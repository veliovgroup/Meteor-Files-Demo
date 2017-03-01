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
        Meteor.startup(function () {                                                                                   // 569
          setTokenCookie();                                                                                            // 570
        });                                                                                                            // 569
        Accounts.onLogin(function () {                                                                                 // 572
          setTokenCookie();                                                                                            // 573
        });                                                                                                            // 572
        Accounts.onLogout(function () {                                                                                // 575
          unsetTokenCookie();                                                                                          // 576
        });                                                                                                            // 575
      }                                                                                                                // 837
                                                                                                                       //
      check(this.onbeforeunloadMessage, Match.OneOf(String, Function));                                                // 579
      _URL = window.URL || window.webkitURL || window.mozURL || window.msURL || window.oURL || false;                  // 581
                                                                                                                       //
      if ((typeof window !== "undefined" && window !== null ? window.Worker : void 0) && (typeof window !== "undefined" && window !== null ? window.Blob : void 0) && _URL) {
        this._supportWebWorker = true;                                                                                 // 583
        this._webWorkerUrl = _URL.createObjectURL(new Blob(['!function(a){"use strict";a.onmessage=function(b){var c=b.data.f.slice(b.data.cs*(b.data.cc-1),b.data.cs*b.data.cc);if(b.data.ib===!0)postMessage({bin:c,chunkId:b.data.cc});else{var d;a.FileReader?(d=new FileReader,d.onloadend=function(a){postMessage({bin:(d.result||a.srcElement||a.target).split(",")[1],chunkId:b.data.cc,s:b.data.s})},d.onerror=function(a){throw(a.target||a.srcElement).error},d.readAsDataURL(c)):a.FileReaderSync?(d=new FileReaderSync,postMessage({bin:d.readAsDataURL(c).split(",")[1],chunkId:b.data.cc})):postMessage({bin:null,chunkId:b.data.cc,error:"File API is not supported in WebWorker!"})}}}(this);'], {
          type: 'application/javascript'                                                                               // 584
        }));                                                                                                           // 584
      } else if (typeof window !== "undefined" && window !== null ? window.Worker : void 0) {                          // 582
        this._supportWebWorker = true;                                                                                 // 586
        this._webWorkerUrl = Meteor.absoluteUrl('packages/ostrio_files/worker.min.js');                                // 587
      } else {                                                                                                         // 585
        this._supportWebWorker = false;                                                                                // 589
      }                                                                                                                // 539
    } else {                                                                                                           // 539
      if (this.strict == null) {                                                                                       // 852
        this.strict = true;                                                                                            // 592
      }                                                                                                                // 854
                                                                                                                       //
      if (this.throttle == null) {                                                                                     // 855
        this.throttle = false;                                                                                         // 593
      }                                                                                                                // 857
                                                                                                                       //
      if (this.permissions == null) {                                                                                  // 858
        this.permissions = parseInt('644', 8);                                                                         // 594
      }                                                                                                                // 860
                                                                                                                       //
      if (this.parentDirPermissions == null) {                                                                         // 861
        this.parentDirPermissions = parseInt('755', 8);                                                                // 595
      }                                                                                                                // 863
                                                                                                                       //
      if (this.cacheControl == null) {                                                                                 // 864
        this.cacheControl = 'public, max-age=31536000, s-maxage=31536000';                                             // 596
      }                                                                                                                // 866
                                                                                                                       //
      if (this.onAfterUpload == null) {                                                                                // 867
        this.onAfterUpload = false;                                                                                    // 597
      }                                                                                                                // 869
                                                                                                                       //
      if (this.onAfterRemove == null) {                                                                                // 870
        this.onAfterRemove = false;                                                                                    // 598
      }                                                                                                                // 872
                                                                                                                       //
      if (this.onBeforeRemove == null) {                                                                               // 873
        this.onBeforeRemove = false;                                                                                   // 599
      }                                                                                                                // 875
                                                                                                                       //
      if (this.integrityCheck == null) {                                                                               // 876
        this.integrityCheck = true;                                                                                    // 600
      }                                                                                                                // 878
                                                                                                                       //
      if (this._currentUploads == null) {                                                                              // 879
        this._currentUploads = {};                                                                                     // 601
      }                                                                                                                // 881
                                                                                                                       //
      if (this.downloadCallback == null) {                                                                             // 882
        this.downloadCallback = false;                                                                                 // 602
      }                                                                                                                // 884
                                                                                                                       //
      if (this.continueUploadTTL == null) {                                                                            // 885
        this.continueUploadTTL = 10800;                                                                                // 603
      }                                                                                                                // 887
                                                                                                                       //
      if (this.responseHeaders == null) {                                                                              // 888
        this.responseHeaders = function (responseCode, fileRef, versionRef) {                                          // 604
          var headers;                                                                                                 // 605
          headers = {};                                                                                                // 605
                                                                                                                       //
          switch (responseCode) {                                                                                      // 606
            case '206':                                                                                                // 606
              headers['Pragma'] = 'private';                                                                           // 608
              headers['Trailer'] = 'expires';                                                                          // 609
              headers['Transfer-Encoding'] = 'chunked';                                                                // 610
              break;                                                                                                   // 607
                                                                                                                       //
            case '400':                                                                                                // 606
              headers['Cache-Control'] = 'no-cache';                                                                   // 612
              break;                                                                                                   // 611
                                                                                                                       //
            case '416':                                                                                                // 606
              headers['Content-Range'] = "bytes */" + versionRef.size;                                                 // 614
          }                                                                                                            // 606
                                                                                                                       //
          headers['Connection'] = 'keep-alive';                                                                        // 616
          headers['Content-Type'] = versionRef.type || 'application/octet-stream';                                     // 617
          headers['Accept-Ranges'] = 'bytes';                                                                          // 618
          return headers;                                                                                              // 619
        };                                                                                                             // 604
      }                                                                                                                // 909
                                                                                                                       //
      if (this["public"] && !storagePath) {                                                                            // 621
        throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "] \"storagePath\" must be set on \"public\" collections! Note: \"storagePath\" must be equal on be inside of your web/proxy-server (absolute) root.");
      }                                                                                                                // 912
                                                                                                                       //
      if (this.debug) {                                                                                                // 624
        console.info('[FilesCollection.storagePath] Set to:', this.storagePath({}));                                   // 624
      }                                                                                                                // 915
                                                                                                                       //
      fs.mkdirs(this.storagePath({}), {                                                                                // 626
        mode: this.parentDirPermissions                                                                                // 626
      }, function (error) {                                                                                            // 626
        if (error) {                                                                                                   // 627
          throw new Meteor.Error(401, "[FilesCollection." + self.collectionName + "] Path \"" + self.storagePath({}) + "\" is not writable!", error);
        }                                                                                                              // 921
      });                                                                                                              // 626
      check(this.strict, Boolean);                                                                                     // 631
      check(this.throttle, Match.OneOf(false, Number));                                                                // 632
      check(this.permissions, Number);                                                                                 // 633
      check(this.storagePath, Function);                                                                               // 634
      check(this.cacheControl, String);                                                                                // 635
      check(this.onAfterRemove, Match.OneOf(false, Function));                                                         // 636
      check(this.onAfterUpload, Match.OneOf(false, Function));                                                         // 637
      check(this.integrityCheck, Boolean);                                                                             // 638
      check(this.onBeforeRemove, Match.OneOf(false, Function));                                                        // 639
      check(this.downloadCallback, Match.OneOf(false, Function));                                                      // 640
      check(this.interceptDownload, Match.OneOf(false, Function));                                                     // 641
      check(this.continueUploadTTL, Number);                                                                           // 642
      check(this.responseHeaders, Match.OneOf(Object, Function));                                                      // 643
      this._preCollection = new Mongo.Collection('__pre_' + this.collectionName);                                      // 645
                                                                                                                       //
      this._preCollection._ensureIndex({                                                                               // 646
        createdAt: 1                                                                                                   // 646
      }, {                                                                                                             // 646
        expireAfterSeconds: this.continueUploadTTL,                                                                    // 646
        background: true                                                                                               // 646
      });                                                                                                              // 646
                                                                                                                       //
      _preCollectionCursor = this._preCollection.find({}, {                                                            // 647
        fields: {                                                                                                      // 648
          _id: 1,                                                                                                      // 649
          isFinished: 1                                                                                                // 650
        }                                                                                                              // 649
      });                                                                                                              // 647
                                                                                                                       //
      _preCollectionCursor.observe({                                                                                   // 652
        changed: function (doc) {                                                                                      // 653
          if (doc.isFinished) {                                                                                        // 654
            if (self.debug) {                                                                                          // 655
              console.info("[FilesCollection] [_preCollectionCursor.observe] [changed]: " + doc._id);                  // 655
            }                                                                                                          // 954
                                                                                                                       //
            self._preCollection.remove({                                                                               // 656
              _id: doc._id                                                                                             // 656
            }, NOOP);                                                                                                  // 656
          }                                                                                                            // 958
        },                                                                                                             // 653
        removed: function (doc) {                                                                                      // 658
          var ref;                                                                                                     // 661
                                                                                                                       //
          if (self.debug) {                                                                                            // 661
            console.info("[FilesCollection] [_preCollectionCursor.observe] [removed]: " + doc._id);                    // 661
          }                                                                                                            // 964
                                                                                                                       //
          if ((ref = self._currentUploads) != null ? ref[doc._id] : void 0) {                                          // 662
            self._currentUploads[doc._id].stop();                                                                      // 663
                                                                                                                       //
            self._currentUploads[doc._id].end();                                                                       // 664
                                                                                                                       //
            if (!doc.isFinished) {                                                                                     // 666
              if (self.debug) {                                                                                        // 667
                console.info("[FilesCollection] [_preCollectionCursor.observe] [removeUnfinishedUpload]: " + doc._id);
              }                                                                                                        // 971
                                                                                                                       //
              self._currentUploads[doc._id].abort();                                                                   // 668
            }                                                                                                          // 973
                                                                                                                       //
            delete self._currentUploads[doc._id];                                                                      // 670
          }                                                                                                            // 975
        }                                                                                                              // 653
      });                                                                                                              // 653
                                                                                                                       //
      this._createStream = function (_id, path, opts) {                                                                // 673
        return self._currentUploads[_id] = new writeStream(path, opts.fileLength, opts, self.permissions);             // 674
      };                                                                                                               // 673
                                                                                                                       //
      this._continueUpload = function (_id) {                                                                          // 678
        var contUpld, ref, ref1;                                                                                       // 679
                                                                                                                       //
        if ((ref = self._currentUploads) != null ? (ref1 = ref[_id]) != null ? ref1.file : void 0 : void 0) {          // 679
          if (!self._currentUploads[_id].aborted && !self._currentUploads[_id].ended) {                                // 680
            return self._currentUploads[_id].file;                                                                     // 681
          } else {                                                                                                     // 680
            self._createStream(_id, self._currentUploads[_id].file.file.path, self._currentUploads[_id].file);         // 683
                                                                                                                       //
            return self._currentUploads[_id].file;                                                                     // 684
          }                                                                                                            // 679
        } else {                                                                                                       // 679
          contUpld = self._preCollection.findOne({                                                                     // 686
            _id: _id                                                                                                   // 686
          });                                                                                                          // 686
                                                                                                                       //
          if (contUpld) {                                                                                              // 687
            self._createStream(_id, contUpld.file.path, contUpld.file);                                                // 688
          }                                                                                                            // 996
                                                                                                                       //
          return contUpld;                                                                                             // 689
        }                                                                                                              // 998
      };                                                                                                               // 678
    }                                                                                                                  // 1000
                                                                                                                       //
    if (!this.schema) {                                                                                                // 691
      this.schema = {                                                                                                  // 692
        size: {                                                                                                        // 693
          type: Number                                                                                                 // 693
        },                                                                                                             // 693
        name: {                                                                                                        // 694
          type: String                                                                                                 // 694
        },                                                                                                             // 694
        type: {                                                                                                        // 695
          type: String                                                                                                 // 695
        },                                                                                                             // 695
        path: {                                                                                                        // 696
          type: String                                                                                                 // 696
        },                                                                                                             // 696
        isVideo: {                                                                                                     // 697
          type: Boolean                                                                                                // 697
        },                                                                                                             // 697
        isAudio: {                                                                                                     // 698
          type: Boolean                                                                                                // 698
        },                                                                                                             // 698
        isImage: {                                                                                                     // 699
          type: Boolean                                                                                                // 699
        },                                                                                                             // 699
        isText: {                                                                                                      // 700
          type: Boolean                                                                                                // 700
        },                                                                                                             // 700
        isJSON: {                                                                                                      // 701
          type: Boolean                                                                                                // 701
        },                                                                                                             // 701
        isPDF: {                                                                                                       // 702
          type: Boolean                                                                                                // 702
        },                                                                                                             // 702
        extension: {                                                                                                   // 703
          type: String,                                                                                                // 704
          optional: true                                                                                               // 705
        },                                                                                                             // 704
        _storagePath: {                                                                                                // 706
          type: String                                                                                                 // 706
        },                                                                                                             // 706
        _downloadRoute: {                                                                                              // 707
          type: String                                                                                                 // 707
        },                                                                                                             // 707
        _collectionName: {                                                                                             // 708
          type: String                                                                                                 // 708
        },                                                                                                             // 708
        "public": {                                                                                                    // 709
          type: Boolean,                                                                                               // 710
          optional: true                                                                                               // 711
        },                                                                                                             // 710
        meta: {                                                                                                        // 712
          type: Object,                                                                                                // 713
          blackbox: true,                                                                                              // 714
          optional: true                                                                                               // 715
        },                                                                                                             // 713
        userId: {                                                                                                      // 716
          type: String,                                                                                                // 717
          optional: true                                                                                               // 718
        },                                                                                                             // 717
        updatedAt: {                                                                                                   // 719
          type: Date,                                                                                                  // 720
          optional: true                                                                                               // 721
        },                                                                                                             // 720
        versions: {                                                                                                    // 722
          type: Object,                                                                                                // 723
          blackbox: true                                                                                               // 724
        }                                                                                                              // 723
      };                                                                                                               // 693
    }                                                                                                                  // 1068
                                                                                                                       //
    check(this.debug, Boolean);                                                                                        // 726
    check(this.schema, Object);                                                                                        // 727
    check(this["public"], Boolean);                                                                                    // 728
    check(this["protected"], Match.OneOf(Boolean, Function));                                                          // 729
    check(this.chunkSize, Number);                                                                                     // 730
    check(this.downloadRoute, String);                                                                                 // 731
    check(this.namingFunction, Match.OneOf(false, Function));                                                          // 732
    check(this.onBeforeUpload, Match.OneOf(false, Function));                                                          // 733
    check(this.onInitiateUpload, Match.OneOf(false, Function));                                                        // 734
    check(this.allowClientCode, Boolean);                                                                              // 735
    check(this.ddp, Match.Any);                                                                                        // 736
                                                                                                                       //
    if (this["public"] && this["protected"]) {                                                                         // 738
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                                  // 1082
                                                                                                                       //
    this._checkAccess = function (http) {                                                                              // 741
      var fileRef, rc, ref, ref1, result, text, user, userId;                                                          // 742
                                                                                                                       //
      if (self["protected"]) {                                                                                         // 742
        ref = self._getUser(http), user = ref.user, userId = ref.userId;                                               // 743
                                                                                                                       //
        if (_.isFunction(self["protected"])) {                                                                         // 745
          if (http != null ? (ref1 = http.params) != null ? ref1._id : void 0 : void 0) {                              // 746
            fileRef = self.collection.findOne(http.params._id);                                                        // 747
          }                                                                                                            // 1090
                                                                                                                       //
          result = http ? self["protected"].call(_.extend(http, {                                                      // 749
            user: user,                                                                                                // 749
            userId: userId                                                                                             // 749
          }), fileRef || null) : self["protected"].call({                                                              // 749
            user: user,                                                                                                // 749
            userId: userId                                                                                             // 749
          }, fileRef || null);                                                                                         // 749
        } else {                                                                                                       // 745
          result = !!userId;                                                                                           // 751
        }                                                                                                              // 1100
                                                                                                                       //
        if (http && result === true || !http) {                                                                        // 753
          return true;                                                                                                 // 754
        } else {                                                                                                       // 753
          rc = _.isNumber(result) ? result : 401;                                                                      // 756
                                                                                                                       //
          if (self.debug) {                                                                                            // 757
            console.warn('[FilesCollection._checkAccess] WARN: Access denied!');                                       // 757
          }                                                                                                            // 1107
                                                                                                                       //
          if (http) {                                                                                                  // 758
            text = 'Access denied!';                                                                                   // 759
            http.response.writeHead(rc, {                                                                              // 760
              'Content-Length': text.length,                                                                           // 761
              'Content-Type': 'text/plain'                                                                             // 762
            });                                                                                                        // 761
            http.response.end(text);                                                                                   // 763
          }                                                                                                            // 1115
                                                                                                                       //
          return false;                                                                                                // 764
        }                                                                                                              // 742
      } else {                                                                                                         // 742
        return true;                                                                                                   // 766
      }                                                                                                                // 1120
    };                                                                                                                 // 741
                                                                                                                       //
    this._methodNames = {                                                                                              // 768
      _Abort: "_FilesCollectionAbort_" + this.collectionName,                                                          // 769
      _Write: "_FilesCollectionWrite_" + this.collectionName,                                                          // 770
      _Start: "_FilesCollectionStart_" + this.collectionName,                                                          // 771
      _Remove: "_FilesCollectionRemove_" + this.collectionName                                                         // 772
    };                                                                                                                 // 769
                                                                                                                       //
    if (Meteor.isServer) {                                                                                             // 774
      this.on('_handleUpload', this._handleUpload);                                                                    // 775
      this.on('_finishUpload', this._finishUpload);                                                                    // 776
      WebApp.connectHandlers.use(function (request, response, next) {                                                  // 778
        var _file, body, handleError, http, params, uri, uris, version;                                                // 779
                                                                                                                       //
        if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName + "/__upload")) {        // 779
          if (request.method === 'POST') {                                                                             // 780
            handleError = function (error) {                                                                           // 782
              console.warn("[FilesCollection] [Upload] [HTTP] Exception:", error);                                     // 783
              response.writeHead(500);                                                                                 // 784
              response.end(JSON.stringify({                                                                            // 785
                error: error                                                                                           // 785
              }));                                                                                                     // 785
            };                                                                                                         // 782
                                                                                                                       //
            body = '';                                                                                                 // 788
            request.on('data', function (data) {                                                                       // 789
              return bound(function () {                                                                               // 1144
                body += data;                                                                                          // 790
              });                                                                                                      // 789
            });                                                                                                        // 789
            request.on('end', function () {                                                                            // 793
              return bound(function () {                                                                               // 1149
                var _continueUpload, e, error, opts, ref, ref1, ref2, ref3, result, user;                              // 794
                                                                                                                       //
                try {                                                                                                  // 794
                  if (request.headers['x-mtok'] && ((ref = Meteor.server.sessions) != null ? ref[request.headers['x-mtok']] : void 0)) {
                    user = {                                                                                           // 796
                      userId: (ref1 = Meteor.server.sessions[request.headers['x-mtok']]) != null ? ref1.userId : void 0
                    };                                                                                                 // 796
                  } else {                                                                                             // 795
                    user = self._getUser({                                                                             // 798
                      request: request,                                                                                // 798
                      response: response                                                                               // 798
                    });                                                                                                // 798
                  }                                                                                                    // 1161
                                                                                                                       //
                  if (request.headers['x-start'] !== '1') {                                                            // 800
                    opts = {                                                                                           // 801
                      fileId: request.headers['x-fileid']                                                              // 801
                    };                                                                                                 // 801
                                                                                                                       //
                    if (request.headers['x-eof'] === '1') {                                                            // 802
                      opts.eof = true;                                                                                 // 803
                    } else {                                                                                           // 802
                      if (typeof Buffer.from === 'function') {                                                         // 805
                        try {                                                                                          // 806
                          opts.binData = Buffer.from(body, 'base64');                                                  // 807
                        } catch (error1) {                                                                             // 806
                          e = error1;                                                                                  // 808
                          opts.binData = new Buffer(body, 'base64');                                                   // 809
                        }                                                                                              // 805
                      } else {                                                                                         // 805
                        opts.binData = new Buffer(body, 'base64');                                                     // 811
                      }                                                                                                // 1178
                                                                                                                       //
                      opts.chunkId = parseInt(request.headers['x-chunkid']);                                           // 812
                    }                                                                                                  // 1180
                                                                                                                       //
                    _continueUpload = self._continueUpload(opts.fileId);                                               // 814
                                                                                                                       //
                    if (!_continueUpload) {                                                                            // 815
                      throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');     // 816
                    }                                                                                                  // 1184
                                                                                                                       //
                    ref2 = self._prepareUpload(_.extend(opts, _continueUpload), user.userId, 'HTTP'), result = ref2.result, opts = ref2.opts;
                                                                                                                       //
                    if (opts.eof) {                                                                                    // 820
                      self._handleUpload(result, opts, function () {                                                   // 821
                        var ref3;                                                                                      // 822
                        response.writeHead(200);                                                                       // 822
                                                                                                                       //
                        if (result != null ? (ref3 = result.file) != null ? ref3.meta : void 0 : void 0) {             // 823
                          result.file.meta = fixJSONStringify(result.file.meta);                                       // 823
                        }                                                                                              // 1192
                                                                                                                       //
                        response.end(JSON.stringify(result));                                                          // 824
                      });                                                                                              // 821
                                                                                                                       //
                      return;                                                                                          // 826
                    } else {                                                                                           // 820
                      self.emit('_handleUpload', result, opts, NOOP);                                                  // 828
                    }                                                                                                  // 1198
                                                                                                                       //
                    response.writeHead(204);                                                                           // 830
                    response.end();                                                                                    // 831
                  } else {                                                                                             // 800
                    opts = JSON.parse(body);                                                                           // 834
                    opts.___s = true;                                                                                  // 835
                                                                                                                       //
                    if (self.debug) {                                                                                  // 836
                      console.info("[FilesCollection] [File Start HTTP] " + opts.file.name + " - " + opts.fileId);     // 836
                    }                                                                                                  // 1206
                                                                                                                       //
                    if (opts != null ? (ref3 = opts.file) != null ? ref3.meta : void 0 : void 0) {                     // 837
                      opts.file.meta = fixJSONParse(opts.file.meta);                                                   // 837
                    }                                                                                                  // 1209
                                                                                                                       //
                    result = self._prepareUpload(_.clone(opts), user.userId, 'HTTP Start Method').result;              // 838
                                                                                                                       //
                    if (self.collection.findOne(result._id)) {                                                         // 839
                      throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');                 // 840
                    }                                                                                                  // 1213
                                                                                                                       //
                    opts._id = opts.fileId;                                                                            // 841
                    opts.createdAt = new Date();                                                                       // 842
                                                                                                                       //
                    self._preCollection.insert(_.omit(opts, '___s'));                                                  // 843
                                                                                                                       //
                    self._createStream(result._id, result.path, _.omit(opts, '___s'));                                 // 844
                                                                                                                       //
                    if (opts.returnMeta) {                                                                             // 846
                      response.writeHead(200);                                                                         // 847
                      response.end(JSON.stringify({                                                                    // 848
                        uploadRoute: self.downloadRoute + "/" + self.collectionName + "/__upload",                     // 849
                        file: result                                                                                   // 850
                      }));                                                                                             // 848
                    } else {                                                                                           // 846
                      response.writeHead(204);                                                                         // 853
                      response.end();                                                                                  // 854
                    }                                                                                                  // 800
                  }                                                                                                    // 794
                } catch (error1) {                                                                                     // 794
                  error = error1;                                                                                      // 855
                  handleError(error);                                                                                  // 856
                }                                                                                                      // 1232
              });                                                                                                      // 793
            });                                                                                                        // 793
          } else {                                                                                                     // 780
            next();                                                                                                    // 859
          }                                                                                                            // 1237
                                                                                                                       //
          return;                                                                                                      // 860
        }                                                                                                              // 1239
                                                                                                                       //
        if (!self["public"]) {                                                                                         // 862
          if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {                    // 863
            uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');                 // 864
                                                                                                                       //
            if (uri.indexOf('/') === 0) {                                                                              // 865
              uri = uri.substring(1);                                                                                  // 866
            }                                                                                                          // 1245
                                                                                                                       //
            uris = uri.split('/');                                                                                     // 868
                                                                                                                       //
            if (uris.length === 3) {                                                                                   // 869
              params = {                                                                                               // 870
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                _id: uris[0],                                                                                          // 872
                version: uris[1],                                                                                      // 873
                name: uris[2]                                                                                          // 874
              };                                                                                                       // 871
              http = {                                                                                                 // 875
                request: request,                                                                                      // 875
                response: response,                                                                                    // 875
                params: params                                                                                         // 875
              };                                                                                                       // 875
                                                                                                                       //
              if (self._checkAccess(http)) {                                                                           // 876
                self.download(http, uris[1], self.collection.findOne(uris[0]));                                        // 876
              }                                                                                                        // 869
            } else {                                                                                                   // 869
              next();                                                                                                  // 878
            }                                                                                                          // 863
          } else {                                                                                                     // 863
            next();                                                                                                    // 880
          }                                                                                                            // 862
        } else {                                                                                                       // 862
          if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                           // 882
            uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                        // 883
                                                                                                                       //
            if (uri.indexOf('/') === 0) {                                                                              // 884
              uri = uri.substring(1);                                                                                  // 885
            }                                                                                                          // 1273
                                                                                                                       //
            uris = uri.split('/');                                                                                     // 887
            _file = uris[uris.length - 1];                                                                             // 888
                                                                                                                       //
            if (_file) {                                                                                               // 889
              if (!!~_file.indexOf('-')) {                                                                             // 890
                version = _file.split('-')[0];                                                                         // 891
                _file = _file.split('-')[1].split('?')[0];                                                             // 892
              } else {                                                                                                 // 890
                version = 'original';                                                                                  // 894
                _file = _file.split('?')[0];                                                                           // 895
              }                                                                                                        // 1283
                                                                                                                       //
              params = {                                                                                               // 897
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                file: _file,                                                                                           // 899
                _id: _file.split('.')[0],                                                                              // 900
                version: version,                                                                                      // 901
                name: _file                                                                                            // 902
              };                                                                                                       // 898
              http = {                                                                                                 // 903
                request: request,                                                                                      // 903
                response: response,                                                                                    // 903
                params: params                                                                                         // 903
              };                                                                                                       // 903
              self.download(http, version, self.collection.findOne(params._id));                                       // 904
            } else {                                                                                                   // 889
              next();                                                                                                  // 906
            }                                                                                                          // 882
          } else {                                                                                                     // 882
            next();                                                                                                    // 908
          }                                                                                                            // 862
        }                                                                                                              // 1303
      });                                                                                                              // 778
      _methods = {};                                                                                                   // 911
                                                                                                                       //
      _methods[self._methodNames._Remove] = function (selector) {                                                      // 916
        var user, userFuncs;                                                                                           // 917
        check(selector, Match.OneOf(String, Object));                                                                  // 917
                                                                                                                       //
        if (self.debug) {                                                                                              // 918
          console.info("[FilesCollection] [Unlink Method] [.remove(" + selector + ")]");                               // 918
        }                                                                                                              // 1311
                                                                                                                       //
        if (self.allowClientCode) {                                                                                    // 920
          if (self.onBeforeRemove && _.isFunction(self.onBeforeRemove)) {                                              // 921
            user = false;                                                                                              // 922
            userFuncs = {                                                                                              // 923
              userId: this.userId,                                                                                     // 924
              user: function () {                                                                                      // 925
                if (Meteor.users) {                                                                                    // 925
                  return Meteor.users.findOne(this.userId);                                                            // 1319
                } else {                                                                                               // 925
                  return null;                                                                                         // 1321
                }                                                                                                      // 1322
              }                                                                                                        // 923
            };                                                                                                         // 923
                                                                                                                       //
            if (!self.onBeforeRemove.call(userFuncs, self.find(selector) || null)) {                                   // 928
              throw new Meteor.Error(403, '[FilesCollection] [remove] Not permitted!');                                // 929
            }                                                                                                          // 921
          }                                                                                                            // 1328
                                                                                                                       //
          self.remove(selector);                                                                                       // 931
          return true;                                                                                                 // 932
        } else {                                                                                                       // 920
          throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');              // 934
        }                                                                                                              // 1333
      };                                                                                                               // 916
                                                                                                                       //
      _methods[self._methodNames._Start] = function (opts, returnMeta) {                                               // 944
        var result;                                                                                                    // 945
        check(opts, {                                                                                                  // 945
          file: Object,                                                                                                // 946
          fileId: String,                                                                                              // 947
          FSName: Match.Optional(String),                                                                              // 948
          chunkSize: Number,                                                                                           // 949
          fileLength: Number                                                                                           // 950
        });                                                                                                            // 945
        check(returnMeta, Match.Optional(Boolean));                                                                    // 953
                                                                                                                       //
        if (self.debug) {                                                                                              // 955
          console.info("[FilesCollection] [File Start Method] " + opts.file.name + " - " + opts.fileId);               // 955
        }                                                                                                              // 1347
                                                                                                                       //
        opts.___s = true;                                                                                              // 956
        result = self._prepareUpload(_.clone(opts), this.userId, 'DDP Start Method').result;                           // 957
                                                                                                                       //
        if (self.collection.findOne(result._id)) {                                                                     // 958
          throw new Meteor.Error(400, 'Can\'t start upload, data substitution detected!');                             // 959
        }                                                                                                              // 1352
                                                                                                                       //
        opts._id = opts.fileId;                                                                                        // 960
        opts.createdAt = new Date();                                                                                   // 961
                                                                                                                       //
        self._preCollection.insert(_.omit(opts, '___s'));                                                              // 962
                                                                                                                       //
        self._createStream(result._id, result.path, _.omit(opts, '___s'));                                             // 963
                                                                                                                       //
        if (returnMeta) {                                                                                              // 965
          return {                                                                                                     // 966
            uploadRoute: self.downloadRoute + "/" + self.collectionName + "/__upload",                                 // 967
            file: result                                                                                               // 968
          };                                                                                                           // 966
        } else {                                                                                                       // 965
          return true;                                                                                                 // 971
        }                                                                                                              // 1364
      };                                                                                                               // 944
                                                                                                                       //
      _methods[self._methodNames._Write] = function (opts) {                                                           // 977
        var _continueUpload, e, ref, result;                                                                           // 978
                                                                                                                       //
        check(opts, {                                                                                                  // 978
          eof: Match.Optional(Boolean),                                                                                // 979
          fileId: String,                                                                                              // 980
          binData: Match.Optional(String),                                                                             // 981
          chunkId: Match.Optional(Number)                                                                              // 982
        });                                                                                                            // 978
                                                                                                                       //
        if (opts.binData) {                                                                                            // 985
          if (typeof Buffer.from === 'function') {                                                                     // 986
            try {                                                                                                      // 987
              opts.binData = Buffer.from(opts.binData, 'base64');                                                      // 988
            } catch (error1) {                                                                                         // 987
              e = error1;                                                                                              // 989
              opts.binData = new Buffer(opts.binData, 'base64');                                                       // 990
            }                                                                                                          // 986
          } else {                                                                                                     // 986
            opts.binData = new Buffer(opts.binData, 'base64');                                                         // 992
          }                                                                                                            // 985
        }                                                                                                              // 1385
                                                                                                                       //
        _continueUpload = self._continueUpload(opts.fileId);                                                           // 994
                                                                                                                       //
        if (!_continueUpload) {                                                                                        // 995
          throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');                 // 996
        }                                                                                                              // 1389
                                                                                                                       //
        this.unblock();                                                                                                // 998
        ref = self._prepareUpload(_.extend(opts, _continueUpload), this.userId, 'DDP'), result = ref.result, opts = ref.opts;
                                                                                                                       //
        if (opts.eof) {                                                                                                // 1001
          try {                                                                                                        // 1002
            return Meteor.wrapAsync(self._handleUpload.bind(self, result, opts))();                                    // 1003
          } catch (error1) {                                                                                           // 1002
            e = error1;                                                                                                // 1004
                                                                                                                       //
            if (self.debug) {                                                                                          // 1005
              console.warn("[FilesCollection] [Write Method] [DDP] Exception:", e);                                    // 1005
            }                                                                                                          // 1399
                                                                                                                       //
            throw e;                                                                                                   // 1006
          }                                                                                                            // 1001
        } else {                                                                                                       // 1001
          self.emit('_handleUpload', result, opts, NOOP);                                                              // 1008
        }                                                                                                              // 1404
                                                                                                                       //
        return true;                                                                                                   // 1009
      };                                                                                                               // 977
                                                                                                                       //
      _methods[self._methodNames._Abort] = function (_id) {                                                            // 1016
        var _continueUpload, ref, ref1, ref2;                                                                          // 1017
                                                                                                                       //
        check(_id, String);                                                                                            // 1017
        _continueUpload = self._continueUpload(_id);                                                                   // 1019
                                                                                                                       //
        if (self.debug) {                                                                                              // 1020
          console.info("[FilesCollection] [Abort Method]: " + _id + " - " + (_continueUpload != null ? (ref = _continueUpload.file) != null ? ref.path : void 0 : void 0));
        }                                                                                                              // 1413
                                                                                                                       //
        if ((ref1 = self._currentUploads) != null ? ref1[_id] : void 0) {                                              // 1022
          self._currentUploads[_id].stop();                                                                            // 1023
                                                                                                                       //
          self._currentUploads[_id].abort();                                                                           // 1024
        }                                                                                                              // 1417
                                                                                                                       //
        if (_continueUpload) {                                                                                         // 1026
          self._preCollection.remove({                                                                                 // 1027
            _id: _id                                                                                                   // 1027
          });                                                                                                          // 1027
                                                                                                                       //
          self.remove({                                                                                                // 1028
            _id: _id                                                                                                   // 1028
          });                                                                                                          // 1028
                                                                                                                       //
          if (_continueUpload != null ? (ref2 = _continueUpload.file) != null ? ref2.path : void 0 : void 0) {         // 1029
            self.unlink({                                                                                              // 1029
              _id: _id,                                                                                                // 1029
              path: _continueUpload.file.path                                                                          // 1029
            });                                                                                                        // 1029
          }                                                                                                            // 1026
        }                                                                                                              // 1431
                                                                                                                       //
        return true;                                                                                                   // 1030
      };                                                                                                               // 1016
                                                                                                                       //
      Meteor.methods(_methods);                                                                                        // 1032
    }                                                                                                                  // 1435
  } /*                                                                                                                 // 497
    @locus Server                                                                                                      //
    @memberOf FilesCollection                                                                                          //
    @name _prepareUpload                                                                                               //
    @summary Internal method. Used to optimize received data and check upload permission                               //
    @returns {Object}                                                                                                  //
     */                                                                                                                //
                                                                                                                       //
  FilesCollection.prototype._prepareUpload = Meteor.isServer ? function (opts, userId, transport) {                    // 1447
    var base, ctx, extension, extensionWithDot, fileName, isUploadAllowed, ref, result;                                // 1042
                                                                                                                       //
    if (opts.eof == null) {                                                                                            // 1449
      opts.eof = false;                                                                                                // 1042
    }                                                                                                                  // 1451
                                                                                                                       //
    if (opts.binData == null) {                                                                                        // 1452
      opts.binData = 'EOF';                                                                                            // 1043
    }                                                                                                                  // 1454
                                                                                                                       //
    if (opts.chunkId == null) {                                                                                        // 1455
      opts.chunkId = -1;                                                                                               // 1044
    }                                                                                                                  // 1457
                                                                                                                       //
    if (opts.FSName == null) {                                                                                         // 1458
      opts.FSName = opts.fileId;                                                                                       // 1045
    }                                                                                                                  // 1460
                                                                                                                       //
    if ((base = opts.file).meta == null) {                                                                             // 1461
      base.meta = {};                                                                                                  // 1462
    }                                                                                                                  // 1463
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1048
      console.info("[FilesCollection] [Upload] [" + transport + "] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
    }                                                                                                                  // 1466
                                                                                                                       //
    fileName = this._getFileName(opts.file);                                                                           // 1050
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 1051
    result = opts.file;                                                                                                // 1053
    result.name = fileName;                                                                                            // 1054
    result.meta = opts.file.meta;                                                                                      // 1055
    result.extension = extension;                                                                                      // 1056
    result.ext = extension;                                                                                            // 1057
    result._id = opts.fileId;                                                                                          // 1058
    result.userId = userId || null;                                                                                    // 1059
    result.path = "" + this.storagePath(result) + nodePath.sep + opts.FSName + extensionWithDot;                       // 1060
    result = _.extend(result, this._dataToSchema(result));                                                             // 1061
                                                                                                                       //
    if (this.onBeforeUpload && _.isFunction(this.onBeforeUpload)) {                                                    // 1063
      ctx = _.extend({                                                                                                 // 1064
        file: opts.file                                                                                                // 1065
      }, {                                                                                                             // 1064
        chunkId: opts.chunkId,                                                                                         // 1067
        userId: result.userId,                                                                                         // 1068
        user: function () {                                                                                            // 1069
          if (Meteor.users) {                                                                                          // 1069
            return Meteor.users.findOne(result.userId);                                                                // 1486
          } else {                                                                                                     // 1069
            return null;                                                                                               // 1488
          }                                                                                                            // 1489
        },                                                                                                             // 1066
        eof: opts.eof                                                                                                  // 1070
      });                                                                                                              // 1066
      isUploadAllowed = this.onBeforeUpload.call(ctx, result);                                                         // 1072
                                                                                                                       //
      if (isUploadAllowed !== true) {                                                                                  // 1074
        throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
      } else {                                                                                                         // 1074
        if (opts.___s === true && this.onInitiateUpload && _.isFunction(this.onInitiateUpload)) {                      // 1077
          this.onInitiateUpload.call(ctx, result);                                                                     // 1078
        }                                                                                                              // 1074
      }                                                                                                                // 1063
    }                                                                                                                  // 1501
                                                                                                                       //
    return {                                                                                                           // 1080
      result: result,                                                                                                  // 1080
      opts: opts                                                                                                       // 1080
    };                                                                                                                 // 1080
  } : void 0; /*                                                                                                       // 1041
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _finishUpload                                                                                      //
              @summary Internal method. Finish upload, close Writable stream, add record to MongoDB and flush used memory
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype._finishUpload = Meteor.isServer ? function (result, opts, cb) {                            // 1517
    var self;                                                                                                          // 1091
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1091
      console.info("[FilesCollection] [Upload] [finish(ing)Upload] -> " + result.path);                                // 1091
    }                                                                                                                  // 1521
                                                                                                                       //
    fs.chmod(result.path, this.permissions, NOOP);                                                                     // 1092
    self = this;                                                                                                       // 1093
    result.type = this._getMimeType(opts.file);                                                                        // 1094
    result["public"] = this["public"];                                                                                 // 1095
                                                                                                                       //
    this._updateFileTypes(result);                                                                                     // 1096
                                                                                                                       //
    this.collection.insert(_.clone(result), function (error, _id) {                                                    // 1098
      if (error) {                                                                                                     // 1099
        cb && cb(error);                                                                                               // 1100
                                                                                                                       //
        if (self.debug) {                                                                                              // 1101
          console.error('[FilesCollection] [Upload] [_finishUpload] Error:', error);                                   // 1101
        }                                                                                                              // 1099
      } else {                                                                                                         // 1099
        self._preCollection.update({                                                                                   // 1103
          _id: opts.fileId                                                                                             // 1103
        }, {                                                                                                           // 1103
          $set: {                                                                                                      // 1103
            isFinished: true                                                                                           // 1103
          }                                                                                                            // 1103
        });                                                                                                            // 1103
                                                                                                                       //
        result._id = _id;                                                                                              // 1104
                                                                                                                       //
        if (self.debug) {                                                                                              // 1105
          console.info("[FilesCollection] [Upload] [finish(ed)Upload] -> " + result.path);                             // 1105
        }                                                                                                              // 1544
                                                                                                                       //
        self.onAfterUpload && self.onAfterUpload.call(self, result);                                                   // 1106
        self.emit('afterUpload', result);                                                                              // 1107
        cb && cb(null, result);                                                                                        // 1108
      }                                                                                                                // 1548
    });                                                                                                                // 1098
  } : void 0; /*                                                                                                       // 1090
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _handleUpload                                                                                      //
              @summary Internal method to handle upload process, pipe incoming data to Writable stream                 //
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype._handleUpload = Meteor.isServer ? function (result, opts, cb) {                            // 1561
    var e, self;                                                                                                       // 1121
                                                                                                                       //
    try {                                                                                                              // 1121
      if (opts.eof) {                                                                                                  // 1122
        self = this;                                                                                                   // 1123
                                                                                                                       //
        this._currentUploads[result._id].end(function () {                                                             // 1124
          return bound(function () {                                                                                   // 1567
            self.emit('_finishUpload', result, opts, cb);                                                              // 1125
          });                                                                                                          // 1124
        });                                                                                                            // 1124
      } else {                                                                                                         // 1122
        this._currentUploads[result._id].write(opts.chunkId, opts.binData, cb);                                        // 1128
      }                                                                                                                // 1121
    } catch (error1) {                                                                                                 // 1121
      e = error1;                                                                                                      // 1129
                                                                                                                       //
      if (this.debug) {                                                                                                // 1130
        console.warn("[_handleUpload] [EXCEPTION:]", e);                                                               // 1130
      }                                                                                                                // 1578
                                                                                                                       //
      cb && cb(e);                                                                                                     // 1131
    }                                                                                                                  // 1580
  } : void 0; /*                                                                                                       // 1120
              @locus Anywhere                                                                                          //
              @memberOf FilesCollection                                                                                //
              @name _getMimeType                                                                                       //
              @param {Object} fileData - File Object                                                                   //
              @summary Returns file's mime-type                                                                        //
              @returns {String}                                                                                        //
               */                                                                                                      //
                                                                                                                       //
  FilesCollection.prototype._getMimeType = function (fileData) {                                                       // 1593
    var br, buf, error, ext, fd, mime, ref;                                                                            // 1144
    check(fileData, Object);                                                                                           // 1144
                                                                                                                       //
    if (fileData != null ? fileData.type : void 0) {                                                                   // 1145
      mime = fileData.type;                                                                                            // 1145
    }                                                                                                                  // 1598
                                                                                                                       //
    if (Meteor.isServer && fileData.path && (!mime || !_.isString(mime))) {                                            // 1146
      try {                                                                                                            // 1147
        buf = new Buffer(262);                                                                                         // 1148
        fd = fs.openSync(fileData.path, 'r');                                                                          // 1149
        br = fs.readSync(fd, buf, 0, 262, 0);                                                                          // 1150
        fs.close(fd, NOOP);                                                                                            // 1151
                                                                                                                       //
        if (br < 262) {                                                                                                // 1152
          buf = buf.slice(0, br);                                                                                      // 1152
        }                                                                                                              // 1607
                                                                                                                       //
        ref = fileType(buf), mime = ref.mime, ext = ref.ext;                                                           // 1153
      } catch (error1) {                                                                                               // 1147
        error = error1;                                                                                                // 1154
      }                                                                                                                // 1146
    }                                                                                                                  // 1612
                                                                                                                       //
    if (!mime || !_.isString(mime)) {                                                                                  // 1155
      mime = 'application/octet-stream';                                                                               // 1156
    }                                                                                                                  // 1615
                                                                                                                       //
    return mime;                                                                                                       // 1157
  }; /*                                                                                                                // 1143
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getFileName                                                                                                //
     @param {Object} fileData - File Object                                                                            //
     @summary Returns file's name                                                                                      //
     @returns {String}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getFileName = function (fileData) {                                                       // 1629
    var fileName;                                                                                                      // 1168
    fileName = fileData.name || fileData.fileName;                                                                     // 1168
                                                                                                                       //
    if (_.isString(fileName) && fileName.length > 0) {                                                                 // 1169
      return (fileData.name || fileData.fileName).replace(/\.\./g, '').replace(/\//g, '');                             // 1170
    } else {                                                                                                           // 1169
      return '';                                                                                                       // 1172
    }                                                                                                                  // 1636
  }; /*                                                                                                                // 1167
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getUser                                                                                                    //
     @summary Returns object with `userId` and `user()` method which return user's object                              //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getUser = function (http) {                                                               // 1648
    var cookie, mtok, ref, ref1, result, userId;                                                                       // 1182
    result = {                                                                                                         // 1182
      user: function () {                                                                                              // 1183
        return null;                                                                                                   // 1183
      },                                                                                                               // 1183
      userId: null                                                                                                     // 1184
    };                                                                                                                 // 1183
                                                                                                                       //
    if (Meteor.isServer) {                                                                                             // 1186
      if (http) {                                                                                                      // 1187
        mtok = null;                                                                                                   // 1188
                                                                                                                       //
        if (http.request.headers['x-mtok']) {                                                                          // 1189
          mtok = http.request.headers['x-mtok'];                                                                       // 1190
        } else {                                                                                                       // 1189
          cookie = http.request.Cookies;                                                                               // 1192
                                                                                                                       //
          if (cookie.has('x_mtok')) {                                                                                  // 1193
            mtok = cookie.get('x_mtok');                                                                               // 1194
          }                                                                                                            // 1189
        }                                                                                                              // 1666
                                                                                                                       //
        if (mtok) {                                                                                                    // 1196
          userId = (ref = Meteor.server.sessions) != null ? (ref1 = ref[mtok]) != null ? ref1.userId : void 0 : void 0;
                                                                                                                       //
          if (userId) {                                                                                                // 1198
            result.user = function () {                                                                                // 1199
              return Meteor.users.findOne(userId);                                                                     // 1671
            };                                                                                                         // 1199
                                                                                                                       //
            result.userId = userId;                                                                                    // 1200
          }                                                                                                            // 1196
        }                                                                                                              // 1187
      }                                                                                                                // 1186
    } else {                                                                                                           // 1186
      if (typeof Meteor.userId === "function" ? Meteor.userId() : void 0) {                                            // 1202
        result.user = function () {                                                                                    // 1203
          return Meteor.user();                                                                                        // 1203
        };                                                                                                             // 1203
                                                                                                                       //
        result.userId = Meteor.userId();                                                                               // 1204
      }                                                                                                                // 1186
    }                                                                                                                  // 1684
                                                                                                                       //
    return result;                                                                                                     // 1206
  }; /*                                                                                                                // 1181
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _getExt                                                                                                     //
     @param {String} FileName - File name                                                                              //
     @summary Get extension from FileName                                                                              //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._getExt = function (fileName) {                                                            // 1698
    var extension;                                                                                                     // 1217
                                                                                                                       //
    if (!!~fileName.indexOf('.')) {                                                                                    // 1217
      extension = (fileName.split('.').pop().split('?')[0] || '').toLowerCase();                                       // 1218
      return {                                                                                                         // 1219
        ext: extension,                                                                                                // 1219
        extension: extension,                                                                                          // 1219
        extensionWithDot: '.' + extension                                                                              // 1219
      };                                                                                                               // 1219
    } else {                                                                                                           // 1217
      return {                                                                                                         // 1221
        ext: '',                                                                                                       // 1221
        extension: '',                                                                                                 // 1221
        extensionWithDot: ''                                                                                           // 1221
      };                                                                                                               // 1221
    }                                                                                                                  // 1713
  }; /*                                                                                                                // 1216
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _updateFileTypes                                                                                            //
     @param {Object} data - File data                                                                                  //
     @summary Internal method. Classify file based on 'type' field                                                     //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._updateFileTypes = function (data) {                                                       // 1725
    data.isVideo = /^video\//i.test(data.type);                                                                        // 1231
    data.isAudio = /^audio\//i.test(data.type);                                                                        // 1232
    data.isImage = /^image\//i.test(data.type);                                                                        // 1233
    data.isText = /^text\//i.test(data.type);                                                                          // 1234
    data.isJSON = /^application\/json$/i.test(data.type);                                                              // 1235
    data.isPDF = /^application\/(x-)?pdf$/i.test(data.type);                                                           // 1236
  }; /*                                                                                                                // 1230
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name _dataToSchema                                                                                               //
     @param {Object} data - File data                                                                                  //
     @summary Internal method. Build object in accordance with default schema from File data                           //
     @returns {Object}                                                                                                 //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype._dataToSchema = function (data) {                                                          // 1744
    var ds;                                                                                                            // 1248
    ds = {                                                                                                             // 1248
      name: data.name,                                                                                                 // 1249
      extension: data.extension,                                                                                       // 1250
      path: data.path,                                                                                                 // 1251
      meta: data.meta,                                                                                                 // 1252
      type: data.type,                                                                                                 // 1253
      size: data.size,                                                                                                 // 1254
      userId: data.userId || null,                                                                                     // 1255
      versions: {                                                                                                      // 1256
        original: {                                                                                                    // 1257
          path: data.path,                                                                                             // 1258
          size: data.size,                                                                                             // 1259
          type: data.type,                                                                                             // 1260
          extension: data.extension                                                                                    // 1261
        }                                                                                                              // 1258
      },                                                                                                               // 1257
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                       // 1262
      _collectionName: data._collectionName || this.collectionName                                                     // 1263
    };                                                                                                                 // 1249
                                                                                                                       //
    this._updateFileTypes(ds);                                                                                         // 1264
                                                                                                                       //
    ds._storagePath = data._storagePath || this.storagePath(_.extend(data, ds));                                       // 1265
    return ds;                                                                                                         // 1266
  }; /*                                                                                                                // 1247
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
  FilesCollection.prototype.write = Meteor.isServer ? function (buffer, opts, callback, proceedAfterUpload) {          // 1787
    var FSName, extension, extensionWithDot, fileId, fileName, ref, result, self, stream;                              // 1284
                                                                                                                       //
    if (opts == null) {                                                                                                // 1789
      opts = {};                                                                                                       // 1283
    }                                                                                                                  // 1791
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1284
      console.info('[FilesCollection] [write()]');                                                                     // 1284
    }                                                                                                                  // 1794
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 1286
      proceedAfterUpload = callback;                                                                                   // 1287
      callback = opts;                                                                                                 // 1288
      opts = {};                                                                                                       // 1289
    } else if (_.isBoolean(callback)) {                                                                                // 1286
      proceedAfterUpload = callback;                                                                                   // 1291
    } else if (_.isBoolean(opts)) {                                                                                    // 1290
      proceedAfterUpload = opts;                                                                                       // 1293
    }                                                                                                                  // 1803
                                                                                                                       //
    check(opts, Match.Optional(Object));                                                                               // 1295
    check(callback, Match.Optional(Function));                                                                         // 1296
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 1297
    fileId = Random.id();                                                                                              // 1299
    FSName = this.namingFunction ? this.namingFunction() : fileId;                                                     // 1300
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : FSName;                                       // 1301
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 1303
    self = this;                                                                                                       // 1305
                                                                                                                       //
    if (opts == null) {                                                                                                // 1812
      opts = {};                                                                                                       // 1306
    }                                                                                                                  // 1814
                                                                                                                       //
    opts.path = "" + this.storagePath(opts) + nodePath.sep + FSName + extensionWithDot;                                // 1307
    opts.type = this._getMimeType(opts);                                                                               // 1308
                                                                                                                       //
    if (opts.meta == null) {                                                                                           // 1817
      opts.meta = {};                                                                                                  // 1309
    }                                                                                                                  // 1819
                                                                                                                       //
    if (opts.size == null) {                                                                                           // 1820
      opts.size = buffer.length;                                                                                       // 1310
    }                                                                                                                  // 1822
                                                                                                                       //
    result = this._dataToSchema({                                                                                      // 1312
      name: fileName,                                                                                                  // 1313
      path: opts.path,                                                                                                 // 1314
      meta: opts.meta,                                                                                                 // 1315
      type: opts.type,                                                                                                 // 1316
      size: opts.size,                                                                                                 // 1317
      userId: opts.userId,                                                                                             // 1318
      extension: extension                                                                                             // 1319
    });                                                                                                                // 1313
    result._id = fileId;                                                                                               // 1321
    stream = fs.createWriteStream(opts.path, {                                                                         // 1323
      flags: 'w',                                                                                                      // 1323
      mode: this.permissions                                                                                           // 1323
    });                                                                                                                // 1323
    stream.end(buffer, function (error) {                                                                              // 1324
      return bound(function () {                                                                                       // 1838
        if (error) {                                                                                                   // 1325
          callback && callback(error);                                                                                 // 1326
        } else {                                                                                                       // 1325
          self.collection.insert(result, function (error, _id) {                                                       // 1328
            var fileRef;                                                                                               // 1329
                                                                                                                       //
            if (error) {                                                                                               // 1329
              callback && callback(error);                                                                             // 1330
                                                                                                                       //
              if (self.debug) {                                                                                        // 1331
                console.warn("[FilesCollection] [write] [insert] Error: " + fileName + " -> " + self.collectionName, error);
              }                                                                                                        // 1329
            } else {                                                                                                   // 1329
              fileRef = self.collection.findOne(_id);                                                                  // 1333
              callback && callback(null, fileRef);                                                                     // 1334
                                                                                                                       //
              if (proceedAfterUpload === true) {                                                                       // 1335
                self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                          // 1336
                self.emit('afterUpload', fileRef);                                                                     // 1337
              }                                                                                                        // 1855
                                                                                                                       //
              if (self.debug) {                                                                                        // 1338
                console.info("[FilesCollection] [write]: " + fileName + " -> " + self.collectionName);                 // 1338
              }                                                                                                        // 1329
            }                                                                                                          // 1859
          });                                                                                                          // 1328
        }                                                                                                              // 1861
      });                                                                                                              // 1324
    });                                                                                                                // 1324
    return this;                                                                                                       // 1341
  } : void 0; /*                                                                                                       // 1283
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
  FilesCollection.prototype.load = Meteor.isServer ? function (url, opts, callback, proceedAfterUpload) {              // 1884
    var FSName, extension, extensionWithDot, fileId, fileName, pathParts, ref, self, storeResult;                      // 1361
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1361
      console.info("[FilesCollection] [load(" + url + ", " + JSON.stringify(opts) + ", callback)]");                   // 1361
    }                                                                                                                  // 1888
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 1363
      proceedAfterUpload = callback;                                                                                   // 1364
      callback = opts;                                                                                                 // 1365
      opts = {};                                                                                                       // 1366
    } else if (_.isBoolean(callback)) {                                                                                // 1363
      proceedAfterUpload = callback;                                                                                   // 1368
    } else if (_.isBoolean(opts)) {                                                                                    // 1367
      proceedAfterUpload = opts;                                                                                       // 1370
    }                                                                                                                  // 1897
                                                                                                                       //
    check(url, String);                                                                                                // 1372
    check(opts, Match.Optional(Object));                                                                               // 1373
    check(callback, Match.Optional(Function));                                                                         // 1374
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 1375
    self = this;                                                                                                       // 1377
                                                                                                                       //
    if (opts == null) {                                                                                                // 1903
      opts = {};                                                                                                       // 1378
    }                                                                                                                  // 1905
                                                                                                                       //
    fileId = Random.id();                                                                                              // 1379
    FSName = this.namingFunction ? this.namingFunction() : fileId;                                                     // 1380
    pathParts = url.split('/');                                                                                        // 1381
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : pathParts[pathParts.length - 1] || FSName;    // 1382
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  // 1384
                                                                                                                       //
    if (opts.meta == null) {                                                                                           // 1911
      opts.meta = {};                                                                                                  // 1385
    }                                                                                                                  // 1913
                                                                                                                       //
    opts.path = "" + this.storagePath(opts) + nodePath.sep + FSName + extensionWithDot;                                // 1386
                                                                                                                       //
    storeResult = function (result, callback) {                                                                        // 1388
      result._id = fileId;                                                                                             // 1389
      self.collection.insert(result, function (error, _id) {                                                           // 1391
        var fileRef;                                                                                                   // 1392
                                                                                                                       //
        if (error) {                                                                                                   // 1392
          callback && callback(error);                                                                                 // 1393
                                                                                                                       //
          if (self.debug) {                                                                                            // 1394
            console.error("[FilesCollection] [load] [insert] Error: " + fileName + " -> " + self.collectionName, error);
          }                                                                                                            // 1392
        } else {                                                                                                       // 1392
          fileRef = self.collection.findOne(_id);                                                                      // 1396
          callback && callback(null, fileRef);                                                                         // 1397
                                                                                                                       //
          if (proceedAfterUpload === true) {                                                                           // 1398
            self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                              // 1399
            self.emit('afterUpload', fileRef);                                                                         // 1400
          }                                                                                                            // 1930
                                                                                                                       //
          if (self.debug) {                                                                                            // 1401
            console.info("[FilesCollection] [load] [insert] " + fileName + " -> " + self.collectionName);              // 1401
          }                                                                                                            // 1392
        }                                                                                                              // 1934
      });                                                                                                              // 1391
    };                                                                                                                 // 1388
                                                                                                                       //
    request.get(url).on('error', function (error) {                                                                    // 1405
      return bound(function () {                                                                                       // 1938
        callback && callback(error);                                                                                   // 1406
                                                                                                                       //
        if (self.debug) {                                                                                              // 1407
          return console.error("[FilesCollection] [load] [request.get(" + url + ")] Error:", error);                   // 1941
        }                                                                                                              // 1942
      });                                                                                                              // 1405
    }).on('response', function (response) {                                                                            // 1405
      return bound(function () {                                                                                       // 1945
        response.on('end', function () {                                                                               // 1409
          return bound(function () {                                                                                   // 1947
            var result;                                                                                                // 1410
                                                                                                                       //
            if (self.debug) {                                                                                          // 1410
              console.info("[FilesCollection] [load] Received: " + url);                                               // 1410
            }                                                                                                          // 1951
                                                                                                                       //
            result = self._dataToSchema({                                                                              // 1411
              name: fileName,                                                                                          // 1412
              path: opts.path,                                                                                         // 1413
              meta: opts.meta,                                                                                         // 1414
              type: opts.type || response.headers['content-type'] || self._getMimeType({                               // 1415
                path: opts.path                                                                                        // 1415
              }),                                                                                                      // 1415
              size: opts.size || parseInt(response.headers['content-length'] || 0),                                    // 1416
              userId: opts.userId,                                                                                     // 1417
              extension: extension                                                                                     // 1418
            });                                                                                                        // 1412
                                                                                                                       //
            if (!result.size) {                                                                                        // 1420
              fs.stat(opts.path, function (error, stats) {                                                             // 1421
                return bound(function () {                                                                             // 1965
                  if (error) {                                                                                         // 1422
                    callback && callback(error);                                                                       // 1423
                  } else {                                                                                             // 1422
                    result.versions.original.size = result.size = stats.size;                                          // 1425
                    storeResult(result, callback);                                                                     // 1426
                  }                                                                                                    // 1971
                });                                                                                                    // 1421
              });                                                                                                      // 1421
            } else {                                                                                                   // 1420
              storeResult(result, callback);                                                                           // 1429
            }                                                                                                          // 1976
          });                                                                                                          // 1409
        });                                                                                                            // 1409
      });                                                                                                              // 1408
    }).pipe(fs.createWriteStream(opts.path, {                                                                          // 1405
      flags: 'w',                                                                                                      // 1433
      mode: this.permissions                                                                                           // 1433
    }));                                                                                                               // 1433
    return this;                                                                                                       // 1435
  } : void 0; /*                                                                                                       // 1360
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
  FilesCollection.prototype.addFile = Meteor.isServer ? function (path, opts, callback, proceedAfterUpload) {          // 2004
    var self;                                                                                                          // 1455
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1455
      console.info("[FilesCollection] [addFile(" + path + ")]");                                                       // 1455
    }                                                                                                                  // 2008
                                                                                                                       //
    if (_.isFunction(opts)) {                                                                                          // 1457
      proceedAfterUpload = callback;                                                                                   // 1458
      callback = opts;                                                                                                 // 1459
      opts = {};                                                                                                       // 1460
    } else if (_.isBoolean(callback)) {                                                                                // 1457
      proceedAfterUpload = callback;                                                                                   // 1462
    } else if (_.isBoolean(opts)) {                                                                                    // 1461
      proceedAfterUpload = opts;                                                                                       // 1464
    }                                                                                                                  // 2017
                                                                                                                       //
    if (this["public"]) {                                                                                              // 1466
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
    }                                                                                                                  // 2020
                                                                                                                       //
    check(path, String);                                                                                               // 1467
    check(opts, Match.Optional(Object));                                                                               // 1468
    check(callback, Match.Optional(Function));                                                                         // 1469
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                // 1470
    self = this;                                                                                                       // 1472
    fs.stat(path, function (error, stats) {                                                                            // 1473
      return bound(function () {                                                                                       // 2027
        var extension, extensionWithDot, pathParts, ref, result;                                                       // 1474
                                                                                                                       //
        if (error) {                                                                                                   // 1474
          callback && callback(error);                                                                                 // 1475
        } else if (stats.isFile()) {                                                                                   // 1474
          if (opts == null) {                                                                                          // 2032
            opts = {};                                                                                                 // 1477
          }                                                                                                            // 2034
                                                                                                                       //
          opts.path = path;                                                                                            // 1478
                                                                                                                       //
          if (!opts.fileName) {                                                                                        // 1480
            pathParts = path.split(nodePath.sep);                                                                      // 1481
            opts.fileName = pathParts[pathParts.length - 1];                                                           // 1482
          }                                                                                                            // 2039
                                                                                                                       //
          ref = self._getExt(opts.fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;       // 1484
                                                                                                                       //
          if (opts.type == null) {                                                                                     // 2041
            opts.type = self._getMimeType(opts);                                                                       // 1486
          }                                                                                                            // 2043
                                                                                                                       //
          if (opts.meta == null) {                                                                                     // 2044
            opts.meta = {};                                                                                            // 1487
          }                                                                                                            // 2046
                                                                                                                       //
          if (opts.size == null) {                                                                                     // 2047
            opts.size = stats.size;                                                                                    // 1488
          }                                                                                                            // 2049
                                                                                                                       //
          result = self._dataToSchema({                                                                                // 1490
            name: opts.fileName,                                                                                       // 1491
            path: path,                                                                                                // 1492
            meta: opts.meta,                                                                                           // 1493
            type: opts.type,                                                                                           // 1494
            size: opts.size,                                                                                           // 1495
            userId: opts.userId,                                                                                       // 1496
            extension: extension,                                                                                      // 1497
            _storagePath: path.replace("" + nodePath.sep + opts.fileName, '')                                          // 1498
          });                                                                                                          // 1491
          self.collection.insert(result, function (error, _id) {                                                       // 1500
            var fileRef;                                                                                               // 1501
                                                                                                                       //
            if (error) {                                                                                               // 1501
              callback && callback(error);                                                                             // 1502
                                                                                                                       //
              if (self.debug) {                                                                                        // 1503
                console.warn("[FilesCollection] [addFile] [insert] Error: " + fileName + " -> " + self.collectionName, error);
              }                                                                                                        // 1501
            } else {                                                                                                   // 1501
              fileRef = self.collection.findOne(_id);                                                                  // 1505
              callback && callback(null, fileRef);                                                                     // 1506
                                                                                                                       //
              if (proceedAfterUpload === true) {                                                                       // 1507
                self.onAfterUpload && self.onAfterUpload.call(self, fileRef);                                          // 1508
                self.emit('afterUpload', fileRef);                                                                     // 1509
              }                                                                                                        // 2073
                                                                                                                       //
              if (self.debug) {                                                                                        // 1510
                console.info("[FilesCollection] [addFile]: " + fileName + " -> " + self.collectionName);               // 1510
              }                                                                                                        // 1501
            }                                                                                                          // 2077
          });                                                                                                          // 1500
        } else {                                                                                                       // 1476
          callback && callback(new Meteor.Error(400, "[FilesCollection] [addFile(" + path + ")]: File does not exist"));
        }                                                                                                              // 2081
      });                                                                                                              // 1473
    });                                                                                                                // 1473
    return this;                                                                                                       // 1516
  } : void 0; /*                                                                                                       // 1454
              @locus Anywhere                                                                                          //
              @memberOf FilesCollection                                                                                //
              @name findOne                                                                                            //
              @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
              @param {Object} options - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
              @summary Find and return Cursor for matching document Object                                             //
              @returns {FileCursor} Instance                                                                           //
               */                                                                                                      //
                                                                                                                       //
  FilesCollection.prototype.findOne = function (selector, options) {                                                   // 2098
    var doc;                                                                                                           // 1530
                                                                                                                       //
    if (this.debug) {                                                                                                  // 1530
      console.info("[FilesCollection] [findOne(" + JSON.stringify(selector) + ", " + JSON.stringify(options) + ")]");  // 1530
    }                                                                                                                  // 2102
                                                                                                                       //
    check(selector, Match.Optional(Match.OneOf(Object, String, Boolean, Number, null)));                               // 1531
    check(options, Match.Optional(Object));                                                                            // 1532
                                                                                                                       //
    if (!arguments.length) {                                                                                           // 1534
      selector = {};                                                                                                   // 1534
    }                                                                                                                  // 2107
                                                                                                                       //
    doc = this.collection.findOne(selector, options);                                                                  // 1535
                                                                                                                       //
    if (doc) {                                                                                                         // 1536
      return new FileCursor(doc, this);                                                                                // 2110
    } else {                                                                                                           // 1536
      return doc;                                                                                                      // 2112
    }                                                                                                                  // 2113
  }; /*                                                                                                                // 1529
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name find                                                                                                        //
     @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)    //
     @param {Object}        options  - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
     @summary Find and return Cursor for matching documents                                                            //
     @returns {FilesCursor} Instance                                                                                   //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.find = function (selector, options) {                                                      // 2127
    if (this.debug) {                                                                                                  // 1548
      console.info("[FilesCollection] [find(" + JSON.stringify(selector) + ", " + JSON.stringify(options) + ")]");     // 1548
    }                                                                                                                  // 2130
                                                                                                                       //
    check(selector, Match.Optional(Match.OneOf(Object, String, Boolean, Number, null)));                               // 1549
    check(options, Match.Optional(Object));                                                                            // 1550
                                                                                                                       //
    if (!arguments.length) {                                                                                           // 1552
      selector = {};                                                                                                   // 1552
    }                                                                                                                  // 2135
                                                                                                                       //
    return new FilesCursor(selector, options, this);                                                                   // 1553
  }; /*                                                                                                                // 1547
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
  FilesCollection.prototype.insert = Meteor.isClient ? function (config, autoStart) {                                  // 2173
    if (autoStart == null) {                                                                                           // 2174
      autoStart = true;                                                                                                // 1587
    }                                                                                                                  // 2176
                                                                                                                       //
    return new this._UploadInstance(config, this)[autoStart ? 'start' : 'manual']();                                   // 1588
  } : void 0; /*                                                                                                       // 1587
              @locus Client                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _UploadInstance                                                                                    //
              @class UploadInstance                                                                                    //
              @summary Internal Class, used in upload                                                                  //
               */                                                                                                      //
  FilesCollection.prototype._UploadInstance = Meteor.isClient ? UploadInstance = function () {                         // 2189
    UploadInstance.prototype.__proto__ = EventEmitter.prototype;                                                       // 2190
                                                                                                                       //
    function UploadInstance(config1, collection) {                                                                     // 1600
      var _file, base, base1, base2, base3, base4, base5, self, wwError;                                               // 1601
                                                                                                                       //
      this.config = config1;                                                                                           // 1600
      this.collection = collection;                                                                                    // 1600
      EventEmitter.call(this);                                                                                         // 1601
                                                                                                                       //
      if (this.collection.debug) {                                                                                     // 1602
        console.info('[FilesCollection] [insert()]');                                                                  // 1602
      }                                                                                                                // 2199
                                                                                                                       //
      self = this;                                                                                                     // 1603
                                                                                                                       //
      if ((base = this.config).ddp == null) {                                                                          // 2201
        base.ddp = this.collection.ddp;                                                                                // 2202
      }                                                                                                                // 2203
                                                                                                                       //
      if ((base1 = this.config).meta == null) {                                                                        // 2204
        base1.meta = {};                                                                                               // 2205
      }                                                                                                                // 2206
                                                                                                                       //
      if ((base2 = this.config).streams == null) {                                                                     // 2207
        base2.streams = 2;                                                                                             // 2208
      }                                                                                                                // 2209
                                                                                                                       //
      if (this.config.streams < 1) {                                                                                   // 1607
        this.config.streams = 2;                                                                                       // 1607
      }                                                                                                                // 2212
                                                                                                                       //
      if ((base3 = this.config).transport == null) {                                                                   // 2213
        base3.transport = 'ddp';                                                                                       // 2214
      }                                                                                                                // 2215
                                                                                                                       //
      if ((base4 = this.config).chunkSize == null) {                                                                   // 2216
        base4.chunkSize = this.collection.chunkSize;                                                                   // 2217
      }                                                                                                                // 2218
                                                                                                                       //
      if ((base5 = this.config).allowWebWorkers == null) {                                                             // 2219
        base5.allowWebWorkers = true;                                                                                  // 2220
      }                                                                                                                // 2221
                                                                                                                       //
      this.config.transport = this.config.transport.toLowerCase();                                                     // 1611
      check(this.config, {                                                                                             // 1613
        file: Match.Any,                                                                                               // 1614
        fileName: Match.Optional(String),                                                                              // 1615
        meta: Match.Optional(Object),                                                                                  // 1616
        type: Match.Optional(String),                                                                                  // 1617
        onError: Match.Optional(Function),                                                                             // 1618
        onAbort: Match.Optional(Function),                                                                             // 1619
        streams: Match.OneOf('dynamic', Number),                                                                       // 1620
        onStart: Match.Optional(Function),                                                                             // 1621
        isBase64: Match.Optional(Boolean),                                                                             // 1622
        transport: Match.OneOf('http', 'ddp'),                                                                         // 1623
        chunkSize: Match.OneOf('dynamic', Number),                                                                     // 1624
        onUploaded: Match.Optional(Function),                                                                          // 1625
        onProgress: Match.Optional(Function),                                                                          // 1626
        onBeforeUpload: Match.Optional(Function),                                                                      // 1627
        allowWebWorkers: Boolean,                                                                                      // 1628
        ddp: Match.Any                                                                                                 // 1629
      });                                                                                                              // 1613
                                                                                                                       //
      if (!this.config.fileName && !this.config.file.name) {                                                           // 1632
        throw new Meteor.Error(400, '"fileName" must me specified for base64 upload!');                                // 1633
      }                                                                                                                // 2243
                                                                                                                       //
      if (this.config.isBase64 === true) {                                                                             // 1635
        check(this.config.file, String);                                                                               // 1636
                                                                                                                       //
        if (!!~this.config.file.indexOf('data:')) {                                                                    // 1637
          this.config.file = this.config.file.replace('data:', '');                                                    // 1638
        }                                                                                                              // 2248
                                                                                                                       //
        if (!!~this.config.file.indexOf(',')) {                                                                        // 1639
          _file = this.config.file.split(',');                                                                         // 1640
          this.fileData = {                                                                                            // 1641
            size: Math.floor(_file[1].replace(/\=/g, '').length / 4 * 3),                                              // 1642
            type: _file[0].split(';')[0],                                                                              // 1643
            name: this.config.fileName,                                                                                // 1644
            meta: this.config.meta                                                                                     // 1645
          };                                                                                                           // 1642
          this.config.file = _file[1];                                                                                 // 1646
        } else if (!this.config.type) {                                                                                // 1639
          throw new Meteor.Error(400, '"type" must me specified for base64 upload! And represent mime-type of the file');
        } else {                                                                                                       // 1647
          this.fileData = {                                                                                            // 1650
            size: Math.floor(this.config.file.replace(/\=/g, '').length / 4 * 3),                                      // 1651
            type: this.config.type,                                                                                    // 1652
            name: this.config.fileName,                                                                                // 1653
            meta: this.config.meta                                                                                     // 1654
          };                                                                                                           // 1651
        }                                                                                                              // 1635
      }                                                                                                                // 2268
                                                                                                                       //
      if (this.config.file) {                                                                                          // 1656
        if (!this.config.isBase64) {                                                                                   // 1657
          this.fileData = {                                                                                            // 1658
            size: this.config.file.size,                                                                               // 1659
            type: this.config.type || this.config.file.type,                                                           // 1660
            name: this.config.fileName || this.config.file.name,                                                       // 1661
            meta: this.config.meta                                                                                     // 1662
          };                                                                                                           // 1659
        }                                                                                                              // 2277
                                                                                                                       //
        if (this.collection.debug) {                                                                                   // 1664
          console.time('insert ' + this.fileData.name);                                                                // 1665
          console.time('loadFile ' + this.fileData.name);                                                              // 1666
        }                                                                                                              // 2281
                                                                                                                       //
        if (this.collection._supportWebWorker && this.config.allowWebWorkers) {                                        // 1668
          try {                                                                                                        // 1669
            this.worker = new Worker(this.collection._webWorkerUrl);                                                   // 1670
          } catch (error1) {                                                                                           // 1669
            wwError = error1;                                                                                          // 1671
            this.worker = false;                                                                                       // 1672
                                                                                                                       //
            if (this.collection.debug) {                                                                               // 1673
              console.warn('[FilesCollection] [insert] [create WebWorker]: Can\'t create WebWorker, fallback to MainThread', wwError);
            }                                                                                                          // 1669
          }                                                                                                            // 1668
        } else {                                                                                                       // 1668
          this.worker = null;                                                                                          // 1675
        }                                                                                                              // 2294
                                                                                                                       //
        this.startTime = {};                                                                                           // 1677
        this.config.debug = this.collection.debug;                                                                     // 1678
        this.currentChunk = 0;                                                                                         // 1679
        this.transferTime = 0;                                                                                         // 1680
        this.trackerComp = null;                                                                                       // 1681
        this.sentChunks = 0;                                                                                           // 1682
        this.fileLength = 1;                                                                                           // 1683
        this.EOFsent = false;                                                                                          // 1684
        this.fileId = Random.id();                                                                                     // 1685
        this.FSName = this.collection.namingFunction ? this.collection.namingFunction(this.fileData) : this.fileId;    // 1686
        this.pipes = [];                                                                                               // 1687
        this.fileData = _.extend(this.fileData, this.collection._getExt(self.fileData.name), {                         // 1689
          mime: this.collection._getMimeType(this.fileData)                                                            // 1689
        });                                                                                                            // 1689
        this.fileData['mime-type'] = this.fileData.mime;                                                               // 1690
        this.result = new this.collection._FileUpload(_.extend(self.config, {                                          // 1692
          fileData: this.fileData,                                                                                     // 1692
          fileId: this.fileId,                                                                                         // 1692
          _Abort: this.collection._methodNames._Abort                                                                  // 1692
        }));                                                                                                           // 1692
                                                                                                                       //
        this.beforeunload = function (e) {                                                                             // 1694
          var message;                                                                                                 // 1695
          message = _.isFunction(self.collection.onbeforeunloadMessage) ? self.collection.onbeforeunloadMessage.call(self.result, self.fileData) : self.collection.onbeforeunloadMessage;
                                                                                                                       //
          if (e) {                                                                                                     // 1696
            e.returnValue = message;                                                                                   // 1696
          }                                                                                                            // 2320
                                                                                                                       //
          return message;                                                                                              // 1697
        };                                                                                                             // 1694
                                                                                                                       //
        this.result.config.beforeunload = this.beforeunload;                                                           // 1698
        window.addEventListener('beforeunload', this.beforeunload, false);                                             // 1699
                                                                                                                       //
        this.result.config._onEnd = function () {                                                                      // 1701
          return self.emitEvent('_onEnd');                                                                             // 2326
        };                                                                                                             // 1701
                                                                                                                       //
        this.addListener('end', this.end);                                                                             // 1703
        this.addListener('start', this.start);                                                                         // 1704
        this.addListener('upload', this.upload);                                                                       // 1705
        this.addListener('sendEOF', this.sendEOF);                                                                     // 1706
        this.addListener('prepare', this.prepare);                                                                     // 1707
        this.addListener('sendChunk', this.sendChunk);                                                                 // 1708
        this.addListener('proceedChunk', this.proceedChunk);                                                           // 1709
        this.addListener('createStreams', this.createStreams);                                                         // 1710
        this.addListener('calculateStats', _.throttle(function () {                                                    // 1712
          var _t, progress;                                                                                            // 1713
                                                                                                                       //
          _t = self.transferTime / self.sentChunks / self.config.streams;                                              // 1713
          self.result.estimateTime.set(_t * (self.fileLength - self.sentChunks));                                      // 1714
          self.result.estimateSpeed.set(self.config.chunkSize / (_t / 1000));                                          // 1715
          progress = Math.round(self.sentChunks / self.fileLength * 100);                                              // 1716
          self.result.progress.set(progress);                                                                          // 1717
          self.config.onProgress && self.config.onProgress.call(self.result, progress, self.fileData);                 // 1718
          self.result.emitEvent('progress', [progress, self.fileData]);                                                // 1719
        }, 250));                                                                                                      // 1712
        this.addListener('_onEnd', function () {                                                                       // 1723
          if (self.result.estimateTimer) {                                                                             // 1724
            Meteor.clearInterval(self.result.estimateTimer);                                                           // 1724
          }                                                                                                            // 2349
                                                                                                                       //
          if (self.worker) {                                                                                           // 1725
            self.worker.terminate();                                                                                   // 1725
          }                                                                                                            // 2352
                                                                                                                       //
          if (self.trackerComp) {                                                                                      // 1726
            self.trackerComp.stop();                                                                                   // 1726
          }                                                                                                            // 2355
                                                                                                                       //
          if (self.beforeunload) {                                                                                     // 1727
            window.removeEventListener('beforeunload', self.beforeunload, false);                                      // 1727
          }                                                                                                            // 2358
                                                                                                                       //
          if (self.result) {                                                                                           // 1728
            return self.result.progress.set(0);                                                                        // 2360
          }                                                                                                            // 2361
        });                                                                                                            // 1723
      } else {                                                                                                         // 1656
        throw new Meteor.Error(500, '[FilesCollection] [insert] Have you forget to pass a File itself?');              // 1730
      }                                                                                                                // 2365
    }                                                                                                                  // 1600
                                                                                                                       //
    UploadInstance.prototype.end = function (error, data) {                                                            // 2368
      if (this.collection.debug) {                                                                                     // 1733
        console.timeEnd('insert ' + this.fileData.name);                                                               // 1733
      }                                                                                                                // 2371
                                                                                                                       //
      this.emitEvent('_onEnd');                                                                                        // 1734
      this.result.emitEvent('uploaded', [error, data]);                                                                // 1735
      this.config.onUploaded && this.config.onUploaded.call(this.result, error, data);                                 // 1736
                                                                                                                       //
      if (error) {                                                                                                     // 1737
        if (this.collection.debug) {                                                                                   // 1738
          console.error('[FilesCollection] [insert] [end] Error:', error);                                             // 1738
        }                                                                                                              // 2378
                                                                                                                       //
        this.result.abort();                                                                                           // 1739
        this.result.state.set('aborted');                                                                              // 1740
        this.result.emitEvent('error', [error, this.fileData]);                                                        // 1741
        this.config.onError && this.config.onError.call(this.result, error, this.fileData);                            // 1742
      } else {                                                                                                         // 1737
        this.result.state.set('completed');                                                                            // 1744
        this.collection.emitEvent('afterUpload', [data]);                                                              // 1745
      }                                                                                                                // 2386
                                                                                                                       //
      this.result.emitEvent('end', [error, data || this.fileData]);                                                    // 1746
      return this.result;                                                                                              // 1747
    };                                                                                                                 // 1732
                                                                                                                       //
    UploadInstance.prototype.sendChunk = function (evt) {                                                              // 2391
      var j, len, opts, p, pad, pipeFunc, ref, ref1, self;                                                             // 1750
      self = this;                                                                                                     // 1750
      opts = {                                                                                                         // 1751
        fileId: this.fileId,                                                                                           // 1752
        binData: evt.data.bin,                                                                                         // 1753
        chunkId: evt.data.chunkId                                                                                      // 1754
      };                                                                                                               // 1752
                                                                                                                       //
      if (this.config.isBase64) {                                                                                      // 1756
        pad = opts.binData.length % 4;                                                                                 // 1757
                                                                                                                       //
        if (pad) {                                                                                                     // 1758
          p = 0;                                                                                                       // 1759
                                                                                                                       //
          while (p < pad) {                                                                                            // 1760
            opts.binData += '=';                                                                                       // 1761
            p++;                                                                                                       // 1762
          }                                                                                                            // 1758
        }                                                                                                              // 1756
      }                                                                                                                // 2408
                                                                                                                       //
      this.emitEvent('data', [evt.data.bin]);                                                                          // 1764
                                                                                                                       //
      if (this.pipes.length) {                                                                                         // 1765
        ref = this.pipes;                                                                                              // 1766
                                                                                                                       //
        for (j = 0, len = ref.length; j < len; j++) {                                                                  // 1766
          pipeFunc = ref[j];                                                                                           // 2413
          opts.binData = pipeFunc(opts.binData);                                                                       // 1767
        }                                                                                                              // 1765
      }                                                                                                                // 2416
                                                                                                                       //
      if (this.fileLength === evt.data.chunkId) {                                                                      // 1769
        if (this.collection.debug) {                                                                                   // 1770
          console.timeEnd('loadFile ' + this.fileData.name);                                                           // 1770
        }                                                                                                              // 2420
                                                                                                                       //
        this.emitEvent('readEnd');                                                                                     // 1771
      }                                                                                                                // 2422
                                                                                                                       //
      if (opts.binData) {                                                                                              // 1773
        if (this.config.transport === 'ddp') {                                                                         // 1774
          this.config.ddp.call(this.collection._methodNames._Write, opts, function (error) {                           // 1775
            self.transferTime += +new Date() - self.startTime[opts.chunkId];                                           // 1776
                                                                                                                       //
            if (error) {                                                                                               // 1777
              if (self.result.state.get() !== 'aborted') {                                                             // 1778
                self.emitEvent('end', [error]);                                                                        // 1779
              }                                                                                                        // 1777
            } else {                                                                                                   // 1777
              ++self.sentChunks;                                                                                       // 1781
                                                                                                                       //
              if (self.sentChunks >= self.fileLength) {                                                                // 1782
                self.emitEvent('sendEOF');                                                                             // 1783
              } else if (self.currentChunk < self.fileLength) {                                                        // 1782
                self.emitEvent('upload');                                                                              // 1785
              }                                                                                                        // 2437
                                                                                                                       //
              self.emitEvent('calculateStats');                                                                        // 1786
            }                                                                                                          // 2439
          });                                                                                                          // 1775
        } else {                                                                                                       // 1774
          HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {      // 1789
            content: opts.binData,                                                                                     // 1790
            headers: {                                                                                                 // 1791
              'x-mtok': ((ref1 = Meteor.connection) != null ? ref1._lastSessionId : void 0) || null,                   // 1792
              'x-fileid': opts.fileId,                                                                                 // 1793
              'x-chunkid': opts.chunkId,                                                                               // 1794
              'content-type': 'text/plain'                                                                             // 1795
            }                                                                                                          // 1792
          }, function (error) {                                                                                        // 1789
            self.transferTime += +new Date() - self.startTime[opts.chunkId];                                           // 1797
                                                                                                                       //
            if (error) {                                                                                               // 1798
              if ("" + error === "Error: network") {                                                                   // 1799
                self.result.pause();                                                                                   // 1800
              } else {                                                                                                 // 1799
                if (self.result.state.get() !== 'aborted') {                                                           // 1802
                  self.emitEvent('end', [error]);                                                                      // 1803
                }                                                                                                      // 1799
              }                                                                                                        // 1798
            } else {                                                                                                   // 1798
              ++self.sentChunks;                                                                                       // 1805
                                                                                                                       //
              if (self.sentChunks >= self.fileLength) {                                                                // 1806
                self.emitEvent('sendEOF');                                                                             // 1807
              } else if (self.currentChunk < self.fileLength) {                                                        // 1806
                self.emitEvent('upload');                                                                              // 1809
              }                                                                                                        // 2466
                                                                                                                       //
              self.emitEvent('calculateStats');                                                                        // 1810
            }                                                                                                          // 2468
          });                                                                                                          // 1789
        }                                                                                                              // 1773
      }                                                                                                                // 2471
    };                                                                                                                 // 1749
                                                                                                                       //
    UploadInstance.prototype.sendEOF = function () {                                                                   // 2474
      var opts, ref, self;                                                                                             // 1815
                                                                                                                       //
      if (!this.EOFsent) {                                                                                             // 1815
        this.EOFsent = true;                                                                                           // 1816
        self = this;                                                                                                   // 1817
        opts = {                                                                                                       // 1818
          eof: true,                                                                                                   // 1819
          fileId: this.fileId                                                                                          // 1820
        };                                                                                                             // 1819
                                                                                                                       //
        if (this.config.transport === 'ddp') {                                                                         // 1822
          this.config.ddp.call(this.collection._methodNames._Write, opts, function () {                                // 1823
            self.emitEvent('end', arguments);                                                                          // 1824
          });                                                                                                          // 1823
        } else {                                                                                                       // 1822
          HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {      // 1827
            content: '',                                                                                               // 1828
            headers: {                                                                                                 // 1829
              'x-mtok': ((ref = Meteor.connection) != null ? ref._lastSessionId : void 0) || null,                     // 1830
              'x-eof': '1',                                                                                            // 1831
              'x-fileId': opts.fileId,                                                                                 // 1832
              'content-type': 'text/plain'                                                                             // 1833
            }                                                                                                          // 1830
          }, function (error, result) {                                                                                // 1827
            result = JSON.parse((result != null ? result.content : void 0) || {});                                     // 1835
                                                                                                                       //
            if (result != null ? result.meta : void 0) {                                                               // 1836
              result.meta = fixJSONParse(result.meta);                                                                 // 1836
            }                                                                                                          // 2500
                                                                                                                       //
            self.emitEvent('end', [error, result]);                                                                    // 1837
          });                                                                                                          // 1827
        }                                                                                                              // 1815
      }                                                                                                                // 2504
    };                                                                                                                 // 1814
                                                                                                                       //
    UploadInstance.prototype.proceedChunk = function (chunkId) {                                                       // 2507
      var chunk, fileReader, self;                                                                                     // 1842
      self = this;                                                                                                     // 1842
      chunk = this.config.file.slice(this.config.chunkSize * (chunkId - 1), this.config.chunkSize * chunkId);          // 1843
                                                                                                                       //
      if (this.config.isBase64) {                                                                                      // 1845
        self.emitEvent('sendChunk', [{                                                                                 // 1846
          data: {                                                                                                      // 1847
            bin: chunk,                                                                                                // 1848
            chunkId: chunkId                                                                                           // 1849
          }                                                                                                            // 1847
        }]);                                                                                                           // 1846
      } else {                                                                                                         // 1845
        if (FileReader) {                                                                                              // 1853
          fileReader = new FileReader();                                                                               // 1854
                                                                                                                       //
          fileReader.onloadend = function (evt) {                                                                      // 1856
            var ref, ref1;                                                                                             // 1857
            self.emitEvent('sendChunk', [{                                                                             // 1857
              data: {                                                                                                  // 1858
                bin: ((fileReader != null ? fileReader.result : void 0) || ((ref = evt.srcElement) != null ? ref.result : void 0) || ((ref1 = evt.target) != null ? ref1.result : void 0)).split(',')[1],
                chunkId: chunkId                                                                                       // 1860
              }                                                                                                        // 1858
            }]);                                                                                                       // 1857
          };                                                                                                           // 1856
                                                                                                                       //
          fileReader.onerror = function (e) {                                                                          // 1865
            self.emitEvent('end', [(e.target || e.srcElement).error]);                                                 // 1866
          };                                                                                                           // 1865
                                                                                                                       //
          fileReader.readAsDataURL(chunk);                                                                             // 1869
        } else if (FileReaderSync) {                                                                                   // 1853
          fileReader = new FileReaderSync();                                                                           // 1872
          self.emitEvent('sendChunk', [{                                                                               // 1874
            data: {                                                                                                    // 1875
              bin: fileReader.readAsDataURL(chunk).split(',')[1],                                                      // 1876
              chunkId: chunkId                                                                                         // 1877
            }                                                                                                          // 1875
          }]);                                                                                                         // 1874
        } else {                                                                                                       // 1871
          self.emitEvent('end', ['File API is not supported in this Browser!']);                                       // 1881
        }                                                                                                              // 1845
      }                                                                                                                // 2551
    };                                                                                                                 // 1841
                                                                                                                       //
    UploadInstance.prototype.upload = function () {                                                                    // 2554
      if (this.result.onPause.get()) {                                                                                 // 1885
        return;                                                                                                        // 1886
      }                                                                                                                // 2557
                                                                                                                       //
      if (this.result.state.get() === 'aborted') {                                                                     // 1888
        return this;                                                                                                   // 1889
      }                                                                                                                // 2560
                                                                                                                       //
      if (this.currentChunk <= this.fileLength) {                                                                      // 1891
        ++this.currentChunk;                                                                                           // 1892
                                                                                                                       //
        if (this.worker) {                                                                                             // 1893
          this.worker.postMessage({                                                                                    // 1894
            sc: this.sentChunks,                                                                                       // 1894
            cc: this.currentChunk,                                                                                     // 1894
            cs: this.config.chunkSize,                                                                                 // 1894
            f: this.config.file,                                                                                       // 1894
            ib: this.config.isBase64                                                                                   // 1894
          });                                                                                                          // 1894
        } else {                                                                                                       // 1893
          this.emitEvent('proceedChunk', [this.currentChunk]);                                                         // 1896
        }                                                                                                              // 1891
      }                                                                                                                // 2574
                                                                                                                       //
      this.startTime[this.currentChunk] = +new Date();                                                                 // 1897
    };                                                                                                                 // 1884
                                                                                                                       //
    UploadInstance.prototype.createStreams = function () {                                                             // 2578
      var i, self;                                                                                                     // 1901
      i = 1;                                                                                                           // 1901
      self = this;                                                                                                     // 1902
                                                                                                                       //
      while (i <= this.config.streams) {                                                                               // 1903
        self.emitEvent('upload');                                                                                      // 1904
        i++;                                                                                                           // 1905
      }                                                                                                                // 1903
    };                                                                                                                 // 1900
                                                                                                                       //
    UploadInstance.prototype.prepare = function () {                                                                   // 2588
      var _len, handleStart, opts, ref, ref1, self;                                                                    // 1909
                                                                                                                       //
      self = this;                                                                                                     // 1909
      this.config.onStart && this.config.onStart.call(this.result, null, this.fileData);                               // 1911
      this.result.emitEvent('start', [null, this.fileData]);                                                           // 1912
                                                                                                                       //
      if (this.config.chunkSize === 'dynamic') {                                                                       // 1914
        this.config.chunkSize = this.fileData.size / 1000;                                                             // 1915
                                                                                                                       //
        if (this.config.chunkSize < 327680) {                                                                          // 1916
          this.config.chunkSize = 327680;                                                                              // 1917
        } else if (this.config.chunkSize > 1048576) {                                                                  // 1916
          this.config.chunkSize = 1048576;                                                                             // 1919
        }                                                                                                              // 2599
                                                                                                                       //
        if (this.config.transport === 'http') {                                                                        // 1921
          this.config.chunkSize = Math.round(this.config.chunkSize / 2);                                               // 1922
        }                                                                                                              // 1914
      }                                                                                                                // 2603
                                                                                                                       //
      if (this.config.isBase64) {                                                                                      // 1924
        this.config.chunkSize = Math.floor(this.config.chunkSize / 4) * 4;                                             // 1925
        _len = Math.ceil(this.config.file.length / this.config.chunkSize);                                             // 1926
      } else {                                                                                                         // 1924
        this.config.chunkSize = Math.floor(this.config.chunkSize / 8) * 8;                                             // 1928
        _len = Math.ceil(this.fileData.size / this.config.chunkSize);                                                  // 1929
      }                                                                                                                // 2610
                                                                                                                       //
      if (this.config.streams === 'dynamic') {                                                                         // 1931
        this.config.streams = _.clone(_len);                                                                           // 1932
                                                                                                                       //
        if (this.config.streams > 24) {                                                                                // 1933
          this.config.streams = 24;                                                                                    // 1933
        }                                                                                                              // 2615
                                                                                                                       //
        if (this.config.transport === 'http') {                                                                        // 1935
          this.config.streams = Math.round(this.config.streams / 2);                                                   // 1936
        }                                                                                                              // 1931
      }                                                                                                                // 2619
                                                                                                                       //
      this.fileLength = _len <= 0 ? 1 : _len;                                                                          // 1938
                                                                                                                       //
      if (this.config.streams > this.fileLength) {                                                                     // 1939
        this.config.streams = this.fileLength;                                                                         // 1939
      }                                                                                                                // 2623
                                                                                                                       //
      this.result.config.fileLength = this.fileLength;                                                                 // 1940
      opts = {                                                                                                         // 1942
        file: this.fileData,                                                                                           // 1943
        fileId: this.fileId,                                                                                           // 1944
        chunkSize: this.config.isBase64 ? this.config.chunkSize / 4 * 3 : this.config.chunkSize,                       // 1945
        fileLength: this.fileLength                                                                                    // 1946
      };                                                                                                               // 1943
                                                                                                                       //
      if (this.FSName !== this.fileId) {                                                                               // 1947
        opts.FSName = this.FSName;                                                                                     // 1947
      }                                                                                                                // 2633
                                                                                                                       //
      handleStart = function (error) {                                                                                 // 1949
        if (error) {                                                                                                   // 1950
          if (self.collection.debug) {                                                                                 // 1951
            console.error('[FilesCollection] [_Start] Error:', error);                                                 // 1951
          }                                                                                                            // 2638
                                                                                                                       //
          self.emitEvent('end', [error]);                                                                              // 1952
        } else {                                                                                                       // 1950
          self.result.continueFunc = function () {                                                                     // 1954
            if (self.collection.debug) {                                                                               // 1955
              console.info('[FilesCollection] [insert] [continueFunc]');                                               // 1955
            }                                                                                                          // 2644
                                                                                                                       //
            self.emitEvent('createStreams');                                                                           // 1956
          };                                                                                                           // 1954
                                                                                                                       //
          self.emitEvent('createStreams');                                                                             // 1958
        }                                                                                                              // 2648
      };                                                                                                               // 1949
                                                                                                                       //
      if (this.config.transport === 'ddp') {                                                                           // 1961
        this.config.ddp.call(this.collection._methodNames._Start, opts, handleStart);                                  // 1962
      } else {                                                                                                         // 1961
        if ((ref = opts.file) != null ? ref.meta : void 0) {                                                           // 1964
          opts.file.meta = fixJSONStringify(opts.file.meta);                                                           // 1964
        }                                                                                                              // 2655
                                                                                                                       //
        HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {        // 1965
          data: opts,                                                                                                  // 1966
          headers: {                                                                                                   // 1967
            'x-start': '1',                                                                                            // 1968
            'x-mtok': ((ref1 = Meteor.connection) != null ? ref1._lastSessionId : void 0) || null                      // 1969
          }                                                                                                            // 1968
        }, handleStart);                                                                                               // 1965
      }                                                                                                                // 2663
    };                                                                                                                 // 1908
                                                                                                                       //
    UploadInstance.prototype.pipe = function (func) {                                                                  // 2666
      this.pipes.push(func);                                                                                           // 1974
      return this;                                                                                                     // 1975
    };                                                                                                                 // 1973
                                                                                                                       //
    UploadInstance.prototype.start = function () {                                                                     // 2671
      var isUploadAllowed, self;                                                                                       // 1978
      self = this;                                                                                                     // 1978
                                                                                                                       //
      if (this.fileData.size <= 0) {                                                                                   // 1979
        this.end(new Meteor.Error(400, 'Can\'t upload empty file'));                                                   // 1980
        return this.result;                                                                                            // 1981
      }                                                                                                                // 2677
                                                                                                                       //
      if (this.config.onBeforeUpload && _.isFunction(this.config.onBeforeUpload)) {                                    // 1983
        isUploadAllowed = this.config.onBeforeUpload.call(_.extend(this.result, this.collection._getUser()), this.fileData);
                                                                                                                       //
        if (isUploadAllowed !== true) {                                                                                // 1985
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'config.onBeforeUpload() returned false'));
        }                                                                                                              // 1983
      }                                                                                                                // 2683
                                                                                                                       //
      if (this.collection.onBeforeUpload && _.isFunction(this.collection.onBeforeUpload)) {                            // 1988
        isUploadAllowed = this.collection.onBeforeUpload.call(_.extend(this.result, this.collection._getUser()), this.fileData);
                                                                                                                       //
        if (isUploadAllowed !== true) {                                                                                // 1990
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'collection.onBeforeUpload() returned false'));
        }                                                                                                              // 1988
      }                                                                                                                // 2689
                                                                                                                       //
      Tracker.autorun(function (computation) {                                                                         // 1993
        self.trackerComp = computation;                                                                                // 1994
                                                                                                                       //
        if (!self.result.onPause.get()) {                                                                              // 1995
          if (Meteor.status().connected) {                                                                             // 1996
            if (self.collection.debug) {                                                                               // 1997
              console.info('[FilesCollection] [insert] [Tracker] [continue]');                                         // 1997
            }                                                                                                          // 2696
                                                                                                                       //
            self.result["continue"]();                                                                                 // 1998
          } else {                                                                                                     // 1996
            if (self.collection.debug) {                                                                               // 2000
              console.info('[FilesCollection] [insert] [Tracker] [pause]');                                            // 2000
            }                                                                                                          // 2701
                                                                                                                       //
            self.result.pause();                                                                                       // 2001
          }                                                                                                            // 1995
        }                                                                                                              // 2704
      });                                                                                                              // 1993
                                                                                                                       //
      if (this.worker) {                                                                                               // 2004
        this.worker.onmessage = function (evt) {                                                                       // 2005
          if (evt.data.error) {                                                                                        // 2006
            if (self.collection.debug) {                                                                               // 2007
              console.warn('[FilesCollection] [insert] [worker] [onmessage] [ERROR:]', evt.data.error);                // 2007
            }                                                                                                          // 2711
                                                                                                                       //
            self.emitEvent('proceedChunk', [evt.data.chunkId]);                                                        // 2008
          } else {                                                                                                     // 2006
            self.emitEvent('sendChunk', [evt]);                                                                        // 2010
          }                                                                                                            // 2715
        };                                                                                                             // 2005
                                                                                                                       //
        this.worker.onerror = function (e) {                                                                           // 2012
          if (self.collection.debug) {                                                                                 // 2013
            console.error('[FilesCollection] [insert] [worker] [onerror] [ERROR:]', e);                                // 2013
          }                                                                                                            // 2720
                                                                                                                       //
          self.emitEvent('end', [e.message]);                                                                          // 2014
        };                                                                                                             // 2012
      }                                                                                                                // 2723
                                                                                                                       //
      if (this.collection.debug) {                                                                                     // 2017
        if (this.worker) {                                                                                             // 2018
          console.info('[FilesCollection] [insert] using WebWorkers');                                                 // 2019
        } else {                                                                                                       // 2018
          console.info('[FilesCollection] [insert] using MainThread');                                                 // 2021
        }                                                                                                              // 2017
      }                                                                                                                // 2730
                                                                                                                       //
      self.emitEvent('prepare');                                                                                       // 2023
      return this.result;                                                                                              // 2024
    };                                                                                                                 // 1977
                                                                                                                       //
    UploadInstance.prototype.manual = function () {                                                                    // 2735
      var self;                                                                                                        // 2027
      self = this;                                                                                                     // 2027
                                                                                                                       //
      this.result.start = function () {                                                                                // 2028
        self.emitEvent('start');                                                                                       // 2029
      };                                                                                                               // 2028
                                                                                                                       //
      this.result.pipe = function (func) {                                                                             // 2031
        self.pipe(func);                                                                                               // 2032
        return this;                                                                                                   // 2033
      };                                                                                                               // 2031
                                                                                                                       //
      return this.result;                                                                                              // 2034
    };                                                                                                                 // 2026
                                                                                                                       //
    return UploadInstance;                                                                                             // 2748
  }() : void 0; /*                                                                                                     // 2750
                @locus Client                                                                                          //
                @memberOf FilesCollection                                                                              //
                @name _FileUpload                                                                                      //
                @class FileUpload                                                                                      //
                @summary Internal Class, instance of this class is returned from `insert()` method                     //
                 */                                                                                                    //
  FilesCollection.prototype._FileUpload = Meteor.isClient ? FileUpload = function () {                                 // 2761
    FileUpload.prototype.__proto__ = EventEmitter.prototype;                                                           // 2762
                                                                                                                       //
    function FileUpload(config1) {                                                                                     // 2046
      var self;                                                                                                        // 2047
      this.config = config1;                                                                                           // 2046
      EventEmitter.call(this);                                                                                         // 2047
      self = this;                                                                                                     // 2048
                                                                                                                       //
      if (!this.config.isBase64) {                                                                                     // 2049
        this.file = _.extend(this.config.file, this.config.fileData);                                                  // 2050
      } else {                                                                                                         // 2049
        this.file = this.config.fileData;                                                                              // 2052
      }                                                                                                                // 2773
                                                                                                                       //
      this.state = new ReactiveVar('active');                                                                          // 2053
      this.onPause = new ReactiveVar(false);                                                                           // 2054
      this.progress = new ReactiveVar(0);                                                                              // 2055
      this.estimateTime = new ReactiveVar(1000);                                                                       // 2056
      this.estimateSpeed = new ReactiveVar(0);                                                                         // 2057
      this.estimateTimer = Meteor.setInterval(function () {                                                            // 2058
        var _currentTime;                                                                                              // 2059
                                                                                                                       //
        if (self.state.get() === 'active') {                                                                           // 2059
          _currentTime = self.estimateTime.get();                                                                      // 2060
                                                                                                                       //
          if (_currentTime > 1000) {                                                                                   // 2061
            self.estimateTime.set(_currentTime - 1000);                                                                // 2062
          }                                                                                                            // 2059
        }                                                                                                              // 2786
      }, 1000);                                                                                                        // 2058
    }                                                                                                                  // 2046
                                                                                                                       //
    FileUpload.prototype.continueFunc = function () {};                                                                // 2790
                                                                                                                       //
    FileUpload.prototype.pause = function () {                                                                         // 2792
      if (this.config.debug) {                                                                                         // 2067
        console.info('[FilesCollection] [insert] [.pause()]');                                                         // 2067
      }                                                                                                                // 2795
                                                                                                                       //
      if (!this.onPause.get()) {                                                                                       // 2068
        this.onPause.set(true);                                                                                        // 2069
        this.state.set('paused');                                                                                      // 2070
        this.emitEvent('pause', [this.file]);                                                                          // 2071
      }                                                                                                                // 2800
    };                                                                                                                 // 2066
                                                                                                                       //
    FileUpload.prototype["continue"] = function () {                                                                   // 2803
      if (this.config.debug) {                                                                                         // 2074
        console.info('[FilesCollection] [insert] [.continue()]');                                                      // 2074
      }                                                                                                                // 2806
                                                                                                                       //
      if (this.onPause.get()) {                                                                                        // 2075
        this.onPause.set(false);                                                                                       // 2076
        this.state.set('active');                                                                                      // 2077
        this.emitEvent('continue', [this.file]);                                                                       // 2078
        this.continueFunc();                                                                                           // 2079
      }                                                                                                                // 2812
    };                                                                                                                 // 2073
                                                                                                                       //
    FileUpload.prototype.toggle = function () {                                                                        // 2815
      if (this.config.debug) {                                                                                         // 2082
        console.info('[FilesCollection] [insert] [.toggle()]');                                                        // 2082
      }                                                                                                                // 2818
                                                                                                                       //
      if (this.onPause.get()) {                                                                                        // 2083
        this["continue"]();                                                                                            // 2083
      } else {                                                                                                         // 2083
        this.pause();                                                                                                  // 2083
      }                                                                                                                // 2823
    };                                                                                                                 // 2081
                                                                                                                       //
    FileUpload.prototype.abort = function () {                                                                         // 2826
      if (this.config.debug) {                                                                                         // 2086
        console.info('[FilesCollection] [insert] [.abort()]');                                                         // 2086
      }                                                                                                                // 2829
                                                                                                                       //
      window.removeEventListener('beforeunload', this.config.beforeunload, false);                                     // 2087
      this.config.onAbort && this.config.onAbort.call(this, this.file);                                                // 2088
      this.emitEvent('abort', [this.file]);                                                                            // 2089
      this.pause();                                                                                                    // 2090
                                                                                                                       //
      this.config._onEnd();                                                                                            // 2091
                                                                                                                       //
      this.state.set('aborted');                                                                                       // 2092
                                                                                                                       //
      if (this.config.debug) {                                                                                         // 2093
        console.timeEnd('insert ' + this.config.fileData.name);                                                        // 2093
      }                                                                                                                // 2838
                                                                                                                       //
      this.config.ddp.call(this.config._Abort, this.config.fileId);                                                    // 2094
    };                                                                                                                 // 2085
                                                                                                                       //
    return FileUpload;                                                                                                 // 2842
  }() : void 0; /*                                                                                                     // 2844
                @locus Anywhere                                                                                        //
                @memberOf FilesCollection                                                                              //
                @name remove                                                                                           //
                @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)
                @param {Function} callback - Callback with one `error` argument                                        //
                @summary Remove documents from the collection                                                          //
                @returns {FilesCollection} Instance                                                                    //
                 */                                                                                                    //
                                                                                                                       //
  FilesCollection.prototype.remove = function (selector, callback) {                                                   // 2857
    var docs, files, self;                                                                                             // 2108
                                                                                                                       //
    if (selector == null) {                                                                                            // 2859
      selector = {};                                                                                                   // 2107
    }                                                                                                                  // 2861
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2108
      console.info("[FilesCollection] [remove(" + JSON.stringify(selector) + ")]");                                    // 2108
    }                                                                                                                  // 2864
                                                                                                                       //
    check(selector, Match.OneOf(Object, String));                                                                      // 2109
    check(callback, Match.Optional(Function));                                                                         // 2110
                                                                                                                       //
    if (Meteor.isClient) {                                                                                             // 2112
      if (this.allowClientCode) {                                                                                      // 2113
        this.ddp.call(this._methodNames._Remove, selector, callback || NOOP);                                          // 2114
      } else {                                                                                                         // 2113
        callback && callback(new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!'));
                                                                                                                       //
        if (this.debug) {                                                                                              // 2117
          console.warn('[FilesCollection] [remove] Run code from client is not allowed!');                             // 2117
        }                                                                                                              // 2113
      }                                                                                                                // 2112
    } else {                                                                                                           // 2112
      files = this.collection.find(selector);                                                                          // 2119
                                                                                                                       //
      if (files.count() > 0) {                                                                                         // 2120
        self = this;                                                                                                   // 2121
        files.forEach(function (file) {                                                                                // 2122
          self.unlink(file);                                                                                           // 2123
        });                                                                                                            // 2122
      }                                                                                                                // 2883
                                                                                                                       //
      if (this.onAfterRemove) {                                                                                        // 2126
        self = this;                                                                                                   // 2127
        docs = files.fetch();                                                                                          // 2128
        this.collection.remove(selector, function () {                                                                 // 2130
          callback && callback.apply(this, arguments);                                                                 // 2131
          self.onAfterRemove(docs);                                                                                    // 2132
        });                                                                                                            // 2130
      } else {                                                                                                         // 2126
        this.collection.remove(selector, callback || NOOP);                                                            // 2135
      }                                                                                                                // 2112
    }                                                                                                                  // 2894
                                                                                                                       //
    return this;                                                                                                       // 2136
  }; /*                                                                                                                // 2107
     @locus Anywhere                                                                                                   //
     @memberOf FilesCollection                                                                                         //
     @name update                                                                                                      //
     @see http://docs.meteor.com/#/full/update                                                                         //
     @summary link Mongo.Collection update method                                                                      //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.update = function () {                                                                     // 2908
    this.collection.update.apply(this.collection, arguments);                                                          // 2147
    return this.collection;                                                                                            // 2148
  }; /*                                                                                                                // 2146
     @locus Server                                                                                                     //
     @memberOf FilesCollection                                                                                         //
     @name deny                                                                                                        //
     @param {Object} rules                                                                                             //
     @see  https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                          //
     @summary link Mongo.Collection deny methods                                                                       //
     @returns {Mongo.Collection} Instance                                                                              //
      */                                                                                                               //
                                                                                                                       //
  FilesCollection.prototype.deny = Meteor.isServer ? function (rules) {                                                // 2924
    this.collection.deny(rules);                                                                                       // 2160
    return this.collection;                                                                                            // 2161
  } : void 0; /*                                                                                                       // 2159
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name allow                                                                                              //
              @param {Object} rules                                                                                    //
              @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                 //
              @summary link Mongo.Collection allow methods                                                             //
              @returns {Mongo.Collection} Instance                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.allow = Meteor.isServer ? function (rules) {                                               // 2940
    this.collection.allow(rules);                                                                                      // 2174
    return this.collection;                                                                                            // 2175
  } : void 0; /*                                                                                                       // 2173
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name denyClient                                                                                         //
              @see https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                  //
              @summary Shorthands for Mongo.Collection deny method                                                     //
              @returns {Mongo.Collection} Instance                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.denyClient = Meteor.isServer ? function () {                                               // 2955
    this.collection.deny({                                                                                             // 2187
      insert: function () {                                                                                            // 2188
        return true;                                                                                                   // 2958
      },                                                                                                               // 2188
      update: function () {                                                                                            // 2189
        return true;                                                                                                   // 2961
      },                                                                                                               // 2188
      remove: function () {                                                                                            // 2190
        return true;                                                                                                   // 2964
      }                                                                                                                // 2188
    });                                                                                                                // 2188
    return this.collection;                                                                                            // 2191
  } : void 0; /*                                                                                                       // 2186
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name allowClient                                                                                        //
              @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                 //
              @summary Shorthands for Mongo.Collection allow method                                                    //
              @returns {Mongo.Collection} Instance                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.allowClient = Meteor.isServer ? function () {                                              // 2980
    this.collection.allow({                                                                                            // 2203
      insert: function () {                                                                                            // 2204
        return true;                                                                                                   // 2983
      },                                                                                                               // 2204
      update: function () {                                                                                            // 2205
        return true;                                                                                                   // 2986
      },                                                                                                               // 2204
      remove: function () {                                                                                            // 2206
        return true;                                                                                                   // 2989
      }                                                                                                                // 2204
    });                                                                                                                // 2204
    return this.collection;                                                                                            // 2207
  } : void 0; /*                                                                                                       // 2202
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name unlink                                                                                             //
              @param {Object} fileRef - fileObj                                                                        //
              @param {String} version - [Optional] file's version                                                      //
              @param {Function} callback - [Optional] callback function                                                //
              @summary Unlink files and it's versions from FS                                                          //
              @returns {FilesCollection} Instance                                                                      //
               */                                                                                                      //
  FilesCollection.prototype.unlink = Meteor.isServer ? function (fileRef, version, callback) {                         // 3007
    var ref, ref1;                                                                                                     // 2222
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2222
      console.info("[FilesCollection] [unlink(" + fileRef._id + ", " + version + ")]");                                // 2222
    }                                                                                                                  // 3011
                                                                                                                       //
    if (version) {                                                                                                     // 2223
      if (((ref = fileRef.versions) != null ? ref[version] : void 0) && ((ref1 = fileRef.versions[version]) != null ? ref1.path : void 0)) {
        fs.unlink(fileRef.versions[version].path, callback || NOOP);                                                   // 2225
      }                                                                                                                // 2223
    } else {                                                                                                           // 2223
      if (fileRef.versions && !_.isEmpty(fileRef.versions)) {                                                          // 2227
        _.each(fileRef.versions, function (vRef) {                                                                     // 2228
          return bound(function () {                                                                                   // 3019
            fs.unlink(vRef.path, callback || NOOP);                                                                    // 2229
          });                                                                                                          // 2228
        });                                                                                                            // 2228
      } else {                                                                                                         // 2227
        fs.unlink(fileRef.path, callback || NOOP);                                                                     // 2232
      }                                                                                                                // 2223
    }                                                                                                                  // 3026
                                                                                                                       //
    return this;                                                                                                       // 2233
  } : void 0; /*                                                                                                       // 2221
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name _404                                                                                               //
              @summary Internal method, used to return 404 error                                                       //
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype._404 = Meteor.isServer ? function (http) {                                                 // 3039
    var text;                                                                                                          // 2244
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2244
      console.warn("[FilesCollection] [download(" + http.request.originalUrl + ")] [_404] File not found");            // 2244
    }                                                                                                                  // 3043
                                                                                                                       //
    text = 'File Not Found :(';                                                                                        // 2245
    http.response.writeHead(404, {                                                                                     // 2246
      'Content-Length': text.length,                                                                                   // 2247
      'Content-Type': 'text/plain'                                                                                     // 2248
    });                                                                                                                // 2247
    http.response.end(text);                                                                                           // 2249
  } : void 0; /*                                                                                                       // 2243
              @locus Server                                                                                            //
              @memberOf FilesCollection                                                                                //
              @name download                                                                                           //
              @param {Object} http    - Server HTTP object                                                             //
              @param {String} version - Requested file version                                                         //
              @param {Object} fileRef - Requested file Object                                                          //
              @summary Initiates the HTTP response                                                                     //
              @returns {undefined}                                                                                     //
               */                                                                                                      //
  FilesCollection.prototype.download = Meteor.isServer ? function (http, version, fileRef) {                           // 3064
    var self, vRef;                                                                                                    // 2264
                                                                                                                       //
    if (version == null) {                                                                                             // 3066
      version = 'original';                                                                                            // 2263
    }                                                                                                                  // 3068
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2264
      console.info("[FilesCollection] [download(" + http.request.originalUrl + ", " + version + ")]");                 // 2264
    }                                                                                                                  // 3071
                                                                                                                       //
    if (fileRef) {                                                                                                     // 2265
      if (_.has(fileRef, 'versions') && _.has(fileRef.versions, version)) {                                            // 2266
        vRef = fileRef.versions[version];                                                                              // 2267
        vRef._id = fileRef._id;                                                                                        // 2268
      } else {                                                                                                         // 2266
        vRef = fileRef;                                                                                                // 2270
      }                                                                                                                // 2265
    } else {                                                                                                           // 2265
      vRef = false;                                                                                                    // 2272
    }                                                                                                                  // 3081
                                                                                                                       //
    if (!vRef || !_.isObject(vRef)) {                                                                                  // 2274
      return this._404(http);                                                                                          // 2275
    } else if (fileRef) {                                                                                              // 2274
      self = this;                                                                                                     // 2277
                                                                                                                       //
      if (this.downloadCallback) {                                                                                     // 2279
        if (!this.downloadCallback.call(_.extend(http, this._getUser(http)), fileRef)) {                               // 2280
          return this._404(http);                                                                                      // 2281
        }                                                                                                              // 2279
      }                                                                                                                // 3090
                                                                                                                       //
      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                            // 2283
        if (this.interceptDownload(http, fileRef, version) === true) {                                                 // 2284
          return;                                                                                                      // 2285
        }                                                                                                              // 2283
      }                                                                                                                // 3095
                                                                                                                       //
      fs.stat(vRef.path, function (statErr, stats) {                                                                   // 2287
        return bound(function () {                                                                                     // 3097
          var responseType;                                                                                            // 2288
                                                                                                                       //
          if (statErr || !stats.isFile()) {                                                                            // 2288
            return self._404(http);                                                                                    // 2289
          }                                                                                                            // 3101
                                                                                                                       //
          if (stats.size !== vRef.size && !self.integrityCheck) {                                                      // 2291
            vRef.size = stats.size;                                                                                    // 2291
          }                                                                                                            // 3104
                                                                                                                       //
          if (stats.size !== vRef.size && self.integrityCheck) {                                                       // 2292
            responseType = '400';                                                                                      // 2292
          }                                                                                                            // 3107
                                                                                                                       //
          return self.serve(http, fileRef, vRef, version, null, responseType || '200');                                // 3108
        });                                                                                                            // 2287
      });                                                                                                              // 2287
    } else {                                                                                                           // 2276
      return this._404(http);                                                                                          // 2296
    }                                                                                                                  // 3113
  } : void 0; /*                                                                                                       // 2263
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
    if (version == null) {                                                                                             // 3134
      version = 'original';                                                                                            // 2313
    }                                                                                                                  // 3136
                                                                                                                       //
    if (readableStream == null) {                                                                                      // 3137
      readableStream = null;                                                                                           // 2313
    }                                                                                                                  // 3139
                                                                                                                       //
    if (responseType == null) {                                                                                        // 3140
      responseType = '200';                                                                                            // 2313
    }                                                                                                                  // 3142
                                                                                                                       //
    if (force200 == null) {                                                                                            // 3143
      force200 = false;                                                                                                // 2313
    }                                                                                                                  // 3145
                                                                                                                       //
    self = this;                                                                                                       // 2314
    partiral = false;                                                                                                  // 2315
    reqRange = false;                                                                                                  // 2316
                                                                                                                       //
    if (http.params.query.download && http.params.query.download === 'true') {                                         // 2318
      dispositionType = 'attachment; ';                                                                                // 2319
    } else {                                                                                                           // 2318
      dispositionType = 'inline; ';                                                                                    // 2321
    }                                                                                                                  // 3153
                                                                                                                       //
    dispositionName = "filename=\"" + encodeURIComponent(fileRef.name) + "\"; filename=*UTF-8\"" + encodeURIComponent(fileRef.name) + "\"; ";
    dispositionEncoding = 'charset=utf-8';                                                                             // 2324
    http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);           // 2326
                                                                                                                       //
    if (http.request.headers.range && !force200) {                                                                     // 2328
      partiral = true;                                                                                                 // 2329
      array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                             // 2330
      start = parseInt(array[1]);                                                                                      // 2331
      end = parseInt(array[2]);                                                                                        // 2332
                                                                                                                       //
      if (isNaN(end)) {                                                                                                // 2333
        end = vRef.size - 1;                                                                                           // 2333
      }                                                                                                                // 3164
                                                                                                                       //
      take = end - start;                                                                                              // 2334
    } else {                                                                                                           // 2328
      start = 0;                                                                                                       // 2336
      end = vRef.size - 1;                                                                                             // 2337
      take = vRef.size;                                                                                                // 2338
    }                                                                                                                  // 3170
                                                                                                                       //
    if (partiral || http.params.query.play && http.params.query.play === 'true') {                                     // 2340
      reqRange = {                                                                                                     // 2341
        start: start,                                                                                                  // 2341
        end: end                                                                                                       // 2341
      };                                                                                                               // 2341
                                                                                                                       //
      if (isNaN(start) && !isNaN(end)) {                                                                               // 2342
        reqRange.start = end - take;                                                                                   // 2343
        reqRange.end = end;                                                                                            // 2344
      }                                                                                                                // 3179
                                                                                                                       //
      if (!isNaN(start) && isNaN(end)) {                                                                               // 2345
        reqRange.start = start;                                                                                        // 2346
        reqRange.end = start + take;                                                                                   // 2347
      }                                                                                                                // 3183
                                                                                                                       //
      if (start + take >= vRef.size) {                                                                                 // 2349
        reqRange.end = vRef.size - 1;                                                                                  // 2349
      }                                                                                                                // 3186
                                                                                                                       //
      if (self.strict && (reqRange.start >= vRef.size - 1 || reqRange.end > vRef.size - 1)) {                          // 2351
        responseType = '416';                                                                                          // 2352
      } else {                                                                                                         // 2351
        responseType = '206';                                                                                          // 2354
      }                                                                                                                // 2340
    } else {                                                                                                           // 2340
      responseType = '200';                                                                                            // 2356
    }                                                                                                                  // 3194
                                                                                                                       //
    streamErrorHandler = function (error) {                                                                            // 2358
      http.response.writeHead(500);                                                                                    // 2359
      http.response.end(error.toString());                                                                             // 2360
                                                                                                                       //
      if (self.debug) {                                                                                                // 2361
        console.error("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [500]", error);                   // 2361
      }                                                                                                                // 3200
    };                                                                                                                 // 2358
                                                                                                                       //
    headers = _.isFunction(self.responseHeaders) ? self.responseHeaders(responseType, fileRef, vRef, version) : self.responseHeaders;
                                                                                                                       //
    if (!headers['Cache-Control']) {                                                                                   // 2366
      http.response.setHeader('Cache-Control', self.cacheControl);                                                     // 2367
    }                                                                                                                  // 3205
                                                                                                                       //
    for (key in meteorBabelHelpers.sanitizeForInObject(headers)) {                                                     // 2369
      value = headers[key];                                                                                            // 3207
      http.response.setHeader(key, value);                                                                             // 2370
    }                                                                                                                  // 2369
                                                                                                                       //
    switch (responseType) {                                                                                            // 2372
      case '400':                                                                                                      // 2372
        if (self.debug) {                                                                                              // 2374
          console.warn("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [400] Content-Length mismatch!");
        }                                                                                                              // 3214
                                                                                                                       //
        text = 'Content-Length mismatch!';                                                                             // 2375
        http.response.writeHead(400, {                                                                                 // 2376
          'Content-Type': 'text/plain',                                                                                // 2377
          'Content-Length': text.length                                                                                // 2378
        });                                                                                                            // 2377
        http.response.end(text);                                                                                       // 2379
        break;                                                                                                         // 2380
                                                                                                                       //
      case '404':                                                                                                      // 2372
        return self._404(http);                                                                                        // 2382
        break;                                                                                                         // 2383
                                                                                                                       //
      case '416':                                                                                                      // 2372
        if (self.debug) {                                                                                              // 2385
          console.warn("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [416] Content-Range is not specified!");
        }                                                                                                              // 3228
                                                                                                                       //
        http.response.writeHead(416);                                                                                  // 2386
        http.response.end();                                                                                           // 2387
        break;                                                                                                         // 2388
                                                                                                                       //
      case '200':                                                                                                      // 2372
        if (self.debug) {                                                                                              // 2390
          console.info("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [200]");                         // 2390
        }                                                                                                              // 3235
                                                                                                                       //
        stream = readableStream || fs.createReadStream(vRef.path);                                                     // 2391
                                                                                                                       //
        if (readableStream) {                                                                                          // 2392
          http.response.writeHead(200);                                                                                // 2392
        }                                                                                                              // 3239
                                                                                                                       //
        stream.on('open', function () {                                                                                // 2393
          http.response.writeHead(200);                                                                                // 2394
        }).on('error', streamErrorHandler).on('end', function () {                                                     // 2393
          http.response.end();                                                                                         // 2398
        });                                                                                                            // 2393
                                                                                                                       //
        if (self.throttle) {                                                                                           // 2400
          stream.pipe(new Throttle({                                                                                   // 2400
            bps: self.throttle,                                                                                        // 2400
            chunksize: self.chunkSize                                                                                  // 2400
          }));                                                                                                         // 2400
        }                                                                                                              // 3250
                                                                                                                       //
        stream.pipe(http.response);                                                                                    // 2401
        break;                                                                                                         // 2402
                                                                                                                       //
      case '206':                                                                                                      // 2372
        if (self.debug) {                                                                                              // 2404
          console.info("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [206]");                         // 2404
        }                                                                                                              // 3256
                                                                                                                       //
        http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + vRef.size);    // 2405
        stream = readableStream || fs.createReadStream(vRef.path, {                                                    // 2406
          start: reqRange.start,                                                                                       // 2406
          end: reqRange.end                                                                                            // 2406
        });                                                                                                            // 2406
                                                                                                                       //
        if (readableStream) {                                                                                          // 2407
          http.response.writeHead(206);                                                                                // 2407
        }                                                                                                              // 3264
                                                                                                                       //
        stream.on('open', function () {                                                                                // 2408
          http.response.writeHead(206);                                                                                // 2409
        }).on('error', streamErrorHandler).on('end', function () {                                                     // 2408
          http.response.end();                                                                                         // 2413
        });                                                                                                            // 2408
                                                                                                                       //
        if (self.throttle) {                                                                                           // 2415
          stream.pipe(new Throttle({                                                                                   // 2415
            bps: self.throttle,                                                                                        // 2415
            chunksize: self.chunkSize                                                                                  // 2415
          }));                                                                                                         // 2415
        }                                                                                                              // 3275
                                                                                                                       //
        stream.pipe(http.response);                                                                                    // 2416
        break;                                                                                                         // 2417
    }                                                                                                                  // 2372
  } : void 0; /*                                                                                                       // 2313
              @locus Anywhere                                                                                          //
              @memberOf FilesCollection                                                                                //
              @name link                                                                                               //
              @param {Object} fileRef - File reference object                                                          //
              @param {String} version - Version of file you would like to request                                      //
              @summary Returns downloadable URL                                                                        //
              @returns {String} Empty string returned in case if file not found in DB                                  //
               */                                                                                                      //
                                                                                                                       //
  FilesCollection.prototype.link = function (fileRef, version) {                                                       // 3292
    if (version == null) {                                                                                             // 3293
      version = 'original';                                                                                            // 2430
    }                                                                                                                  // 3295
                                                                                                                       //
    if (this.debug) {                                                                                                  // 2431
      console.info("[FilesCollection] [link(" + (fileRef != null ? fileRef._id : void 0) + ", " + version + ")]");     // 2431
    }                                                                                                                  // 3298
                                                                                                                       //
    check(fileRef, Object);                                                                                            // 2432
    check(version, String);                                                                                            // 2433
                                                                                                                       //
    if (!fileRef) {                                                                                                    // 2434
      return '';                                                                                                       // 2434
    }                                                                                                                  // 3303
                                                                                                                       //
    return formatFleURL(fileRef, version);                                                                             // 2435
  };                                                                                                                   // 2430
                                                                                                                       //
  return FilesCollection;                                                                                              // 3307
}()); /*                                                                                                               // 3309
      @locus Anywhere                                                                                                  //
      @private                                                                                                         //
      @name formatFleURL                                                                                               //
      @param {Object} fileRef - File reference object                                                                  //
      @param {String} version - [Optional] Version of file you would like build URL for                                //
      @summary Returns formatted URL for file                                                                          //
      @returns {String} Downloadable link                                                                              //
       */                                                                                                              //
                                                                                                                       //
