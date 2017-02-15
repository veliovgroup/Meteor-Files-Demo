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
var Cookies = Package['ostrio:cookies'].Cookies;
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

var require = meteorInstall({"node_modules":{"meteor":{"ostrio:files":{"files.coffee.js":["./event-emitter.jsx",function(require,exports,module){

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
var EventEmitter, FileCursor, FilesCursor, NOOP, Throttle, bound, events, fileType, fixJSONParse, fixJSONStringify, formatFleURL, fs, nodePath, request, writeStream;
                                                                                                                       //
NOOP = function () {};                                                                                                 // 1
                                                                                                                       //
if (Meteor.isServer) {                                                                                                 // 3
  /*                                                                                                                   // 4
  @summary Require NPM packages                                                                                        //
   */fs = Npm.require('fs-extra');                                                                                     //
  events = Npm.require('events');                                                                                      // 8
  request = Npm.require('request');                                                                                    // 9
  Throttle = Npm.require('throttle');                                                                                  // 10
  fileType = Npm.require('file-type');                                                                                 // 11
  nodePath = Npm.require('path'); /*                                                                                   // 12
                                  @var {Object} bound - Meteor.bindEnvironment (Fiber wrapper)                         //
                                   */                                                                                  //
  bound = Meteor.bindEnvironment(function (callback) {                                                                 // 17
    return callback();                                                                                                 // 17
  }); /*                                                                                                               // 17
      @private                                                                                                         //
      @locus Server                                                                                                    //
      @class writeStream                                                                                               //
      @param path      {String} - Path to file on FS                                                                   //
      @param maxLength {Number} - Max amount of chunks in stream                                                       //
      @param file      {Object} - fileRef Object                                                                       //
      @summary writableStream wrapper class, makes sure chunks is written in given order. Implementation of queue stream.
       */                                                                                                              //
                                                                                                                       //
  writeStream = function () {                                                                                          // 28
    function writeStream(path1, maxLength, file1, permissions) {                                                       // 29
      var self;                                                                                                        // 30
      this.path = path1;                                                                                               // 29
      this.maxLength = maxLength;                                                                                      // 29
      this.file = file1;                                                                                               // 29
      this.permissions = permissions;                                                                                  // 29
                                                                                                                       //
      if (!this.path || !_.isString(this.path)) {                                                                      // 30
        return;                                                                                                        // 31
      }                                                                                                                // 42
                                                                                                                       //
      self = this;                                                                                                     // 33
      this.fd = null;                                                                                                  // 34
      fs.open(this.path, 'w+', this.permissions, function (error, fd) {                                                // 35
        return bound(function () {                                                                                     // 46
          if (error) {                                                                                                 // 36
            throw new Meteor.Error(500, '[FilesCollection] [writeStream] [Exception:]', error);                        // 37
          } else {                                                                                                     // 36
            self.fd = fd;                                                                                              // 39
          }                                                                                                            // 51
        });                                                                                                            // 35
      });                                                                                                              // 35
      this.ended = false;                                                                                              // 41
      this.aborted = false;                                                                                            // 42
      this.writtenChunks = 0;                                                                                          // 43
    } /*                                                                                                               // 29
      @memberOf writeStream                                                                                            //
      @name write                                                                                                      //
      @param {Number} num - Chunk position in stream                                                                   //
      @param {Buffer} chunk - Chunk binary data                                                                        //
      @param {Function} callback - Callback                                                                            //
      @summary Write chunk in given order                                                                              //
      @returns {Boolean} - True if chunk is sent to stream, false if chunk is set into queue                           //
       */                                                                                                              //
                                                                                                                       //
    writeStream.prototype.write = function (num, chunk, callback) {                                                    // 70
      var _stream, self;                                                                                               // 55
                                                                                                                       //
      if (!this.aborted && !this.ended) {                                                                              // 55
        self = this;                                                                                                   // 56
                                                                                                                       //
        if (this.fd) {                                                                                                 // 57
          _stream = fs.createWriteStream(this.path, {                                                                  // 58
            flags: 'r+',                                                                                               // 59
            mode: this.permissions,                                                                                    // 60
            highWaterMark: 0,                                                                                          // 61
            fd: this.fd,                                                                                               // 62
            autoClose: true,                                                                                           // 63
            start: (num - 1) * this.file.chunkSize                                                                     // 64
          });                                                                                                          // 58
                                                                                                                       //
          _stream.on('error', function (error) {                                                                       // 66
            return bound(function () {                                                                                 // 84
              console.error("[FilesCollection] [writeStream] [ERROR:]", error);                                        // 67
              self.abort();                                                                                            // 68
            });                                                                                                        // 66
          });                                                                                                          // 66
                                                                                                                       //
          _stream.write(chunk, function () {                                                                           // 70
            return bound(function () {                                                                                 // 90
              ++self.writtenChunks;                                                                                    // 71
              callback && callback();                                                                                  // 72
            });                                                                                                        // 70
          });                                                                                                          // 70
        } else {                                                                                                       // 57
          Meteor.setTimeout(function () {                                                                              // 75
            self.write(num, chunk, callback);                                                                          // 76
          }, 25);                                                                                                      // 75
        }                                                                                                              // 55
      }                                                                                                                // 100
                                                                                                                       //
      return false;                                                                                                    // 79
    }; /*                                                                                                              // 54
       @memberOf writeStream                                                                                           //
       @name end                                                                                                       //
       @param {Function} callback - Callback                                                                           //
       @summary Finishes writing to writableStream, only after all chunks in queue is written                          //
       @returns {Boolean} - True if stream is fulfilled, false if queue is in progress                                 //
        */                                                                                                             //
                                                                                                                       //
    writeStream.prototype.end = function (callback) {                                                                  // 113
      var self;                                                                                                        // 89
                                                                                                                       //
      if (!this.aborted && !this.ended) {                                                                              // 89
        if (this.writtenChunks === this.maxLength) {                                                                   // 90
          self = this;                                                                                                 // 91
          fs.close(this.fd, function () {                                                                              // 92
            return bound(function () {                                                                                 // 119
              self.ended = true;                                                                                       // 93
              callback && callback(true);                                                                              // 94
            });                                                                                                        // 92
          });                                                                                                          // 92
          return true;                                                                                                 // 96
        } else {                                                                                                       // 90
          self = this;                                                                                                 // 98
          Meteor.setTimeout(function () {                                                                              // 99
            self.end(callback);                                                                                        // 100
          }, 25);                                                                                                      // 99
        }                                                                                                              // 89
      } else {                                                                                                         // 89
        callback && callback(false);                                                                                   // 104
      }                                                                                                                // 133
                                                                                                                       //
      return false;                                                                                                    // 105
    }; /*                                                                                                              // 88
       @memberOf writeStream                                                                                           //
       @name abort                                                                                                     //
       @param {Function} callback - Callback                                                                           //
       @summary Aborts writing to writableStream, removes created file                                                 //
       @returns {Boolean} - True                                                                                       //
        */                                                                                                             //
                                                                                                                       //
    writeStream.prototype.abort = function (callback) {                                                                // 146
      this.aborted = true;                                                                                             // 115
      fs.unlink(this.path, callback || NOOP);                                                                          // 116
      return true;                                                                                                     // 117
    }; /*                                                                                                              // 114
       @memberOf writeStream                                                                                           //
       @name stop                                                                                                      //
       @summary Stop writing to writableStream                                                                         //
       @returns {Boolean} - True                                                                                       //
        */                                                                                                             //
                                                                                                                       //
    writeStream.prototype.stop = function () {                                                                         // 160
      this.aborted = true;                                                                                             // 126
      this.ended = true;                                                                                               // 127
      return true;                                                                                                     // 128
    };                                                                                                                 // 125
                                                                                                                       //
    return writeStream;                                                                                                // 166
  }();                                                                                                                 // 168
} else {                                                                                                               // 3
  EventEmitter = require('./event-emitter.jsx').EventEmitter;                                                          // 130
} /*                                                                                                                   // 171
  @private                                                                                                             //
  @locus Anywhere                                                                                                      //
  @class FileCursor                                                                                                    //
  @param _fileRef    {Object} - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)           //
  @param _collection {FilesCollection} - FilesCollection Instance                                                      //
  @summary Internal class, represents each record in `FilesCursor.each()` or document returned from `.findOne()` method
   */                                                                                                                  //
                                                                                                                       //
FileCursor = function () {                                                                                             // 140
  function FileCursor(_fileRef, _collection) {                                                                         // 141
    var self;                                                                                                          // 142
    this._fileRef = _fileRef;                                                                                          // 141
    this._collection = _collection;                                                                                    // 141
    self = this;                                                                                                       // 142
    self = _.extend(self, this._fileRef);                                                                              // 143
  } /*                                                                                                                 // 141
    @locus Anywhere                                                                                                    //
    @memberOf FileCursor                                                                                               //
    @name remove                                                                                                       //
    @param callback {Function} - Triggered asynchronously after item is removed or failed to be removed                //
    @summary Remove document                                                                                           //
    @returns {FileCursor}                                                                                              //
     */                                                                                                                //
                                                                                                                       //
  FileCursor.prototype.remove = function (callback) {                                                                  // 202
    if (this._collection.debug) {                                                                                      // 154
      console.info('[FilesCollection] [FileCursor] [remove()]');                                                       // 154
    }                                                                                                                  // 205
                                                                                                                       //
    if (this._fileRef) {                                                                                               // 155
      this._collection.remove(this._fileRef._id, callback);                                                            // 156
    } else {                                                                                                           // 155
      callback && callback(new Meteor.Error(404, 'No such file'));                                                     // 158
    }                                                                                                                  // 210
                                                                                                                       //
    return this;                                                                                                       // 159
  }; /*                                                                                                                // 153
     @locus Anywhere                                                                                                   //
     @memberOf FileCursor                                                                                              //
     @name link                                                                                                        //
     @param version {String} - Name of file's subversion                                                               //
     @summary Returns downloadable URL to File                                                                         //
     @returns {String}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FileCursor.prototype.link = function (version) {                                                                     // 224
    if (this._collection.debug) {                                                                                      // 170
      console.info("[FilesCollection] [FileCursor] [link(" + version + ")]");                                          // 170
    }                                                                                                                  // 227
                                                                                                                       //
    if (this._fileRef) {                                                                                               // 171
      return this._collection.link(this._fileRef, version);                                                            // 229
    } else {                                                                                                           // 171
      return '';                                                                                                       // 231
    }                                                                                                                  // 232
  }; /*                                                                                                                // 169
     @locus Anywhere                                                                                                   //
     @memberOf FileCursor                                                                                              //
     @name get                                                                                                         //
     @param property {String} - Name of sub-object property                                                            //
     @summary Returns current document as a plain Object, if `property` is specified - returns value of sub-object property
     @returns {Object|mix}                                                                                             //
      */                                                                                                               //
                                                                                                                       //
  FileCursor.prototype.get = function (property) {                                                                     // 245
    if (this._collection.debug) {                                                                                      // 182
      console.info("[FilesCollection] [FileCursor] [get(" + property + ")]");                                          // 182
    }                                                                                                                  // 248
                                                                                                                       //
    if (property) {                                                                                                    // 183
      return this._fileRef[property];                                                                                  // 184
    } else {                                                                                                           // 183
      return this._fileRef;                                                                                            // 186
    }                                                                                                                  // 253
  }; /*                                                                                                                // 181
     @locus Anywhere                                                                                                   //
     @memberOf FileCursor                                                                                              //
     @name fetch                                                                                                       //
     @summary Returns document as plain Object in Array                                                                //
     @returns {[Object]}                                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FileCursor.prototype.fetch = function () {                                                                           // 265
    if (this._collection.debug) {                                                                                      // 196
      console.info('[FilesCollection] [FileCursor] [fetch()]');                                                        // 196
    }                                                                                                                  // 268
                                                                                                                       //
    return [this._fileRef];                                                                                            // 197
  }; /*                                                                                                                // 195
     @locus Anywhere                                                                                                   //
     @memberOf FileCursor                                                                                              //
     @name with                                                                                                        //
     @summary Returns reactive version of current FileCursor, useful to use with `{{#with}}...{{/with}}` block template helper
     @returns {[Object]}                                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FileCursor.prototype["with"] = function () {                                                                         // 281
    var self;                                                                                                          // 207
                                                                                                                       //
    if (this._collection.debug) {                                                                                      // 207
      console.info('[FilesCollection] [FileCursor] [with()]');                                                         // 207
    }                                                                                                                  // 285
                                                                                                                       //
    self = this;                                                                                                       // 208
    return _.extend(self, this._collection.collection.findOne(this._fileRef._id));                                     // 209
  };                                                                                                                   // 206
                                                                                                                       //
  return FileCursor;                                                                                                   // 290
}(); /*                                                                                                                // 292
     @private                                                                                                          //
     @locus Anywhere                                                                                                   //
     @class FilesCursor                                                                                                //
     @param _selector   {String|Object}   - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
     @param options     {Object}          - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#selectors)
     @param _collection {FilesCollection} - FilesCollection Instance                                                   //
     @summary Implementation of Cursor for FilesCollection                                                             //
      */                                                                                                               //
                                                                                                                       //
FilesCursor = function () {                                                                                            // 220
  function FilesCursor(_selector, options, _collection) {                                                              // 221
    this._selector = _selector != null ? _selector : {};                                                               // 221
    this._collection = _collection;                                                                                    // 221
    this._current = -1;                                                                                                // 222
    this.cursor = this._collection.collection.find(this._selector, options);                                           // 223
  } /*                                                                                                                 // 221
    @locus Anywhere                                                                                                    //
    @memberOf FilesCursor                                                                                              //
    @name get                                                                                                          //
    @summary Returns all matching document(s) as an Array. Alias of `.fetch()`                                         //
    @returns {[Object]}                                                                                                //
     */                                                                                                                //
                                                                                                                       //
  FilesCursor.prototype.get = function () {                                                                            // 322
    if (this._collection.debug) {                                                                                      // 233
      console.info("[FilesCollection] [FilesCursor] [get()]");                                                         // 233
    }                                                                                                                  // 325
                                                                                                                       //
    return this.cursor.fetch();                                                                                        // 234
  }; /*                                                                                                                // 232
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name hasNext                                                                                                     //
     @summary Returns `true` if there is next item available on Cursor                                                 //
     @returns {Boolean}                                                                                                //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.hasNext = function () {                                                                        // 338
    if (this._collection.debug) {                                                                                      // 244
      console.info('[FilesCollection] [FilesCursor] [hasNext()]');                                                     // 244
    }                                                                                                                  // 341
                                                                                                                       //
    return this._current < this.cursor.count() - 1;                                                                    // 245
  }; /*                                                                                                                // 243
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name next                                                                                                        //
     @summary Returns next item on Cursor, if available                                                                //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.next = function () {                                                                           // 354
    if (this._collection.debug) {                                                                                      // 255
      console.info('[FilesCollection] [FilesCursor] [next()]');                                                        // 255
    }                                                                                                                  // 357
                                                                                                                       //
    if (this.hasNext()) {                                                                                              // 256
      return this.cursor.fetch()[++this._current];                                                                     // 257
    }                                                                                                                  // 360
  }; /*                                                                                                                // 254
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name hasPrevious                                                                                                 //
     @summary Returns `true` if there is previous item available on Cursor                                             //
     @returns {Boolean}                                                                                                //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.hasPrevious = function () {                                                                    // 372
    if (this._collection.debug) {                                                                                      // 267
      console.info('[FilesCollection] [FilesCursor] [hasPrevious()]');                                                 // 267
    }                                                                                                                  // 375
                                                                                                                       //
    return this._current !== -1;                                                                                       // 268
  }; /*                                                                                                                // 266
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name previous                                                                                                    //
     @summary Returns previous item on Cursor, if available                                                            //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.previous = function () {                                                                       // 388
    if (this._collection.debug) {                                                                                      // 278
      console.info('[FilesCollection] [FilesCursor] [previous()]');                                                    // 278
    }                                                                                                                  // 391
                                                                                                                       //
    if (this.hasPrevious()) {                                                                                          // 279
      return this.cursor.fetch()[--this._current];                                                                     // 280
    }                                                                                                                  // 394
  }; /*                                                                                                                // 277
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name fetch                                                                                                       //
     @summary Returns all matching document(s) as an Array.                                                            //
     @returns {[Object]}                                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.fetch = function () {                                                                          // 406
    if (this._collection.debug) {                                                                                      // 290
      console.info('[FilesCollection] [FilesCursor] [fetch()]');                                                       // 290
    }                                                                                                                  // 409
                                                                                                                       //
    return this.cursor.fetch();                                                                                        // 291
  }; /*                                                                                                                // 289
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name first                                                                                                       //
     @summary Returns first item on Cursor, if available                                                               //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.first = function () {                                                                          // 422
    var ref;                                                                                                           // 301
                                                                                                                       //
    if (this._collection.debug) {                                                                                      // 301
      console.info('[FilesCollection] [FilesCursor] [first()]');                                                       // 301
    }                                                                                                                  // 426
                                                                                                                       //
    this._current = 0;                                                                                                 // 302
    return (ref = this.fetch()) != null ? ref[this._current] : void 0;                                                 // 303
  }; /*                                                                                                                // 300
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name last                                                                                                        //
     @summary Returns last item on Cursor, if available                                                                //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.last = function () {                                                                           // 440
    var ref;                                                                                                           // 313
                                                                                                                       //
    if (this._collection.debug) {                                                                                      // 313
      console.info('[FilesCollection] [FilesCursor] [last()]');                                                        // 313
    }                                                                                                                  // 444
                                                                                                                       //
    this._current = this.count() - 1;                                                                                  // 314
    return (ref = this.fetch()) != null ? ref[this._current] : void 0;                                                 // 315
  }; /*                                                                                                                // 312
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name count                                                                                                       //
     @summary Returns the number of documents that match a query                                                       //
     @returns {Number}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.count = function () {                                                                          // 458
    if (this._collection.debug) {                                                                                      // 325
      console.info('[FilesCollection] [FilesCursor] [count()]');                                                       // 325
    }                                                                                                                  // 461
                                                                                                                       //
    return this.cursor.count();                                                                                        // 326
  }; /*                                                                                                                // 324
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name remove                                                                                                      //
     @param callback {Function} - Triggered asynchronously after item is removed or failed to be removed               //
     @summary Removes all documents that match a query                                                                 //
     @returns {FilesCursor}                                                                                            //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.remove = function (callback) {                                                                 // 475
    if (this._collection.debug) {                                                                                      // 337
      console.info('[FilesCollection] [FilesCursor] [remove()]');                                                      // 337
    }                                                                                                                  // 478
                                                                                                                       //
    this._collection.remove(this._selector, callback);                                                                 // 338
                                                                                                                       //
    return this;                                                                                                       // 339
  }; /*                                                                                                                // 336
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name forEach                                                                                                     //
     @param callback {Function} - Function to call. It will be called with three arguments: the `file`, a 0-based index, and cursor itself
     @param context {Object} - An object which will be the value of `this` inside `callback`                           //
     @summary Call `callback` once for each matching document, sequentially and synchronously.                         //
     @returns {undefined}                                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.forEach = function (callback, context) {                                                       // 494
    if (context == null) {                                                                                             // 495
      context = {};                                                                                                    // 350
    }                                                                                                                  // 497
                                                                                                                       //
    if (this._collection.debug) {                                                                                      // 351
      console.info('[FilesCollection] [FilesCursor] [forEach()]');                                                     // 351
    }                                                                                                                  // 500
                                                                                                                       //
    this.cursor.forEach(callback, context);                                                                            // 352
  }; /*                                                                                                                // 350
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name each                                                                                                        //
     @summary Returns an Array of FileCursor made for each document on current cursor                                  //
              Useful when using in {{#each FilesCursor#each}}...{{/each}} block template helper                        //
     @returns {[FileCursor]}                                                                                           //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.each = function () {                                                                           // 514
    var self;                                                                                                          // 364
    self = this;                                                                                                       // 364
    return this.map(function (file) {                                                                                  // 365
      return new FileCursor(file, self._collection);                                                                   // 366
    });                                                                                                                // 365
  }; /*                                                                                                                // 363
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name map                                                                                                         //
     @param callback {Function} - Function to call. It will be called with three arguments: the `file`, a 0-based index, and cursor itself
     @param context {Object} - An object which will be the value of `this` inside `callback`                           //
     @summary Map `callback` over all matching documents. Returns an Array.                                            //
     @returns {Array}                                                                                                  //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.map = function (callback, context) {                                                           // 533
    if (context == null) {                                                                                             // 534
      context = {};                                                                                                    // 377
    }                                                                                                                  // 536
                                                                                                                       //
    if (this._collection.debug) {                                                                                      // 378
      console.info('[FilesCollection] [FilesCursor] [map()]');                                                         // 378
    }                                                                                                                  // 539
                                                                                                                       //
    return this.cursor.map(callback, context);                                                                         // 379
  }; /*                                                                                                                // 377
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name current                                                                                                     //
     @summary Returns current item on Cursor, if available                                                             //
     @returns {Object|undefined}                                                                                       //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.current = function () {                                                                        // 552
    if (this._collection.debug) {                                                                                      // 389
      console.info('[FilesCollection] [FilesCursor] [current()]');                                                     // 389
    }                                                                                                                  // 555
                                                                                                                       //
    if (this._current < 0) {                                                                                           // 390
      this._current = 0;                                                                                               // 390
    }                                                                                                                  // 558
                                                                                                                       //
    return this.fetch()[this._current];                                                                                // 391
  }; /*                                                                                                                // 388
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name observe                                                                                                     //
     @param callbacks {Object} - Functions to call to deliver the result set as it changes                             //
     @summary Watch a query. Receive callbacks as the result set changes.                                              //
     @url http://docs.meteor.com/api/collections.html#Mongo-Cursor-observe                                             //
     @returns {Object} - live query handle                                                                             //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.observe = function (callbacks) {                                                               // 573
    if (this._collection.debug) {                                                                                      // 403
      console.info('[FilesCollection] [FilesCursor] [observe()]');                                                     // 403
    }                                                                                                                  // 576
                                                                                                                       //
    return this.cursor.observe(callbacks);                                                                             // 404
  }; /*                                                                                                                // 402
     @locus Anywhere                                                                                                   //
     @memberOf FilesCursor                                                                                             //
     @name observeChanges                                                                                              //
     @param callbacks {Object} - Functions to call to deliver the result set as it changes                             //
     @summary Watch a query. Receive callbacks as the result set changes. Only the differences between the old and new documents are passed to the callbacks.
     @url http://docs.meteor.com/api/collections.html#Mongo-Cursor-observeChanges                                      //
     @returns {Object} - live query handle                                                                             //
      */                                                                                                               //
                                                                                                                       //
  FilesCursor.prototype.observeChanges = function (callbacks) {                                                        // 591
    if (this._collection.debug) {                                                                                      // 416
      console.info('[FilesCollection] [FilesCursor] [observeChanges()]');                                              // 416
    }                                                                                                                  // 594
                                                                                                                       //
    return this.cursor.observeChanges(callbacks);                                                                      // 417
  };                                                                                                                   // 415
                                                                                                                       //
  return FilesCursor;                                                                                                  // 598
}(); /*                                                                                                                // 600
     @var {Function} fixJSONParse - Fix issue with Date parse                                                          //
      */                                                                                                               //
                                                                                                                       //
fixJSONParse = function (obj) {                                                                                        // 422
  var i, j, key, len, v, value;                                                                                        // 423
                                                                                                                       //
  for (key in meteorBabelHelpers.sanitizeForInObject(obj)) {                                                           // 423
    value = obj[key];                                                                                                  // 610
                                                                                                                       //
    if (_.isString(value) && !!~value.indexOf('=--JSON-DATE--=')) {                                                    // 424
      value = value.replace('=--JSON-DATE--=', '');                                                                    // 425
      obj[key] = new Date(parseInt(value));                                                                            // 426
    } else if (_.isObject(value)) {                                                                                    // 424
      obj[key] = fixJSONParse(value);                                                                                  // 428
    } else if (_.isArray(value)) {                                                                                     // 427
      for (i = j = 0, len = value.length; j < len; i = ++j) {                                                          // 430
        v = value[i];                                                                                                  // 618
                                                                                                                       //
        if (_.isObject(v)) {                                                                                           // 431
          obj[key][i] = fixJSONParse(v);                                                                               // 432
        } else if (_.isString(v) && !!~v.indexOf('=--JSON-DATE--=')) {                                                 // 431
          v = v.replace('=--JSON-DATE--=', '');                                                                        // 434
          obj[key][i] = new Date(parseInt(v));                                                                         // 435
        }                                                                                                              // 624
      }                                                                                                                // 429
    }                                                                                                                  // 626
  }                                                                                                                    // 423
                                                                                                                       //
  return obj;                                                                                                          // 436
}; /*                                                                                                                  // 422
   @var {Function} fixJSONStringify - Fix issue with Date stringify                                                    //
    */                                                                                                                 //
                                                                                                                       //
fixJSONStringify = function (obj) {                                                                                    // 441
  var i, j, key, len, v, value;                                                                                        // 442
                                                                                                                       //
  for (key in meteorBabelHelpers.sanitizeForInObject(obj)) {                                                           // 442
    value = obj[key];                                                                                                  // 639
                                                                                                                       //
    if (_.isDate(value)) {                                                                                             // 443
      obj[key] = '=--JSON-DATE--=' + +value;                                                                           // 444
    } else if (_.isObject(value)) {                                                                                    // 443
      obj[key] = fixJSONStringify(value);                                                                              // 446
    } else if (_.isArray(value)) {                                                                                     // 445
      for (i = j = 0, len = value.length; j < len; i = ++j) {                                                          // 448
        v = value[i];                                                                                                  // 646
                                                                                                                       //
        if (_.isObject(v)) {                                                                                           // 449
          obj[key][i] = fixJSONStringify(v);                                                                           // 450
        } else if (_.isDate(v)) {                                                                                      // 449
          obj[key][i] = '=--JSON-DATE--=' + +v;                                                                        // 452
        }                                                                                                              // 651
      }                                                                                                                // 447
    }                                                                                                                  // 653
  }                                                                                                                    // 442
                                                                                                                       //
  return obj;                                                                                                          // 453
}; /*                                                                                                                  // 441
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
module.runModuleSetters(FilesCollection = function () {                                                                // 495
  var FileUpload, UploadInstance;                                                                                      // 496
                                                                                                                       //
  FilesCollection.prototype.__proto__ = function () {                                                                  // 703
    if (Meteor.isServer) {                                                                                             // 496
      return events.EventEmitter.prototype;                                                                            // 705
    } else {                                                                                                           // 496
      return EventEmitter.prototype;                                                                                   // 707
    }                                                                                                                  // 708
  }();                                                                                                                 // 496
                                                                                                                       //
  function FilesCollection(config) {                                                                                   // 497
    var _URL, _methods, _preCollectionCursor, cookie, self, setTokenCookie, storagePath, unsetTokenCookie;             // 498
                                                                                                                       //
    if (Meteor.isServer) {                                                                                             // 498
      events.EventEmitter.call(this);                                                                                  // 499
    } else {                                                                                                           // 498
      EventEmitter.call(this);                                                                                         // 501
    }                                                                                                                  // 717
                                                                                                                       //
    if (config) {                                                                                                      // 502
      storagePath = config.storagePath, this.ddp = config.ddp, this.collection = config.collection, this.collectionName = config.collectionName, this.downloadRoute = config.downloadRoute, this.schema = config.schema, this.chunkSize = config.chunkSize, this.namingFunction = config.namingFunction, this.debug = config.debug, this.onbeforeunloadMessage = config.onbeforeunloadMessage, this.permissions = config.permissions, this.parentDirPermissions = config.parentDirPermissions, this.allowClientCode = config.allowClientCode, this.onBeforeUpload = config.onBeforeUpload, this.onInitiateUpload = config.onInitiateUpload, this.integrityCheck = config.integrityCheck, this["protected"] = config["protected"], this["public"] = config["public"], this.strict = config.strict, this.downloadCallback = config.downloadCallback, this.cacheControl = config.cacheControl, this.responseHeaders = config.responseHeaders, this.throttle = config.throttle, this.onAfterUpload = config.onAfterUpload, this.onAfterRemove = config.onAfterRemove, this.interceptDownload = config.interceptDownload, this.onBeforeRemove = config.onBeforeRemove, this.continueUploadTTL = config.continueUploadTTL;
    }                                                                                                                  // 720
                                                                                                                       //
    self = this;                                                                                                       // 504
    cookie = new Cookies();                                                                                            // 505
                                                                                                                       //
    if (this.debug == null) {                                                                                          // 723
      this.debug = false;                                                                                              // 506
    }                                                                                                                  // 725
                                                                                                                       //
    if (this["public"] == null) {                                                                                      // 726
      this["public"] = false;                                                                                          // 507
    }                                                                                                                  // 728
                                                                                                                       //
    if (this["protected"] == null) {                                                                                   // 729
      this["protected"] = false;                                                                                       // 508
    }                                                                                                                  // 731
                                                                                                                       //
    if (this.chunkSize == null) {                                                                                      // 732
      this.chunkSize = 1024 * 512;                                                                                     // 509
    }                                                                                                                  // 734
                                                                                                                       //
    this.chunkSize = Math.floor(this.chunkSize / 8) * 8;                                                               // 510
                                                                                                                       //
    if (this["public"] && !this.downloadRoute) {                                                                       // 512
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: \"downloadRoute\" must be precisely provided on \"public\" collections! Note: \"downloadRoute\" must be equal or be inside of your web/proxy-server (relative) root.");
    }                                                                                                                  // 738
                                                                                                                       //
    if (this.collection == null) {                                                                                     // 739
      this.collection = new Mongo.Collection(this.collectionName);                                                     // 515
    }                                                                                                                  // 741
                                                                                                                       //
    if (this.collectionName == null) {                                                                                 // 742
      this.collectionName = this.collection._name;                                                                     // 516
    }                                                                                                                  // 744
                                                                                                                       //
    check(this.collectionName, String);                                                                                // 517
                                                                                                                       //
    if (this.downloadRoute == null) {                                                                                  // 746
      this.downloadRoute = '/cdn/storage';                                                                             // 518
    }                                                                                                                  // 748
                                                                                                                       //
    this.downloadRoute = this.downloadRoute.replace(/\/$/, '');                                                        // 519
                                                                                                                       //
    if (this.collectionName == null) {                                                                                 // 750
      this.collectionName = 'MeteorUploadFiles';                                                                       // 520
    }                                                                                                                  // 752
                                                                                                                       //
    if (this.namingFunction == null) {                                                                                 // 753
      this.namingFunction = false;                                                                                     // 521
    }                                                                                                                  // 755
                                                                                                                       //
    if (this.onBeforeUpload == null) {                                                                                 // 756
      this.onBeforeUpload = false;                                                                                     // 522
    }                                                                                                                  // 758
                                                                                                                       //
    if (this.allowClientCode == null) {                                                                                // 759
      this.allowClientCode = true;                                                                                     // 523
    }                                                                                                                  // 761
                                                                                                                       //
    if (this.ddp == null) {                                                                                            // 762
      this.ddp = Meteor;                                                                                               // 524
    }                                                                                                                  // 764
                                                                                                                       //
    if (this.onInitiateUpload == null) {                                                                               // 765
      this.onInitiateUpload = false;                                                                                   // 525
    }                                                                                                                  // 767
                                                                                                                       //
    if (this.interceptDownload == null) {                                                                              // 768
      this.interceptDownload = false;                                                                                  // 526
    }                                                                                                                  // 770
                                                                                                                       //
    if (storagePath == null) {                                                                                         // 771
      storagePath = function () {                                                                                      // 527
        return "assets" + nodePath.sep + "app" + nodePath.sep + "uploads" + nodePath.sep + this.collectionName;        // 773
      };                                                                                                               // 527
    }                                                                                                                  // 775
                                                                                                                       //
    if (_.isString(storagePath)) {                                                                                     // 529
      this.storagePath = function () {                                                                                 // 530
        return storagePath;                                                                                            // 778
      };                                                                                                               // 530
    } else {                                                                                                           // 529
      this.storagePath = function () {                                                                                 // 532
        var sp;                                                                                                        // 533
        sp = storagePath.apply(this, arguments);                                                                       // 533
                                                                                                                       //
        if (!_.isString(sp)) {                                                                                         // 534
          throw new Meteor.Error(400, "[FilesCollection." + self.collectionName + "] \"storagePath\" function must return a String!");
        }                                                                                                              // 786
                                                                                                                       //
        sp = sp.replace(/\/$/, '');                                                                                    // 536
                                                                                                                       //
        if (Meteor.isServer) {                                                                                         // 537
          return nodePath.normalize(sp);                                                                               // 789
        } else {                                                                                                       // 537
          return sp;                                                                                                   // 791
        }                                                                                                              // 792
      };                                                                                                               // 532
    }                                                                                                                  // 794
                                                                                                                       //
    if (Meteor.isClient) {                                                                                             // 539
      if (this.onbeforeunloadMessage == null) {                                                                        // 796
        this.onbeforeunloadMessage = 'Upload in a progress... Do you want to abort?';                                  // 540
      }                                                                                                                // 798
                                                                                                                       //
      delete this.strict;                                                                                              // 541
      delete this.throttle;                                                                                            // 542
      delete this.permissions;                                                                                         // 543
      delete this.parentDirPermissions;                                                                                // 544
      delete this.cacheControl;                                                                                        // 545
      delete this.onAfterUpload;                                                                                       // 546
      delete this.onAfterRemove;                                                                                       // 547
      delete this.onBeforeRemove;                                                                                      // 548
      this.onInitiateUpload = false;                                                                                   // 549
      delete this.integrityCheck;                                                                                      // 550
      delete this.downloadCallback;                                                                                    // 551
      delete this.interceptDownload;                                                                                   // 552
      delete this.continueUploadTTL;                                                                                   // 553
      delete this.responseHeaders;                                                                                     // 554
                                                                                                                       //
      setTokenCookie = function () {                                                                                   // 556
        Meteor.setTimeout(function () {                                                                                // 557
          if (!cookie.has('x_mtok') && Meteor.connection._lastSessionId || cookie.has('x_mtok') && cookie.get('x_mtok') !== Meteor.connection._lastSessionId) {
            cookie.set('x_mtok', Meteor.connection._lastSessionId, {                                                   // 559
              path: '/'                                                                                                // 559
            });                                                                                                        // 559
          }                                                                                                            // 819
        }, 25);                                                                                                        // 557
      };                                                                                                               // 556
                                                                                                                       //
      unsetTokenCookie = function () {                                                                                 // 564
        if (cookie.has('x_mtok')) {                                                                                    // 565
          cookie.remove('x_mtok', '/');                                                                                // 565
        }                                                                                                              // 825
      };                                                                                                               // 564
                                                                                                                       //
      if (typeof Accounts !== "undefined" && Accounts !== null) {                                                      // 568
        Accounts.onLogin(function () {                                                                                 // 569
          setTokenCookie();                                                                                            // 570
        });                                                                                                            // 569
        Accounts.onLogout(function () {                                                                                // 572
          unsetTokenCookie();                                                                                          // 573
        });                                                                                                            // 572
      }                                                                                                                // 834
                                                                                                                       //
      check(this.onbeforeunloadMessage, Match.OneOf(String, Function));                                                // 576
      _URL = window.URL || window.webkitURL || window.mozURL || window.msURL || window.oURL || false;                  // 578
                                                                                                                       //
      if ((typeof window !== "undefined" && window !== null ? window.Worker : void 0) && (typeof window !== "undefined" && window !== null ? window.Blob : void 0) && _URL) {
        this._supportWebWorker = true;                                                                                 // 580
        this._webWorkerUrl = _URL.createObjectURL(new Blob(['!function(a){"use strict";a.onmessage=function(b){var c=b.data.f.slice(b.data.cs*(b.data.cc-1),b.data.cs*b.data.cc);if(b.data.ib===!0)postMessage({bin:c,chunkId:b.data.cc});else{var d;a.FileReader?(d=new FileReader,d.onloadend=function(a){postMessage({bin:(d.result||a.srcElement||a.target).split(",")[1],chunkId:b.data.cc,s:b.data.s})},d.onerror=function(a){throw(a.target||a.srcElement).error},d.readAsDataURL(c)):a.FileReaderSync?(d=new FileReaderSync,postMessage({bin:d.readAsDataURL(c).split(",")[1],chunkId:b.data.cc})):postMessage({bin:null,chunkId:b.data.cc,error:"File API is not supported in WebWorker!"})}}}(this);'], {
          type: 'application/javascript'                                                                               // 581
        }));                                                                                                           // 581
      } else if (typeof window !== "undefined" && window !== null ? window.Worker : void 0) {                          // 579
        this._supportWebWorker = true;                                                                                 // 583
        this._webWorkerUrl = Meteor.absoluteUrl('packages/ostrio_files/worker.min.js');                                // 584
      } else {                                                                                                         // 582
        this._supportWebWorker = false;                                                                                // 586
      }                                                                                                                // 539
    } else {                                                                                                           // 539
      if (this.strict == null) {                                                                                       // 849
        this.strict = true;                                                                                            // 589
      }                                                                                                                // 851
                                                                                                                       //
      if (this.throttle == null) {                                                                                     // 852
        this.throttle = false;                                                                                         // 590
      }                                                                                                                // 854
                                                                                                                       //
      if (this.permissions == null) {                                                                                  // 855
        this.permissions = parseInt('644', 8);                                                                         // 591
      }                                                                                                                // 857
                                                                                                                       //
      if (this.parentDirPermissions == null) {                                                                         // 858
        this.parentDirPermissions = parseInt('755', 8);                                                                // 592
      }                                                                                                                // 860
                                                                                                                       //
      if (this.cacheControl == null) {                                                                                 // 861
        this.cacheControl = 'public, max-age=31536000, s-maxage=31536000';                                             // 593
      }                                                                                                                // 863
                                                                                                                       //
      if (this.onAfterUpload == null) {                                                                                // 864
        this.onAfterUpload = false;                                                                                    // 594
      }                                                                                                                // 866
                                                                                                                       //
      if (this.onAfterRemove == null) {                                                                                // 867
        this.onAfterRemove = false;                                                                                    // 595
      }                                                                                                                // 869
                                                                                                                       //
      if (this.onBeforeRemove == null) {                                                                               // 870
        this.onBeforeRemove = false;                                                                                   // 596
      }                                                                                                                // 872
                                                                                                                       //
      if (this.integrityCheck == null) {                                                                               // 873
        this.integrityCheck = true;                                                                                    // 597
      }                                                                                                                // 875
                                                                                                                       //
      if (this._currentUploads == null) {                                                                              // 876
        this._currentUploads = {};                                                                                     // 598
      }                                                                                                                // 878
                                                                                                                       //
      if (this.downloadCallback == null) {                                                                             // 879
        this.downloadCallback = false;                                                                                 // 599
      }                                                                                                                // 881
                                                                                                                       //
      if (this.continueUploadTTL == null) {                                                                            // 882
        this.continueUploadTTL = 10800;                                                                                // 600
      }                                                                                                                // 884
                                                                                                                       //
      if (this.responseHeaders == null) {                                                                              // 885
        this.responseHeaders = function (responseCode, fileRef, versionRef) {                                          // 601
          var headers;                                                                                                 // 602
          headers = {};                                                                                                // 602
                                                                                                                       //
          switch (responseCode) {                                                                                      // 603
            case '206':                                                                                                // 603
              headers['Pragma'] = 'private';                                                                           // 605
              headers['Trailer'] = 'expires';                                                                          // 606
              headers['Transfer-Encoding'] = 'chunked';                                                                // 607
              break;                                                                                                   // 604
                                                                                                                       //
            case '400':                                                                                                // 603
              headers['Cache-Control'] = 'no-cache';                                                                   // 609
              break;                                                                                                   // 608
                                                                                                                       //
            case '416':                                                                                                // 603
              headers['Content-Range'] = "bytes */" + versionRef.size;                                                 // 611
          }                                                                                                            // 603
                                                                                                                       //
          headers['Connection'] = 'keep-alive';                                                                        // 613
          headers['Content-Type'] = versionRef.type || 'application/octet-stream';                                     // 614
          headers['Accept-Ranges'] = 'bytes';                                                                          // 615
          return headers;                                                                                              // 616
        };                                                                                                             // 601
      }                                                                                                                // 906
                                                                                                                       //
      if (this["public"] && !storagePath) {                                                                            // 618
        throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "] \"storagePath\" must be set on \"public\" collections! Note: \"storagePath\" must be equal on be inside of your web/proxy-server (absolute) root.");
      }                                                                                                                // 909
                                                                                                                       //
      if (this.debug) {                                                                                                // 621
        console.info('[FilesCollection.storagePath] Set to:', this.storagePath({}));                                   // 621
      }                                                                                                                // 912
                                                                                                                       //
      fs.mkdirs(this.storagePath({}), {                                                                                // 623
        mode: this.parentDirPermissions                                                                                // 623
      }, function (error) {                                                                                            // 623
        if (error) {                                                                                                   // 624
          throw new Meteor.Error(401, "[FilesCollection." + self.collectionName + "] Path \"" + self.storagePath({}) + "\" is not writable!", error);
        }                                                                                                              // 918
      });                                                                                                              // 623
      check(this.strict, Boolean);                                                                                     // 628
      check(this.throttle, Match.OneOf(false, Number));                                                                // 629
      check(this.permissions, Number);                                                                                 // 630
      check(this.storagePath, Function);                                                                               // 631
      check(this.cacheControl, String);                                                                                // 632
      check(this.onAfterRemove, Match.OneOf(false, Function));                                                         // 633
      check(this.onAfterUpload, Match.OneOf(false, Function));                                                         // 634
      check(this.integrityCheck, Boolean);                                                                             // 635
      check(this.onBeforeRemove, Match.OneOf(false, Function));                                                        // 636
      check(this.downloadCallback, Match.OneOf(false, Function));                                                      // 637
      check(this.interceptDownload, Match.OneOf(false, Function));                                                     // 638
      check(this.continueUploadTTL, Number);                                                                           // 639
      check(this.responseHeaders, Match.OneOf(Object, Function));                                                      // 640
      this._preCollection = new Mongo.Collection('__pre_' + this.collectionName);                                      // 642
                                                                                                                       //
      this._preCollection._ensureIndex({                                                                               // 643
        createdAt: 1                                                                                                   // 643
      }, {                                                                                                             // 643
        expireAfterSeconds: this.continueUploadTTL,                                                                    // 643
        background: true                                                                                               // 643
      });                                                                                                              // 643
                                                                                                                       //
      _preCollectionCursor = this._preCollection.find({}, {                                                            // 644
        fields: {                                                                                                      // 645
          _id: 1,                                                                                                      // 646
          isFinished: 1                                                                                                // 647
        }                                                                                                              // 646
      });                                                                                                              // 644
                                                                                                                       //
      _preCollectionCursor.observe({                                                                                   // 649
        changed: function (doc) {                                                                                      // 650
          if (doc.isFinished) {                                                                                        // 651
            if (self.debug) {                                                                                          // 652
              console.info("[FilesCollection] [_preCollectionCursor.observe] [changed]: " + doc._id);                  // 652
            }                                                                                                          // 951
                                                                                                                       //
            self._preCollection.remove({                                                                               // 653
              _id: doc._id                                                                                             // 653
            }, NOOP);                                                                                                  // 653
          }                                                                                                            // 955
        },                                                                                                             // 650
        removed: function (doc) {                                                                                      // 655
          var ref;                                                                                                     // 658
                                                                                                                       //
          if (self.debug) {                                                                                            // 658
            console.info("[FilesCollection] [_preCollectionCursor.observe] [removed]: " + doc._id);                    // 658
          }                                                                                                            // 961
                                                                                                                       //
          if ((ref = self._currentUploads) != null ? ref[doc._id] : void 0) {                                          // 659
            self._currentUploads[doc._id].stop();                                                                      // 660
                                                                                                                       //
            self._currentUploads[doc._id].end();                                                                       // 661
                                                                                                                       //
            if (!doc.isFinished) {                                                                                     // 663
              if (self.debug) {                                                                                        // 664
                console.info("[FilesCollection] [_preCollectionCursor.observe] [removeUnfinishedUpload]: " + doc.file.path);
              }                                                                                                        // 968
                                                                                                                       //
              self._currentUploads[doc._id].abort();                                                                   // 665
            }                                                                                                          // 970
                                                                                                                       //
            delete self._currentUploads[doc._id];                                                                      // 667
          }                                                                                                            // 972
        }                                                                                                              // 650
      });                                                                                                              // 650
                                                                                                                       //
      this._createStream = function (_id, path, opts) {                                                                // 670
        return self._currentUploads[_id] = new writeStream(path, opts.fileLength, opts, self.permissions);             // 671
      };                                                                                                               // 670
                                                                                                                       //
      this._continueUpload = function (_id) {                                                                          // 675
        var contUpld, ref, ref1;                                                                                       // 676
                                                                                                                       //
        if ((ref = self._currentUploads) != null ? (ref1 = ref[_id]) != null ? ref1.file : void 0 : void 0) {          // 676
          if (!self._currentUploads[_id].aborted && !self._currentUploads[_id].ended) {                                // 677
            return self._currentUploads[_id].file;                                                                     // 678
          } else {                                                                                                     // 677
            self._createStream(_id, self._currentUploads[_id].file.file.path, self._currentUploads[_id].file);         // 680
                                                                                                                       //
            return self._currentUploads[_id].file;                                                                     // 681
          }                                                                                                            // 676
        } else {                                                                                                       // 676
          contUpld = self._preCollection.findOne({                                                                     // 683
            _id: _id                                                                                                   // 683
          });                                                                                                          // 683
                                                                                                                       //
          if (contUpld) {                                                                                              // 684
            self._createStream(_id, contUpld.file.path, contUpld.file);                                                // 685
          }                                                                                                            // 993
                                                                                                                       //
          return contUpld;                                                                                             // 686
        }                                                                                                              // 995
      };                                                                                                               // 675
    }                                                                                                                  // 997
                                                                                                                       //
    if (!this.schema) {                                                                                                // 688
      this.schema = {                                                                                                  // 689
        size: {                                                                                                        // 690
          type: Number                                                                                                 // 690
        },                                                                                                             // 690
        name: {                                                                                                        // 691
          type: String                                                                                                 // 691
        },                                                                                                             // 691
        type: {                                                                                                        // 692
          type: String                                                                                                 // 692
        },                                                                                                             // 692
        path: {                                                                                                        // 693
          type: String                                                                                                 // 693
        },                                                                                                             // 693
        isVideo: {                                                                                                     // 694
          type: Boolean                                                                                                // 694
        },                                                                                                             // 694
        isAudio: {                                                                                                     // 695
          type: Boolean                                                                                                // 695
        },                                                                                                             // 695
        isImage: {                                                                                                     // 696
          type: Boolean                                                                                                // 696
        },                                                                                                             // 696
        isText: {                                                                                                      // 697
          type: Boolean                                                                                                // 697
        },                                                                                                             // 697
        isJSON: {                                                                                                      // 698
          type: Boolean                                                                                                // 698
        },                                                                                                             // 698
        isPDF: {                                                                                                       // 699
          type: Boolean                                                                                                // 699
        },                                                                                                             // 699
        extension: {                                                                                                   // 700
          type: String,                                                                                                // 701
          optional: true                                                                                               // 702
        },                                                                                                             // 701
        _storagePath: {                                                                                                // 703
          type: String                                                                                                 // 703
        },                                                                                                             // 703
        _downloadRoute: {                                                                                              // 704
          type: String                                                                                                 // 704
        },                                                                                                             // 704
        _collectionName: {                                                                                             // 705
          type: String                                                                                                 // 705
        },                                                                                                             // 705
        "public": {                                                                                                    // 706
          type: Boolean,                                                                                               // 707
          optional: true                                                                                               // 708
        },                                                                                                             // 707
        meta: {                                                                                                        // 709
          type: Object,                                                                                                // 710
          blackbox: true,                                                                                              // 711
          optional: true                                                                                               // 712
        },                                                                                                             // 710
        userId: {                                                                                                      // 713
          type: String,                                                                                                // 714
          optional: true                                                                                               // 715
        },                                                                                                             // 714
        updatedAt: {                                                                                                   // 716
          type: Date,                                                                                                  // 717
          optional: true                                                                                               // 718
        },                                                                                                             // 717
        versions: {                                                                                                    // 719
          type: Object,                                                                                                // 720
          blackbox: true                                                                                               // 721
        }                                                                                                              // 720
      };                                                                                                               // 690
    }                                                                                                                  // 1065
                                                                                                                       //
    check(this.debug, Boolean);                                                                                        // 723
    check(this.schema, Object);                                                                                        // 724
    check(this["public"], Boolean);                                                                                    // 725
    check(this["protected"], Match.OneOf(Boolean, Function));                                                          // 726
    check(this.chunkSize, Number);                                                                                     // 727
    check(this.downloadRoute, String);                                                                                 // 728
    check(this.namingFunction, Match.OneOf(false, Function));                                                          // 729
    check(this.onBeforeUpload, Match.OneOf(false, Function));                                                          // 730
    check(this.onInitiateUpload, Match.OneOf(false, Function));                                                        // 731
    check(this.allowClientCode, Boolean);                                                                              // 732
    check(this.ddp, Match.Any);                                                                                        // 733
                                                                                                                       //
    if (this["public"] && this["protected"]) {                                                                         // 735
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                                  // 1079
                                                                                                                       //
    this._checkAccess = function (http) {                                                                              // 738
      var fileRef, rc, ref, ref1, result, text, user, userId;                                                          // 739
                                                                                                                       //
      if (self["protected"]) {                                                                                         // 739
        ref = self._getUser(http), user = ref.user, userId = ref.userId;                                               // 740
                                                                                                                       //
        if (_.isFunction(self["protected"])) {                                                                         // 742
          if (http != null ? (ref1 = http.params) != null ? ref1._id : void 0 : void 0) {                              // 743
            fileRef = self.collection.findOne(http.params._id);                                                        // 744
          }                                                                                                            // 1087
                                                                                                                       //
          result = http ? self["protected"].call(_.extend(http, {                                                      // 746
            user: user,                                                                                                // 746
            userId: userId                                                                                             // 746
          }), fileRef || null) : self["protected"].call({                                                              // 746
            user: user,                                                                                                // 746
            userId: userId                                                                                             // 746
          }, fileRef || null);                                                                                         // 746
        } else {                                                                                                       // 742
          result = !!userId;                                                                                           // 748
        }                                                                                                              // 1097
                                                                                                                       //
        if (http && result === true || !http) {                                                                        // 750
          return true;                                                                                                 // 751
        } else {                                                                                                       // 750
          rc = _.isNumber(result) ? result : 401;                                                                      // 753
                                                                                                                       //
          if (self.debug) {                                                                                            // 754
            console.warn('[FilesCollection._checkAccess] WARN: Access denied!');                                       // 754
          }                                                                                                            // 1104
                                                                                                                       //
          if (http) {                                                                                                  // 755
            text = 'Access denied!';                                                                                   // 756
            http.response.writeHead(rc, {                                                                              // 757
              'Content-Length': text.length,                                                                           // 758
              'Content-Type': 'text/plain'                                                                             // 759
            });                                                                                                        // 758
            http.response.end(text);                                                                                   // 760
          }                                                                                                            // 1112
                                                                                                                       //
          return false;                                                                                                // 761
        }                                                                                                              // 739
      } else {                                                                                                         // 739
        return true;                                                                                                   // 763
      }                                                                                                                // 1117
    };                                                                                                                 // 738
                                                                                                                       //
    this._methodNames = {                                                                                              // 765
      _Abort: "_FilesCollectionAbort_" + this.collectionName,                                                          // 766
      _Write: "_FilesCollectionWrite_" + this.collectionName,                                                          // 767
      _Start: "_FilesCollectionStart_" + this.collectionName,                                                          // 768
      _Remove: "_FilesCollectionRemove_" + this.collectionName                                                         // 769
    };                                                                                                                 // 766
                                                                                                                       //
    if (Meteor.isServer) {                                                                                             // 771
      this.on('_handleUpload', this._handleUpload);                                                                    // 772
      this.on('_finishUpload', this._finishUpload);                                                                    // 773
      WebApp.connectHandlers.use(function (request, response, next) {                                                  // 775
        var _file, body, handleError, http, params, uri, uris, version;                                                // 776
                                                                                                                       //
        if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName + "/__upload")) {        // 776
          if (request.method === 'POST') {                                                                             // 777
            handleError = function (error) {                                                                           // 779
              console.warn("[FilesCollection] [Upload] [HTTP] Exception:", error);                                     // 780
              response.writeHead(500);                                                                                 // 781
              response.end(JSON.stringify({                                                                            // 782
                error: error                                                                                           // 782
              }));                                                                                                     // 782
            };                                                                                                         // 779
                                                                                                                       //
            body = '';                                                                                                 // 785
            request.on('data', function (data) {                                                                       // 786
              return bound(function () {                                                                               // 1141
                body += data;                                                                                          // 787
              });                                                                                                      // 786
            });                                                                                                        // 786
            request.on('end', function () {                                                                            // 790
              return bound(function () {                                                                               // 1146
                var _continueUpload, error, opts, ref, ref1, ref2, ref3, result, user;                                 // 791
                                                                                                                       //
                try {                                                                                                  // 791
                  if (request.headers['x-mtok'] && ((ref = Meteor.server.sessions) != null ? ref[request.headers['x-mtok']] : void 0)) {
                    user = {                                                                                           // 793
                      userId: (ref1 = Meteor.server.sessions[request.headers['x-mtok']]) != null ? ref1.userId : void 0
                    };                                                                                                 // 793
                  } else {                                                                                             // 792
                    user = self._getUser({                                                                             // 795
                      request: request,                                                                                // 795
                      response: response                                                                               // 795
                    });                                                                                                // 795
                  }                                                                                                    // 1158
                                                                                                                       //
                  if (request.headers['x-start'] !== '1') {                                                            // 797
                    opts = {                                                                                           // 798
                      fileId: request.headers['x-fileid']                                                              // 798
                    };                                                                                                 // 798
                                                                                                                       //
                    if (request.headers['x-eof'] === '1') {                                                            // 799
                      opts.eof = true;                                                                                 // 800
                    } else {                                                                                           // 799
                      if (typeof Buffer.from === 'function') {                                                         // 802
                        opts.binData = Buffer.from(body, 'base64');                                                    // 803
                      } else {                                                                                         // 802
                        opts.binData = new Buffer(body, 'base64');                                                     // 805
                      }                                                                                                // 1170
                                                                                                                       //
                      opts.chunkId = parseInt(request.headers['x-chunkid']);                                           // 806
                    }                                                                                                  // 1172
                                                                                                                       //
                    _continueUpload = self._continueUpload(opts.fileId);                                               // 808
                                                                                                                       //
                    if (!_continueUpload) {                                                                            // 809
                      throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');     // 810
                    }                                                                                                  // 1176
                                                                                                                       //
                    ref2 = self._prepareUpload(_.extend(opts, _continueUpload), user.userId, 'HTTP'), result = ref2.result, opts = ref2.opts;
                                                                                                                       //
                    if (opts.eof) {                                                                                    // 814
                      self._handleUpload(result, opts, function () {                                                   // 815
                        var ref3;                                                                                      // 816
                        response.writeHead(200);                                                                       // 816
                                                                                                                       //
                        if (result != null ? (ref3 = result.file) != null ? ref3.meta : void 0 : void 0) {             // 817
                          result.file.meta = fixJSONStringify(result.file.meta);                                       // 817
                        }                                                                                              // 1184
                                                                                                                       //
                        response.end(JSON.stringify(result));                                                          // 818
                      });                                                                                              // 815
                                                                                                                       //
                      return;                                                                                          // 820
                    } else {                                                                                           // 814
                      self.emit('_handleUpload', result, opts, NOOP);                                                  // 822
                    }                                                                                                  // 1190
                                                                                                                       //
                    response.writeHead(204);                                                                           // 824
                    response.end();                                                                                    // 825
                  } else {                                                                                             // 797
                    opts = JSON.parse(body);                                                                           // 828
                    opts.___s = true;                                                                                  // 829
                                                                                                                       //
                    if (self.debug) {                                                                                  // 830
                      console.info("[FilesCollection] [File Start HTTP] " + opts.file.name + " - " + opts.fileId);     // 830
                    }                                                                                                  // 1198
                                                                                                                       //
                    if (opts != null ? (ref3 = opts.file) != null ? ref3.meta : void 0 : void 0) {                     // 831
                      opts.file.meta = fixJSONParse(opts.file.meta);                                                   // 831
                    }                                                                                                  // 1201
                                                                                                                       //
                    result = self._prepareUpload(_.clone(opts), user.userId, 'HTTP Start Method').result;              // 832
                                                                                                                       //
                    if (self.collection.findOne(result._id)) {                                                         // 833
                      throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');                 // 834
                    }                                                                                                  // 1205
                                                                                                                       //
                    opts._id = opts.fileId;                                                                            // 835
                    opts.createdAt = new Date();                                                                       // 836
                                                                                                                       //
                    self._preCollection.insert(_.omit(opts, '___s'));                                                  // 837
                                                                                                                       //
                    self._createStream(result._id, result.path, _.omit(opts, '___s'));                                 // 838
                                                                                                                       //
                    if (opts.returnMeta) {                                                                             // 840
                      response.writeHead(200);                                                                         // 841
                      response.end(JSON.stringify({                                                                    // 842
                        uploadRoute: self.downloadRoute + "/" + self.collectionName + "/__upload",                     // 843
                        file: result                                                                                   // 844
                      }));                                                                                             // 842
                    } else {                                                                                           // 840
                      response.writeHead(204);                                                                         // 847
                      response.end();                                                                                  // 848
                    }                                                                                                  // 797
                  }                                                                                                    // 791
                } catch (error1) {                                                                                     // 791
                  error = error1;                                                                                      // 849
                  handleError(error);                                                                                  // 850
                }                                                                                                      // 1224
              });                                                                                                      // 790
            });                                                                                                        // 790
          } else {                                                                                                     // 777
            next();                                                                                                    // 853
          }                                                                                                            // 1229
                                                                                                                       //
          return;                                                                                                      // 854
        }                                                                                                              // 1231
                                                                                                                       //
        if (!self["public"]) {                                                                                         // 856
          if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {                    // 857
            uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');                 // 858
                                                                                                                       //
            if (uri.indexOf('/') === 0) {                                                                              // 859
              uri = uri.substring(1);                                                                                  // 860
            }                                                                                                          // 1237
                                                                                                                       //
            uris = uri.split('/');                                                                                     // 862
                                                                                                                       //
            if (uris.length === 3) {                                                                                   // 863
              params = {                                                                                               // 864
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                _id: uris[0],                                                                                          // 866
                version: uris[1],                                                                                      // 867
                name: uris[2]                                                                                          // 868
              };                                                                                                       // 865
              http = {                                                                                                 // 869
                request: request,                                                                                      // 869
                response: response,                                                                                    // 869
                params: params                                                                                         // 869
              };                                                                                                       // 869
                                                                                                                       //
              if (self._checkAccess(http)) {                                                                           // 870
                self.download(http, uris[1], self.collection.findOne(uris[0]));                                        // 870
              }                                                                                                        // 863
            } else {                                                                                                   // 863
              next();                                                                                                  // 872
            }                                                                                                          // 857
          } else {                                                                                                     // 857
            next();                                                                                                    // 874
          }                                                                                                            // 856
        } else {                                                                                                       // 856
          if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                           // 876
            uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                        // 877
                                                                                                                       //
            if (uri.indexOf('/') === 0) {                                                                              // 878
              uri = uri.substring(1);                                                                                  // 879
            }                                                                                                          // 1265
                                                                                                                       //
            uris = uri.split('/');                                                                                     // 881
            _file = uris[uris.length - 1];                                                                             // 882
                                                                                                                       //
            if (_file) {                                                                                               // 883
              if (!!~_file.indexOf('-')) {                                                                             // 884
                version = _file.split('-')[0];                                                                         // 885
                _file = _file.split('-')[1].split('?')[0];                                                             // 886
              } else {                                                                                                 // 884
                version = 'original';                                                                                  // 888
                _file = _file.split('?')[0];                                                                           // 889
              }                                                                                                        // 1275
                                                                                                                       //
              params = {                                                                                               // 891
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                file: _file,                                                                                           // 893
                _id: _file.split('.')[0],                                                                              // 894
                version: version,                                                                                      // 895
                name: _file                                                                                            // 896
              };                                                                                                       // 892
              http = {                                                                                                 // 897
                request: request,                                                                                      // 897
                response: response,                                                                                    // 897
                params: params                                                                                         // 897
              };                                                                                                       // 897
              self.download(http, version, self.collection.findOne(params._id));                                       // 898
            } else {                                                                                                   // 883
              next();                                                                                                  // 900
            }                                                                                                          // 876
          } else {                                                                                                     // 876
            next();                                                                                                    // 902
          }                                                                                                            // 856
        }                                                                                                              // 1295
      });                                                                                                              // 775
      _methods = {};                                                                                                   // 905
                                                                                                                       //
      _methods[self._methodNames._Remove] = function (selector) {                                                      // 910
        var user, userFuncs;                                                                                           // 911
        check(selector, Match.OneOf(String, Object));                                                                  // 911
                                                                                                                       //
        if (self.debug) {                                                                                              // 912
          console.info("[FilesCollection] [Unlink Method] [.remove(" + selector + ")]");                               // 912
        }                                                                                                              // 1303
                                                                                                                       //
        if (self.allowClientCode) {                                                                                    // 914
          if (self.onBeforeRemove && _.isFunction(self.onBeforeRemove)) {                                              // 915
            user = false;                                                                                              // 916
            userFuncs = {                                                                                              // 917
              userId: this.userId,                                                                                     // 918
              user: function () {                                                                                      // 919
                if (Meteor.users) {                                                                                    // 919
                  return Meteor.users.findOne(this.userId);                                                            // 1311
                } else {                                                                                               // 919
                  return null;                                                                                         // 1313
                }                                                                                                      // 1314
              }                                                                                                        // 917
            };                                                                                                         // 917
                                                                                                                       //
            if (!self.onBeforeRemove.call(userFuncs, self.find(selector) || null)) {                                   // 922
              throw new Meteor.Error(403, '[FilesCollection] [remove] Not permitted!');                                // 923
            }                                                                                                          // 915
          }                                                                                                            // 1320
                                                                                                                       //
          self.remove(selector);                                                                                       // 925
          return true;                                                                                                 // 926
        } else {                                                                                                       // 914
          throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');              // 928
        }                                                                                                              // 1325
      };                                                                                                               // 910
                                                                                                                       //
      _methods[self._methodNames._Start] = function (opts, returnMeta) {                                               // 938
        var result;                                                                                                    // 939
        check(opts, {                                                                                                  // 939
          file: Object,                                                                                                // 940
          fileId: String,                                                                                              // 941
          FSName: Match.Optional(String),                                                                              // 942
          chunkSize: Number,                                                                                           // 943
          fileLength: Number                                                                                           // 944
        });                                                                                                            // 939
        check(returnMeta, Match.Optional(Boolean));                                                                    // 947
                                                                                                                       //
        if (self.debug) {                                                                                              // 949
          console.info("[FilesCollection] [File Start Method] " + opts.file.name + " - " + opts.fileId);               // 949
        }                                                                                                              // 1339
                                                                                                                       //
        opts.___s = true;                                                                                              // 950
        result = self._prepareUpload(_.clone(opts), this.userId, 'DDP Start Method').result;                           // 951
                                                                                                                       //
        if (self.collection.findOne(result._id)) {                                                                     // 952
          throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');                             // 953
        }                                                                                                              // 1344
                                                                                                                       //
        opts._id = opts.fileId;                                                                                        // 954
        opts.createdAt = new Date();                                                                                   // 955
                                                                                                                       //
        self._preCollection.insert(_.omit(opts, '___s'));                                                              // 956
                                                                                                                       //
        self._createStream(result._id, result.path, _.omit(opts, '___s'));                                             // 957
                                                                                                                       //
        if (returnMeta) {                                                                                              // 959
          return {                                                                                                     // 960
            uploadRoute: self.downloadRoute + "/" + self.collectionName + "/__upload",                                 // 961
            file: result                                                                                               // 962
          };                                                                                                           // 960
        } else {                                                                                                       // 959
          return true;                                                                                                 // 965
        }                                                                                                              // 1356
      };                                                                                                               // 938
                                                                                                                       //
      _methods[self._methodNames._Write] = function (opts) {                                                           // 971
        var _continueUpload, e, ref, result;                                                                           // 972
                                                                                                                       //
        check(opts, {                                                                                                  // 972
          eof: Match.Optional(Boolean),                                                                                // 973
          fileId: String,                                                                                              // 974
          binData: Match.Optional(String),                                                                             // 975
          chunkId: Match.Optional(Number)                                                                              // 976
        });                                                                                                            // 972
                                                                                                                       //
        if (opts.binData) {                                                                                            // 979
          if (typeof Buffer.from === 'function') {                                                                     // 980
            opts.binData = Buffer.from(opts.binData, 'base64');                                                        // 981
          } else {                                                                                                     // 980
            opts.binData = new Buffer(opts.binData, 'base64');                                                         // 983
          }                                                                                                            // 979
        }                                                                                                              // 1372
                                                                                                                       //
        _continueUpload = self._continueUpload(opts.fileId);                                                           // 985
                                                                                                                       //
        if (!_continueUpload) {                                                                                        // 986
          throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');                 // 987
        }                                                                                                              // 1376
                                                                                                                       //
        this.unblock();                                                                                                // 989
        ref = self._prepareUpload(_.extend(opts, _continueUpload), this.userId, 'DDP'), result = ref.result, opts = ref.opts;
                                                                                                                       //
        if (opts.eof) {                                                                                                // 992
          try {                                                                                                        // 993
            return Meteor.wrapAsync(self._handleUpload.bind(self, result, opts))();                                    // 994
          } catch (error1) {                                                                                           // 993
            e = error1;                                                                                                // 995
                                                                                                                       //
            if (self.debug) {                                                                                          // 996
              console.warn("[FilesCollection] [Write Method] [DDP] Exception:", e);                                    // 996
            }                                                                                                          // 1386
                                                                                                                       //
            throw e;                                                                                                   // 997
          }                                                                                                            // 992
        } else {                                                                                                       // 992
          self.emit('_handleUpload', result, opts, NOOP);                                                              // 999
        }                                                                                                              // 1391
                                                                                                                       //
        return true;                                                                                                   // 1000
      };                                                                                                               // 971
                                                                                                                       //
      _methods[self._methodNames._Abort] = function (_id) {                                                            // 1007
        var _continueUpload, ref, ref1, ref2;                                                                          // 1008
                                                                                                                       //
        check(_id, String);                                                                                            // 1008
        _continueUpload = self._continueUpload(_id);                                                                   // 1010
                                                                                                                       //
        if (self.debug) {                                                                                              // 1011
          console.info("[FilesCollection] [Abort Method]: " + _id + " - " + (_continueUpload != null ? (ref = _continueUpload.file) != null ? ref.path : void 0 : void 0));
        }                                                                                                              // 1400
                                                                                                                       //
        if ((ref1 = self._currentUploads) != null ? ref1[_id] : void 0) {                                              // 1013
          self._currentUploads[_id].stop();                                                                            // 1014
                                                                                                                       //
          self._currentUploads[_id].abort();                                                                           // 1015
        }                                                                                                              // 1404
                                                                                                                       //
        if (_continueUpload) {                                                                                         // 1017
          self._preCollection.remove({                                                                                 // 1018
            _id: _id                                                                                                   // 1018
          });                                                                                                          // 1018
                                                                                                                       //
          self.remove({                                                                                                // 1019
            _id: _id                                                                                                   // 1019
          });                                                                                                          // 1019
                                                                                                                       //
          if (_continueUpload != null ? (ref2 = _continueUpload.file) != null ? ref2.path : void 0 : void 0) {         // 1020
            self.unlink({                                                                                              // 1020
              _id: _id,                                                                                                // 1020
              path: _continueUpload.file.path                                                                          // 1020
            });                                                                                                        // 1020
          }                                                                                                            // 1017
        }                                                                                                              // 1418
                                                                                                                       //
        return true;                                                                                                   // 1021
      };                                                                                                               // 1007
                                                                                                                       //
      Meteor.methods(_methods);                                                                                        // 1023
    }                                                                                                                  // 1422
  } /*                                                                                                                 // 497
    @locus Server                                                                                                      //
    @memberOf FilesCollection                                                                                          //
    @name _prepareUpload                                                                                               //
    @summary Internal method. Used to optimize received data and check upload permission                               //
    @returns {Object}                                                                                                  //
     */                                                                                                                //
                                                                                                                       //
  FilesCollection.prototype._prepareUpload = Meteor.isServer ? function (opts, userId, transport) {                    // 1434
    var base, ctx, extension, extensionWithDot, fileName, isUploadAllowed, ref, result;                                // 1033
                                                                                                                       //
    if (opts.eof == null) {                                                                                            // 1436
      opts.eof = false;                                                                                                // 1033
    }                                                                                                                  // 1438
                                                                                                                       //
    if (opts.binData == null) {                                                                                        // 1439
      opts.binData = 'EOF';                                                                                            // 1034
    }                                                                                                                  // 1441
                                                                                                                       //
    if (opts.chunkId == null) {                                                                                        // 1442
      opts.chunkId = -1;                                                                                               // 1035
    }                                                                                                                  // 1444
                                                                                                                       //
    if (opts.FSName == null) {                                                                                         // 1445
      opts.FSName = opts.fileId;                                                                                       // 1036
    }                                                                                                                  // 1447
                                                                                                                       //
    if ((base = opts.file).meta == null) {                                                                             // 1448
      base.meta = {};                                                                                                  // 1449
    }                                                                                                                  // 1450
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1039
      console.info("[FilesCollection] [Upload] [" + transport + "] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
    }                                                                                                                  // 1453
                                                                                                                       //
    fileName = this._getFileName(opts.file);                                                                           // 1041
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 1042
    result = opts.file;                                                                                                // 1044
    result.name = fileName;                                                                                            // 1045
    result.meta = opts.file.meta;                                                                                      // 1046
    result.extension = extension;                                                                                      // 1047
    result.ext = extension;                                                                                            // 1048
    result._id = opts.fileId;                                                                                          // 1049
    result.userId = userId || null;                                                                                    // 1050
    result.path = "" + this.storagePath(result) + nodePath.sep + opts.FSName + extensionWithDot;                       // 1051
    result = _.extend(result, this._dataToSchema(result));                                                             // 1052
                                                                                                                       //
    if (this.onBeforeUpload && _.isFunction(this.onBeforeUpload)) {                                                    // 1054
      ctx = _.extend({                                                                                                 // 1055
        file: opts.file                                                                                                // 1056
      }, {                                                                                                             // 1055
        chunkId: opts.chunkId,                                                                                         // 1058
        userId: result.userId,                                                                                         // 1059
        user: function () {                                                                                            // 1060
          if (Meteor.users) {                                                                                          // 1060
            return Meteor.users.findOne(result.userId);                                                                // 1473
          } else {                                                                                                     // 1060
            return null;                                                                                               // 1475
          }                                                                                                            // 1476
        },                                                                                                             // 1057
        eof: opts.eof                                                                                                  // 1061
      });                                                                                                              // 1057
      isUploadAllowed = this.onBeforeUpload.call(ctx, result);                                                         // 1063
                                                                                                                       //
      if (isUploadAllowed !== true) {                                                                                  // 1065
        throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
      } else {                                                                                                         // 1065
        if (opts.___s === true && this.onInitiateUpload && _.isFunction(this.onInitiateUpload)) {                      // 1068
          this.onInitiateUpload.call(ctx, result);                                                                     // 1069
        }                                                                                                              // 1065
      }                                                                                                                // 1054
    }                                                                                                                  // 1488
                                                                                                                       //
    return {                                                                                                           // 1071
      result: result,                                                                                                  // 1071
      opts: opts                                                                                                       // 1071
    };                                                                                                                 // 1071
  } : void 0; /*                                                                                                       // 1032
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _finishUpload                                                                                      //
              @summary Internal method. Finish upload, close Writable stream, add record to MongoDB and flush used memory
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype._finishUpload = Meteor.isServer ? function (result, opts, cb) {                            // 1504
    var self;                                                                                                          // 1082
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1082
      console.info("[FilesCollection] [Upload] [finish(ing)Upload] -> " + result.path);                                // 1082
    }                                                                                                                  // 1508
                                                                                                                       //
    fs.chmod(result.path, this.permissions, NOOP);                                                                     // 1083
    self = this;                                                                                                       // 1084
    result.type = this._getMimeType(opts.file);                                                                        // 1085
    result["public"] = this["public"];                                                                                 // 1086
    this.collection.insert(_.clone(result), function (error, _id) {                                                    // 1088
      if (error) {                                                                                                     // 1089
        cb && cb(error);                                                                                               // 1090
                                                                                                                       //
        if (self.debug) {                                                                                              // 1091
          console.error('[FilesCollection] [Upload] [_finishUpload] Error:', error);                                   // 1091
        }                                                                                                              // 1089
      } else {                                                                                                         // 1089
        self._preCollection.update({                                                                                   // 1093
          _id: opts.fileId                                                                                             // 1093
        }, {                                                                                                           // 1093
          $set: {                                                                                                      // 1093
            isFinished: true                                                                                           // 1093
          }                                                                                                            // 1093
        });                                                                                                            // 1093
                                                                                                                       //
        result._id = _id;                                                                                              // 1094
                                                                                                                       //
        if (self.debug) {                                                                                              // 1095
          console.info("[FilesCollection] [Upload] [finish(ed)Upload] -> " + result.path);                             // 1095
        }                                                                                                              // 1530
                                                                                                                       //
        self.onAfterUpload && self.onAfterUpload.call(self, result);                                                   // 1096
        self.emit('afterUpload', result);                                                                              // 1097
        cb && cb(null, result);                                                                                        // 1098
      }                                                                                                                // 1534
    });                                                                                                                // 1088
  } : void 0; /*                                                                                                       // 1081
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _handleUpload                                                                                      //
              @summary Internal method to handle upload process, pipe incoming data to Writable stream                 //
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype._handleUpload = Meteor.isServer ? function (result, opts, cb) {                            // 1547
    var e, self;                                                                                                       // 1111
                                                                                                                       //
    try {                                                                                                              // 1111
      if (opts.eof) {                                                                                                  // 1112
        self = this;                                                                                                   // 1113
                                                                                                                       //
        this._currentUploads[result._id].end(function () {                                                             // 1114
          return bound(function () {                                                                                   // 1553
            self.emit('_finishUpload', result, opts, cb);                                                              // 1115
          });                                                                                                          // 1114
        });                                                                                                            // 1114
      } else {                                                                                                         // 1112
        this._currentUploads[result._id].write(opts.chunkId, opts.binData, cb);                                        // 1118
      }                                                                                                                // 1111
    } catch (error1) {                                                                                                 // 1111
      e = error1;                                                                                                      // 1119
                                                                                                                       //
      if (this.debug) {                                                                                                // 1120
        console.warn("[_handleUpload] [EXCEPTION:]", e);                                                               // 1120
      }                                                                                                                // 1564
                                                                                                                       //
      cb && cb(e);                                                                                                     // 1121
    }                                                                                                                  // 1566
  } : void 0; /*                                                                                                       // 1110
              @locus Anywhere                                                                                          //
              @memberOf FilesCollection                                                                                //
              @name _getMimeType                                                                                       //
              @param {Object} fileData - File Object                                                                   //
              @summary Returns file's mime-type                                                                        //
              @returns {String}                                                                                        //
               */                                                                                                      //
                                                                                                                       //
  FilesCollection.prototype._getMimeType = function (fileData) {                                                       // 1579
    var br, buf, error, ext, fd, mime, ref;                                                                            // 1134
    check(fileData, Object);                                                                                           // 1134
                                                                                                                       //
    if (fileData != null ? fileData.type : void 0) {                                                                   // 1135
      mime = fileData.type;                                                                                            // 1135
    }                                                                                                                  // 1584
                                                                                                                       //
    if (Meteor.isServer && fileData.path && (!mime || !_.isString(mime))) {                                            // 1136
      try {                                                                                                            // 1137
        buf = new Buffer(262);                                                                                         // 1138
        fd = fs.openSync(fileData.path, 'r');                                                                          // 1139
        br = fs.readSync(fd, buf, 0, 262, 0);                                                                          // 1140
        fs.close(fd, NOOP);                                                                                            // 1141
                                                                                                                       //
        if (br < 262) {                                                                                                // 1142
          buf = buf.slice(0, br);                                                                                      // 1142
        }                                                                                                              // 1593
                                                                                                                       //
        ref = fileType(buf), mime = ref.mime, ext = ref.ext;                                                           // 1143
      } catch (error1) {                                                                                               // 1137
        error = error1;                                                                                                // 1144
      }                                                                                                                // 1136
    }                                                                                                                  // 1598
                                                                                                                       //
    if (!mime || !_.isString(mime)) {                                                                                  // 1145
      mime = 'application/octet-stream';                                                                               // 1146
    }                                                                                                                  // 1601
                                                                                                                       //
    return mime;                                                                                                       // 1147
  }; /*                                                                                                                // 1133
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getFileName                                                                                                //
     @param {Object} fileData - File Object                                                                            //
     @summary Returns file's name                                                                                      //
     @returns {String}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getFileName = function (fileData) {                                                       // 1615
    var fileName;                                                                                                      // 1158
    fileName = fileData.name || fileData.fileName;                                                                     // 1158
                                                                                                                       //
    if (_.isString(fileName) && fileName.length > 0) {                                                                 // 1159
      return (fileData.name || fileData.fileName).replace(/\.\./g, '').replace(/\//g, '');                             // 1160
    } else {                                                                                                           // 1159
      return '';                                                                                                       // 1162
    }                                                                                                                  // 1622
  }; /*                                                                                                                // 1157
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getUser                                                                                                    //
     @summary Returns object with `userId` and `user()` method which return user's object                              //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getUser = function (http) {                                                               // 1634
    var cookie, mtok, ref, ref1, result, userId;                                                                       // 1172
    result = {                                                                                                         // 1172
      user: function () {                                                                                              // 1173
        return null;                                                                                                   // 1173
      },                                                                                                               // 1173
      userId: null                                                                                                     // 1174
    };                                                                                                                 // 1173
                                                                                                                       //
    if (Meteor.isServer) {                                                                                             // 1176
      if (http) {                                                                                                      // 1177
        mtok = null;                                                                                                   // 1178
                                                                                                                       //
        if (http.request.headers['x-mtok']) {                                                                          // 1179
          mtok = http.request.headers['x-mtok'];                                                                       // 1180
        } else {                                                                                                       // 1179
          cookie = http.request.Cookies;                                                                               // 1182
                                                                                                                       //
          if (cookie.has('x_mtok')) {                                                                                  // 1183
            mtok = cookie.get('x_mtok');                                                                               // 1184
          }                                                                                                            // 1179
        }                                                                                                              // 1652
                                                                                                                       //
        if (mtok) {                                                                                                    // 1186
          userId = (ref = Meteor.server.sessions) != null ? (ref1 = ref[mtok]) != null ? ref1.userId : void 0 : void 0;
                                                                                                                       //
          if (userId) {                                                                                                // 1188
            result.user = function () {                                                                                // 1189
              return Meteor.users.findOne(userId);                                                                     // 1657
            };                                                                                                         // 1189
                                                                                                                       //
            result.userId = userId;                                                                                    // 1190
          }                                                                                                            // 1186
        }                                                                                                              // 1177
      }                                                                                                                // 1176
    } else {                                                                                                           // 1176
      if (typeof Meteor.userId === "function" ? Meteor.userId() : void 0) {                                            // 1192
        result.user = function () {                                                                                    // 1193
          return Meteor.user();                                                                                        // 1193
        };                                                                                                             // 1193
                                                                                                                       //
        result.userId = Meteor.userId();                                                                               // 1194
      }                                                                                                                // 1176
    }                                                                                                                  // 1670
                                                                                                                       //
    return result;                                                                                                     // 1196
  }; /*                                                                                                                // 1171
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getExt                                                                                                     //
     @param {String} FileName - File name                                                                              //
     @summary Get extension from FileName                                                                              //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getExt = function (fileName) {                                                            // 1684
    var extension;                                                                                                     // 1207
                                                                                                                       //
    if (!!~fileName.indexOf('.')) {                                                                                    // 1207
      extension = (fileName.split('.').pop().split('?')[0] || '').toLowerCase();                                       // 1208
      return {                                                                                                         // 1209
        ext: extension,                                                                                                // 1209
        extension: extension,                                                                                          // 1209
        extensionWithDot: '.' + extension                                                                              // 1209
      };                                                                                                               // 1209
    } else {                                                                                                           // 1207
      return {                                                                                                         // 1211
        ext: '',                                                                                                       // 1211
        extension: '',                                                                                                 // 1211
        extensionWithDot: ''                                                                                           // 1211
      };                                                                                                               // 1211
    }                                                                                                                  // 1699
  }; /*                                                                                                                // 1206
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _dataToSchema                                                                                               //
     @param {Object} data - File data                                                                                  //
     @summary Internal method. Build object in accordance with default schema from File data                           //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._dataToSchema = function (data) {                                                          // 1712
    var ds;                                                                                                            // 1222
    ds = {                                                                                                             // 1222
      name: data.name,                                                                                                 // 1223
      extension: data.extension,                                                                                       // 1224
      path: data.path,                                                                                                 // 1225
      meta: data.meta,                                                                                                 // 1226
      type: data.type,                                                                                                 // 1227
      size: data.size,                                                                                                 // 1228
      userId: data.userId || null,                                                                                     // 1229
      versions: {                                                                                                      // 1230
        original: {                                                                                                    // 1231
          path: data.path,                                                                                             // 1232
          size: data.size,                                                                                             // 1233
          type: data.type,                                                                                             // 1234
          extension: data.extension                                                                                    // 1235
        }                                                                                                              // 1232
      },                                                                                                               // 1231
      isVideo: /^video\//i.test(data.type),                                                                            // 1236
      isAudio: /^audio\//i.test(data.type),                                                                            // 1237
      isImage: /^image\//i.test(data.type),                                                                            // 1238
      isText: /^text\//i.test(data.type),                                                                              // 1239
      isJSON: /application\/json/i.test(data.type),                                                                    // 1240
      isPDF: /application\/pdf|application\/x-pdf/i.test(data.type),                                                   // 1241
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                       // 1242
      _collectionName: data._collectionName || this.collectionName                                                     // 1243
    };                                                                                                                 // 1223
    ds._storagePath = data._storagePath || this.storagePath(_.extend(data, ds));                                       // 1244
    return ds;                                                                                                         // 1245
  }; /*                                                                                                                // 1221
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name write                                                                                                       //
     @param {Buffer} buffer - Binary File's Buffer                                                                     //
     @param {Object} opts - Object with file-data                                                                      //
     @param {String} opts.name - File name, alias: `fileName`                                                          //
     @param {String} opts.type - File mime-type                                                                        //
     @param {Object} opts.meta - File additional meta-data                                                             //
     @param {String} opts.userId - UserId, default *null*                                                              //
     @param {Function} callback - function(error, fileObj){...}                                                        //
     @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook                                                  //
     @summary Write buffer to FS and add to FilesCollection Collection                                                 //
     @returns {FilesCollection} Instance                                                                               //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.write = Meteor.isServer ? function (buffer, opts, callback, proceedAfterUpload) {          // 1760
    var FSName, extension, extensionWithDot, fileId, fileName, ref, result, self, stream;                              // 1263
                                                                                                                       //
    if (opts == null) {                                                                                                // 1762
      opts = {};                                                                                                       // 1262
    }                                                                                                                  // 1764
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1263
      console.info('[FilesCollection] [write()]');                                                                     // 1263
    }                                                                                                                  // 1767
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 1265
      proceedAfterUpload = callback;                                                                                   // 1266
      callback = opts;                                                                                                 // 1267
      opts = {};                                                                                                       // 1268
    } else if (_.isBoolean(callback)) {                                                                                // 1265
      proceedAfterUpload = callback;                                                                                   // 1270
    } else if (_.isBoolean(opts)) {                                                                                    // 1269
      proceedAfterUpload = opts;                                                                                       // 1272
    }                                                                                                                  // 1776
                                                                                                                       //
    check(opts, Match.Optional(Object));                                                                               // 1274
    check(callback, Match.Optional(Function));                                                                         // 1275
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 1276
    fileId = Random.id();                                                                                              // 1278
    FSName = this.namingFunction ? this.namingFunction() : fileId;                                                     // 1279
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : FSName;                                       // 1280
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 1282
    self = this;                                                                                                       // 1284
                                                                                                                       //
    if (opts == null) {                                                                                                // 1785
      opts = {};                                                                                                       // 1285
    }                                                                                                                  // 1787
                                                                                                                       //
    opts.path = "" + this.storagePath(opts) + nodePath.sep + FSName + extensionWithDot;                                // 1286
    opts.type = this._getMimeType(opts);                                                                               // 1287
                                                                                                                       //
    if (opts.meta == null) {                                                                                           // 1790
      opts.meta = {};                                                                                                  // 1288
    }                                                                                                                  // 1792
                                                                                                                       //
    if (opts.size == null) {                                                                                           // 1793
      opts.size = buffer.length;                                                                                       // 1289
    }                                                                                                                  // 1795
                                                                                                                       //
    result = this._dataToSchema({                                                                                      // 1291
      name: fileName,                                                                                                  // 1292
      path: opts.path,                                                                                                 // 1293
      meta: opts.meta,                                                                                                 // 1294
      type: opts.type,                                                                                                 // 1295
      size: opts.size,                                                                                                 // 1296
      userId: opts.userId,                                                                                             // 1297
      extension: extension                                                                                             // 1298
    });                                                                                                                // 1292
    result._id = fileId;                                                                                               // 1300
    stream = fs.createWriteStream(opts.path, {                                                                         // 1302
      flags: 'w',                                                                                                      // 1302
      mode: this.permissions                                                                                           // 1302
    });                                                                                                                // 1302
    stream.end(buffer, function (error) {                                                                              // 1303
      return bound(function () {                                                                                       // 1811
        if (error) {                                                                                                   // 1304
          callback && callback(error);                                                                                 // 1305
        } else {                                                                                                       // 1304
          self.collection.insert(result, function (error, _id) {                                                       // 1307
            var fileRef;                                                                                               // 1308
                                                                                                                       //
            if (error) {                                                                                               // 1308
              callback && callback(error);                                                                             // 1309
                                                                                                                       //
              if (self.debug) {                                                                                        // 1310
                console.warn("[FilesCollection] [write] [insert] Error: " + fileName + " -> " + self.collectionName, error);
              }                                                                                                        // 1308
            } else {                                                                                                   // 1308
              fileRef = self.collection.findOne(_id);                                                                  // 1312
              callback && callback(null, fileRef);                                                                     // 1313
                                                                                                                       //
              if (proceedAfterUpload === true) {                                                                       // 1314
                self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                          // 1315
                self.emit('afterUpload', fileRef);                                                                     // 1316
              }                                                                                                        // 1828
                                                                                                                       //
              if (self.debug) {                                                                                        // 1317
                console.info("[FilesCollection] [write]: " + fileName + " -> " + self.collectionName);                 // 1317
              }                                                                                                        // 1308
            }                                                                                                          // 1832
          });                                                                                                          // 1307
        }                                                                                                              // 1834
      });                                                                                                              // 1303
    });                                                                                                                // 1303
    return this;                                                                                                       // 1320
  } : void 0; /*                                                                                                       // 1262
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name load                                                                                               //
              @param {String} url - URL to file                                                                        //
              @param {Object} opts - Object with file-data                                                             //
              @param {String} opts.name - File name, alias: `fileName`                                                 //
              @param {String} opts.type - File mime-type                                                               //
              @param {Object} opts.meta - File additional meta-data                                                    //
              @param {String} opts.userId - UserId, default *null*                                                     //
              @param {Function} callback - function(error, fileObj){...}                                               //
              @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook                                         //
              @summary Download file, write stream to FS and add to FilesCollection Collection                         //
              @returns {FilesCollection} Instance                                                                      //
               */                                                                                                      //
  FilesCollection.prototype.load = Meteor.isServer ? function (url, opts, callback, proceedAfterUpload) {              // 1857
    var FSName, extension, extensionWithDot, fileId, fileName, pathParts, ref, self, storeResult;                      // 1340
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1340
      console.info("[FilesCollection] [load(" + url + ", " + JSON.stringify(opts) + ", callback)]");                   // 1340
    }                                                                                                                  // 1861
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 1342
      proceedAfterUpload = callback;                                                                                   // 1343
      callback = opts;                                                                                                 // 1344
      opts = {};                                                                                                       // 1345
    } else if (_.isBoolean(callback)) {                                                                                // 1342
      proceedAfterUpload = callback;                                                                                   // 1347
    } else if (_.isBoolean(opts)) {                                                                                    // 1346
      proceedAfterUpload = opts;                                                                                       // 1349
    }                                                                                                                  // 1870
                                                                                                                       //
    check(url, String);                                                                                                // 1351
    check(opts, Match.Optional(Object));                                                                               // 1352
    check(callback, Match.Optional(Function));                                                                         // 1353
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 1354
    self = this;                                                                                                       // 1356
                                                                                                                       //
    if (opts == null) {                                                                                                // 1876
      opts = {};                                                                                                       // 1357
    }                                                                                                                  // 1878
                                                                                                                       //
    fileId = Random.id();                                                                                              // 1358
    FSName = this.namingFunction ? this.namingFunction() : fileId;                                                     // 1359
    pathParts = url.split('/');                                                                                        // 1360
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : pathParts[pathParts.length - 1] || FSName;    // 1361
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 1363
                                                                                                                       //
    if (opts.meta == null) {                                                                                           // 1884
      opts.meta = {};                                                                                                  // 1364
    }                                                                                                                  // 1886
                                                                                                                       //
    opts.path = "" + this.storagePath(opts) + nodePath.sep + FSName + extensionWithDot;                                // 1365
                                                                                                                       //
    storeResult = function (result, callback) {                                                                        // 1367
      result._id = fileId;                                                                                             // 1368
      self.collection.insert(result, function (error, _id) {                                                           // 1370
        var fileRef;                                                                                                   // 1371
                                                                                                                       //
        if (error) {                                                                                                   // 1371
          callback && callback(error);                                                                                 // 1372
                                                                                                                       //
          if (self.debug) {                                                                                            // 1373
            console.error("[FilesCollection] [load] [insert] Error: " + fileName + " -> " + self.collectionName, error);
          }                                                                                                            // 1371
        } else {                                                                                                       // 1371
          fileRef = self.collection.findOne(_id);                                                                      // 1375
          callback && callback(null, fileRef);                                                                         // 1376
                                                                                                                       //
          if (proceedAfterUpload === true) {                                                                           // 1377
            self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                              // 1378
            self.emit('afterUpload', fileRef);                                                                         // 1379
          }                                                                                                            // 1903
                                                                                                                       //
          if (self.debug) {                                                                                            // 1380
            console.info("[FilesCollection] [load] [insert] " + fileName + " -> " + self.collectionName);              // 1380
          }                                                                                                            // 1371
        }                                                                                                              // 1907
      });                                                                                                              // 1370
    };                                                                                                                 // 1367
                                                                                                                       //
    request.get(url).on('error', function (error) {                                                                    // 1384
      return bound(function () {                                                                                       // 1911
        callback && callback(error);                                                                                   // 1385
                                                                                                                       //
        if (self.debug) {                                                                                              // 1386
          return console.error("[FilesCollection] [load] [request.get(" + url + ")] Error:", error);                   // 1914
        }                                                                                                              // 1915
      });                                                                                                              // 1384
    }).on('response', function (response) {                                                                            // 1384
      return bound(function () {                                                                                       // 1918
        response.on('end', function () {                                                                               // 1388
          return bound(function () {                                                                                   // 1920
            var result;                                                                                                // 1389
                                                                                                                       //
            if (self.debug) {                                                                                          // 1389
              console.info("[FilesCollection] [load] Received: " + url);                                               // 1389
            }                                                                                                          // 1924
                                                                                                                       //
            result = self._dataToSchema({                                                                              // 1390
              name: fileName,                                                                                          // 1391
              path: opts.path,                                                                                         // 1392
              meta: opts.meta,                                                                                         // 1393
              type: opts.type || response.headers['content-type'] || self._getMimeType({                               // 1394
                path: opts.path                                                                                        // 1394
              }),                                                                                                      // 1394
              size: opts.size || parseInt(response.headers['content-length'] || 0),                                    // 1395
              userId: opts.userId,                                                                                     // 1396
              extension: extension                                                                                     // 1397
            });                                                                                                        // 1391
                                                                                                                       //
            if (!result.size) {                                                                                        // 1399
              fs.stat(opts.path, function (error, stats) {                                                             // 1400
                return bound(function () {                                                                             // 1938
                  if (error) {                                                                                         // 1401
                    callback && callback(error);                                                                       // 1402
                  } else {                                                                                             // 1401
                    result.versions.original.size = result.size = stats.size;                                          // 1404
                    storeResult(result, callback);                                                                     // 1405
                  }                                                                                                    // 1944
                });                                                                                                    // 1400
              });                                                                                                      // 1400
            } else {                                                                                                   // 1399
              storeResult(result, callback);                                                                           // 1408
            }                                                                                                          // 1949
          });                                                                                                          // 1388
        });                                                                                                            // 1388
      });                                                                                                              // 1387
    }).pipe(fs.createWriteStream(opts.path, {                                                                          // 1384
      flags: 'w',                                                                                                      // 1412
      mode: this.permissions                                                                                           // 1412
    }));                                                                                                               // 1412
    return this;                                                                                                       // 1414
  } : void 0; /*                                                                                                       // 1339
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
  FilesCollection.prototype.addFile = Meteor.isServer ? function (path, opts, callback, proceedAfterUpload) {          // 1977
    var self;                                                                                                          // 1434
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1434
      console.info("[FilesCollection] [addFile(" + path + ")]");                                                       // 1434
    }                                                                                                                  // 1981
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 1436
      proceedAfterUpload = callback;                                                                                   // 1437
      callback = opts;                                                                                                 // 1438
      opts = {};                                                                                                       // 1439
    } else if (_.isBoolean(callback)) {                                                                                // 1436
      proceedAfterUpload = callback;                                                                                   // 1441
    } else if (_.isBoolean(opts)) {                                                                                    // 1440
      proceedAfterUpload = opts;                                                                                       // 1443
    }                                                                                                                  // 1990
                                                                                                                       //
    if (this["public"]) {                                                                                              // 1445
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
    }                                                                                                                  // 1993
                                                                                                                       //
    check(path, String);                                                                                               // 1446
    check(opts, Match.Optional(Object));                                                                               // 1447
    check(callback, Match.Optional(Function));                                                                         // 1448
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 1449
    self = this;                                                                                                       // 1451
    fs.stat(path, function (error, stats) {                                                                            // 1452
      return bound(function () {                                                                                       // 2000
        var extension, extensionWithDot, pathParts, ref, result;                                                       // 1453
                                                                                                                       //
        if (error) {                                                                                                   // 1453
          callback && callback(error);                                                                                 // 1454
        } else if (stats.isFile()) {                                                                                   // 1453
          if (opts == null) {                                                                                          // 2005
            opts = {};                                                                                                 // 1456
          }                                                                                                            // 2007
                                                                                                                       //
          opts.path = path;                                                                                            // 1457
                                                                                                                       //
          if (!opts.fileName) {                                                                                        // 1459
            pathParts = path.split(nodePath.sep);                                                                      // 1460
            opts.fileName = pathParts[pathParts.length - 1];                                                           // 1461
          }                                                                                                            // 2012
                                                                                                                       //
          ref = self._getExt(opts.fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;       // 1463
                                                                                                                       //
          if (opts.type == null) {                                                                                     // 2014
            opts.type = self._getMimeType(opts);                                                                       // 1465
          }                                                                                                            // 2016
                                                                                                                       //
          if (opts.meta == null) {                                                                                     // 2017
            opts.meta = {};                                                                                            // 1466
          }                                                                                                            // 2019
                                                                                                                       //
          if (opts.size == null) {                                                                                     // 2020
            opts.size = stats.size;                                                                                    // 1467
          }                                                                                                            // 2022
                                                                                                                       //
          result = self._dataToSchema({                                                                                // 1469
            name: opts.fileName,                                                                                       // 1470
            path: path,                                                                                                // 1471
            meta: opts.meta,                                                                                           // 1472
            type: opts.type,                                                                                           // 1473
            size: opts.size,                                                                                           // 1474
            userId: opts.userId,                                                                                       // 1475
            extension: extension,                                                                                      // 1476
            _storagePath: path.replace("" + nodePath.sep + opts.fileName, '')                                          // 1477
          });                                                                                                          // 1470
          self.collection.insert(result, function (error, _id) {                                                       // 1479
            var fileRef;                                                                                               // 1480
                                                                                                                       //
            if (error) {                                                                                               // 1480
              callback && callback(error);                                                                             // 1481
                                                                                                                       //
              if (self.debug) {                                                                                        // 1482
                console.warn("[FilesCollection] [addFile] [insert] Error: " + fileName + " -> " + self.collectionName, error);
              }                                                                                                        // 1480
            } else {                                                                                                   // 1480
              fileRef = self.collection.findOne(_id);                                                                  // 1484
              callback && callback(null, fileRef);                                                                     // 1485
                                                                                                                       //
              if (proceedAfterUpload === true) {                                                                       // 1486
                self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                          // 1487
                self.emit('afterUpload', fileRef);                                                                     // 1488
              }                                                                                                        // 2046
                                                                                                                       //
              if (self.debug) {                                                                                        // 1489
                console.info("[FilesCollection] [addFile]: " + fileName + " -> " + self.collectionName);               // 1489
              }                                                                                                        // 1480
            }                                                                                                          // 2050
          });                                                                                                          // 1479
        } else {                                                                                                       // 1455
          callback && callback(new Meteor.Error(400, "[FilesCollection] [addFile(" + path + ")]: File does not exist"));
        }                                                                                                              // 2054
      });                                                                                                              // 1452
    });                                                                                                                // 1452
    return this;                                                                                                       // 1495
  } : void 0; /*                                                                                                       // 1433
              @locus Anywhere                                                                                          //
              @memberOf FilesCollection                                                                                //
              @name findOne                                                                                            //
              @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
              @param {Object} options - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
              @summary Find and return Cursor for matching document Object                                             //
              @returns {FileCursor} Instance                                                                           //
               */                                                                                                      //
                                                                                                                       //
  FilesCollection.prototype.findOne = function (selector, options) {                                                   // 2071
    var doc;                                                                                                           // 1509
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1509
      console.info("[FilesCollection] [findOne(" + JSON.stringify(selector) + ", " + JSON.stringify(options) + ")]");  // 1509
    }                                                                                                                  // 2075
                                                                                                                       //
    check(selector, Match.Optional(Match.OneOf(Object, String, Boolean, Number, null)));                               // 1510
    check(options, Match.Optional(Object));                                                                            // 1511
                                                                                                                       //
    if (!arguments.length) {                                                                                           // 1513
      selector = {};                                                                                                   // 1513
    }                                                                                                                  // 2080
                                                                                                                       //
    doc = this.collection.findOne(selector, options);                                                                  // 1514
                                                                                                                       //
    if (doc) {                                                                                                         // 1515
      return new FileCursor(doc, this);                                                                                // 2083
    } else {                                                                                                           // 1515
      return doc;                                                                                                      // 2085
    }                                                                                                                  // 2086
  }; /*                                                                                                                // 1508
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name find                                                                                                        //
     @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)    //
     @param {Object}        options  - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
     @summary Find and return Cursor for matching documents                                                            //
     @returns {FilesCursor} Instance                                                                                   //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.find = function (selector, options) {                                                      // 2100
    if (this.debug) {                                                                                                  // 1527
      console.info("[FilesCollection] [find(" + JSON.stringify(selector) + ", " + JSON.stringify(options) + ")]");     // 1527
    }                                                                                                                  // 2103
                                                                                                                       //
    check(selector, Match.Optional(Match.OneOf(Object, String, Boolean, Number, null)));                               // 1528
    check(options, Match.Optional(Object));                                                                            // 1529
                                                                                                                       //
    if (!arguments.length) {                                                                                           // 1531
      selector = {};                                                                                                   // 1531
    }                                                                                                                  // 2108
                                                                                                                       //
    return new FilesCursor(selector, options, this);                                                                   // 1532
  }; /*                                                                                                                // 1526
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
  FilesCollection.prototype.insert = Meteor.isClient ? function (config, autoStart) {                                  // 2146
    if (autoStart == null) {                                                                                           // 2147
      autoStart = true;                                                                                                // 1566
    }                                                                                                                  // 2149
                                                                                                                       //
    return new this._UploadInstance(config, this)[autoStart ? 'start' : 'manual']();                                   // 1567
  } : void 0; /*                                                                                                       // 1566
              @locus Client                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _UploadInstance                                                                                    //
              @class UploadInstance                                                                                    //
              @summary Internal Class, used in upload                                                                  //
               */                                                                                                      //
  FilesCollection.prototype._UploadInstance = Meteor.isClient ? UploadInstance = function () {                         // 2162
    UploadInstance.prototype.__proto__ = EventEmitter.prototype;                                                       // 2163
                                                                                                                       //
    function UploadInstance(config1, collection) {                                                                     // 1579
      var _file, base, base1, base2, base3, base4, base5, self, wwError;                                               // 1580
                                                                                                                       //
      this.config = config1;                                                                                           // 1579
      this.collection = collection;                                                                                    // 1579
      EventEmitter.call(this);                                                                                         // 1580
                                                                                                                       //
      if (this.collection.debug) {                                                                                     // 1581
        console.info('[FilesCollection] [insert()]');                                                                  // 1581
      }                                                                                                                // 2172
                                                                                                                       //
      self = this;                                                                                                     // 1582
                                                                                                                       //
      if ((base = this.config).ddp == null) {                                                                          // 2174
        base.ddp = this.collection.ddp;                                                                                // 2175
      }                                                                                                                // 2176
                                                                                                                       //
      if ((base1 = this.config).meta == null) {                                                                        // 2177
        base1.meta = {};                                                                                               // 2178
      }                                                                                                                // 2179
                                                                                                                       //
      if ((base2 = this.config).streams == null) {                                                                     // 2180
        base2.streams = 2;                                                                                             // 2181
      }                                                                                                                // 2182
                                                                                                                       //
      if (this.config.streams < 1) {                                                                                   // 1586
        this.config.streams = 2;                                                                                       // 1586
      }                                                                                                                // 2185
                                                                                                                       //
      if ((base3 = this.config).transport == null) {                                                                   // 2186
        base3.transport = 'ddp';                                                                                       // 2187
      }                                                                                                                // 2188
                                                                                                                       //
      if ((base4 = this.config).chunkSize == null) {                                                                   // 2189
        base4.chunkSize = this.collection.chunkSize;                                                                   // 2190
      }                                                                                                                // 2191
                                                                                                                       //
      if ((base5 = this.config).allowWebWorkers == null) {                                                             // 2192
        base5.allowWebWorkers = true;                                                                                  // 2193
      }                                                                                                                // 2194
                                                                                                                       //
      this.config.transport = this.config.transport.toLowerCase();                                                     // 1590
      check(this.config, {                                                                                             // 1592
        file: Match.Any,                                                                                               // 1593
        fileName: Match.Optional(String),                                                                              // 1594
        meta: Match.Optional(Object),                                                                                  // 1595
        type: Match.Optional(String),                                                                                  // 1596
        onError: Match.Optional(Function),                                                                             // 1597
        onAbort: Match.Optional(Function),                                                                             // 1598
        streams: Match.OneOf('dynamic', Number),                                                                       // 1599
        onStart: Match.Optional(Function),                                                                             // 1600
        isBase64: Match.Optional(Boolean),                                                                             // 1601
        transport: Match.OneOf('http', 'ddp'),                                                                         // 1602
        chunkSize: Match.OneOf('dynamic', Number),                                                                     // 1603
        onUploaded: Match.Optional(Function),                                                                          // 1604
        onProgress: Match.Optional(Function),                                                                          // 1605
        onBeforeUpload: Match.Optional(Function),                                                                      // 1606
        allowWebWorkers: Boolean,                                                                                      // 1607
        ddp: Match.Any                                                                                                 // 1608
      });                                                                                                              // 1592
                                                                                                                       //
      if (!this.config.fileName && !this.config.file.name) {                                                           // 1611
        throw new Meteor.Error(400, '"fileName" must me specified for base64 upload!');                                // 1612
      }                                                                                                                // 2216
                                                                                                                       //
      if (this.config.isBase64 === true) {                                                                             // 1614
        check(this.config.file, String);                                                                               // 1615
                                                                                                                       //
        if (!!~this.config.file.indexOf('data:')) {                                                                    // 1616
          this.config.file = this.config.file.replace('data:', '');                                                    // 1617
        }                                                                                                              // 2221
                                                                                                                       //
        if (!!~this.config.file.indexOf(',')) {                                                                        // 1618
          _file = this.config.file.split(',');                                                                         // 1619
          this.fileData = {                                                                                            // 1620
            size: Math.floor(_file[1].replace(/\=/g, '').length / 4 * 3),                                              // 1621
            type: _file[0].split(';')[0],                                                                              // 1622
            name: this.config.fileName,                                                                                // 1623
            meta: this.config.meta                                                                                     // 1624
          };                                                                                                           // 1621
          this.config.file = _file[1];                                                                                 // 1625
        } else if (!this.config.type) {                                                                                // 1618
          throw new Meteor.Error(400, '"type" must me specified for base64 upload! And represent mime-type of the file');
        } else {                                                                                                       // 1626
          this.fileData = {                                                                                            // 1629
            size: Math.floor(this.config.file.replace(/\=/g, '').length / 4 * 3),                                      // 1630
            type: this.config.type,                                                                                    // 1631
            name: this.config.fileName,                                                                                // 1632
            meta: this.config.meta                                                                                     // 1633
          };                                                                                                           // 1630
        }                                                                                                              // 1614
      }                                                                                                                // 2241
                                                                                                                       //
      if (this.config.file) {                                                                                          // 1635
        if (!this.config.isBase64) {                                                                                   // 1636
          this.fileData = {                                                                                            // 1637
            size: this.config.file.size,                                                                               // 1638
            type: this.config.type || this.config.file.type,                                                           // 1639
            name: this.config.fileName || this.config.file.name,                                                       // 1640
            meta: this.config.meta                                                                                     // 1641
          };                                                                                                           // 1638
        }                                                                                                              // 2250
                                                                                                                       //
        if (this.collection.debug) {                                                                                   // 1643
          console.time('insert ' + this.fileData.name);                                                                // 1644
          console.time('loadFile ' + this.fileData.name);                                                              // 1645
        }                                                                                                              // 2254
                                                                                                                       //
        if (this.collection._supportWebWorker && this.config.allowWebWorkers) {                                        // 1647
          try {                                                                                                        // 1648
            this.worker = new Worker(this.collection._webWorkerUrl);                                                   // 1649
          } catch (error1) {                                                                                           // 1648
            wwError = error1;                                                                                          // 1650
            this.worker = false;                                                                                       // 1651
                                                                                                                       //
            if (this.collection.debug) {                                                                               // 1652
              console.warn('[FilesCollection] [insert] [create WebWorker]: Can\'t create WebWorker, fallback to MainThread', wwError);
            }                                                                                                          // 1648
          }                                                                                                            // 1647
        } else {                                                                                                       // 1647
          this.worker = null;                                                                                          // 1654
        }                                                                                                              // 2267
                                                                                                                       //
        this.startTime = {};                                                                                           // 1656
        this.config.debug = this.collection.debug;                                                                     // 1657
        this.currentChunk = 0;                                                                                         // 1658
        this.transferTime = 0;                                                                                         // 1659
        this.trackerComp = null;                                                                                       // 1660
        this.sentChunks = 0;                                                                                           // 1661
        this.fileLength = 1;                                                                                           // 1662
        this.EOFsent = false;                                                                                          // 1663
        this.fileId = Random.id();                                                                                     // 1664
        this.FSName = this.collection.namingFunction ? this.collection.namingFunction(this.fileData) : this.fileId;    // 1665
        this.pipes = [];                                                                                               // 1666
        this.fileData = _.extend(this.fileData, this.collection._getExt(self.fileData.name), {                         // 1668
          mime: this.collection._getMimeType(this.fileData)                                                            // 1668
        });                                                                                                            // 1668
        this.fileData['mime-type'] = this.fileData.mime;                                                               // 1669
        this.result = new this.collection._FileUpload(_.extend(self.config, {                                          // 1671
          fileData: this.fileData,                                                                                     // 1671
          fileId: this.fileId,                                                                                         // 1671
          _Abort: this.collection._methodNames._Abort                                                                  // 1671
        }));                                                                                                           // 1671
                                                                                                                       //
        this.beforeunload = function (e) {                                                                             // 1673
          var message;                                                                                                 // 1674
          message = _.isFunction(self.collection.onbeforeunloadMessage) ? self.collection.onbeforeunloadMessage.call(self.result, self.fileData) : self.collection.onbeforeunloadMessage;
                                                                                                                       //
          if (e) {                                                                                                     // 1675
            e.returnValue = message;                                                                                   // 1675
          }                                                                                                            // 2293
                                                                                                                       //
          return message;                                                                                              // 1676
        };                                                                                                             // 1673
                                                                                                                       //
        this.result.config.beforeunload = this.beforeunload;                                                           // 1677
        window.addEventListener('beforeunload', this.beforeunload, false);                                             // 1678
                                                                                                                       //
        this.result.config._onEnd = function () {                                                                      // 1680
          return self.emitEvent('_onEnd');                                                                             // 2299
        };                                                                                                             // 1680
                                                                                                                       //
        this.addListener('end', this.end);                                                                             // 1682
        this.addListener('start', this.start);                                                                         // 1683
        this.addListener('upload', this.upload);                                                                       // 1684
        this.addListener('sendEOF', this.sendEOF);                                                                     // 1685
        this.addListener('prepare', this.prepare);                                                                     // 1686
        this.addListener('sendChunk', this.sendChunk);                                                                 // 1687
        this.addListener('proceedChunk', this.proceedChunk);                                                           // 1688
        this.addListener('createStreams', this.createStreams);                                                         // 1689
        this.addListener('calculateStats', _.throttle(function () {                                                    // 1691
          var _t, progress;                                                                                            // 1692
                                                                                                                       //
          _t = self.transferTime / self.sentChunks / self.config.streams;                                              // 1692
          self.result.estimateTime.set(_t * (self.fileLength - self.sentChunks));                                      // 1693
          self.result.estimateSpeed.set(self.config.chunkSize / (_t / 1000));                                          // 1694
          progress = Math.round(self.sentChunks / self.fileLength * 100);                                              // 1695
          self.result.progress.set(progress);                                                                          // 1696
          self.config.onProgress && self.config.onProgress.call(self.result, progress, self.fileData);                 // 1697
          self.result.emitEvent('progress', [progress, self.fileData]);                                                // 1698
        }, 250));                                                                                                      // 1691
        this.addListener('_onEnd', function () {                                                                       // 1702
          if (self.result.estimateTimer) {                                                                             // 1703
            Meteor.clearInterval(self.result.estimateTimer);                                                           // 1703
          }                                                                                                            // 2322
                                                                                                                       //
          if (self.worker) {                                                                                           // 1704
            self.worker.terminate();                                                                                   // 1704
          }                                                                                                            // 2325
                                                                                                                       //
          if (self.trackerComp) {                                                                                      // 1705
            self.trackerComp.stop();                                                                                   // 1705
          }                                                                                                            // 2328
                                                                                                                       //
          if (self.beforeunload) {                                                                                     // 1706
            window.removeEventListener('beforeunload', self.beforeunload, false);                                      // 1706
          }                                                                                                            // 2331
                                                                                                                       //
          if (self.result) {                                                                                           // 1707
            return self.result.progress.set(0);                                                                        // 2333
          }                                                                                                            // 2334
        });                                                                                                            // 1702
      } else {                                                                                                         // 1635
        throw new Meteor.Error(500, '[FilesCollection] [insert] Have you forget to pass a File itself?');              // 1709
      }                                                                                                                // 2338
    }                                                                                                                  // 1579
                                                                                                                       //
    UploadInstance.prototype.end = function (error, data) {                                                            // 2341
      if (this.collection.debug) {                                                                                     // 1712
        console.timeEnd('insert ' + this.fileData.name);                                                               // 1712
      }                                                                                                                // 2344
                                                                                                                       //
      this.emitEvent('_onEnd');                                                                                        // 1713
      this.result.emitEvent('uploaded', [error, data]);                                                                // 1714
      this.config.onUploaded && this.config.onUploaded.call(this.result, error, data);                                 // 1715
                                                                                                                       //
      if (error) {                                                                                                     // 1716
        if (this.collection.debug) {                                                                                   // 1717
          console.error('[FilesCollection] [insert] [end] Error:', error);                                             // 1717
        }                                                                                                              // 2351
                                                                                                                       //
        this.result.abort();                                                                                           // 1718
        this.result.state.set('aborted');                                                                              // 1719
        this.result.emitEvent('error', [error, this.fileData]);                                                        // 1720
        this.config.onError && this.config.onError.call(this.result, error, this.fileData);                            // 1721
      } else {                                                                                                         // 1716
        this.result.state.set('completed');                                                                            // 1723
        this.collection.emitEvent('afterUpload', [data]);                                                              // 1724
      }                                                                                                                // 2359
                                                                                                                       //
      this.result.emitEvent('end', [error, data || this.fileData]);                                                    // 1725
      return this.result;                                                                                              // 1726
    };                                                                                                                 // 1711
                                                                                                                       //
    UploadInstance.prototype.sendChunk = function (evt) {                                                              // 2364
      var j, len, opts, p, pad, pipeFunc, ref, ref1, self;                                                             // 1729
      self = this;                                                                                                     // 1729
      opts = {                                                                                                         // 1730
        fileId: this.fileId,                                                                                           // 1731
        binData: evt.data.bin,                                                                                         // 1732
        chunkId: evt.data.chunkId                                                                                      // 1733
      };                                                                                                               // 1731
                                                                                                                       //
      if (this.config.isBase64) {                                                                                      // 1735
        pad = opts.binData.length % 4;                                                                                 // 1736
                                                                                                                       //
        if (pad) {                                                                                                     // 1737
          p = 0;                                                                                                       // 1738
                                                                                                                       //
          while (p < pad) {                                                                                            // 1739
            opts.binData += '=';                                                                                       // 1740
            p++;                                                                                                       // 1741
          }                                                                                                            // 1737
        }                                                                                                              // 1735
      }                                                                                                                // 2381
                                                                                                                       //
      this.emitEvent('data', [evt.data.bin]);                                                                          // 1743
                                                                                                                       //
      if (this.pipes.length) {                                                                                         // 1744
        ref = this.pipes;                                                                                              // 1745
                                                                                                                       //
        for (j = 0, len = ref.length; j < len; j++) {                                                                  // 1745
          pipeFunc = ref[j];                                                                                           // 2386
          opts.binData = pipeFunc(opts.binData);                                                                       // 1746
        }                                                                                                              // 1744
      }                                                                                                                // 2389
                                                                                                                       //
      if (this.fileLength === evt.data.chunkId) {                                                                      // 1748
        if (this.collection.debug) {                                                                                   // 1749
          console.timeEnd('loadFile ' + this.fileData.name);                                                           // 1749
        }                                                                                                              // 2393
                                                                                                                       //
        this.emitEvent('readEnd');                                                                                     // 1750
      }                                                                                                                // 2395
                                                                                                                       //
      if (opts.binData) {                                                                                              // 1752
        if (this.config.transport === 'ddp') {                                                                         // 1753
          this.config.ddp.call(this.collection._methodNames._Write, opts, function (error) {                           // 1754
            self.transferTime += +new Date() - self.startTime[opts.chunkId];                                           // 1755
                                                                                                                       //
            if (error) {                                                                                               // 1756
              if (self.result.state.get() !== 'aborted') {                                                             // 1757
                self.emitEvent('end', [error]);                                                                        // 1758
              }                                                                                                        // 1756
            } else {                                                                                                   // 1756
              ++self.sentChunks;                                                                                       // 1760
                                                                                                                       //
              if (self.sentChunks >= self.fileLength) {                                                                // 1761
                self.emitEvent('sendEOF');                                                                             // 1762
              } else if (self.currentChunk < self.fileLength) {                                                        // 1761
                self.emitEvent('upload');                                                                              // 1764
              }                                                                                                        // 2410
                                                                                                                       //
              self.emitEvent('calculateStats');                                                                        // 1765
            }                                                                                                          // 2412
          });                                                                                                          // 1754
        } else {                                                                                                       // 1753
          HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {      // 1768
            content: opts.binData,                                                                                     // 1769
            headers: {                                                                                                 // 1770
              'x-mtok': ((ref1 = Meteor.connection) != null ? ref1._lastSessionId : void 0) || null,                   // 1771
              'x-fileid': opts.fileId,                                                                                 // 1772
              'x-chunkid': opts.chunkId,                                                                               // 1773
              'content-type': 'text/plain'                                                                             // 1774
            }                                                                                                          // 1771
          }, function (error) {                                                                                        // 1768
            self.transferTime += +new Date() - self.startTime[opts.chunkId];                                           // 1776
                                                                                                                       //
            if (error) {                                                                                               // 1777
              if ("" + error === "Error: network") {                                                                   // 1778
                self.result.pause();                                                                                   // 1779
              } else {                                                                                                 // 1778
                if (self.result.state.get() !== 'aborted') {                                                           // 1781
                  self.emitEvent('end', [error]);                                                                      // 1782
                }                                                                                                      // 1778
              }                                                                                                        // 1777
            } else {                                                                                                   // 1777
              ++self.sentChunks;                                                                                       // 1784
                                                                                                                       //
              if (self.sentChunks >= self.fileLength) {                                                                // 1785
                self.emitEvent('sendEOF');                                                                             // 1786
              } else if (self.currentChunk < self.fileLength) {                                                        // 1785
                self.emitEvent('upload');                                                                              // 1788
              }                                                                                                        // 2439
                                                                                                                       //
              self.emitEvent('calculateStats');                                                                        // 1789
            }                                                                                                          // 2441
          });                                                                                                          // 1768
        }                                                                                                              // 1752
      }                                                                                                                // 2444
    };                                                                                                                 // 1728
                                                                                                                       //
    UploadInstance.prototype.sendEOF = function () {                                                                   // 2447
      var opts, ref, self;                                                                                             // 1794
                                                                                                                       //
      if (!this.EOFsent) {                                                                                             // 1794
        this.EOFsent = true;                                                                                           // 1795
        self = this;                                                                                                   // 1796
        opts = {                                                                                                       // 1797
          eof: true,                                                                                                   // 1798
          fileId: this.fileId                                                                                          // 1799
        };                                                                                                             // 1798
                                                                                                                       //
        if (this.config.transport === 'ddp') {                                                                         // 1801
          this.config.ddp.call(this.collection._methodNames._Write, opts, function () {                                // 1802
            self.emitEvent('end', arguments);                                                                          // 1803
          });                                                                                                          // 1802
        } else {                                                                                                       // 1801
          HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {      // 1806
            content: '',                                                                                               // 1807
            headers: {                                                                                                 // 1808
              'x-mtok': ((ref = Meteor.connection) != null ? ref._lastSessionId : void 0) || null,                     // 1809
              'x-eof': '1',                                                                                            // 1810
              'x-fileId': opts.fileId,                                                                                 // 1811
              'content-type': 'text/plain'                                                                             // 1812
            }                                                                                                          // 1809
          }, function (error, result) {                                                                                // 1806
            result = JSON.parse((result != null ? result.content : void 0) || {});                                     // 1814
                                                                                                                       //
            if (result != null ? result.meta : void 0) {                                                               // 1815
              result.meta = fixJSONParse(result.meta);                                                                 // 1815
            }                                                                                                          // 2473
                                                                                                                       //
            self.emitEvent('end', [error, result]);                                                                    // 1816
          });                                                                                                          // 1806
        }                                                                                                              // 1794
      }                                                                                                                // 2477
    };                                                                                                                 // 1793
                                                                                                                       //
    UploadInstance.prototype.proceedChunk = function (chunkId) {                                                       // 2480
      var chunk, fileReader, self;                                                                                     // 1821
      self = this;                                                                                                     // 1821
      chunk = this.config.file.slice(this.config.chunkSize * (chunkId - 1), this.config.chunkSize * chunkId);          // 1822
                                                                                                                       //
      if (this.config.isBase64) {                                                                                      // 1824
        self.emitEvent('sendChunk', [{                                                                                 // 1825
          data: {                                                                                                      // 1826
            bin: chunk,                                                                                                // 1827
            chunkId: chunkId                                                                                           // 1828
          }                                                                                                            // 1826
        }]);                                                                                                           // 1825
      } else {                                                                                                         // 1824
        if (FileReader) {                                                                                              // 1832
          fileReader = new FileReader();                                                                               // 1833
                                                                                                                       //
          fileReader.onloadend = function (evt) {                                                                      // 1835
            var ref, ref1;                                                                                             // 1836
            self.emitEvent('sendChunk', [{                                                                             // 1836
              data: {                                                                                                  // 1837
                bin: ((fileReader != null ? fileReader.result : void 0) || ((ref = evt.srcElement) != null ? ref.result : void 0) || ((ref1 = evt.target) != null ? ref1.result : void 0)).split(',')[1],
                chunkId: chunkId                                                                                       // 1839
              }                                                                                                        // 1837
            }]);                                                                                                       // 1836
          };                                                                                                           // 1835
                                                                                                                       //
          fileReader.onerror = function (e) {                                                                          // 1844
            self.emitEvent('end', [(e.target || e.srcElement).error]);                                                 // 1845
          };                                                                                                           // 1844
                                                                                                                       //
          fileReader.readAsDataURL(chunk);                                                                             // 1848
        } else if (FileReaderSync) {                                                                                   // 1832
          fileReader = new FileReaderSync();                                                                           // 1851
          self.emitEvent('sendChunk', [{                                                                               // 1853
            data: {                                                                                                    // 1854
              bin: fileReader.readAsDataURL(chunk).split(',')[1],                                                      // 1855
              chunkId: chunkId                                                                                         // 1856
            }                                                                                                          // 1854
          }]);                                                                                                         // 1853
        } else {                                                                                                       // 1850
          self.emitEvent('end', ['File API is not supported in this Browser!']);                                       // 1860
        }                                                                                                              // 1824
      }                                                                                                                // 2524
    };                                                                                                                 // 1820
                                                                                                                       //
    UploadInstance.prototype.upload = function () {                                                                    // 2527
      if (this.result.onPause.get()) {                                                                                 // 1864
        return;                                                                                                        // 1865
      }                                                                                                                // 2530
                                                                                                                       //
      if (this.result.state.get() === 'aborted') {                                                                     // 1867
        return this;                                                                                                   // 1868
      }                                                                                                                // 2533
                                                                                                                       //
      if (this.currentChunk <= this.fileLength) {                                                                      // 1870
        ++this.currentChunk;                                                                                           // 1871
                                                                                                                       //
        if (this.worker) {                                                                                             // 1872
          this.worker.postMessage({                                                                                    // 1873
            sc: this.sentChunks,                                                                                       // 1873
            cc: this.currentChunk,                                                                                     // 1873
            cs: this.config.chunkSize,                                                                                 // 1873
            f: this.config.file,                                                                                       // 1873
            ib: this.config.isBase64                                                                                   // 1873
          });                                                                                                          // 1873
        } else {                                                                                                       // 1872
          this.emitEvent('proceedChunk', [this.currentChunk]);                                                         // 1875
        }                                                                                                              // 1870
      }                                                                                                                // 2547
                                                                                                                       //
      this.startTime[this.currentChunk] = +new Date();                                                                 // 1876
    };                                                                                                                 // 1863
                                                                                                                       //
    UploadInstance.prototype.createStreams = function () {                                                             // 2551
      var i, self;                                                                                                     // 1880
      i = 1;                                                                                                           // 1880
      self = this;                                                                                                     // 1881
                                                                                                                       //
      while (i <= this.config.streams) {                                                                               // 1882
        self.emitEvent('upload');                                                                                      // 1883
        i++;                                                                                                           // 1884
      }                                                                                                                // 1882
    };                                                                                                                 // 1879
                                                                                                                       //
    UploadInstance.prototype.prepare = function () {                                                                   // 2561
      var _len, handleStart, opts, ref, ref1, self;                                                                    // 1888
                                                                                                                       //
      self = this;                                                                                                     // 1888
      this.config.onStart && this.config.onStart.call(this.result, null, this.fileData);                               // 1890
      this.result.emitEvent('start', [null, this.fileData]);                                                           // 1891
                                                                                                                       //
      if (this.config.chunkSize === 'dynamic') {                                                                       // 1893
        this.config.chunkSize = this.fileData.size / 1000;                                                             // 1894
                                                                                                                       //
        if (this.config.chunkSize < 327680) {                                                                          // 1895
          this.config.chunkSize = 327680;                                                                              // 1896
        } else if (this.config.chunkSize > 1048576) {                                                                  // 1895
          this.config.chunkSize = 1048576;                                                                             // 1898
        }                                                                                                              // 2572
                                                                                                                       //
        if (this.config.transport === 'http') {                                                                        // 1900
          this.config.chunkSize = Math.round(this.config.chunkSize / 2);                                               // 1901
        }                                                                                                              // 1893
      }                                                                                                                // 2576
                                                                                                                       //
      if (this.config.isBase64) {                                                                                      // 1903
        this.config.chunkSize = Math.floor(this.config.chunkSize / 4) * 4;                                             // 1904
        _len = Math.ceil(this.config.file.length / this.config.chunkSize);                                             // 1905
      } else {                                                                                                         // 1903
        this.config.chunkSize = Math.floor(this.config.chunkSize / 8) * 8;                                             // 1907
        _len = Math.ceil(this.fileData.size / this.config.chunkSize);                                                  // 1908
      }                                                                                                                // 2583
                                                                                                                       //
      if (this.config.streams === 'dynamic') {                                                                         // 1910
        this.config.streams = _.clone(_len);                                                                           // 1911
                                                                                                                       //
        if (this.config.streams > 24) {                                                                                // 1912
          this.config.streams = 24;                                                                                    // 1912
        }                                                                                                              // 2588
                                                                                                                       //
        if (this.config.transport === 'http') {                                                                        // 1914
          this.config.streams = Math.round(this.config.streams / 2);                                                   // 1915
        }                                                                                                              // 1910
      }                                                                                                                // 2592
                                                                                                                       //
      this.fileLength = _len <= 0 ? 1 : _len;                                                                          // 1917
                                                                                                                       //
      if (this.config.streams > this.fileLength) {                                                                     // 1918
        this.config.streams = this.fileLength;                                                                         // 1918
      }                                                                                                                // 2596
                                                                                                                       //
      this.result.config.fileLength = this.fileLength;                                                                 // 1919
      opts = {                                                                                                         // 1921
        file: this.fileData,                                                                                           // 1922
        fileId: this.fileId,                                                                                           // 1923
        chunkSize: this.config.isBase64 ? this.config.chunkSize / 4 * 3 : this.config.chunkSize,                       // 1924
        fileLength: this.fileLength                                                                                    // 1925
      };                                                                                                               // 1922
                                                                                                                       //
      if (this.FSName !== this.fileId) {                                                                               // 1926
        opts.FSName = this.FSName;                                                                                     // 1926
      }                                                                                                                // 2606
                                                                                                                       //
      handleStart = function (error) {                                                                                 // 1928
        if (error) {                                                                                                   // 1929
          if (self.collection.debug) {                                                                                 // 1930
            console.error('[FilesCollection] [_Start] Error:', error);                                                 // 1930
          }                                                                                                            // 2611
                                                                                                                       //
          self.emitEvent('end', [error]);                                                                              // 1931
        } else {                                                                                                       // 1929
          self.result.continueFunc = function () {                                                                     // 1933
            if (self.collection.debug) {                                                                               // 1934
              console.info('[FilesCollection] [insert] [continueFunc]');                                               // 1934
            }                                                                                                          // 2617
                                                                                                                       //
            self.emitEvent('createStreams');                                                                           // 1935
          };                                                                                                           // 1933
                                                                                                                       //
          self.emitEvent('createStreams');                                                                             // 1937
        }                                                                                                              // 2621
      };                                                                                                               // 1928
                                                                                                                       //
      if (this.config.transport === 'ddp') {                                                                           // 1940
        this.config.ddp.call(this.collection._methodNames._Start, opts, handleStart);                                  // 1941
      } else {                                                                                                         // 1940
        if ((ref = opts.file) != null ? ref.meta : void 0) {                                                           // 1943
          opts.file.meta = fixJSONStringify(opts.file.meta);                                                           // 1943
        }                                                                                                              // 2628
                                                                                                                       //
        HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {        // 1944
          data: opts,                                                                                                  // 1945
          headers: {                                                                                                   // 1946
            'x-start': '1',                                                                                            // 1947
            'x-mtok': ((ref1 = Meteor.connection) != null ? ref1._lastSessionId : void 0) || null                      // 1948
          }                                                                                                            // 1947
        }, handleStart);                                                                                               // 1944
      }                                                                                                                // 2636
    };                                                                                                                 // 1887
                                                                                                                       //
    UploadInstance.prototype.pipe = function (func) {                                                                  // 2639
      this.pipes.push(func);                                                                                           // 1953
      return this;                                                                                                     // 1954
    };                                                                                                                 // 1952
                                                                                                                       //
    UploadInstance.prototype.start = function () {                                                                     // 2644
      var isUploadAllowed, self;                                                                                       // 1957
      self = this;                                                                                                     // 1957
                                                                                                                       //
      if (this.fileData.size <= 0) {                                                                                   // 1958
        this.end(new Meteor.Error(400, 'Can\'t upload empty file'));                                                   // 1959
        return this.result;                                                                                            // 1960
      }                                                                                                                // 2650
                                                                                                                       //
      if (this.config.onBeforeUpload && _.isFunction(this.config.onBeforeUpload)) {                                    // 1962
        isUploadAllowed = this.config.onBeforeUpload.call(_.extend(this.result, this.collection._getUser()), this.fileData);
                                                                                                                       //
        if (isUploadAllowed !== true) {                                                                                // 1964
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'config.onBeforeUpload() returned false'));
        }                                                                                                              // 1962
      }                                                                                                                // 2656
                                                                                                                       //
      if (this.collection.onBeforeUpload && _.isFunction(this.collection.onBeforeUpload)) {                            // 1967
        isUploadAllowed = this.collection.onBeforeUpload.call(_.extend(this.result, this.collection._getUser()), this.fileData);
                                                                                                                       //
        if (isUploadAllowed !== true) {                                                                                // 1969
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'collection.onBeforeUpload() returned false'));
        }                                                                                                              // 1967
      }                                                                                                                // 2662
                                                                                                                       //
      Tracker.autorun(function (computation) {                                                                         // 1972
        self.trackerComp = computation;                                                                                // 1973
                                                                                                                       //
        if (!self.result.onPause.get()) {                                                                              // 1974
          if (Meteor.status().connected) {                                                                             // 1975
            if (self.collection.debug) {                                                                               // 1976
              console.info('[FilesCollection] [insert] [Tracker] [continue]');                                         // 1976
            }                                                                                                          // 2669
                                                                                                                       //
            self.result["continue"]();                                                                                 // 1977
          } else {                                                                                                     // 1975
            if (self.collection.debug) {                                                                               // 1979
              console.info('[FilesCollection] [insert] [Tracker] [pause]');                                            // 1979
            }                                                                                                          // 2674
                                                                                                                       //
            self.result.pause();                                                                                       // 1980
          }                                                                                                            // 1974
        }                                                                                                              // 2677
      });                                                                                                              // 1972
                                                                                                                       //
      if (this.worker) {                                                                                               // 1983
        this.worker.onmessage = function (evt) {                                                                       // 1984
          if (evt.data.error) {                                                                                        // 1985
            if (self.collection.debug) {                                                                               // 1986
              console.warn('[FilesCollection] [insert] [worker] [onmessage] [ERROR:]', evt.data.error);                // 1986
            }                                                                                                          // 2684
                                                                                                                       //
            self.emitEvent('proceedChunk', [evt.data.chunkId]);                                                        // 1987
          } else {                                                                                                     // 1985
            self.emitEvent('sendChunk', [evt]);                                                                        // 1989
          }                                                                                                            // 2688
        };                                                                                                             // 1984
                                                                                                                       //
        this.worker.onerror = function (e) {                                                                           // 1991
          if (self.collection.debug) {                                                                                 // 1992
            console.error('[FilesCollection] [insert] [worker] [onerror] [ERROR:]', e);                                // 1992
          }                                                                                                            // 2693
                                                                                                                       //
          self.emitEvent('end', [e.message]);                                                                          // 1993
        };                                                                                                             // 1991
      }                                                                                                                // 2696
                                                                                                                       //
      if (this.collection.debug) {                                                                                     // 1996
        if (this.worker) {                                                                                             // 1997
          console.info('[FilesCollection] [insert] using WebWorkers');                                                 // 1998
        } else {                                                                                                       // 1997
          console.info('[FilesCollection] [insert] using MainThread');                                                 // 2000
        }                                                                                                              // 1996
      }                                                                                                                // 2703
                                                                                                                       //
      self.emitEvent('prepare');                                                                                       // 2002
      return this.result;                                                                                              // 2003
    };                                                                                                                 // 1956
                                                                                                                       //
    UploadInstance.prototype.manual = function () {                                                                    // 2708
      var self;                                                                                                        // 2006
      self = this;                                                                                                     // 2006
                                                                                                                       //
      this.result.start = function () {                                                                                // 2007
        self.emitEvent('start');                                                                                       // 2008
      };                                                                                                               // 2007
                                                                                                                       //
      this.result.pipe = function (func) {                                                                             // 2010
        self.pipe(func);                                                                                               // 2011
        return this;                                                                                                   // 2012
      };                                                                                                               // 2010
                                                                                                                       //
      return this.result;                                                                                              // 2013
    };                                                                                                                 // 2005
                                                                                                                       //
    return UploadInstance;                                                                                             // 2721
  }() : void 0; /*                                                                                                     // 2723
                @locus Client                                                                                          //
                @memberOf FilesCollection                                                                              //
                @name _FileUpload                                                                                      //
                @class FileUpload                                                                                      //
                @summary Internal Class, instance of this class is returned from `insert()` method                     //
                 */                                                                                                    //
  FilesCollection.prototype._FileUpload = Meteor.isClient ? FileUpload = function () {                                 // 2734
    FileUpload.prototype.__proto__ = EventEmitter.prototype;                                                           // 2735
                                                                                                                       //
    function FileUpload(config1) {                                                                                     // 2025
      var self;                                                                                                        // 2026
      this.config = config1;                                                                                           // 2025
      EventEmitter.call(this);                                                                                         // 2026
      self = this;                                                                                                     // 2027
                                                                                                                       //
      if (!this.config.isBase64) {                                                                                     // 2028
        this.file = _.extend(this.config.file, this.config.fileData);                                                  // 2029
      } else {                                                                                                         // 2028
        this.file = this.config.fileData;                                                                              // 2031
      }                                                                                                                // 2746
                                                                                                                       //
      this.state = new ReactiveVar('active');                                                                          // 2032
      this.onPause = new ReactiveVar(false);                                                                           // 2033
      this.progress = new ReactiveVar(0);                                                                              // 2034
      this.estimateTime = new ReactiveVar(1000);                                                                       // 2035
      this.estimateSpeed = new ReactiveVar(0);                                                                         // 2036
      this.estimateTimer = Meteor.setInterval(function () {                                                            // 2037
        var _currentTime;                                                                                              // 2038
                                                                                                                       //
        if (self.state.get() === 'active') {                                                                           // 2038
          _currentTime = self.estimateTime.get();                                                                      // 2039
                                                                                                                       //
          if (_currentTime > 1000) {                                                                                   // 2040
            self.estimateTime.set(_currentTime - 1000);                                                                // 2041
          }                                                                                                            // 2038
        }                                                                                                              // 2759
      }, 1000);                                                                                                        // 2037
    }                                                                                                                  // 2025
                                                                                                                       //
    FileUpload.prototype.continueFunc = function () {};                                                                // 2763
                                                                                                                       //
    FileUpload.prototype.pause = function () {                                                                         // 2765
      if (this.config.debug) {                                                                                         // 2046
        console.info('[FilesCollection] [insert] [.pause()]');                                                         // 2046
      }                                                                                                                // 2768
                                                                                                                       //
      if (!this.onPause.get()) {                                                                                       // 2047
        this.onPause.set(true);                                                                                        // 2048
        this.state.set('paused');                                                                                      // 2049
        this.emitEvent('pause', [this.file]);                                                                          // 2050
      }                                                                                                                // 2773
    };                                                                                                                 // 2045
                                                                                                                       //
    FileUpload.prototype["continue"] = function () {                                                                   // 2776
      if (this.config.debug) {                                                                                         // 2053
        console.info('[FilesCollection] [insert] [.continue()]');                                                      // 2053
      }                                                                                                                // 2779
                                                                                                                       //
      if (this.onPause.get()) {                                                                                        // 2054
        this.onPause.set(false);                                                                                       // 2055
        this.state.set('active');                                                                                      // 2056
        this.emitEvent('continue', [this.file]);                                                                       // 2057
        this.continueFunc();                                                                                           // 2058
      }                                                                                                                // 2785
    };                                                                                                                 // 2052
                                                                                                                       //
    FileUpload.prototype.toggle = function () {                                                                        // 2788
      if (this.config.debug) {                                                                                         // 2061
        console.info('[FilesCollection] [insert] [.toggle()]');                                                        // 2061
      }                                                                                                                // 2791
                                                                                                                       //
      if (this.onPause.get()) {                                                                                        // 2062
        this["continue"]();                                                                                            // 2062
      } else {                                                                                                         // 2062
        this.pause();                                                                                                  // 2062
      }                                                                                                                // 2796
    };                                                                                                                 // 2060
                                                                                                                       //
    FileUpload.prototype.abort = function () {                                                                         // 2799
      if (this.config.debug) {                                                                                         // 2065
        console.info('[FilesCollection] [insert] [.abort()]');                                                         // 2065
      }                                                                                                                // 2802
                                                                                                                       //
      window.removeEventListener('beforeunload', this.config.beforeunload, false);                                     // 2066
      this.config.onAbort && this.config.onAbort.call(this, this.file);                                                // 2067
      this.emitEvent('abort', [this.file]);                                                                            // 2068
      this.pause();                                                                                                    // 2069
                                                                                                                       //
      this.config._onEnd();                                                                                            // 2070
                                                                                                                       //
      this.state.set('aborted');                                                                                       // 2071
                                                                                                                       //
      if (this.config.debug) {                                                                                         // 2072
        console.timeEnd('insert ' + this.config.fileData.name);                                                        // 2072
      }                                                                                                                // 2811
                                                                                                                       //
      this.config.ddp.call(this.config._Abort, this.config.fileId);                                                    // 2073
    };                                                                                                                 // 2064
                                                                                                                       //
    return FileUpload;                                                                                                 // 2815
  }() : void 0; /*                                                                                                     // 2817
                @locus Anywhere                                                                                        //
                @memberOf FilesCollection                                                                              //
                @name remove                                                                                           //
                @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
                @param {Function} callback - Callback with one `error` argument                                        //
                @summary Remove documents from the collection                                                          //
                @returns {FilesCollection} Instance                                                                    //
                 */                                                                                                    //
                                                                                                                       //
  FilesCollection.prototype.remove = function (selector, callback) {                                                   // 2830
    var docs, files, self;                                                                                             // 2087
                                                                                                                       //
    if (selector == null) {                                                                                            // 2832
      selector = {};                                                                                                   // 2086
    }                                                                                                                  // 2834
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2087
      console.info("[FilesCollection] [remove(" + JSON.stringify(selector) + ")]");                                    // 2087
    }                                                                                                                  // 2837
                                                                                                                       //
    check(selector, Match.OneOf(Object, String));                                                                      // 2088
    check(callback, Match.Optional(Function));                                                                         // 2089
                                                                                                                       //
    if (Meteor.isClient) {                                                                                             // 2091
      if (this.allowClientCode) {                                                                                      // 2092
        this.ddp.call(this._methodNames._Remove, selector, callback || NOOP);                                          // 2093
      } else {                                                                                                         // 2092
        callback && callback(new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!'));
                                                                                                                       //
        if (this.debug) {                                                                                              // 2096
          console.warn('[FilesCollection] [remove] Run code from client is not allowed!');                             // 2096
        }                                                                                                              // 2092
      }                                                                                                                // 2091
    } else {                                                                                                           // 2091
      files = this.collection.find(selector);                                                                          // 2098
                                                                                                                       //
      if (files.count() > 0) {                                                                                         // 2099
        self = this;                                                                                                   // 2100
        files.forEach(function (file) {                                                                                // 2101
          self.unlink(file);                                                                                           // 2102
        });                                                                                                            // 2101
      }                                                                                                                // 2856
                                                                                                                       //
      if (this.onAfterRemove) {                                                                                        // 2105
        self = this;                                                                                                   // 2106
        docs = files.fetch();                                                                                          // 2107
        this.collection.remove(selector, function () {                                                                 // 2109
          callback && callback.apply(this, arguments);                                                                 // 2110
          self.onAfterRemove(docs);                                                                                    // 2111
        });                                                                                                            // 2109
      } else {                                                                                                         // 2105
        this.collection.remove(selector, callback || NOOP);                                                            // 2114
      }                                                                                                                // 2091
    }                                                                                                                  // 2867
                                                                                                                       //
    return this;                                                                                                       // 2115
  }; /*                                                                                                                // 2086
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name update                                                                                                      //
     @see http://docs.meteor.com/#/full/update                                                                         //
     @summary link Mongo.Collection update method                                                                      //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.update = function () {                                                                     // 2881
    this.collection.update.apply(this.collection, arguments);                                                          // 2126
    return this.collection;                                                                                            // 2127
  }; /*                                                                                                                // 2125
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name deny                                                                                                        //
     @param {Object} rules                                                                                             //
     @see  https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                          //
     @summary link Mongo.Collection deny methods                                                                       //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.deny = Meteor.isServer ? function (rules) {                                                // 2897
    this.collection.deny(rules);                                                                                       // 2139
    return this.collection;                                                                                            // 2140
  } : void 0; /*                                                                                                       // 2138
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name allow                                                                                              //
              @param {Object} rules                                                                                    //
              @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                 //
              @summary link Mongo.Collection allow methods                                                             //
              @returns {Mongo.Collection} Instance                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.allow = Meteor.isServer ? function (rules) {                                               // 2913
    this.collection.allow(rules);                                                                                      // 2153
    return this.collection;                                                                                            // 2154
  } : void 0; /*                                                                                                       // 2152
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name denyClient                                                                                         //
              @see https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                  //
              @summary Shorthands for Mongo.Collection deny method                                                     //
              @returns {Mongo.Collection} Instance                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.denyClient = Meteor.isServer ? function () {                                               // 2928
    this.collection.deny({                                                                                             // 2166
      insert: function () {                                                                                            // 2167
        return true;                                                                                                   // 2931
      },                                                                                                               // 2167
      update: function () {                                                                                            // 2168
        return true;                                                                                                   // 2934
      },                                                                                                               // 2167
      remove: function () {                                                                                            // 2169
        return true;                                                                                                   // 2937
      }                                                                                                                // 2167
    });                                                                                                                // 2167
    return this.collection;                                                                                            // 2170
  } : void 0; /*                                                                                                       // 2165
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name allowClient                                                                                        //
              @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                 //
              @summary Shorthands for Mongo.Collection allow method                                                    //
              @returns {Mongo.Collection} Instance                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.allowClient = Meteor.isServer ? function () {                                              // 2953
    this.collection.allow({                                                                                            // 2182
      insert: function () {                                                                                            // 2183
        return true;                                                                                                   // 2956
      },                                                                                                               // 2183
      update: function () {                                                                                            // 2184
        return true;                                                                                                   // 2959
      },                                                                                                               // 2183
      remove: function () {                                                                                            // 2185
        return true;                                                                                                   // 2962
      }                                                                                                                // 2183
    });                                                                                                                // 2183
    return this.collection;                                                                                            // 2186
  } : void 0; /*                                                                                                       // 2181
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name unlink                                                                                             //
              @param {Object} fileRef - fileObj                                                                        //
              @param {String} version - [Optional] file's version                                                      //
              @param {Function} callback - [Optional] callback function                                                //
              @summary Unlink files and it's versions from FS                                                          //
              @returns {FilesCollection} Instance                                                                      //
               */                                                                                                      //
  FilesCollection.prototype.unlink = Meteor.isServer ? function (fileRef, version, callback) {                         // 2980
    var ref, ref1;                                                                                                     // 2201
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2201
      console.info("[FilesCollection] [unlink(" + fileRef._id + ", " + version + ")]");                                // 2201
    }                                                                                                                  // 2984
                                                                                                                       //
    if (version) {                                                                                                     // 2202
      if (((ref = fileRef.versions) != null ? ref[version] : void 0) && ((ref1 = fileRef.versions[version]) != null ? ref1.path : void 0)) {
        fs.unlink(fileRef.versions[version].path, callback || NOOP);                                                   // 2204
      }                                                                                                                // 2202
    } else {                                                                                                           // 2202
      if (fileRef.versions && !_.isEmpty(fileRef.versions)) {                                                          // 2206
        _.each(fileRef.versions, function (vRef) {                                                                     // 2207
          return bound(function () {                                                                                   // 2992
            fs.unlink(vRef.path, callback || NOOP);                                                                    // 2208
          });                                                                                                          // 2207
        });                                                                                                            // 2207
      } else {                                                                                                         // 2206
        fs.unlink(fileRef.path, callback || NOOP);                                                                     // 2211
      }                                                                                                                // 2202
    }                                                                                                                  // 2999
                                                                                                                       //
    return this;                                                                                                       // 2212
  } : void 0; /*                                                                                                       // 2200
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _404                                                                                               //
              @summary Internal method, used to return 404 error                                                       //
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype._404 = Meteor.isServer ? function (http) {                                                 // 3012
    var text;                                                                                                          // 2223
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2223
      console.warn("[FilesCollection] [download(" + http.request.originalUrl + ")] [_404] File not found");            // 2223
    }                                                                                                                  // 3016
                                                                                                                       //
    text = 'File Not Found :(';                                                                                        // 2224
    http.response.writeHead(404, {                                                                                     // 2225
      'Content-Length': text.length,                                                                                   // 2226
      'Content-Type': 'text/plain'                                                                                     // 2227
    });                                                                                                                // 2226
    http.response.end(text);                                                                                           // 2228
  } : void 0; /*                                                                                                       // 2222
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name download                                                                                           //
              @param {Object} http    - Server HTTP object                                                             //
              @param {String} version - Requested file version                                                         //
              @param {Object} fileRef - Requested file Object                                                          //
              @summary Initiates the HTTP response                                                                     //
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.download = Meteor.isServer ? function (http, version, fileRef) {                           // 3037
    var self, vRef;                                                                                                    // 2243
                                                                                                                       //
    if (version == null) {                                                                                             // 3039
      version = 'original';                                                                                            // 2242
    }                                                                                                                  // 3041
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2243
      console.info("[FilesCollection] [download(" + http.request.originalUrl + ", " + version + ")]");                 // 2243
    }                                                                                                                  // 3044
                                                                                                                       //
    if (fileRef) {                                                                                                     // 2244
      if (_.has(fileRef, 'versions') && _.has(fileRef.versions, version)) {                                            // 2245
        vRef = fileRef.versions[version];                                                                              // 2246
        vRef._id = fileRef._id;                                                                                        // 2247
      } else {                                                                                                         // 2245
        vRef = fileRef;                                                                                                // 2249
      }                                                                                                                // 2244
    } else {                                                                                                           // 2244
      vRef = false;                                                                                                    // 2251
    }                                                                                                                  // 3054
                                                                                                                       //
    if (!vRef || !_.isObject(vRef)) {                                                                                  // 2253
      return this._404(http);                                                                                          // 2254
    } else if (fileRef) {                                                                                              // 2253
      self = this;                                                                                                     // 2256
                                                                                                                       //
      if (this.downloadCallback) {                                                                                     // 2258
        if (!this.downloadCallback.call(_.extend(http, this._getUser(http)), fileRef)) {                               // 2259
          return this._404(http);                                                                                      // 2260
        }                                                                                                              // 2258
      }                                                                                                                // 3063
                                                                                                                       //
      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                            // 2262
        if (this.interceptDownload(http, fileRef, version) === true) {                                                 // 2263
          return;                                                                                                      // 2264
        }                                                                                                              // 2262
      }                                                                                                                // 3068
                                                                                                                       //
      fs.stat(vRef.path, function (statErr, stats) {                                                                   // 2266
        return bound(function () {                                                                                     // 3070
          var responseType;                                                                                            // 2267
                                                                                                                       //
          if (statErr || !stats.isFile()) {                                                                            // 2267
            return self._404(http);                                                                                    // 2268
          }                                                                                                            // 3074
                                                                                                                       //
          if (stats.size !== vRef.size && !self.integrityCheck) {                                                      // 2270
            vRef.size = stats.size;                                                                                    // 2270
          }                                                                                                            // 3077
                                                                                                                       //
          if (stats.size !== vRef.size && self.integrityCheck) {                                                       // 2271
            responseType = '400';                                                                                      // 2271
          }                                                                                                            // 3080
                                                                                                                       //
          return self.serve(http, fileRef, vRef, version, null, responseType || '200');                                // 3081
        });                                                                                                            // 2266
      });                                                                                                              // 2266
    } else {                                                                                                           // 2255
      return this._404(http);                                                                                          // 2275
    }                                                                                                                  // 3086
  } : void 0; /*                                                                                                       // 2242
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
    if (version == null) {                                                                                             // 3107
      version = 'original';                                                                                            // 2292
    }                                                                                                                  // 3109
                                                                                                                       //
    if (readableStream == null) {                                                                                      // 3110
      readableStream = null;                                                                                           // 2292
    }                                                                                                                  // 3112
                                                                                                                       //
    if (responseType == null) {                                                                                        // 3113
      responseType = '200';                                                                                            // 2292
    }                                                                                                                  // 3115
                                                                                                                       //
    if (force200 == null) {                                                                                            // 3116
      force200 = false;                                                                                                // 2292
    }                                                                                                                  // 3118
                                                                                                                       //
    self = this;                                                                                                       // 2293
    partiral = false;                                                                                                  // 2294
    reqRange = false;                                                                                                  // 2295
                                                                                                                       //
    if (http.params.query.download && http.params.query.download === 'true') {                                         // 2297
      dispositionType = 'attachment; ';                                                                                // 2298
    } else {                                                                                                           // 2297
      dispositionType = 'inline; ';                                                                                    // 2300
    }                                                                                                                  // 3126
                                                                                                                       //
    dispositionName = "filename=\"" + encodeURIComponent(fileRef.name) + "\"; filename=*UTF-8\"" + encodeURIComponent(fileRef.name) + "\"; ";
    dispositionEncoding = 'charset=utf-8';                                                                             // 2303
    http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);           // 2305
                                                                                                                       //
    if (http.request.headers.range && !force200) {                                                                     // 2307
      partiral = true;                                                                                                 // 2308
      array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                             // 2309
      start = parseInt(array[1]);                                                                                      // 2310
      end = parseInt(array[2]);                                                                                        // 2311
                                                                                                                       //
      if (isNaN(end)) {                                                                                                // 2312
        end = vRef.size - 1;                                                                                           // 2312
      }                                                                                                                // 3137
                                                                                                                       //
      take = end - start;                                                                                              // 2313
    } else {                                                                                                           // 2307
      start = 0;                                                                                                       // 2315
      end = vRef.size - 1;                                                                                             // 2316
      take = vRef.size;                                                                                                // 2317
    }                                                                                                                  // 3143
                                                                                                                       //
    if (partiral || http.params.query.play && http.params.query.play === 'true') {                                     // 2319
      reqRange = {                                                                                                     // 2320
        start: start,                                                                                                  // 2320
        end: end                                                                                                       // 2320
      };                                                                                                               // 2320
                                                                                                                       //
      if (isNaN(start) && !isNaN(end)) {                                                                               // 2321
        reqRange.start = end - take;                                                                                   // 2322
        reqRange.end = end;                                                                                            // 2323
      }                                                                                                                // 3152
                                                                                                                       //
      if (!isNaN(start) && isNaN(end)) {                                                                               // 2324
        reqRange.start = start;                                                                                        // 2325
        reqRange.end = start + take;                                                                                   // 2326
      }                                                                                                                // 3156
                                                                                                                       //
      if (start + take >= vRef.size) {                                                                                 // 2328
        reqRange.end = vRef.size - 1;                                                                                  // 2328
      }                                                                                                                // 3159
                                                                                                                       //
      if (self.strict && (reqRange.start >= vRef.size - 1 || reqRange.end > vRef.size - 1)) {                          // 2330
        responseType = '416';                                                                                          // 2331
      } else {                                                                                                         // 2330
        responseType = '206';                                                                                          // 2333
      }                                                                                                                // 2319
    } else {                                                                                                           // 2319
      responseType = '200';                                                                                            // 2335
    }                                                                                                                  // 3167
                                                                                                                       //
    streamErrorHandler = function (error) {                                                                            // 2337
      http.response.writeHead(500);                                                                                    // 2338
      http.response.end(error.toString());                                                                             // 2339
                                                                                                                       //
      if (self.debug) {                                                                                                // 2340
        console.error("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [500]", error);                   // 2340
      }                                                                                                                // 3173
    };                                                                                                                 // 2337
                                                                                                                       //
    headers = _.isFunction(self.responseHeaders) ? self.responseHeaders(responseType, fileRef, vRef, version) : self.responseHeaders;
                                                                                                                       //
    if (!headers['Cache-Control']) {                                                                                   // 2345
      http.response.setHeader('Cache-Control', self.cacheControl);                                                     // 2346
    }                                                                                                                  // 3178
                                                                                                                       //
    for (key in meteorBabelHelpers.sanitizeForInObject(headers)) {                                                     // 2348
      value = headers[key];                                                                                            // 3180
      http.response.setHeader(key, value);                                                                             // 2349
    }                                                                                                                  // 2348
                                                                                                                       //
    switch (responseType) {                                                                                            // 2351
      case '400':                                                                                                      // 2351
        if (self.debug) {                                                                                              // 2353
          console.warn("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [400] Content-Length mismatch!");
        }                                                                                                              // 3187
                                                                                                                       //
        text = 'Content-Length mismatch!';                                                                             // 2354
        http.response.writeHead(400, {                                                                                 // 2355
          'Content-Type': 'text/plain',                                                                                // 2356
          'Content-Length': text.length                                                                                // 2357
        });                                                                                                            // 2356
        http.response.end(text);                                                                                       // 2358
        break;                                                                                                         // 2359
                                                                                                                       //
      case '404':                                                                                                      // 2351
        return self._404(http);                                                                                        // 2361
        break;                                                                                                         // 2362
                                                                                                                       //
      case '416':                                                                                                      // 2351
        if (self.debug) {                                                                                              // 2364
          console.warn("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [416] Content-Range is not specified!");
        }                                                                                                              // 3201
                                                                                                                       //
        http.response.writeHead(416);                                                                                  // 2365
        http.response.end();                                                                                           // 2366
        break;                                                                                                         // 2367
                                                                                                                       //
      case '200':                                                                                                      // 2351
        if (self.debug) {                                                                                              // 2369
          console.info("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [200]");                         // 2369
        }                                                                                                              // 3208
                                                                                                                       //
        stream = readableStream || fs.createReadStream(vRef.path);                                                     // 2370
                                                                                                                       //
        if (readableStream) {                                                                                          // 2371
          http.response.writeHead(200);                                                                                // 2371
        }                                                                                                              // 3212
                                                                                                                       //
        stream.on('open', function () {                                                                                // 2372
          http.response.writeHead(200);                                                                                // 2373
        }).on('error', streamErrorHandler).on('end', function () {                                                     // 2372
          http.response.end();                                                                                         // 2377
        });                                                                                                            // 2372
                                                                                                                       //
        if (self.throttle) {                                                                                           // 2379
          stream.pipe(new Throttle({                                                                                   // 2379
            bps: self.throttle,                                                                                        // 2379
            chunksize: self.chunkSize                                                                                  // 2379
          }));                                                                                                         // 2379
        }                                                                                                              // 3223
                                                                                                                       //
        stream.pipe(http.response);                                                                                    // 2380
        break;                                                                                                         // 2381
                                                                                                                       //
      case '206':                                                                                                      // 2351
        if (self.debug) {                                                                                              // 2383
          console.info("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [206]");                         // 2383
        }                                                                                                              // 3229
                                                                                                                       //
        http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + vRef.size);    // 2384
        stream = readableStream || fs.createReadStream(vRef.path, {                                                    // 2385
          start: reqRange.start,                                                                                       // 2385
          end: reqRange.end                                                                                            // 2385
        });                                                                                                            // 2385
                                                                                                                       //
        if (readableStream) {                                                                                          // 2386
          http.response.writeHead(206);                                                                                // 2386
        }                                                                                                              // 3237
                                                                                                                       //
        stream.on('open', function () {                                                                                // 2387
          http.response.writeHead(206);                                                                                // 2388
        }).on('error', streamErrorHandler).on('end', function () {                                                     // 2387
          http.response.end();                                                                                         // 2392
        });                                                                                                            // 2387
                                                                                                                       //
        if (self.throttle) {                                                                                           // 2394
          stream.pipe(new Throttle({                                                                                   // 2394
            bps: self.throttle,                                                                                        // 2394
            chunksize: self.chunkSize                                                                                  // 2394
          }));                                                                                                         // 2394
        }                                                                                                              // 3248
                                                                                                                       //
        stream.pipe(http.response);                                                                                    // 2395
        break;                                                                                                         // 2396
    }                                                                                                                  // 2351
  } : void 0; /*                                                                                                       // 2292
              @locus Anywhere                                                                                          //
              @memberOf FilesCollection                                                                                //
              @name link                                                                                               //
              @param {Object} fileRef - File reference object                                                          //
              @param {String} version - Version of file you would like to request                                      //
              @summary Returns downloadable URL                                                                        //
              @returns {String} Empty string returned in case if file not found in DB                                  //
               */                                                                                                      //
                                                                                                                       //
  FilesCollection.prototype.link = function (fileRef, version) {                                                       // 3265
    if (version == null) {                                                                                             // 3266
      version = 'original';                                                                                            // 2409
    }                                                                                                                  // 3268
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2410
      console.info("[FilesCollection] [link(" + (fileRef != null ? fileRef._id : void 0) + ", " + version + ")]");     // 2410
    }                                                                                                                  // 3271
                                                                                                                       //
    check(fileRef, Object);                                                                                            // 2411
    check(version, String);                                                                                            // 2412
                                                                                                                       //
    if (!fileRef) {                                                                                                    // 2413
      return '';                                                                                                       // 2413
    }                                                                                                                  // 3276
                                                                                                                       //
    return formatFleURL(fileRef, version);                                                                             // 2414
  };                                                                                                                   // 2409
                                                                                                                       //
  return FilesCollection;                                                                                              // 3280
}()); /*                                                                                                               // 3282
      @locus Anywhere                                                                                                  //
      @private                                                                                                         //
      @name formatFleURL                                                                                               //
      @param {Object} fileRef - File reference object                                                                  //
      @param {String} version - [Optional] Version of file you would like build URL for                                //
      @summary Returns formatted URL for file                                                                          //
      @returns {String} Downloadable link                                                                              //
       */                                                                                                              //
                                                                                                                       //
formatFleURL = function (fileRef, version) {                                                                           // 2425
  var ext, ref, root;                                                                                                  // 2426
                                                                                                                       //
  if (version == null) {                                                                                               // 3297
    version = 'original';                                                                                              // 2425
  }                                                                                                                    // 3299
                                                                                                                       //
  check(fileRef, Object);                                                                                              // 2426
  check(version, String);                                                                                              // 2427
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                       // 2429
                                                                                                                       //
  if ((ref = fileRef.extension) != null ? ref.length : void 0) {                                                       // 2431
    ext = '.' + fileRef.extension;                                                                                     // 2432
  } else {                                                                                                             // 2431
    ext = '';                                                                                                          // 2434
  }                                                                                                                    // 3307
                                                                                                                       //
  if (fileRef["public"] === true) {                                                                                    // 2436
    return root + (version === 'original' ? fileRef._downloadRoute + "/" + fileRef._id + ext : fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);
  } else {                                                                                                             // 2436
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                    // 3312
};                                                                                                                     // 2425
                                                                                                                       //
if (Meteor.isClient) {                                                                                                 // 2441
  /*                                                                                                                   // 2442
  @locus Client                                                                                                        //
  @TemplateHelper                                                                                                      //
  @name fileURL                                                                                                        //
  @param {Object} fileRef - File reference object                                                                      //
  @param {String} version - [Optional] Version of file you would like to request                                       //
  @summary Get download URL for file by fileRef, even without subscription                                             //
  @example {{fileURL fileRef}}                                                                                         //
  @returns {String}                                                                                                    //
   */Meteor.startup(function () {                                                                                      //
    if (typeof Template !== "undefined" && Template !== null) {                                                        // 2453
      Template.registerHelper('fileURL', function (fileRef, version) {                                                 // 2454
        if (!fileRef || !_.isObject(fileRef)) {                                                                        // 2455
          return void 0;                                                                                               // 2455
        }                                                                                                              // 3332
                                                                                                                       //
        version = !version || !_.isString(version) ? 'original' : version;                                             // 2456
                                                                                                                       //
        if (fileRef._id) {                                                                                             // 2457
          return formatFleURL(fileRef, version);                                                                       // 2458
        } else {                                                                                                       // 2457
          return '';                                                                                                   // 2460
        }                                                                                                              // 3338
      });                                                                                                              // 2454
    }                                                                                                                  // 3340
  });                                                                                                                  // 2452
} /*                                                                                                                   // 3342
  Export the FilesCollection class                                                                                     //
   */                                                                                                                  //
                                                                                                                       //
Meteor.Files = FilesCollection;                                                                                        // 2466
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
    var value = void 0;                                                                                                // 270
    var single = remove ? this.removeListener : this.addListener;                                                      // 271
    var multiple = remove ? this.removeListeners : this.addListeners; // If evt is an object then pass each of its properties to this method
                                                                                                                       //
    if ((typeof evt === "undefined" ? "undefined" : (0, _typeof3.default)(evt)) === 'object' && !(evt instanceof RegExp)) {
      for (i in meteorBabelHelpers.sanitizeForInObject(evt)) {                                                         // 276
        if (evt.hasOwnProperty(i) && (value = evt[i])) {                                                               // 277
          // Pass the single listener straight through to the singular method                                          // 278
          if (typeof value === 'function') {                                                                           // 279
            single.call(this, i, value);                                                                               // 280
          } else {                                                                                                     // 281
            // Otherwise pass back to the multiple function                                                            // 282
            multiple.call(this, i, value);                                                                             // 283
          }                                                                                                            // 284
        }                                                                                                              // 285
      }                                                                                                                // 286
    } else {                                                                                                           // 287
      // So evt must be a string                                                                                       // 288
      // And listeners must be an array of listeners                                                                   // 289
      // Loop over it and pass each one to the multiple method                                                         // 290
      i = listeners.length;                                                                                            // 291
                                                                                                                       //
      while (i--) {                                                                                                    // 292
        single.call(this, evt, listeners[i]);                                                                          // 293
      }                                                                                                                // 294
    }                                                                                                                  // 295
                                                                                                                       //
    return this;                                                                                                       // 297
  }                                                                                                                    // 298
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
proto.removeEvent = function () {                                                                                      // 309
  function removeEvent(evt) {                                                                                          // 309
    var type = typeof evt === "undefined" ? "undefined" : (0, _typeof3.default)(evt);                                  // 310
                                                                                                                       //
    var events = this._getEvents();                                                                                    // 311
                                                                                                                       //
    var key = void 0; // Remove different things depending on the state of evt                                         // 312
                                                                                                                       //
    if (type === 'string') {                                                                                           // 315
      // Remove all listeners for the specified event                                                                  // 316
      delete events[evt];                                                                                              // 317
    } else if (evt instanceof RegExp) {                                                                                // 318
      // Remove all events matching the regex.                                                                         // 319
      for (key in meteorBabelHelpers.sanitizeForInObject(events)) {                                                    // 320
        if (events.hasOwnProperty(key) && evt.test(key)) {                                                             // 321
          delete events[key];                                                                                          // 322
        }                                                                                                              // 323
      }                                                                                                                // 324
    } else {                                                                                                           // 325
      // Remove all listeners in all events                                                                            // 326
      delete this._events;                                                                                             // 327
    }                                                                                                                  // 328
                                                                                                                       //
    return this;                                                                                                       // 330
  }                                                                                                                    // 331
                                                                                                                       //
  return removeEvent;                                                                                                  // 309
}(); /**                                                                                                               // 309
      * Alias of removeEvent.                                                                                          //
      *                                                                                                                //
      * Added to mirror the node API.                                                                                  //
      */                                                                                                               //
                                                                                                                       //