formatFleURL = function (fileRef, version) {                                                                           // 2446
  var ext, ref, root;                                                                                                  // 2447
                                                                                                                       //
  if (version == null) {                                                                                               // 3324
    version = 'original';                                                                                              // 2446
  }                                                                                                                    // 3326
                                                                                                                       //
  check(fileRef, Object);                                                                                              // 2447
  check(version, String);                                                                                              // 2448
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                       // 2450
                                                                                                                       //
  if ((ref = fileRef.extension) != null ? ref.length : void 0) {                                                       // 2452
    ext = '.' + fileRef.extension;                                                                                     // 2453
  } else {                                                                                                             // 2452
    ext = '';                                                                                                          // 2455
  }                                                                                                                    // 3334
                                                                                                                       //
  if (fileRef["public"] === true) {                                                                                    // 2457
    return root + (version === 'original' ? fileRef._downloadRoute + "/" + fileRef._id + ext : fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);
  } else {                                                                                                             // 2457
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                    // 3339
};                                                                                                                     // 2446
                                                                                                                       //
if (Meteor.isClient) {                                                                                                 // 2462
  /*                                                                                                                   // 2463
  @locus Client                                                                                                        //
  @TemplateHelper                                                                                                      //
  @name fileURL                                                                                                        //
  @param {Object} fileRef - File reference object                                                                      //
  @param {String} version - [Optional] Version of file you would like to request                                       //
  @summary Get download URL for file by fileRef, even without subscription                                             //
  @example {{fileURL fileRef}}                                                                                         //
  @returns {String}                                                                                                    //
   */Meteor.startup(function () {                                                                                      //
    if (typeof Template !== "undefined" && Template !== null) {                                                        // 2474
      Template.registerHelper('fileURL', function (fileRef, version) {                                                 // 2475
        if (!fileRef || !_.isObject(fileRef)) {                                                                        // 2476
          return void 0;                                                                                               // 2476
        }                                                                                                              // 3359
                                                                                                                       //
        version = !version || !_.isString(version) ? 'original' : version;                                             // 2477
                                                                                                                       //
        if (fileRef._id) {                                                                                             // 2478
          return formatFleURL(fileRef, version);                                                                       // 2479
        } else {                                                                                                       // 2478
          return '';                                                                                                   // 2481
        }                                                                                                              // 3365
      });                                                                                                              // 2475
    }                                                                                                                  // 3367
  });                                                                                                                  // 2473
} /*                                                                                                                   // 3369
  Export the FilesCollection class                                                                                     //
   */                                                                                                                  //
                                                                                                                       //
Meteor.Files = FilesCollection;                                                                                        // 2487
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