proto.removeAllListeners = alias('removeEvent'); /**                                                                   // 338
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
proto.emitEvent = function () {                                                                                        // 352
  function emitEvent(evt, args) {                                                                                      // 352
    var listenersMap = this.getListenersAsObject(evt);                                                                 // 353
    var listeners = void 0;                                                                                            // 354
    var listener = void 0;                                                                                             // 355
    var i = void 0;                                                                                                    // 356
    var key = void 0;                                                                                                  // 357
    var response = void 0;                                                                                             // 358
                                                                                                                       //
    for (key in meteorBabelHelpers.sanitizeForInObject(listenersMap)) {                                                // 360
      if (listenersMap.hasOwnProperty(key)) {                                                                          // 361
        listeners = listenersMap[key].slice(0);                                                                        // 362
        i = listeners.length;                                                                                          // 363
                                                                                                                       //
        while (i--) {                                                                                                  // 365
          // If the listener returns true then it shall be removed from the event                                      // 366
          // The function is executed either with a basic call or an apply if there is an args array                   // 367
          listener = listeners[i];                                                                                     // 368
                                                                                                                       //
          if (listener.once === true) {                                                                                // 370
            this.removeListener(evt, listener.listener);                                                               // 371
          }                                                                                                            // 372
                                                                                                                       //
          response = listener.listener.apply(this, args || []);                                                        // 374
                                                                                                                       //
          if (response === this._getOnceReturnValue()) {                                                               // 376
            this.removeListener(evt, listener.listener);                                                               // 377
          }                                                                                                            // 378
        }                                                                                                              // 379
      }                                                                                                                // 380
    }                                                                                                                  // 381
                                                                                                                       //
    return this;                                                                                                       // 383
  }                                                                                                                    // 384
                                                                                                                       //
  return emitEvent;                                                                                                    // 352
}(); /**                                                                                                               // 352
      * Alias of emitEvent                                                                                             //
      */                                                                                                               //
                                                                                                                       //
proto.trigger = alias('emitEvent'); /**                                                                                // 389
                                     * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
                                     * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
                                     *                                                                                 //
                                     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
                                     * @param {...*} Optional additional arguments to be passed to each listener.      //
                                     * @return {Object} Current instance of EventEmitter for chaining.                 //
                                     */                                                                                //
                                                                                                                       //
proto.emit = function () {                                                                                             // 399
  function emit(evt) {                                                                                                 // 399
    var args = Array.prototype.slice.call(arguments, 1);                                                               // 400
    return this.emitEvent(evt, args);                                                                                  // 401
  }                                                                                                                    // 402
                                                                                                                       //
  return emit;                                                                                                         // 399
}(); /**                                                                                                               // 399
      * Sets the current value to check against when executing listeners. If a                                         //
      * listeners return value matches the one set here then it will be removed                                        //
      * after execution. This value defaults to true.                                                                  //
      *                                                                                                                //
      * @param {*} value The new value to check for when executing listeners.                                          //
      * @return {Object} Current instance of EventEmitter for chaining.                                                //
      */                                                                                                               //
                                                                                                                       //
proto.setOnceReturnValue = function () {                                                                               // 412
  function setOnceReturnValue(value) {                                                                                 // 412
    this._onceReturnValue = value;                                                                                     // 413
    return this;                                                                                                       // 414
  }                                                                                                                    // 415
                                                                                                                       //
  return setOnceReturnValue;                                                                                           // 412
}(); /**                                                                                                               // 412
      * Fetches the current value to check against when executing listeners. If                                        //
      * the listeners return value matches this one then it should be removed                                          //
      * automatically. It will return true by default.                                                                 //
      *                                                                                                                //
      * @return {*|Boolean} The current value to check for or the default, true.                                       //
      * @api private                                                                                                   //
      */                                                                                                               //
                                                                                                                       //
proto._getOnceReturnValue = function () {                                                                              // 425
  function _getOnceReturnValue() {                                                                                     // 425
    if (this.hasOwnProperty('_onceReturnValue')) {                                                                     // 426
      return this._onceReturnValue;                                                                                    // 427
    }                                                                                                                  // 428
                                                                                                                       //
    return true;                                                                                                       // 429
  }                                                                                                                    // 430
                                                                                                                       //
  return _getOnceReturnValue;                                                                                          // 425
}(); /**                                                                                                               // 425
      * Fetches the events object and creates one if required.                                                         //
      *                                                                                                                //
      * @return {Object} The events storage object.                                                                    //
      * @api private                                                                                                   //
      */                                                                                                               //
                                                                                                                       //
proto._getEvents = function () {                                                                                       // 438
  function _getEvents() {                                                                                              // 438
    return this._events || (this._events = {});                                                                        // 439
  }                                                                                                                    // 440
                                                                                                                       //
  return _getEvents;                                                                                                   // 438
}(); /**                                                                                                               // 438
      * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.         //
      *                                                                                                                //
      * @return {Function} Non conflicting EventEmitter class.                                                         //
      */                                                                                                               //
                                                                                                                       //
EventEmitter.noConflict = function () {                                                                                // 447
  function noConflict() {                                                                                              // 447
    _exports.EventEmitter = originalGlobalValue;                                                                       // 448
    return EventEmitter;                                                                                               // 449
  }                                                                                                                    // 450
                                                                                                                       //
  return noConflict;                                                                                                   // 447
}(); // Expose the class                                                                                               // 447
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
