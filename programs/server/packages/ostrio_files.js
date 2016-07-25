(function () {

/* Imports */
var Meteor = Package.meteor.Meteor;
var global = Package.meteor.global;
var meteorEnv = Package.meteor.meteorEnv;
var WebApp = Package.webapp.WebApp;
var main = Package.webapp.main;
var WebAppInternals = Package.webapp.WebAppInternals;
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
exports.__esModule = true;                                                                                             //
var FileCursor, FilesCursor, NOOP, Throttle, bound, events, fileType, _fixJSONParse, _fixJSONStringify, formatFleURL, fs, nodePath, request, writeStream;                 
                                                                                                                       //
NOOP = function NOOP() {};                                                                                             //
                                                                                                                       //
if (Meteor.isServer) {                                                                                                 //
                                                                                                                       //
  /*                                                                                                                   //
  @summary Require NPM packages                                                                                        //
   */                                                                                                                  //
  fs = Npm.require('fs-extra');                                                                                        //
  events = Npm.require('events');                                                                                      //
  request = Npm.require('request');                                                                                    //
  Throttle = Npm.require('throttle');                                                                                  //
  fileType = Npm.require('file-type');                                                                                 //
  nodePath = Npm.require('path');                                                                                      //
                                                                                                                       //
  /*                                                                                                                   //
  @var {Object} bound - Meteor.bindEnvironment (Fiber wrapper)                                                         //
   */                                                                                                                  //
  bound = Meteor.bindEnvironment(function (callback) {                                                                 //
    return callback();                                                                                                 //
  });                                                                                                                  //
                                                                                                                       //
  /*                                                                                                                   //
  @private                                                                                                             //
  @locus Server                                                                                                        //
  @class writeStream                                                                                                   //
  @param path      {String} - Path to file on FS                                                                       //
  @param maxLength {Number} - Max amount of chunks in stream                                                           //
  @param file      {Object} - fileRef Object                                                                           //
  @summary writableStream wrapper class, makes sure chunks is written in given order. Implementation of queue stream.  //
   */                                                                                                                  //
  writeStream = function () {                                                                                          //
    function writeStream(path1, maxLength, file1) {                                                                    //
      var self;                                                                                                        //
      this.path = path1;                                                                                               //
      this.maxLength = maxLength;                                                                                      //
      this.file = file1;                                                                                               //
      self = this;                                                                                                     //
      this.stream = fs.createWriteStream(this.path, {                                                                  //
        flags: 'a',                                                                                                    //
        mode: self.permissions,                                                                                        //
        highWaterMark: 0                                                                                               //
      });                                                                                                              //
      this.drained = true;                                                                                             //
      this.writtenChunks = 0;                                                                                          //
      this.stream.on('drain', function () {                                                                            //
        return bound(function () {                                                                                     //
          ++self.writtenChunks;                                                                                        //
          self.drained = true;                                                                                         //
        });                                                                                                            //
      });                                                                                                              //
      this.stream.on('error', function (error) {                                                                       //
        return bound(function () {});                                                                                  //
      });                                                                                                              //
    }                                                                                                                  //
                                                                                                                       //
    /*                                                                                                                 //
    @memberOf writeStream                                                                                              //
    @name write                                                                                                        //
    @param {Number} num - Chunk position in stream                                                                     //
    @param {Buffer} chunk - Chunk binary data                                                                          //
    @param {Function} callback - Callback                                                                              //
    @summary Write chunk in given order                                                                                //
    @returns {Boolean} - True if chunk is sent to stream, false if chunk is set into queue                             //
     */                                                                                                                //
                                                                                                                       //
    writeStream.prototype.write = function (num, chunk, callback) {                                                    //
      var self;                                                                                                        //
      if (!this.stream._writableState.ended && num > this.writtenChunks) {                                             //
        if (this.drained && num === this.writtenChunks + 1) {                                                          //
          this.drained = false;                                                                                        //
          this.stream.write(chunk, callback);                                                                          //
          return true;                                                                                                 //
        } else {                                                                                                       //
          self = this;                                                                                                 //
          Meteor.setTimeout(function () {                                                                              //
            self.write(num, chunk);                                                                                    //
          }, 25);                                                                                                      //
        }                                                                                                              //
      }                                                                                                                //
      return false;                                                                                                    //
    };                                                                                                                 //
                                                                                                                       //
    /*                                                                                                                 //
    @memberOf writeStream                                                                                              //
    @name end                                                                                                          //
    @param {Function} callback - Callback                                                                              //
    @summary Finishes writing to writableStream, only after all chunks in queue is written                             //
    @returns {Boolean} - True if stream is fulfilled, false if queue is in progress                                    //
     */                                                                                                                //
                                                                                                                       //
    writeStream.prototype.end = function (callback) {                                                                  //
      var self;                                                                                                        //
      if (!this.stream._writableState.ended) {                                                                         //
        if (this.writtenChunks === this.maxLength) {                                                                   //
          this.stream.end(callback);                                                                                   //
          return true;                                                                                                 //
        } else {                                                                                                       //
          self = this;                                                                                                 //
          Meteor.setTimeout(function () {                                                                              //
            self.end(callback);                                                                                        //
          }, 25);                                                                                                      //
        }                                                                                                              //
      }                                                                                                                //
      return false;                                                                                                    //
    };                                                                                                                 //
                                                                                                                       //
    return writeStream;                                                                                                //
  }();                                                                                                                 //
} else {var EventEmitter;module.import('./event-emitter.jsx',{"EventEmitter":function(v){EventEmitter=v}});            //
                                                                                                                       //
}                                                                                                                      //
                                                                                                                       //
/*                                                                                                                     //
@private                                                                                                               //
@locus Anywhere                                                                                                        //
@class FileCursor                                                                                                      //
@param _fileRef    {Object} - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)             //
@param _collection {FilesCollection} - FilesCollection Instance                                                        //
@summary Internal class, represents each record in `FilesCursor.each()` or document returned from `.findOne()` method  //
 */                                                                                                                    //
                                                                                                                       //
FileCursor = function () {                                                                                             //
  function FileCursor(_fileRef, _collection) {                                                                         //
    var self;                                                                                                          //
    this._fileRef = _fileRef;                                                                                          //
    this._collection = _collection;                                                                                    //
    self = this;                                                                                                       //
    self = _.extend(self, this._fileRef);                                                                              //
  }                                                                                                                    //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FileCursor                                                                                                 //
  @name remove                                                                                                         //
  @param callback {Function} - Triggered asynchronously after item is removed or failed to be removed                  //
  @summary Remove document                                                                                             //
  @returns {FileCursor}                                                                                                //
   */                                                                                                                  //
                                                                                                                       //
  FileCursor.prototype.remove = function (callback) {                                                                  //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FileCursor] [remove()]');                                                       //
    }                                                                                                                  //
    if (this._fileRef) {                                                                                               //
      this._collection.remove(this._fileRef._id, callback);                                                            //
    } else {                                                                                                           //
      callback && callback(new Meteor.Error(404, 'No such file'));                                                     //
    }                                                                                                                  //
    return this;                                                                                                       //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FileCursor                                                                                                 //
  @name link                                                                                                           //
  @param version {String} - Name of file's subversion                                                                  //
  @summary Returns downloadable URL to File                                                                            //
  @returns {String}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  FileCursor.prototype.link = function (version) {                                                                     //
    if (this._collection.debug) {                                                                                      //
      console.info("[FilesCollection] [FileCursor] [link(" + version + ")]");                                          //
    }                                                                                                                  //
    if (this._fileRef) {                                                                                               //
      return this._collection.link(this._fileRef, version);                                                            //
    } else {                                                                                                           //
      return '';                                                                                                       //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FileCursor                                                                                                 //
  @name get                                                                                                            //
  @param property {String} - Name of sub-object property                                                               //
  @summary Returns current document as a plain Object, if `property` is specified - returns value of sub-object property
  @returns {Object|mix}                                                                                                //
   */                                                                                                                  //
                                                                                                                       //
  FileCursor.prototype.get = function (property) {                                                                     //
    if (this._collection.debug) {                                                                                      //
      console.info("[FilesCollection] [FileCursor] [get(" + property + ")]");                                          //
    }                                                                                                                  //
    if (property) {                                                                                                    //
      return this._fileRef[property];                                                                                  //
    } else {                                                                                                           //
      return this._fileRef;                                                                                            //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FileCursor                                                                                                 //
  @name fetch                                                                                                          //
  @summary Returns document as plain Object in Array                                                                   //
  @returns {[Object]}                                                                                                  //
   */                                                                                                                  //
                                                                                                                       //
  FileCursor.prototype.fetch = function () {                                                                           //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FileCursor] [fetch()]');                                                        //
    }                                                                                                                  //
    return [this._fileRef];                                                                                            //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FileCursor                                                                                                 //
  @name with                                                                                                           //
  @summary Returns reactive version of current FileCursor, useful to use with `{{#with}}...{{/with}}` block template helper
  @returns {[Object]}                                                                                                  //
   */                                                                                                                  //
                                                                                                                       //
  FileCursor.prototype["with"] = function () {                                                                         //
    var self;                                                                                                          //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FileCursor] [with()]');                                                         //
    }                                                                                                                  //
    self = this;                                                                                                       //
    return _.extend(self, this._collection.collection.findOne(this._fileRef._id));                                     //
  };                                                                                                                   //
                                                                                                                       //
  return FileCursor;                                                                                                   //
}();                                                                                                                   //
                                                                                                                       //
/*                                                                                                                     //
@private                                                                                                               //
@locus Anywhere                                                                                                        //
@class FilesCursor                                                                                                     //
@param _selector   {String|Object}   - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)    //
@param options     {Object}          - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#selectors)
@param _collection {FilesCollection} - FilesCollection Instance                                                        //
@summary Implementation of Cursor for FilesCollection                                                                  //
 */                                                                                                                    //
                                                                                                                       //
FilesCursor = function () {                                                                                            //
  function FilesCursor(_selector, options, _collection) {                                                              //
    this._selector = _selector != null ? _selector : {};                                                               //
    this._collection = _collection;                                                                                    //
    this._current = -1;                                                                                                //
    this.cursor = this._collection.collection.find(this._selector, options);                                           //
  }                                                                                                                    //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name get                                                                                                            //
  @summary Returns all matching document(s) as an Array. Alias of `.fetch()`                                           //
  @returns {[Object]}                                                                                                  //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.get = function () {                                                                            //
    if (this._collection.debug) {                                                                                      //
      console.info("[FilesCollection] [FilesCursor] [get()]");                                                         //
    }                                                                                                                  //
    return this.cursor.fetch();                                                                                        //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name hasNext                                                                                                        //
  @summary Returns `true` if there is next item available on Cursor                                                    //
  @returns {Boolean}                                                                                                   //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.hasNext = function () {                                                                        //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FilesCursor] [hasNext()]');                                                     //
    }                                                                                                                  //
    return this._current < this.cursor.count() - 1;                                                                    //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name next                                                                                                           //
  @summary Returns next item on Cursor, if available                                                                   //
  @returns {Object|undefined}                                                                                          //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.next = function () {                                                                           //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FilesCursor] [next()]');                                                        //
    }                                                                                                                  //
    if (this.hasNext()) {                                                                                              //
      return this.cursor.fetch()[++this._current];                                                                     //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name hasPrevious                                                                                                    //
  @summary Returns `true` if there is previous item available on Cursor                                                //
  @returns {Boolean}                                                                                                   //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.hasPrevious = function () {                                                                    //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FilesCursor] [hasPrevious()]');                                                 //
    }                                                                                                                  //
    return this._current !== -1;                                                                                       //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name previous                                                                                                       //
  @summary Returns previous item on Cursor, if available                                                               //
  @returns {Object|undefined}                                                                                          //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.previous = function () {                                                                       //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FilesCursor] [previous()]');                                                    //
    }                                                                                                                  //
    if (this.hasPrevious()) {                                                                                          //
      return this.cursor.fetch()[--this._current];                                                                     //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name fetch                                                                                                          //
  @summary Returns all matching document(s) as an Array.                                                               //
  @returns {[Object]}                                                                                                  //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.fetch = function () {                                                                          //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FilesCursor] [fetch()]');                                                       //
    }                                                                                                                  //
    return this.cursor.fetch();                                                                                        //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name first                                                                                                          //
  @summary Returns first item on Cursor, if available                                                                  //
  @returns {Object|undefined}                                                                                          //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.first = function () {                                                                          //
    var ref;                                                                                                           //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FilesCursor] [first()]');                                                       //
    }                                                                                                                  //
    this._current = 0;                                                                                                 //
    return (ref = this.fetch()) != null ? ref[this._current] : void 0;                                                 //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name last                                                                                                           //
  @summary Returns last item on Cursor, if available                                                                   //
  @returns {Object|undefined}                                                                                          //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.last = function () {                                                                           //
    var ref;                                                                                                           //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FilesCursor] [last()]');                                                        //
    }                                                                                                                  //
    this._current = this.count() - 1;                                                                                  //
    return (ref = this.fetch()) != null ? ref[this._current] : void 0;                                                 //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name count                                                                                                          //
  @summary Returns the number of documents that match a query                                                          //
  @returns {Number}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.count = function () {                                                                          //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FilesCursor] [count()]');                                                       //
    }                                                                                                                  //
    return this.cursor.count();                                                                                        //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name remove                                                                                                         //
  @param callback {Function} - Triggered asynchronously after item is removed or failed to be removed                  //
  @summary Removes all documents that match a query                                                                    //
  @returns {FilesCursor}                                                                                               //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.remove = function (callback) {                                                                 //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FilesCursor] [remove()]');                                                      //
    }                                                                                                                  //
    this._collection.remove(this._selector, callback);                                                                 //
    return this;                                                                                                       //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name forEach                                                                                                        //
  @param callback {Function} - Function to call. It will be called with three arguments: the `file`, a 0-based index, and cursor itself
  @param context {Object} - An object which will be the value of `this` inside `callback`                              //
  @summary Call `callback` once for each matching document, sequentially and synchronously.                            //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.forEach = function (callback, context) {                                                       //
    if (context == null) {                                                                                             //
      context = {};                                                                                                    //
    }                                                                                                                  //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FilesCursor] [forEach()]');                                                     //
    }                                                                                                                  //
    this.cursor.forEach(callback, context);                                                                            //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name each                                                                                                           //
  @summary Returns an Array of FileCursor made for each document on current cursor                                     //
           Useful when using in {{#each FilesCursor#each}}...{{/each}} block template helper                           //
  @returns {[FileCursor]}                                                                                              //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.each = function () {                                                                           //
    var self;                                                                                                          //
    self = this;                                                                                                       //
    return this.map(function (file) {                                                                                  //
      return new FileCursor(file, self._collection);                                                                   //
    });                                                                                                                //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name map                                                                                                            //
  @param callback {Function} - Function to call. It will be called with three arguments: the `file`, a 0-based index, and cursor itself
  @param context {Object} - An object which will be the value of `this` inside `callback`                              //
  @summary Map `callback` over all matching documents. Returns an Array.                                               //
  @returns {Array}                                                                                                     //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.map = function (callback, context) {                                                           //
    if (context == null) {                                                                                             //
      context = {};                                                                                                    //
    }                                                                                                                  //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FilesCursor] [map()]');                                                         //
    }                                                                                                                  //
    return this.cursor.map(callback, context);                                                                         //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name current                                                                                                        //
  @summary Returns current item on Cursor, if available                                                                //
  @returns {Object|undefined}                                                                                          //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.current = function () {                                                                        //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FilesCursor] [current()]');                                                     //
    }                                                                                                                  //
    if (this._current < 0) {                                                                                           //
      this._current = 0;                                                                                               //
    }                                                                                                                  //
    return this.fetch()[this._current];                                                                                //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name observe                                                                                                        //
  @param callbacks {Object} - Functions to call to deliver the result set as it changes                                //
  @summary Watch a query. Receive callbacks as the result set changes.                                                 //
  @url http://docs.meteor.com/api/collections.html#Mongo-Cursor-observe                                                //
  @returns {Object} - live query handle                                                                                //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.observe = function (callbacks) {                                                               //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FilesCursor] [observe()]');                                                     //
    }                                                                                                                  //
    return this.cursor.observe(callbacks);                                                                             //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCursor                                                                                                //
  @name observeChanges                                                                                                 //
  @param callbacks {Object} - Functions to call to deliver the result set as it changes                                //
  @summary Watch a query. Receive callbacks as the result set changes. Only the differences between the old and new documents are passed to the callbacks.
  @url http://docs.meteor.com/api/collections.html#Mongo-Cursor-observeChanges                                         //
  @returns {Object} - live query handle                                                                                //
   */                                                                                                                  //
                                                                                                                       //
  FilesCursor.prototype.observeChanges = function (callbacks) {                                                        //
    if (this._collection.debug) {                                                                                      //
      console.info('[FilesCollection] [FilesCursor] [observeChanges()]');                                              //
    }                                                                                                                  //
    return this.cursor.observeChanges(callbacks);                                                                      //
  };                                                                                                                   //
                                                                                                                       //
  return FilesCursor;                                                                                                  //
}();                                                                                                                   //
                                                                                                                       //
/*                                                                                                                     //
@var {Function} fixJSONParse - Fix issue with Date parse                                                               //
 */                                                                                                                    //
                                                                                                                       //
_fixJSONParse = function fixJSONParse(obj) {                                                                           //
  var i, j, key, len, v, value;                                                                                        //
  for (key in meteorBabelHelpers.sanitizeForInObject(obj)) {                                                           //
    value = obj[key];                                                                                                  //
    if (_.isString(value) && !!~value.indexOf('=--JSON-DATE--=')) {                                                    //
      value = value.replace('=--JSON-DATE--=', '');                                                                    //
      obj[key] = new Date(parseInt(value));                                                                            //
    } else if (_.isObject(value)) {                                                                                    //
      obj[key] = _fixJSONParse(value);                                                                                 //
    } else if (_.isArray(value)) {                                                                                     //
      for (i = j = 0, len = value.length; j < len; i = ++j) {                                                          //
        v = value[i];                                                                                                  //
        if (_.isObject(v)) {                                                                                           //
          obj[key][i] = _fixJSONParse(v);                                                                              //
        } else if (_.isString(v) && !!~v.indexOf('=--JSON-DATE--=')) {                                                 //
          v = v.replace('=--JSON-DATE--=', '');                                                                        //
          obj[key][i] = new Date(parseInt(v));                                                                         //
        }                                                                                                              //
      }                                                                                                                //
    }                                                                                                                  //
  }                                                                                                                    //
  return obj;                                                                                                          //
};                                                                                                                     //
                                                                                                                       //
/*                                                                                                                     //
@var {Function} fixJSONStringify - Fix issue with Date stringify                                                       //
 */                                                                                                                    //
                                                                                                                       //
_fixJSONStringify = function fixJSONStringify(obj) {                                                                   //
  var i, j, key, len, v, value;                                                                                        //
  for (key in meteorBabelHelpers.sanitizeForInObject(obj)) {                                                           //
    value = obj[key];                                                                                                  //
    if (_.isDate(value)) {                                                                                             //
      obj[key] = '=--JSON-DATE--=' + +value;                                                                           //
    } else if (_.isObject(value)) {                                                                                    //
      obj[key] = _fixJSONStringify(value);                                                                             //
    } else if (_.isArray(value)) {                                                                                     //
      for (i = j = 0, len = value.length; j < len; i = ++j) {                                                          //
        v = value[i];                                                                                                  //
        if (_.isObject(v)) {                                                                                           //
          obj[key][i] = _fixJSONStringify(v);                                                                          //
        } else if (_.isDate(v)) {                                                                                      //
          obj[key][i] = '=--JSON-DATE--=' + +v;                                                                        //
        }                                                                                                              //
      }                                                                                                                //
    }                                                                                                                  //
  }                                                                                                                    //
  return obj;                                                                                                          //
};                                                                                                                     //
                                                                                                                       //
/*                                                                                                                     //
@locus Anywhere                                                                                                        //
@class FilesCollection                                                                                                 //
@param config           {Object}   - [Both]   Configuration object with next properties:                               //
@param config.debug     {Boolean}  - [Both]   Turn on/of debugging and extra logging                                   //
@param config.schema    {Object}   - [Both]   Collection Schema                                                        //
@param config.public    {Boolean}  - [Both]   Store files in folder accessible for proxy servers, for limits, and more - read docs
@param config.strict    {Boolean}  - [Server] Strict mode for partial content, if is `true` server will return `416` response code, when `range` is not specified, otherwise server return `206`
@param config.protected {Function} - [Both]   If `true` - files will be served only to authorized users, if `function()` - you're able to check visitor's permissions in your own way function's context has:
  - `request` - On server only                                                                                         //
  - `response` - On server only                                                                                        //
  - `user()`                                                                                                           //
  - `userId`                                                                                                           //
@param config.chunkSize      {Number}  - [Both] Upload chunk size, default: 524288 bytes (0,5 Mb)                      //
@param config.permissions    {Number}  - [Server] Permissions which will be set to uploaded files (octal), like: `511` or `0o755`. Default: 0644
@param config.parentDirPermissions {Number}  - [Server] Permissions which will be set to parent directory of uploaded files (octal), like: `611` or `0o777`. Default: 0755
@param config.storagePath    {String|Function}  - [Server] Storage path on file system                                 //
@param config.cacheControl   {String}  - [Server] Default `Cache-Control` header                                       //
@param config.responseHeaders {Object|Function} - [Server] Custom response headers, if function is passed, must return Object
@param config.throttle       {Number}  - [Server] bps throttle threshold                                               //
@param config.downloadRoute  {String}  - [Both]   Server Route used to retrieve files                                  //
@param config.collection     {Mongo.Collection} - [Both] Mongo Collection Instance                                     //
@param config.collectionName {String}  - [Both]   Collection name                                                      //
@param config.namingFunction {Function}- [Both]   Function which returns `String`                                      //
@param config.integrityCheck {Boolean} - [Server] Check file's integrity before serving to users                       //
@param config.onAfterUpload  {Function}- [Server] Called right after file is ready on FS. Use to transfer file somewhere else, or do other thing with file directly
@param config.onAfterRemove  {Function} - [Server] Called right after file is removed. Removed objects is passed to callback
@param config.continueUploadTTL {Number} - [Server] Time in seconds, during upload may be continued, default 3 hours (10800 seconds)
@param config.onBeforeUpload {Function}- [Both]   Function which executes on server after receiving each chunk and on client right before beginning upload. Function context is `File` - so you are able to check for extension, mime-type, size and etc.
return `true` to continue                                                                                              //
return `false` or `String` to abort upload                                                                             //
@param config.onBeforeRemove {Function} - [Server] Executes before removing file on server, so you can check permissions. Return `true` to allow action and `false` to deny.
@param config.allowClientCode  {Boolean}  - [Both]   Allow to run `remove` from client                                 //
@param config.downloadCallback {Function} - [Server] Callback triggered each time file is requested, return truthy value to continue download, or falsy to abort
@param config.interceptDownload {Function} - [Server] Intercept download request, so you can serve file from third-party resource, arguments {http: {request: {...}, response: {...}}, fileRef: {...}}
@param config.onbeforeunloadMessage {String|Function} - [Client] Message shown to user when closing browser's window or tab while upload process is running
@summary Create new instance of FilesCollection                                                                        //
 */                                                                                                                    //
                                                                                                                       //
exports.                                                                                                               //
                                                                                                                       //
/*                                                                                                                     //
Export the FilesCollection class                                                                                       //
 */                                                                                                                    //
                                                                                                                       //
FilesCollection = FilesCollection = function () {                                                                      //
  var FileUpload, UploadInstance;                                                                                      //
                                                                                                                       //
  FilesCollection.prototype.__proto__ = function () {                                                                  //
    if (Meteor.isServer) {                                                                                             //
      return events.EventEmitter.prototype;                                                                            //
    } else {                                                                                                           //
      return EventEmitter.prototype;                                                                                   //
    }                                                                                                                  //
  }();                                                                                                                 //
                                                                                                                       //
  function FilesCollection(config) {                                                                                   //
    var _methods, _preCollectionCursor, cookie, self, setTokenCookie, storagePath, unsetTokenCookie;                   //
    if (Meteor.isServer) {                                                                                             //
      events.EventEmitter.call(this);                                                                                  //
    } else {                                                                                                           //
      EventEmitter.call(this);                                                                                         //
    }                                                                                                                  //
    if (config) {                                                                                                      //
      storagePath = config.storagePath, this.collection = config.collection, this.collectionName = config.collectionName, this.downloadRoute = config.downloadRoute, this.schema = config.schema, this.chunkSize = config.chunkSize, this.namingFunction = config.namingFunction, this.debug = config.debug, this.onbeforeunloadMessage = config.onbeforeunloadMessage, this.permissions = config.permissions, this.parentDirPermissions = config.parentDirPermissions, this.allowClientCode = config.allowClientCode, this.onBeforeUpload = config.onBeforeUpload, this.integrityCheck = config.integrityCheck, this["protected"] = config["protected"], this["public"] = config["public"], this.strict = config.strict, this.downloadCallback = config.downloadCallback, this.cacheControl = config.cacheControl, this.responseHeaders = config.responseHeaders, this.throttle = config.throttle, this.onAfterUpload = config.onAfterUpload, this.onAfterRemove = config.onAfterRemove, this.interceptDownload = config.interceptDownload, this.onBeforeRemove = config.onBeforeRemove, this.continueUploadTTL = config.continueUploadTTL;
    }                                                                                                                  //
    self = this;                                                                                                       //
    cookie = new Cookies();                                                                                            //
    if (this.debug == null) {                                                                                          //
      this.debug = false;                                                                                              //
    }                                                                                                                  //
    if (this["public"] == null) {                                                                                      //
      this["public"] = false;                                                                                          //
    }                                                                                                                  //
    if (this["protected"] == null) {                                                                                   //
      this["protected"] = false;                                                                                       //
    }                                                                                                                  //
    if (this.chunkSize == null) {                                                                                      //
      this.chunkSize = 1024 * 512;                                                                                     //
    }                                                                                                                  //
    this.chunkSize = Math.floor(this.chunkSize / 8) * 8;                                                               //
    if (this["public"] && !this.downloadRoute) {                                                                       //
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: \"downloadRoute\" must be precisely provided on \"public\" collections! Note: \"downloadRoute\" must be equal on be inside of your web/proxy-server (relative) root.");
    }                                                                                                                  //
    if (this.collection == null) {                                                                                     //
      this.collection = new Mongo.Collection(this.collectionName);                                                     //
    }                                                                                                                  //
    if (this.collectionName == null) {                                                                                 //
      this.collectionName = this.collection._name;                                                                     //
    }                                                                                                                  //
    check(this.collectionName, String);                                                                                //
    if (this.downloadRoute == null) {                                                                                  //
      this.downloadRoute = '/cdn/storage';                                                                             //
    }                                                                                                                  //
    this.downloadRoute = this.downloadRoute.replace(/\/$/, '');                                                        //
    if (this.collectionName == null) {                                                                                 //
      this.collectionName = 'MeteorUploadFiles';                                                                       //
    }                                                                                                                  //
    if (this.namingFunction == null) {                                                                                 //
      this.namingFunction = false;                                                                                     //
    }                                                                                                                  //
    if (this.onBeforeUpload == null) {                                                                                 //
      this.onBeforeUpload = false;                                                                                     //
    }                                                                                                                  //
    if (this.allowClientCode == null) {                                                                                //
      this.allowClientCode = true;                                                                                     //
    }                                                                                                                  //
    if (this.interceptDownload == null) {                                                                              //
      this.interceptDownload = false;                                                                                  //
    }                                                                                                                  //
    if (Meteor.isClient) {                                                                                             //
      if (this.onbeforeunloadMessage == null) {                                                                        //
        this.onbeforeunloadMessage = 'Upload in a progress... Do you want to abort?';                                  //
      }                                                                                                                //
      delete this.strict;                                                                                              //
      delete this.throttle;                                                                                            //
      delete this.permissions;                                                                                         //
      delete this.parentDirPermissions;                                                                                //
      delete this.cacheControl;                                                                                        //
      delete this.onAfterUpload;                                                                                       //
      delete this.onAfterRemove;                                                                                       //
      delete this.onBeforeRemove;                                                                                      //
      delete this.integrityCheck;                                                                                      //
      delete this.downloadCallback;                                                                                    //
      delete this.interceptDownload;                                                                                   //
      delete this.continueUploadTTL;                                                                                   //
      delete this.responseHeaders;                                                                                     //
      if (_.has(Package, 'accounts-base')) {                                                                           //
        setTokenCookie = function () {                                                                                 //
          function setTokenCookie() {                                                                                  //
            if (!cookie.has('meteor_login_token') && Accounts._lastLoginTokenWhenPolled || cookie.has('meteor_login_token') && cookie.get('meteor_login_token') !== Accounts._lastLoginTokenWhenPolled) {
              cookie.set('meteor_login_token', Accounts._lastLoginTokenWhenPolled, null, '/');                         //
              return cookie.send();                                                                                    //
            }                                                                                                          //
          }                                                                                                            //
                                                                                                                       //
          return setTokenCookie;                                                                                       //
        }();                                                                                                           //
        unsetTokenCookie = function () {                                                                               //
          function unsetTokenCookie() {                                                                                //
            if (cookie.has('meteor_login_token')) {                                                                    //
              cookie.remove('meteor_login_token');                                                                     //
              return cookie.send();                                                                                    //
            }                                                                                                          //
          }                                                                                                            //
                                                                                                                       //
          return unsetTokenCookie;                                                                                     //
        }();                                                                                                           //
        Accounts.onLogin(function () {                                                                                 //
          setTokenCookie();                                                                                            //
        });                                                                                                            //
        Accounts.onLogout(function () {                                                                                //
          unsetTokenCookie();                                                                                          //
        });                                                                                                            //
        if (Accounts._lastLoginTokenWhenPolled) {                                                                      //
          setTokenCookie();                                                                                            //
        } else {                                                                                                       //
          unsetTokenCookie();                                                                                          //
        }                                                                                                              //
      }                                                                                                                //
      check(this.onbeforeunloadMessage, Match.OneOf(String, Function));                                                //
    } else {                                                                                                           //
      if (this.strict == null) {                                                                                       //
        this.strict = true;                                                                                            //
      }                                                                                                                //
      if (this.throttle == null) {                                                                                     //
        this.throttle = false;                                                                                         //
      }                                                                                                                //
      if (this.permissions == null) {                                                                                  //
        this.permissions = parseInt('644', 8);                                                                         //
      }                                                                                                                //
      if (this.parentDirPermissions == null) {                                                                         //
        this.parentDirPermissions = parseInt('755', 8);                                                                //
      }                                                                                                                //
      if (this.cacheControl == null) {                                                                                 //
        this.cacheControl = 'public, max-age=31536000, s-maxage=31536000';                                             //
      }                                                                                                                //
      if (this.onAfterUpload == null) {                                                                                //
        this.onAfterUpload = false;                                                                                    //
      }                                                                                                                //
      if (this.onAfterRemove == null) {                                                                                //
        this.onAfterRemove = false;                                                                                    //
      }                                                                                                                //
      if (this.onBeforeRemove == null) {                                                                               //
        this.onBeforeRemove = false;                                                                                   //
      }                                                                                                                //
      if (this.integrityCheck == null) {                                                                               //
        this.integrityCheck = true;                                                                                    //
      }                                                                                                                //
      if (this._currentUploads == null) {                                                                              //
        this._currentUploads = {};                                                                                     //
      }                                                                                                                //
      if (this.downloadCallback == null) {                                                                             //
        this.downloadCallback = false;                                                                                 //
      }                                                                                                                //
      if (this.continueUploadTTL == null) {                                                                            //
        this.continueUploadTTL = 10800;                                                                                //
      }                                                                                                                //
      if (this.responseHeaders == null) {                                                                              //
        this.responseHeaders = function (responseCode, fileRef, versionRef) {                                          //
          var headers;                                                                                                 //
          headers = {};                                                                                                //
          switch (responseCode) {                                                                                      //
            case '206':                                                                                                //
              headers['Pragma'] = 'private';                                                                           //
              headers['Trailer'] = 'expires';                                                                          //
              headers['Transfer-Encoding'] = 'chunked';                                                                //
              break;                                                                                                   //
            case '400':                                                                                                //
              headers['Cache-Control'] = 'no-cache';                                                                   //
              break;                                                                                                   //
            case '416':                                                                                                //
              headers['Content-Range'] = "bytes */" + versionRef.size;                                                 //
          }                                                                                                            //
          headers['Connection'] = 'keep-alive';                                                                        //
          headers['Content-Type'] = versionRef.type || 'application/octet-stream';                                     //
          headers['Accept-Ranges'] = 'bytes';                                                                          //
          return headers;                                                                                              //
        };                                                                                                             //
      }                                                                                                                //
      if (this["public"] && !storagePath) {                                                                            //
        throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "] \"storagePath\" must be set on \"public\" collections! Note: \"storagePath\" must be equal on be inside of your web/proxy-server (absolute) root.");
      }                                                                                                                //
      if (storagePath == null) {                                                                                       //
        storagePath = "assets" + nodePath.sep + "app" + nodePath.sep + "uploads" + nodePath.sep + this.collectionName;
      }                                                                                                                //
      Object.defineProperty(self, 'storagePath', {                                                                     //
        get: function () {                                                                                             //
          function get() {                                                                                             //
            var sp;                                                                                                    //
            sp = '';                                                                                                   //
            if (_.isString(storagePath)) {                                                                             //
              sp = storagePath;                                                                                        //
            } else if (_.isFunction(storagePath)) {                                                                    //
              sp = storagePath.call(self, "assets" + nodePath.sep + "app" + nodePath.sep + "uploads" + nodePath.sep + self.collectionName);
            }                                                                                                          //
            if (!_.isString(sp)) {                                                                                     //
              throw new Meteor.Error(400, "[FilesCollection." + self.collectionName + "] \"storagePath\" function must return a String!");
            }                                                                                                          //
            sp = sp.replace(/\/$/, '');                                                                                //
            return nodePath.normalize(sp);                                                                             //
          }                                                                                                            //
                                                                                                                       //
          return get;                                                                                                  //
        }()                                                                                                            //
      });                                                                                                              //
      if (this.debug) {                                                                                                //
        console.info('[FilesCollection.storagePath] Set to:', this.storagePath);                                       //
      }                                                                                                                //
      fs.mkdirs(this.storagePath, {                                                                                    //
        mode: this.parentDirPermissions                                                                                //
      }, function (error) {                                                                                            //
        if (error) {                                                                                                   //
          throw new Meteor.Error(401, "[FilesCollection." + self.collectionName + "] Path \"" + self.storagePath + "\" is not writable!", error);
        }                                                                                                              //
      });                                                                                                              //
      check(this.strict, Boolean);                                                                                     //
      check(this.throttle, Match.OneOf(false, Number));                                                                //
      check(this.permissions, Number);                                                                                 //
      check(this.storagePath, String);                                                                                 //
      check(this.cacheControl, String);                                                                                //
      check(this.onAfterRemove, Match.OneOf(false, Function));                                                         //
      check(this.onAfterUpload, Match.OneOf(false, Function));                                                         //
      check(this.integrityCheck, Boolean);                                                                             //
      check(this.onBeforeRemove, Match.OneOf(false, Function));                                                        //
      check(this.downloadCallback, Match.OneOf(false, Function));                                                      //
      check(this.interceptDownload, Match.OneOf(false, Function));                                                     //
      check(this.continueUploadTTL, Number);                                                                           //
      check(this.responseHeaders, Match.OneOf(Object, Function));                                                      //
      this._preCollection = new Mongo.Collection('__pre_' + this.collectionName);                                      //
      this._preCollection._ensureIndex({                                                                               //
        'createdAt': 1                                                                                                 //
      }, {                                                                                                             //
        expireAfterSeconds: this.continueUploadTTL,                                                                    //
        background: true                                                                                               //
      });                                                                                                              //
      _preCollectionCursor = this._preCollection.find({});                                                             //
      _preCollectionCursor.observeChanges({                                                                            //
        removed: function () {                                                                                         //
          function removed(_id) {                                                                                      //
            var ref;                                                                                                   //
            if (self.debug) {                                                                                          //
              console.info("[FilesCollection] [_preCollectionCursor.observeChanges] [removed]: " + _id);               //
            }                                                                                                          //
            if ((ref = self._currentUploads) != null ? ref[_id] : void 0) {                                            //
              self._currentUploads[_id].end();                                                                         //
              delete self._currentUploads[_id];                                                                        //
            }                                                                                                          //
          }                                                                                                            //
                                                                                                                       //
          return removed;                                                                                              //
        }()                                                                                                            //
      });                                                                                                              //
      this._createStream = function (_id, path, opts) {                                                                //
        return self._currentUploads[_id] = new writeStream(path, opts.fileLength, opts);                               //
      };                                                                                                               //
      this._continueUpload = function (_id) {                                                                          //
        var contUpld, ref, ref1;                                                                                       //
        if ((ref = self._currentUploads) != null ? (ref1 = ref[_id]) != null ? ref1.file : void 0 : void 0) {          //
          if (!self._currentUploads[_id].stream._writableState.ended) {                                                //
            return self._currentUploads[_id].file;                                                                     //
          } else {                                                                                                     //
            self._createStream(_id, self._currentUploads[_id].file.file.path, self._currentUploads[_id].file);         //
            return self._currentUploads[_id].file;                                                                     //
          }                                                                                                            //
        } else {                                                                                                       //
          contUpld = self._preCollection.findOne({                                                                     //
            _id: _id                                                                                                   //
          });                                                                                                          //
          if (contUpld) {                                                                                              //
            self._createStream(_id, contUpld.file.path, contUpld.file);                                                //
          }                                                                                                            //
          return contUpld;                                                                                             //
        }                                                                                                              //
      };                                                                                                               //
    }                                                                                                                  //
    if (!this.schema) {                                                                                                //
      this.schema = {                                                                                                  //
        size: {                                                                                                        //
          type: Number                                                                                                 //
        },                                                                                                             //
        name: {                                                                                                        //
          type: String                                                                                                 //
        },                                                                                                             //
        type: {                                                                                                        //
          type: String                                                                                                 //
        },                                                                                                             //
        path: {                                                                                                        //
          type: String                                                                                                 //
        },                                                                                                             //
        isVideo: {                                                                                                     //
          type: Boolean                                                                                                //
        },                                                                                                             //
        isAudio: {                                                                                                     //
          type: Boolean                                                                                                //
        },                                                                                                             //
        isImage: {                                                                                                     //
          type: Boolean                                                                                                //
        },                                                                                                             //
        isText: {                                                                                                      //
          type: Boolean                                                                                                //
        },                                                                                                             //
        isJSON: {                                                                                                      //
          type: Boolean                                                                                                //
        },                                                                                                             //
        isPDF: {                                                                                                       //
          type: Boolean                                                                                                //
        },                                                                                                             //
        extension: {                                                                                                   //
          type: String,                                                                                                //
          optional: true                                                                                               //
        },                                                                                                             //
        _storagePath: {                                                                                                //
          type: String                                                                                                 //
        },                                                                                                             //
        _downloadRoute: {                                                                                              //
          type: String                                                                                                 //
        },                                                                                                             //
        _collectionName: {                                                                                             //
          type: String                                                                                                 //
        },                                                                                                             //
        "public": {                                                                                                    //
          type: Boolean,                                                                                               //
          optional: true                                                                                               //
        },                                                                                                             //
        meta: {                                                                                                        //
          type: Object,                                                                                                //
          blackbox: true,                                                                                              //
          optional: true                                                                                               //
        },                                                                                                             //
        userId: {                                                                                                      //
          type: String,                                                                                                //
          optional: true                                                                                               //
        },                                                                                                             //
        updatedAt: {                                                                                                   //
          type: Date,                                                                                                  //
          optional: true                                                                                               //
        },                                                                                                             //
        versions: {                                                                                                    //
          type: Object,                                                                                                //
          blackbox: true                                                                                               //
        }                                                                                                              //
      };                                                                                                               //
    }                                                                                                                  //
    check(this.debug, Boolean);                                                                                        //
    check(this.schema, Object);                                                                                        //
    check(this["public"], Boolean);                                                                                    //
    check(this["protected"], Match.OneOf(Boolean, Function));                                                          //
    check(this.chunkSize, Number);                                                                                     //
    check(this.downloadRoute, String);                                                                                 //
    check(this.namingFunction, Match.OneOf(false, Function));                                                          //
    check(this.onBeforeUpload, Match.OneOf(false, Function));                                                          //
    check(this.allowClientCode, Boolean);                                                                              //
    if (this["public"] && this["protected"]) {                                                                         //
      throw new Meteor.Error(500, "[FilesCollection." + this.collectionName + "]: Files can not be public and protected at the same time!");
    }                                                                                                                  //
    this._checkAccess = function (http) {                                                                              //
      var fileRef, rc, ref, result, text, user, userFuncs, userId;                                                     //
      if (self["protected"]) {                                                                                         //
        user = false;                                                                                                  //
        userFuncs = self._getUser(http);                                                                               //
        user = userFuncs.user, userId = userFuncs.userId;                                                              //
        user = user();                                                                                                 //
        if (_.isFunction(self["protected"])) {                                                                         //
          if (http != null ? (ref = http.params) != null ? ref._id : void 0 : void 0) {                                //
            fileRef = self.collection.findOne(http.params._id);                                                        //
          }                                                                                                            //
          result = http ? self["protected"].call(_.extend(http, userFuncs), fileRef || null) : self["protected"].call(userFuncs, fileRef || null);
        } else {                                                                                                       //
          result = !!user;                                                                                             //
        }                                                                                                              //
        if (http && result === true || !http) {                                                                        //
          return true;                                                                                                 //
        } else {                                                                                                       //
          rc = _.isNumber(result) ? result : 401;                                                                      //
          if (self.debug) {                                                                                            //
            console.warn('[FilesCollection._checkAccess] WARN: Access denied!');                                       //
          }                                                                                                            //
          if (http) {                                                                                                  //
            text = 'Access denied!';                                                                                   //
            http.response.writeHead(rc, {                                                                              //
              'Content-Length': text.length,                                                                           //
              'Content-Type': 'text/plain'                                                                             //
            });                                                                                                        //
            http.response.end(text);                                                                                   //
          }                                                                                                            //
          return false;                                                                                                //
        }                                                                                                              //
      } else {                                                                                                         //
        return true;                                                                                                   //
      }                                                                                                                //
    };                                                                                                                 //
    this._methodNames = {                                                                                              //
      _Abort: "_FilesCollectionAbort_" + this.collectionName,                                                          //
      _Write: "_FilesCollectionWrite_" + this.collectionName,                                                          //
      _Start: "_FilesCollectionStart_" + this.collectionName,                                                          //
      _Remove: "_FilesCollectionRemove_" + this.collectionName                                                         //
    };                                                                                                                 //
    if (Meteor.isServer) {                                                                                             //
      this.on('_handleUpload', this._handleUpload);                                                                    //
      this.on('_finishUpload', this._finishUpload);                                                                    //
      WebApp.connectHandlers.use(function (request, response, next) {                                                  //
        var _file, body, handleError, http, params, uri, uris, version;                                                //
        if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName + "/__upload")) {        //
          if (request.method === 'POST') {                                                                             //
            body = '';                                                                                                 //
            handleError = function () {                                                                                //
              function handleError(error) {                                                                            //
                console.warn("[FilesCollection] [Upload] [HTTP] Exception:", error);                                   //
                response.writeHead(500);                                                                               //
                response.end(JSON.stringify({                                                                          //
                  error: error                                                                                         //
                }));                                                                                                   //
              }                                                                                                        //
                                                                                                                       //
              return handleError;                                                                                      //
            }();                                                                                                       //
            request.on('data', function (data) {                                                                       //
              return bound(function () {                                                                               //
                body += data;                                                                                          //
              });                                                                                                      //
            });                                                                                                        //
            request.on('end', function () {                                                                            //
              return bound(function () {                                                                               //
                var _continueUpload, error, error1, opts, ref, ref1, result, user;                                     //
                try {                                                                                                  //
                  opts = JSON.parse(body);                                                                             //
                  user = self._getUser({                                                                               //
                    request: request,                                                                                  //
                    response: response                                                                                 //
                  });                                                                                                  //
                  _continueUpload = self._continueUpload(opts.fileId);                                                 //
                  if (!_continueUpload) {                                                                              //
                    throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');       //
                  }                                                                                                    //
                  ref = self._prepareUpload(_.extend(opts, _continueUpload), user.userId, 'HTTP'), result = ref.result, opts = ref.opts;
                  if (opts.eof) {                                                                                      //
                    Meteor.wrapAsync(self._handleUpload.bind(self, result, opts))();                                   //
                    response.writeHead(200);                                                                           //
                    if (result != null ? (ref1 = result.file) != null ? ref1.meta : void 0 : void 0) {                 //
                      result.file.meta = _fixJSONStringify(result.file.meta);                                          //
                    }                                                                                                  //
                    response.end(JSON.stringify(result));                                                              //
                  } else {                                                                                             //
                    self.emit('_handleUpload', result, opts, NOOP);                                                    //
                  }                                                                                                    //
                  response.writeHead(200);                                                                             //
                  response.end(JSON.stringify({                                                                        //
                    success: true                                                                                      //
                  }));                                                                                                 //
                } catch (error1) {                                                                                     //
                  error = error1;                                                                                      //
                  handleError(error);                                                                                  //
                }                                                                                                      //
              });                                                                                                      //
            });                                                                                                        //
          } else {                                                                                                     //
            next();                                                                                                    //
          }                                                                                                            //
          return;                                                                                                      //
        }                                                                                                              //
        if (!self["public"]) {                                                                                         //
          if (!!~request._parsedUrl.path.indexOf(self.downloadRoute + "/" + self.collectionName)) {                    //
            uri = request._parsedUrl.path.replace(self.downloadRoute + "/" + self.collectionName, '');                 //
            if (uri.indexOf('/') === 0) {                                                                              //
              uri = uri.substring(1);                                                                                  //
            }                                                                                                          //
            uris = uri.split('/');                                                                                     //
            if (uris.length === 3) {                                                                                   //
              params = {                                                                                               //
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                _id: uris[0],                                                                                          //
                version: uris[1],                                                                                      //
                name: uris[2]                                                                                          //
              };                                                                                                       //
              http = {                                                                                                 //
                request: request,                                                                                      //
                response: response,                                                                                    //
                params: params                                                                                         //
              };                                                                                                       //
              if (self._checkAccess(http)) {                                                                           //
                self.download(http, uris[1], self.collection.findOne(uris[0]));                                        //
              }                                                                                                        //
            } else {                                                                                                   //
              next();                                                                                                  //
            }                                                                                                          //
          } else {                                                                                                     //
            next();                                                                                                    //
          }                                                                                                            //
        } else {                                                                                                       //
          if (!!~request._parsedUrl.path.indexOf("" + self.downloadRoute)) {                                           //
            uri = request._parsedUrl.path.replace("" + self.downloadRoute, '');                                        //
            if (uri.indexOf('/') === 0) {                                                                              //
              uri = uri.substring(1);                                                                                  //
            }                                                                                                          //
            uris = uri.split('/');                                                                                     //
            _file = uris[uris.length - 1];                                                                             //
            if (_file) {                                                                                               //
              if (!!~_file.indexOf('-')) {                                                                             //
                version = _file.split('-')[0];                                                                         //
                _file = _file.split('-')[1].split('?')[0];                                                             //
              } else {                                                                                                 //
                version = 'original';                                                                                  //
                _file = _file.split('?')[0];                                                                           //
              }                                                                                                        //
              params = {                                                                                               //
                query: request._parsedUrl.query ? JSON.parse('{"' + decodeURI(request._parsedUrl.query).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"') + '"}') : {},
                file: _file,                                                                                           //
                _id: _file.split('.')[0],                                                                              //
                version: version,                                                                                      //
                name: _file                                                                                            //
              };                                                                                                       //
              http = {                                                                                                 //
                request: request,                                                                                      //
                response: response,                                                                                    //
                params: params                                                                                         //
              };                                                                                                       //
              self.download(http, version, self.collection.findOne(params._id));                                       //
            } else {                                                                                                   //
              next();                                                                                                  //
            }                                                                                                          //
          } else {                                                                                                     //
            next();                                                                                                    //
          }                                                                                                            //
        }                                                                                                              //
      });                                                                                                              //
      _methods = {};                                                                                                   //
      _methods[self._methodNames._Remove] = function (selector) {                                                      //
        var user, userFuncs;                                                                                           //
        check(selector, Match.OneOf(String, Object));                                                                  //
        if (self.debug) {                                                                                              //
          console.info("[FilesCollection] [Unlink Method] [.remove(" + selector + ")]");                               //
        }                                                                                                              //
        if (self.allowClientCode) {                                                                                    //
          if (self.onBeforeRemove && _.isFunction(self.onBeforeRemove)) {                                              //
            user = false;                                                                                              //
            userFuncs = {                                                                                              //
              userId: this.userId,                                                                                     //
              user: function () {                                                                                      //
                function user() {                                                                                      //
                  if (Meteor.users) {                                                                                  //
                    return Meteor.users.findOne(this.userId);                                                          //
                  } else {                                                                                             //
                    return null;                                                                                       //
                  }                                                                                                    //
                }                                                                                                      //
                                                                                                                       //
                return user;                                                                                           //
              }()                                                                                                      //
            };                                                                                                         //
            if (!self.onBeforeRemove.call(userFuncs, self.find(selector) || null)) {                                   //
              throw new Meteor.Error(403, '[FilesCollection] [remove] Not permitted!');                                //
            }                                                                                                          //
          }                                                                                                            //
          self.remove(selector);                                                                                       //
          return true;                                                                                                 //
        } else {                                                                                                       //
          throw new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!');              //
        }                                                                                                              //
      };                                                                                                               //
      _methods[self._methodNames._Start] = function (opts) {                                                           //
        var result;                                                                                                    //
        check(opts, {                                                                                                  //
          file: Object,                                                                                                //
          fileId: String,                                                                                              //
          FSName: Match.Optional(String),                                                                              //
          chunkSize: Number,                                                                                           //
          fileLength: Number                                                                                           //
        });                                                                                                            //
        if (self.debug) {                                                                                              //
          console.info("[FilesCollection] [File Start Method] " + opts.file.name + " - " + opts.fileId);               //
        }                                                                                                              //
        result = self._prepareUpload(_.clone(opts), this.userId, 'Start Method').result;                               //
        opts._id = opts.fileId;                                                                                        //
        opts.createdAt = new Date();                                                                                   //
        self._preCollection.insert(opts);                                                                              //
        self._createStream(result._id, result.path, opts);                                                             //
        return true;                                                                                                   //
      };                                                                                                               //
      _methods[self._methodNames._Write] = function (opts) {                                                           //
        var _continueUpload, e, error1, ref, result;                                                                   //
        check(opts, {                                                                                                  //
          eof: Match.Optional(Boolean),                                                                                //
          fileId: String,                                                                                              //
          binData: Match.Optional(String),                                                                             //
          chunkId: Match.Optional(Number)                                                                              //
        });                                                                                                            //
        _continueUpload = self._continueUpload(opts.fileId);                                                           //
        if (!_continueUpload) {                                                                                        //
          throw new Meteor.Error(408, 'Can\'t continue upload, session expired. Start upload again.');                 //
        }                                                                                                              //
        this.unblock();                                                                                                //
        ref = self._prepareUpload(_.extend(opts, _continueUpload), this.userId, 'DDP'), result = ref.result, opts = ref.opts;
        if (opts.eof) {                                                                                                //
          try {                                                                                                        //
            return Meteor.wrapAsync(self._handleUpload.bind(self, result, opts))();                                    //
          } catch (error1) {                                                                                           //
            e = error1;                                                                                                //
            if (self.debug) {                                                                                          //
              console.warn("[FilesCollection] [Write Method] [DDP] Exception:", e);                                    //
            }                                                                                                          //
            throw e;                                                                                                   //
          }                                                                                                            //
        } else {                                                                                                       //
          self.emit('_handleUpload', result, opts, NOOP);                                                              //
        }                                                                                                              //
        return true;                                                                                                   //
      };                                                                                                               //
      _methods[self._methodNames._Abort] = function (_id) {                                                            //
        var _continueUpload, ref;                                                                                      //
        check(_id, String);                                                                                            //
        _continueUpload = self._continueUpload(_id);                                                                   //
        if (self.debug) {                                                                                              //
          console.info("[FilesCollection] [Abort Method]: " + _id + " - " + (_continueUpload != null ? (ref = _continueUpload.file) != null ? ref.path : void 0 : void 0));
        }                                                                                                              //
        if (_continueUpload) {                                                                                         //
          self._preCollection.remove({                                                                                 //
            _id: _id                                                                                                   //
          });                                                                                                          //
          self.remove({                                                                                                //
            _id: _id                                                                                                   //
          });                                                                                                          //
          self.unlink({                                                                                                //
            _id: _id,                                                                                                  //
            path: _continueUpload.file.path                                                                            //
          });                                                                                                          //
        }                                                                                                              //
        return true;                                                                                                   //
      };                                                                                                               //
      Meteor.methods(_methods);                                                                                        //
    }                                                                                                                  //
  }                                                                                                                    //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name _prepareUpload                                                                                                 //
  @summary Internal method. Used to optimize received data and check upload permission                                 //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype._prepareUpload = Meteor.isServer ? function (opts, userId, transport) {                    //
    var base, extension, extensionWithDot, fileName, isUploadAllowed, ref, result;                                     //
    if (opts.eof == null) {                                                                                            //
      opts.eof = false;                                                                                                //
    }                                                                                                                  //
    if (opts.binData == null) {                                                                                        //
      opts.binData = 'EOF';                                                                                            //
    }                                                                                                                  //
    if (opts.chunkId == null) {                                                                                        //
      opts.chunkId = -1;                                                                                               //
    }                                                                                                                  //
    if (opts.FSName == null) {                                                                                         //
      opts.FSName = opts.fileId;                                                                                       //
    }                                                                                                                  //
    if ((base = opts.file).meta == null) {                                                                             //
      base.meta = {};                                                                                                  //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  //
      console.info("[FilesCollection] [Upload] [" + transport + "] Got #" + opts.chunkId + "/" + opts.fileLength + " chunks, dst: " + (opts.file.name || opts.file.fileName));
    }                                                                                                                  //
    fileName = this._getFileName(opts.file);                                                                           //
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  //
    result = opts.file;                                                                                                //
    result.path = "" + this.storagePath + nodePath.sep + opts.FSName + extensionWithDot;                               //
    result.name = fileName;                                                                                            //
    result.meta = opts.file.meta;                                                                                      //
    result.extension = extension;                                                                                      //
    result.ext = extension;                                                                                            //
    result = this._dataToSchema(result);                                                                               //
    result._id = opts.fileId;                                                                                          //
    if (userId) {                                                                                                      //
      result.userId = userId;                                                                                          //
    }                                                                                                                  //
    if (this.onBeforeUpload && _.isFunction(this.onBeforeUpload)) {                                                    //
      isUploadAllowed = this.onBeforeUpload.call(_.extend({                                                            //
        file: opts.file                                                                                                //
      }, {                                                                                                             //
        chunkId: opts.chunkId,                                                                                         //
        userId: result.userId,                                                                                         //
        user: function () {                                                                                            //
          function user() {                                                                                            //
            if (Meteor.users) {                                                                                        //
              return Meteor.users.findOne(result.userId);                                                              //
            } else {                                                                                                   //
              return null;                                                                                             //
            }                                                                                                          //
          }                                                                                                            //
                                                                                                                       //
          return user;                                                                                                 //
        }(),                                                                                                           //
        eof: opts.eof                                                                                                  //
      }), result);                                                                                                     //
      if (isUploadAllowed !== true) {                                                                                  //
        throw new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : '@onBeforeUpload() returned false');
      }                                                                                                                //
    }                                                                                                                  //
    return {                                                                                                           //
      result: result,                                                                                                  //
      opts: opts                                                                                                       //
    };                                                                                                                 //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name _finishUpload                                                                                                  //
  @summary Internal method. Finish upload, close Writable stream, add recored to MongoDB and flush used memory         //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype._finishUpload = Meteor.isServer ? function (result, opts, cb) {                            //
    var self;                                                                                                          //
    if (this.debug) {                                                                                                  //
      console.info("[FilesCollection] [Upload] [finish(ing)Upload] -> " + result.path);                                //
    }                                                                                                                  //
    fs.chmod(result.path, this.permissions, NOOP);                                                                     //
    self = this;                                                                                                       //
    result.type = this._getMimeType(opts.file);                                                                        //
    result["public"] = this["public"];                                                                                 //
    this.collection.insert(_.clone(result), function (error, _id) {                                                    //
      if (error) {                                                                                                     //
        cb && cb(error);                                                                                               //
        if (self.debug) {                                                                                              //
          console.error('[FilesCollection] [Upload] [_finishUpload] Error:', error);                                   //
        }                                                                                                              //
      } else {                                                                                                         //
        self._preCollection.remove({                                                                                   //
          _id: opts.fileId                                                                                             //
        }, function (error) {                                                                                          //
          if (error) {                                                                                                 //
            cb && cb(error);                                                                                           //
            if (self.debug) {                                                                                          //
              console.error('[FilesCollection] [Upload] [_finishUpload] Error:', error);                               //
            }                                                                                                          //
          } else {                                                                                                     //
            result._id = _id;                                                                                          //
            if (self.debug) {                                                                                          //
              console.info("[FilesCollection] [Upload] [finish(ed)Upload] -> " + result.path);                         //
            }                                                                                                          //
            self.onAfterUpload && self.onAfterUpload.call(self, result);                                               //
            self.emit('afterUpload', result);                                                                          //
            cb && cb(null, result);                                                                                    //
          }                                                                                                            //
        });                                                                                                            //
      }                                                                                                                //
    });                                                                                                                //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name _handleUpload                                                                                                  //
  @summary Internal method to handle upload process, pipe incoming data to Writable stream                             //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype._handleUpload = Meteor.isServer ? function (result, opts, cb) {                            //
    var e, error1, self;                                                                                               //
    self = this;                                                                                                       //
    try {                                                                                                              //
      if (opts.eof) {                                                                                                  //
        this._currentUploads[result._id].end(function () {                                                             //
          return bound(function () {                                                                                   //
            self.emit('_finishUpload', result, opts, cb);                                                              //
          });                                                                                                          //
        });                                                                                                            //
      } else {                                                                                                         //
        this._currentUploads[result._id].write(opts.chunkId, new Buffer(opts.binData, 'base64'), cb);                  //
      }                                                                                                                //
    } catch (error1) {                                                                                                 //
      e = error1;                                                                                                      //
      cb && cb(e);                                                                                                     //
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name _getMimeType                                                                                                   //
  @param {Object} fileData - File Object                                                                               //
  @summary Returns file's mime-type                                                                                    //
  @returns {String}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype._getMimeType = function (fileData) {                                                       //
    var br, buf, error, error1, ext, fd, mime, ref;                                                                    //
    check(fileData, Object);                                                                                           //
    if (fileData != null ? fileData.type : void 0) {                                                                   //
      mime = fileData.type;                                                                                            //
    }                                                                                                                  //
    if (Meteor.isServer && fileData.path && (!mime || !_.isString(mime))) {                                            //
      try {                                                                                                            //
        buf = new Buffer(262);                                                                                         //
        fd = fs.openSync(fileData.path, 'r');                                                                          //
        br = fs.readSync(fd, buf, 0, 262, 0);                                                                          //
        fs.close(fd, NOOP);                                                                                            //
        if (br < 262) {                                                                                                //
          buf = buf.slice(0, br);                                                                                      //
        }                                                                                                              //
        ref = fileType(buf), mime = ref.mime, ext = ref.ext;                                                           //
      } catch (error1) {                                                                                               //
        error = error1;                                                                                                //
      }                                                                                                                //
    }                                                                                                                  //
    if (!mime || !_.isString(mime)) {                                                                                  //
      mime = 'application/octet-stream';                                                                               //
    }                                                                                                                  //
    return mime;                                                                                                       //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name _getFileName                                                                                                   //
  @param {Object} fileData - File Object                                                                               //
  @summary Returns file's name                                                                                         //
  @returns {String}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype._getFileName = function (fileData) {                                                       //
    var cleanName, fileName;                                                                                           //
    fileName = fileData.name || fileData.fileName;                                                                     //
    if (_.isString(fileName) && fileName.length > 0) {                                                                 //
      cleanName = function () {                                                                                        //
        function cleanName(str) {                                                                                      //
          return str.replace(/\.\./g, '').replace(/\//g, '');                                                          //
        }                                                                                                              //
                                                                                                                       //
        return cleanName;                                                                                              //
      }();                                                                                                             //
      return cleanName(fileData.name || fileData.fileName);                                                            //
    } else {                                                                                                           //
      return '';                                                                                                       //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name _getUser                                                                                                       //
  @summary Returns object with `userId` and `user()` method which return user's object                                 //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype._getUser = function (http) {                                                               //
    var cookie, result, user;                                                                                          //
    result = {                                                                                                         //
      user: function () {                                                                                              //
        function user() {                                                                                              //
          return null;                                                                                                 //
        }                                                                                                              //
                                                                                                                       //
        return user;                                                                                                   //
      }(),                                                                                                             //
      userId: null                                                                                                     //
    };                                                                                                                 //
    if (Meteor.isServer) {                                                                                             //
      if (http) {                                                                                                      //
        cookie = http.request.Cookies;                                                                                 //
        if (_.has(Package, 'accounts-base') && cookie.has('meteor_login_token')) {                                     //
          user = Meteor.users.findOne({                                                                                //
            'services.resume.loginTokens.hashedToken': Accounts._hashLoginToken(cookie.get('meteor_login_token'))      //
          });                                                                                                          //
          if (user) {                                                                                                  //
            result.user = function () {                                                                                //
              return user;                                                                                             //
            };                                                                                                         //
            result.userId = user._id;                                                                                  //
          }                                                                                                            //
        }                                                                                                              //
      }                                                                                                                //
    } else {                                                                                                           //
      if (_.has(Package, 'accounts-base') && Meteor.userId()) {                                                        //
        result.user = function () {                                                                                    //
          return Meteor.user();                                                                                        //
        };                                                                                                             //
        result.userId = Meteor.userId();                                                                               //
      }                                                                                                                //
    }                                                                                                                  //
    return result;                                                                                                     //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name _getExt                                                                                                        //
  @param {String} FileName - File name                                                                                 //
  @summary Get extension from FileName                                                                                 //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype._getExt = function (fileName) {                                                            //
    var extension;                                                                                                     //
    if (!!~fileName.indexOf('.')) {                                                                                    //
      extension = fileName.split('.').pop();                                                                           //
      return {                                                                                                         //
        ext: extension,                                                                                                //
        extension: extension,                                                                                          //
        extensionWithDot: '.' + extension                                                                              //
      };                                                                                                               //
    } else {                                                                                                           //
      return {                                                                                                         //
        ext: '',                                                                                                       //
        extension: '',                                                                                                 //
        extensionWithDot: ''                                                                                           //
      };                                                                                                               //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name _dataToSchema                                                                                                  //
  @param {Object} data - File data                                                                                     //
  @summary Internal method. Build object in accordance with default schema from File data                              //
  @returns {Object}                                                                                                    //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype._dataToSchema = function (data) {                                                          //
    return {                                                                                                           //
      name: data.name,                                                                                                 //
      extension: data.extension,                                                                                       //
      path: data.path,                                                                                                 //
      meta: data.meta,                                                                                                 //
      type: data.type,                                                                                                 //
      size: data.size,                                                                                                 //
      versions: {                                                                                                      //
        original: {                                                                                                    //
          path: data.path,                                                                                             //
          size: data.size,                                                                                             //
          type: data.type,                                                                                             //
          extension: data.extension                                                                                    //
        }                                                                                                              //
      },                                                                                                               //
      isVideo: !!~data.type.toLowerCase().indexOf('video'),                                                            //
      isAudio: !!~data.type.toLowerCase().indexOf('audio'),                                                            //
      isImage: !!~data.type.toLowerCase().indexOf('image'),                                                            //
      isText: !!~data.type.toLowerCase().indexOf('text'),                                                              //
      isJSON: !!~data.type.toLowerCase().indexOf('json'),                                                              //
      isPDF: !!~data.type.toLowerCase().indexOf('pdf'),                                                                //
      _storagePath: data._storagePath || this.storagePath,                                                             //
      _downloadRoute: data._downloadRoute || this.downloadRoute,                                                       //
      _collectionName: data._collectionName || this.collectionName                                                     //
    };                                                                                                                 //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name write                                                                                                          //
  @param {Buffer} buffer - Binary File's Buffer                                                                        //
  @param {Object} opts - Object with file-data                                                                         //
  @param {String} opts.name - File name, alias: `fileName`                                                             //
  @param {String} opts.type - File mime-type                                                                           //
  @param {Object} opts.meta - File additional meta-data                                                                //
  @param {Function} callback - function(error, fileObj){...}                                                           //
  @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook                                                     //
  @summary Write buffer to FS and add to FilesCollection Collection                                                    //
  @returns {FilesCollection} Instance                                                                                  //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.write = Meteor.isServer ? function (buffer, opts, callback, proceedAfterUpload) {          //
    var FSName, extension, extensionWithDot, fileId, fileName, ref, result, self, stream;                              //
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  //
      console.info('[FilesCollection] [write()]');                                                                     //
    }                                                                                                                  //
    if (_.isFunction(opts)) {                                                                                          //
      proceedAfterUpload = callback;                                                                                   //
      callback = opts;                                                                                                 //
      opts = {};                                                                                                       //
    } else if (_.isBoolean(callback)) {                                                                                //
      proceedAfterUpload = callback;                                                                                   //
    } else if (_.isBoolean(opts)) {                                                                                    //
      proceedAfterUpload = opts;                                                                                       //
    }                                                                                                                  //
    check(opts, Match.Optional(Object));                                                                               //
    check(callback, Match.Optional(Function));                                                                         //
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                //
    fileId = Random.id();                                                                                              //
    FSName = this.namingFunction ? this.namingFunction() : fileId;                                                     //
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : FSName;                                       //
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  //
    self = this;                                                                                                       //
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    opts.path = "" + this.storagePath + nodePath.sep + FSName + extensionWithDot;                                      //
    opts.type = this._getMimeType(opts);                                                                               //
    if (opts.meta == null) {                                                                                           //
      opts.meta = {};                                                                                                  //
    }                                                                                                                  //
    if (opts.size == null) {                                                                                           //
      opts.size = buffer.length;                                                                                       //
    }                                                                                                                  //
    result = this._dataToSchema({                                                                                      //
      name: fileName,                                                                                                  //
      path: opts.path,                                                                                                 //
      meta: opts.meta,                                                                                                 //
      type: opts.type,                                                                                                 //
      size: opts.size,                                                                                                 //
      extension: extension                                                                                             //
    });                                                                                                                //
    result._id = fileId;                                                                                               //
    stream = fs.createWriteStream(opts.path, {                                                                         //
      flags: 'w',                                                                                                      //
      mode: this.permissions                                                                                           //
    });                                                                                                                //
    stream.end(buffer, function (error) {                                                                              //
      return bound(function () {                                                                                       //
        if (error) {                                                                                                   //
          callback && callback(error);                                                                                 //
        } else {                                                                                                       //
          self.collection.insert(_.clone(result), function (error) {                                                   //
            if (error) {                                                                                               //
              callback && callback(error);                                                                             //
              if (self.debug) {                                                                                        //
                console.warn("[FilesCollection] [write] [insert] Error: " + fileName + " -> " + self.collectionName, error);
              }                                                                                                        //
            } else {                                                                                                   //
              callback && callback(null, result);                                                                      //
              if (proceedAfterUpload === true) {                                                                       //
                self.onAfterUpload && self.onAfterUpload.call(self, result);                                           //
                self.emit('afterUpload', result);                                                                      //
              }                                                                                                        //
              if (self.debug) {                                                                                        //
                console.info("[FilesCollection] [write]: " + fileName + " -> " + self.collectionName);                 //
              }                                                                                                        //
            }                                                                                                          //
          });                                                                                                          //
        }                                                                                                              //
      });                                                                                                              //
    });                                                                                                                //
    return this;                                                                                                       //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name load                                                                                                           //
  @param {String} url - URL to file                                                                                    //
  @param {Object} opts - Object with file-data                                                                         //
  @param {String} opts.name - File name, alias: `fileName`                                                             //
  @param {String} opts.type - File mime-type                                                                           //
  @param {Object} opts.meta - File additional meta-data                                                                //
  @param {Function} callback - function(error, fileObj){...}                                                           //
  @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook                                                     //
  @summary Download file, write stream to FS and add to FilesCollection Collection                                     //
  @returns {FilesCollection} Instance                                                                                  //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.load = Meteor.isServer ? function (url, opts, callback, proceedAfterUpload) {              //
    var FSName, extension, extensionWithDot, fileId, fileName, pathParts, ref, self, storeResult;                      //
    if (this.debug) {                                                                                                  //
      console.info("[FilesCollection] [load(" + url + ", " + JSON.stringify(opts) + ", callback)]");                   //
    }                                                                                                                  //
    if (_.isFunction(opts)) {                                                                                          //
      proceedAfterUpload = callback;                                                                                   //
      callback = opts;                                                                                                 //
      opts = {};                                                                                                       //
    } else if (_.isBoolean(callback)) {                                                                                //
      proceedAfterUpload = callback;                                                                                   //
    } else if (_.isBoolean(opts)) {                                                                                    //
      proceedAfterUpload = opts;                                                                                       //
    }                                                                                                                  //
    check(url, String);                                                                                                //
    check(opts, Match.Optional(Object));                                                                               //
    check(callback, Match.Optional(Function));                                                                         //
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                //
    self = this;                                                                                                       //
    if (opts == null) {                                                                                                //
      opts = {};                                                                                                       //
    }                                                                                                                  //
    fileId = Random.id();                                                                                              //
    FSName = this.namingFunction ? this.namingFunction() : fileId;                                                     //
    pathParts = url.split('/');                                                                                        //
    fileName = opts.name || opts.fileName ? opts.name || opts.fileName : pathParts[pathParts.length - 1] || FSName;    //
    ref = this._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;                  //
    if (opts.meta == null) {                                                                                           //
      opts.meta = {};                                                                                                  //
    }                                                                                                                  //
    opts.path = "" + this.storagePath + nodePath.sep + FSName + extensionWithDot;                                      //
    storeResult = function () {                                                                                        //
      function storeResult(result, callback) {                                                                         //
        result._id = fileId;                                                                                           //
        self.collection.insert(result, function (error) {                                                              //
          if (error) {                                                                                                 //
            callback && callback(error);                                                                               //
            if (self.debug) {                                                                                          //
              console.error("[FilesCollection] [load] [insert] Error: " + fileName + " -> " + self.collectionName, error);
            }                                                                                                          //
          } else {                                                                                                     //
            callback && callback(null, result);                                                                        //
            if (proceedAfterUpload === true) {                                                                         //
              self.onAfterUpload && self.onAfterUpload.call(self, result);                                             //
              self.emit('afterUpload', result);                                                                        //
            }                                                                                                          //
            if (self.debug) {                                                                                          //
              console.info("[FilesCollection] [load] [insert] " + fileName + " -> " + self.collectionName);            //
            }                                                                                                          //
          }                                                                                                            //
        });                                                                                                            //
      }                                                                                                                //
                                                                                                                       //
      return storeResult;                                                                                              //
    }();                                                                                                               //
    request.get(url).on('error', function (error) {                                                                    //
      return bound(function () {                                                                                       //
        callback && callback(error);                                                                                   //
        if (self.debug) {                                                                                              //
          return console.error("[FilesCollection] [load] [request.get(" + url + ")] Error:", error);                   //
        }                                                                                                              //
      });                                                                                                              //
    }).on('response', function (response) {                                                                            //
      return bound(function () {                                                                                       //
        response.on('end', function () {                                                                               //
          return bound(function () {                                                                                   //
            var result;                                                                                                //
            if (self.debug) {                                                                                          //
              console.info("[FilesCollection] [load] Received: " + url);                                               //
            }                                                                                                          //
            result = self._dataToSchema({                                                                              //
              name: fileName,                                                                                          //
              path: opts.path,                                                                                         //
              meta: opts.meta,                                                                                         //
              type: opts.type || response.headers['content-type'] || self._getMimeType({                               //
                path: opts.path                                                                                        //
              }),                                                                                                      //
              size: opts.size || parseInt(response.headers['content-length'] || 0),                                    //
              extension: extension                                                                                     //
            });                                                                                                        //
            if (!result.size) {                                                                                        //
              fs.stat(opts.path, function (error, stats) {                                                             //
                return bound(function () {                                                                             //
                  if (error) {                                                                                         //
                    callback && callback(error);                                                                       //
                  } else {                                                                                             //
                    result.versions.original.size = result.size = stats.size;                                          //
                    storeResult(result, callback);                                                                     //
                  }                                                                                                    //
                });                                                                                                    //
              });                                                                                                      //
            } else {                                                                                                   //
              storeResult(result, callback);                                                                           //
            }                                                                                                          //
          });                                                                                                          //
        });                                                                                                            //
      });                                                                                                              //
    }).pipe(fs.createWriteStream(opts.path, {                                                                          //
      flags: 'w',                                                                                                      //
      mode: this.permissions                                                                                           //
    }));                                                                                                               //
    return this;                                                                                                       //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name addFile                                                                                                        //
  @param {String} path - Path to file                                                                                  //
  @param {String} opts - Object with file-data                                                                         //
  @param {String} opts.type - File mime-type                                                                           //
  @param {Object} opts.meta - File additional meta-data                                                                //
  @param {Function} callback - function(error, fileObj){...}                                                           //
  @param {Boolean} proceedAfterUpload - Proceed onAfterUpload hook                                                     //
  @summary Add file from FS to FilesCollection                                                                         //
  @returns {FilesCollection} Instance                                                                                  //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.addFile = Meteor.isServer ? function (path, opts, callback, proceedAfterUpload) {          //
    var self;                                                                                                          //
    if (this.debug) {                                                                                                  //
      console.info("[FilesCollection] [addFile(" + path + ")]");                                                       //
    }                                                                                                                  //
    if (_.isFunction(opts)) {                                                                                          //
      proceedAfterUpload = callback;                                                                                   //
      callback = opts;                                                                                                 //
      opts = {};                                                                                                       //
    } else if (_.isBoolean(callback)) {                                                                                //
      proceedAfterUpload = callback;                                                                                   //
    } else if (_.isBoolean(opts)) {                                                                                    //
      proceedAfterUpload = opts;                                                                                       //
    }                                                                                                                  //
    if (this["public"]) {                                                                                              //
      throw new Meteor.Error(403, 'Can not run [addFile] on public collection! Just Move file to root of your server, then add record to Collection');
    }                                                                                                                  //
    check(path, String);                                                                                               //
    check(opts, Match.Optional(Object));                                                                               //
    check(callback, Match.Optional(Function));                                                                         //
    check(proceedAfterUpload, Match.Optional(Boolean));                                                                //
    self = this;                                                                                                       //
    fs.stat(path, function (error, stats) {                                                                            //
      return bound(function () {                                                                                       //
        var extension, extensionWithDot, fileName, pathParts, ref, result;                                             //
        if (error) {                                                                                                   //
          callback && callback(error);                                                                                 //
        } else if (stats.isFile()) {                                                                                   //
          pathParts = path.split('/');                                                                                 //
          fileName = pathParts[pathParts.length - 1];                                                                  //
          ref = self._getExt(fileName), extension = ref.extension, extensionWithDot = ref.extensionWithDot;            //
          if (opts == null) {                                                                                          //
            opts = {};                                                                                                 //
          }                                                                                                            //
          opts.path = path;                                                                                            //
          if (opts.type == null) {                                                                                     //
            opts.type = self._getMimeType(opts);                                                                       //
          }                                                                                                            //
          if (opts.meta == null) {                                                                                     //
            opts.meta = {};                                                                                            //
          }                                                                                                            //
          if (opts.size == null) {                                                                                     //
            opts.size = stats.size;                                                                                    //
          }                                                                                                            //
          result = self._dataToSchema({                                                                                //
            name: fileName,                                                                                            //
            path: path,                                                                                                //
            meta: opts.meta,                                                                                           //
            type: opts.type,                                                                                           //
            size: opts.size,                                                                                           //
            extension: extension,                                                                                      //
            _storagePath: path.replace("" + nodePath.sep + fileName, '')                                               //
          });                                                                                                          //
          result._id = Random.id();                                                                                    //
          self.collection.insert(_.clone(result), function (error) {                                                   //
            if (error) {                                                                                               //
              callback && callback(error);                                                                             //
              if (self.debug) {                                                                                        //
                console.warn("[FilesCollection] [addFile] [insert] Error: " + fileName + " -> " + self.collectionName, error);
              }                                                                                                        //
            } else {                                                                                                   //
              callback && callback(null, result);                                                                      //
              if (proceedAfterUpload === true) {                                                                       //
                self.onAfterUpload && self.onAfterUpload.call(self, result);                                           //
                self.emit('afterUpload', result);                                                                      //
              }                                                                                                        //
              if (self.debug) {                                                                                        //
                console.info("[FilesCollection] [addFile]: " + fileName + " -> " + self.collectionName);               //
              }                                                                                                        //
            }                                                                                                          //
          });                                                                                                          //
        } else {                                                                                                       //
          callback && callback(new Meteor.Error(400, "[FilesCollection] [addFile(" + path + ")]: File does not exist"));
        }                                                                                                              //
      });                                                                                                              //
    });                                                                                                                //
    return this;                                                                                                       //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name findOne                                                                                                        //
  @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)       //
  @param {Object} options - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)  //
  @summary Find and return Cursor for matching document Object                                                         //
  @returns {FileCursor} Instance                                                                                       //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.findOne = function (selector, options) {                                                   //
    var doc;                                                                                                           //
    if (selector == null) {                                                                                            //
      selector = {};                                                                                                   //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  //
      console.info("[FilesCollection] [findOne(" + JSON.stringify(selector) + ", " + JSON.stringify(options) + ")]");  //
    }                                                                                                                  //
    check(selector, Match.OneOf(Object, String));                                                                      //
    check(options, Match.Optional(Object));                                                                            //
    doc = this.collection.findOne(selector, options);                                                                  //
    if (doc) {                                                                                                         //
      return new FileCursor(doc, this);                                                                                //
    } else {                                                                                                           //
      return doc;                                                                                                      //
    }                                                                                                                  //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name find                                                                                                           //
  @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)       //
  @param {Object}        options  - Mongo-Style selector Options (http://docs.meteor.com/api/collections.html#sortspecifiers)
  @summary Find and return Cursor for matching documents                                                               //
  @returns {FilesCursor} Instance                                                                                      //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.find = function (selector, options) {                                                      //
    if (selector == null) {                                                                                            //
      selector = {};                                                                                                   //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  //
      console.info("[FilesCollection] [find(" + JSON.stringify(selector) + ", " + JSON.stringify(options) + ")]");     //
    }                                                                                                                  //
    check(selector, Match.OneOf(Object, String));                                                                      //
    check(options, Match.Optional(Object));                                                                            //
    return new FilesCursor(selector, options, this);                                                                   //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Client                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name insert                                                                                                         //
  @see https://developer.mozilla.org/en-US/docs/Web/API/FileReader                                                     //
  @param {Object} config - Configuration object with next properties:                                                  //
    {File|Object} file           - HTML5 `files` item, like in change event: `e.currentTarget.files[0]`                //
    {Object}      meta           - Additional data as object, use later for search                                     //
    {Boolean}     allowWebWorkers- Allow/Deny WebWorkers usage                                                         //
    {Number|dynamic} streams     - Quantity of parallel upload streams, default: 2                                     //
    {Number|dynamic} chunkSize   - Chunk size for upload                                                               //
    {String}      transport      - Upload transport `http` or `ddp`                                                    //
    {Function}    onUploaded     - Callback triggered when upload is finished, with two arguments `error` and `fileRef`
    {Function}    onStart        - Callback triggered when upload is started after all successful validations, with two arguments `error` (always null) and `fileRef`
    {Function}    onError        - Callback triggered on error in upload and/or FileReader, with two arguments `error` and `fileData`
    {Function}    onProgress     - Callback triggered when chunk is sent, with only argument `progress`                //
    {Function}    onBeforeUpload - Callback triggered right before upload is started:                                  //
        return true to continue                                                                                        //
        return false to abort upload                                                                                   //
  @param {Boolean} autoStart     - Start upload immediately. If set to false, you need manually call .start() method on returned class. Useful to set EventListeners.
  @summary Upload file to server over DDP                                                                              //
  @returns {UploadInstance} Instance. UploadInstance has next properties:                                              //
    {ReactiveVar} onPause  - Is upload process on the pause?                                                           //
    {ReactiveVar} state    - active|paused|aborted|completed                                                           //
    {ReactiveVar} progress - Current progress in percentage                                                            //
    {Function}    pause    - Pause upload process                                                                      //
    {Function}    continue - Continue paused upload process                                                            //
    {Function}    toggle   - Toggle continue/pause if upload process                                                   //
    {Function}    abort    - Abort upload                                                                              //
    {Function}    readAsDataURL - Current file as data URL, use to create image preview and etc. Be aware of big files, may lead to browser crash
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.insert = Meteor.isClient ? function (config, autoStart) {                                  //
    if (autoStart == null) {                                                                                           //
      autoStart = true;                                                                                                //
    }                                                                                                                  //
    return new this._UploadInstance(config, this)[autoStart ? 'start' : 'manual']();                                   //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Client                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name _UploadInstance                                                                                                //
  @class UploadInstance                                                                                                //
  @summary Internal Class, used in upload                                                                              //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype._UploadInstance = Meteor.isClient ? UploadInstance = function () {                         //
    UploadInstance.prototype.__proto__ = EventEmitter.prototype;                                                       //
                                                                                                                       //
    function UploadInstance(config1, collection) {                                                                     //
      var base, base1, base2, base3, base4, self;                                                                      //
      this.config = config1;                                                                                           //
      this.collection = collection;                                                                                    //
      EventEmitter.call(this);                                                                                         //
      if (this.collection.debug) {                                                                                     //
        console.info('[FilesCollection] [insert()]');                                                                  //
      }                                                                                                                //
      self = this;                                                                                                     //
      if ((base = this.config).meta == null) {                                                                         //
        base.meta = {};                                                                                                //
      }                                                                                                                //
      if ((base1 = this.config).streams == null) {                                                                     //
        base1.streams = 2;                                                                                             //
      }                                                                                                                //
      if (this.config.streams < 1) {                                                                                   //
        this.config.streams = 2;                                                                                       //
      }                                                                                                                //
      if ((base2 = this.config).transport == null) {                                                                   //
        base2.transport = 'ddp';                                                                                       //
      }                                                                                                                //
      if ((base3 = this.config).chunkSize == null) {                                                                   //
        base3.chunkSize = this.collection.chunkSize;                                                                   //
      }                                                                                                                //
      if ((base4 = this.config).allowWebWorkers == null) {                                                             //
        base4.allowWebWorkers = true;                                                                                  //
      }                                                                                                                //
      this.config.transport = this.config.transport.toLowerCase();                                                     //
      check(this.config, {                                                                                             //
        file: Match.Any,                                                                                               //
        fileName: Match.Optional(String),                                                                              //
        meta: Match.Optional(Object),                                                                                  //
        onError: Match.Optional(Function),                                                                             //
        onAbort: Match.Optional(Function),                                                                             //
        streams: Match.OneOf('dynamic', Number),                                                                       //
        onStart: Match.Optional(Function),                                                                             //
        transport: Match.OneOf('http', 'ddp'),                                                                         //
        chunkSize: Match.OneOf('dynamic', Number),                                                                     //
        onUploaded: Match.Optional(Function),                                                                          //
        onProgress: Match.Optional(Function),                                                                          //
        onBeforeUpload: Match.Optional(Function),                                                                      //
        allowWebWorkers: Boolean                                                                                       //
      });                                                                                                              //
      if (this.config.file) {                                                                                          //
        if (this.collection.debug) {                                                                                   //
          console.time('insert ' + this.config.file.name);                                                             //
          console.time('loadFile ' + this.config.file.name);                                                           //
        }                                                                                                              //
        if (Worker && this.config.allowWebWorkers) {                                                                   //
          this.worker = new Worker('/packages/ostrio_files/worker.js');                                                //
        } else {                                                                                                       //
          this.worker = null;                                                                                          //
        }                                                                                                              //
        this.config.debug = this.collection.debug;                                                                     //
        this.currentChunk = 0;                                                                                         //
        this.transferTime = 0;                                                                                         //
        this.trackerComp = null;                                                                                       //
        this.sentChunks = 0;                                                                                           //
        this.fileLength = 1;                                                                                           //
        this.EOFsent = false;                                                                                          //
        this.FSName = this.collection.namingFunction ? this.collection.namingFunction(this.config.file) : this.fileId;
        this.fileId = Random.id();                                                                                     //
        this.pipes = [];                                                                                               //
        this.fileData = {                                                                                              //
          size: this.config.file.size,                                                                                 //
          type: this.config.file.type,                                                                                 //
          name: this.config.fileName || this.config.file.name,                                                         //
          meta: this.config.meta                                                                                       //
        };                                                                                                             //
        this.fileData = _.extend(this.fileData, this.collection._getExt(self.config.file.name), {                      //
          mime: this.collection._getMimeType(this.fileData)                                                            //
        });                                                                                                            //
        this.fileData['mime-type'] = this.fileData.mime;                                                               //
        this.result = new this.collection._FileUpload(_.extend(self.config, {                                          //
          fileData: this.fileData,                                                                                     //
          fileId: this.fileId,                                                                                         //
          _Abort: this.collection._methodNames._Abort                                                                  //
        }));                                                                                                           //
        this.beforeunload = function (e) {                                                                             //
          var message;                                                                                                 //
          message = _.isFunction(self.collection.onbeforeunloadMessage) ? self.collection.onbeforeunloadMessage.call(self.result, self.fileData) : self.collection.onbeforeunloadMessage;
          if (e) {                                                                                                     //
            e.returnValue = message;                                                                                   //
          }                                                                                                            //
          return message;                                                                                              //
        };                                                                                                             //
        this.result.config.beforeunload = this.beforeunload;                                                           //
        window.addEventListener('beforeunload', this.beforeunload, false);                                             //
        this.result.config._onEnd = function () {                                                                      //
          return self.emitEvent('_onEnd');                                                                             //
        };                                                                                                             //
        this.addListener('end', this.end);                                                                             //
        this.addListener('start', this.start);                                                                         //
        this.addListener('upload', this.upload);                                                                       //
        this.addListener('sendEOF', this.sendEOF);                                                                     //
        this.addListener('prepare', this.prepare);                                                                     //
        this.addListener('sendChunk', this.sendChunk);                                                                 //
        this.addListener('proceedChunk', this.proceedChunk);                                                           //
        this.addListener('createStreams', this.createStreams);                                                         //
        this.addListener('calculateStats', _.throttle(function () {                                                    //
          var _t, progress;                                                                                            //
          _t = self.transferTime / self.sentChunks / self.config.streams;                                              //
          self.result.estimateTime.set(_t * (self.fileLength - self.sentChunks));                                      //
          self.result.estimateSpeed.set(self.config.chunkSize / (_t / 1000));                                          //
          progress = Math.round(self.sentChunks / self.fileLength * 100);                                              //
          self.result.progress.set(progress);                                                                          //
          self.config.onProgress && self.config.onProgress.call(self.result, progress, self.fileData);                 //
          self.result.emitEvent('progress', [progress, self.fileData]);                                                //
        }, 250));                                                                                                      //
        this.addListener('_onEnd', function () {                                                                       //
          if (self.result.estimateTimer) {                                                                             //
            Meteor.clearInterval(self.result.estimateTimer);                                                           //
          }                                                                                                            //
          if (self.worker) {                                                                                           //
            self.worker.terminate();                                                                                   //
          }                                                                                                            //
          if (self.trackerComp) {                                                                                      //
            self.trackerComp.stop();                                                                                   //
          }                                                                                                            //
          if (self.beforeunload) {                                                                                     //
            window.removeEventListener('beforeunload', self.beforeunload, false);                                      //
          }                                                                                                            //
          if (self.result) {                                                                                           //
            return self.result.progress.set(0);                                                                        //
          }                                                                                                            //
        });                                                                                                            //
      } else {                                                                                                         //
        throw new Meteor.Error(500, '[FilesCollection] [insert] Have you forget to pass a File itself?');              //
      }                                                                                                                //
    }                                                                                                                  //
                                                                                                                       //
    UploadInstance.prototype.end = function (error, data) {                                                            //
      if (this.collection.debug) {                                                                                     //
        console.timeEnd('insert ' + this.config.file.name);                                                            //
      }                                                                                                                //
      this.emitEvent('_onEnd');                                                                                        //
      this.result.emitEvent('uploaded', [error, data]);                                                                //
      this.config.onUploaded && this.config.onUploaded.call(this.result, error, data);                                 //
      if (error) {                                                                                                     //
        if (this.collection.debug) {                                                                                   //
          console.error('[FilesCollection] [insert] [end] Error:', error);                                             //
        }                                                                                                              //
        this.result.abort();                                                                                           //
        this.result.state.set('aborted');                                                                              //
        this.result.emitEvent('error', [error, this.fileData]);                                                        //
        this.config.onError && this.config.onError.call(this.result, error, this.fileData);                            //
      } else {                                                                                                         //
        this.result.state.set('completed');                                                                            //
        this.collection.emitEvent('afterUpload', [data]);                                                              //
      }                                                                                                                //
      this.result.emitEvent('end', [error, data || this.fileData]);                                                    //
      return this.result;                                                                                              //
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.sendChunk = function (evt) {                                                              //
      var j, len, opts, pipeFunc, ref, ref1, self;                                                                     //
      self = this;                                                                                                     //
      opts = {                                                                                                         //
        fileId: this.fileId,                                                                                           //
        binData: evt.data.bin,                                                                                         //
        chunkId: evt.data.chunkId                                                                                      //
      };                                                                                                               //
      this.emitEvent('data', [evt.data.bin]);                                                                          //
      if (this.pipes.length) {                                                                                         //
        ref = this.pipes;                                                                                              //
        for (j = 0, len = ref.length; j < len; j++) {                                                                  //
          pipeFunc = ref[j];                                                                                           //
          opts.binData = pipeFunc(opts.binData);                                                                       //
        }                                                                                                              //
      }                                                                                                                //
      if (this.fileLength === evt.data.chunkId) {                                                                      //
        if (this.collection.debug) {                                                                                   //
          console.timeEnd('loadFile ' + this.config.file.name);                                                        //
        }                                                                                                              //
        this.emitEvent('readEnd');                                                                                     //
      }                                                                                                                //
      if (opts.binData && opts.binData.length) {                                                                       //
        if (this.config.transport === 'ddp') {                                                                         //
          Meteor.call(this.collection._methodNames._Write, opts, function (error) {                                    //
            self.transferTime += +new Date() - evt.data.start;                                                         //
            if (error) {                                                                                               //
              if (self.result.state.get() !== 'aborted') {                                                             //
                self.emitEvent('end', [error]);                                                                        //
              }                                                                                                        //
            } else {                                                                                                   //
              ++self.sentChunks;                                                                                       //
              if (self.sentChunks >= self.fileLength) {                                                                //
                self.emitEvent('sendEOF', [opts]);                                                                     //
              } else if (self.currentChunk < self.fileLength) {                                                        //
                self.emitEvent('upload');                                                                              //
              }                                                                                                        //
              self.emitEvent('calculateStats');                                                                        //
            }                                                                                                          //
          });                                                                                                          //
        } else {                                                                                                       //
          if (opts != null ? (ref1 = opts.file) != null ? ref1.meta : void 0 : void 0) {                               //
            opts.file.meta = _fixJSONStringify(opts.file.meta);                                                        //
          }                                                                                                            //
          HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {      //
            data: opts                                                                                                 //
          }, function (error, result) {                                                                                //
            self.transferTime += +new Date() - evt.data.start;                                                         //
            if (error) {                                                                                               //
              if ("" + error === "Error: network") {                                                                   //
                self.result.pause();                                                                                   //
              } else {                                                                                                 //
                if (self.result.state.get() !== 'aborted') {                                                           //
                  self.emitEvent('end', [error]);                                                                      //
                }                                                                                                      //
              }                                                                                                        //
            } else {                                                                                                   //
              ++self.sentChunks;                                                                                       //
              if (self.sentChunks >= self.fileLength) {                                                                //
                self.emitEvent('sendEOF', [opts]);                                                                     //
              } else if (self.currentChunk < self.fileLength) {                                                        //
                self.emitEvent('upload');                                                                              //
              }                                                                                                        //
              self.emitEvent('calculateStats');                                                                        //
            }                                                                                                          //
          });                                                                                                          //
        }                                                                                                              //
      }                                                                                                                //
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.sendEOF = function (opts) {                                                               //
      var self;                                                                                                        //
      if (!this.EOFsent) {                                                                                             //
        this.EOFsent = true;                                                                                           //
        self = this;                                                                                                   //
        opts = {                                                                                                       //
          eof: true,                                                                                                   //
          fileId: this.fileId                                                                                          //
        };                                                                                                             //
        if (this.config.transport === 'ddp') {                                                                         //
          Meteor.call(this.collection._methodNames._Write, opts, function () {                                         //
            self.emitEvent('end', arguments);                                                                          //
          });                                                                                                          //
        } else {                                                                                                       //
          HTTP.call('POST', this.collection.downloadRoute + "/" + this.collection.collectionName + "/__upload", {      //
            data: opts                                                                                                 //
          }, function (error, result) {                                                                                //
            var res;                                                                                                   //
            res = JSON.parse((result != null ? result.content : void 0) || {});                                        //
            if (res != null ? res.meta : void 0) {                                                                     //
              res.meta = _fixJSONParse(res.meta);                                                                      //
            }                                                                                                          //
            self.emitEvent('end', [error, res]);                                                                       //
          });                                                                                                          //
        }                                                                                                              //
      }                                                                                                                //
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.proceedChunk = function (chunkId, start) {                                                //
      var chunk, fileReader, self;                                                                                     //
      self = this;                                                                                                     //
      chunk = this.config.file.slice(this.config.chunkSize * (chunkId - 1), this.config.chunkSize * chunkId);          //
      fileReader = new FileReader();                                                                                   //
      fileReader.onloadend = function (evt) {                                                                          //
        var ref, ref1;                                                                                                 //
        self.emitEvent('sendChunk', [{                                                                                 //
          data: {                                                                                                      //
            bin: ((fileReader != null ? fileReader.result : void 0) || ((ref = evt.srcElement) != null ? ref.result : void 0) || ((ref1 = evt.target) != null ? ref1.result : void 0)).split(',')[1],
            chunkId: chunkId,                                                                                          //
            start: start                                                                                               //
          }                                                                                                            //
        }]);                                                                                                           //
      };                                                                                                               //
      fileReader.onerror = function (e) {                                                                              //
        self.emitEvent('end', [(e.target || e.srcElement).error]);                                                     //
      };                                                                                                               //
      fileReader.readAsDataURL(chunk);                                                                                 //
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.upload = function () {                                                                    //
      var start;                                                                                                       //
      start = +new Date();                                                                                             //
      if (this.result.onPause.get()) {                                                                                 //
        return;                                                                                                        //
      }                                                                                                                //
      if (this.result.state.get() === 'aborted') {                                                                     //
        return this;                                                                                                   //
      }                                                                                                                //
      if (this.currentChunk <= this.fileLength) {                                                                      //
        ++this.currentChunk;                                                                                           //
        if (this.worker) {                                                                                             //
          this.worker.postMessage({                                                                                    //
            sentChunks: this.sentChunks,                                                                               //
            start: start,                                                                                              //
            currentChunk: this.currentChunk,                                                                           //
            chunkSize: this.config.chunkSize,                                                                          //
            file: this.config.file                                                                                     //
          });                                                                                                          //
        } else {                                                                                                       //
          this.emitEvent('proceedChunk', [this.currentChunk, start]);                                                  //
        }                                                                                                              //
      }                                                                                                                //
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.createStreams = function () {                                                             //
      var i, self;                                                                                                     //
      i = 1;                                                                                                           //
      self = this;                                                                                                     //
      while (i <= this.config.streams) {                                                                               //
        self.emitEvent('upload');                                                                                      //
        i++;                                                                                                           //
      }                                                                                                                //
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.prepare = function () {                                                                   //
      var _len, opts, self;                                                                                            //
      self = this;                                                                                                     //
      this.config.onStart && this.config.onStart.call(this.result, null, this.fileData);                               //
      this.result.emitEvent('start', [null, this.fileData]);                                                           //
      if (this.config.chunkSize === 'dynamic') {                                                                       //
        this.config.chunkSize = this.config.file.size / 1000;                                                          //
        if (this.config.chunkSize < 327680) {                                                                          //
          this.config.chunkSize = 327680;                                                                              //
        } else if (this.config.chunkSize > 1048576) {                                                                  //
          this.config.chunkSize = 1048576;                                                                             //
        }                                                                                                              //
        if (this.config.transport === 'http') {                                                                        //
          this.config.chunkSize = Math.round(this.config.chunkSize / 2);                                               //
        }                                                                                                              //
      }                                                                                                                //
      this.config.chunkSize = Math.floor(this.config.chunkSize / 8) * 8;                                               //
      _len = Math.ceil(this.config.file.size / this.config.chunkSize);                                                 //
      if (this.config.streams === 'dynamic') {                                                                         //
        this.config.streams = _.clone(_len);                                                                           //
        if (this.config.streams > 24) {                                                                                //
          this.config.streams = 24;                                                                                    //
        }                                                                                                              //
        if (this.config.transport === 'http') {                                                                        //
          this.config.streams = Math.round(this.config.streams / 2);                                                   //
        }                                                                                                              //
      }                                                                                                                //
      this.fileLength = _len <= 0 ? 1 : _len;                                                                          //
      if (this.config.streams > this.fileLength) {                                                                     //
        this.config.streams = this.fileLength;                                                                         //
      }                                                                                                                //
      this.result.config.fileLength = this.fileLength;                                                                 //
      opts = {                                                                                                         //
        file: this.fileData,                                                                                           //
        fileId: this.fileId,                                                                                           //
        chunkSize: this.config.chunkSize,                                                                              //
        fileLength: this.fileLength                                                                                    //
      };                                                                                                               //
      if (this.FSName !== this.fileId) {                                                                               //
        opts.FSName = this.FSName;                                                                                     //
      }                                                                                                                //
      Meteor.call(this.collection._methodNames._Start, opts, function (error) {                                        //
        if (error) {                                                                                                   //
          if (self.collection.debug) {                                                                                 //
            console.error('[FilesCollection] [.call(_Start)] Error:', error);                                          //
          }                                                                                                            //
          self.emitEvent('end', [error]);                                                                              //
        } else {                                                                                                       //
          self.result.continueFunc = function () {                                                                     //
            if (self.collection.debug) {                                                                               //
              console.info('[FilesCollection] [insert] [continueFunc]');                                               //
            }                                                                                                          //
            self.emitEvent('createStreams');                                                                           //
          };                                                                                                           //
          self.emitEvent('createStreams');                                                                             //
        }                                                                                                              //
      });                                                                                                              //
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.pipe = function (func) {                                                                  //
      this.pipes.push(func);                                                                                           //
      return this;                                                                                                     //
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.start = function () {                                                                     //
      var isUploadAllowed, self;                                                                                       //
      self = this;                                                                                                     //
      if (this.config.file.size <= 0) {                                                                                //
        this.end(new Meteor.Error(400, 'Can\'t upload empty file'));                                                   //
        return this.result;                                                                                            //
      }                                                                                                                //
      if (this.config.onBeforeUpload && _.isFunction(this.config.onBeforeUpload)) {                                    //
        isUploadAllowed = this.config.onBeforeUpload.call(_.extend(this.result, this.collection._getUser()), this.fileData);
        if (isUploadAllowed !== true) {                                                                                //
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'config.onBeforeUpload() returned false'));
        }                                                                                                              //
      }                                                                                                                //
      if (this.collection.onBeforeUpload && _.isFunction(this.collection.onBeforeUpload)) {                            //
        isUploadAllowed = this.collection.onBeforeUpload.call(_.extend(this.result, this.collection._getUser()), this.fileData);
        if (isUploadAllowed !== true) {                                                                                //
          return this.end(new Meteor.Error(403, _.isString(isUploadAllowed) ? isUploadAllowed : 'collection.onBeforeUpload() returned false'));
        }                                                                                                              //
      }                                                                                                                //
      Tracker.autorun(function (computation) {                                                                         //
        self.trackerComp = computation;                                                                                //
        if (!self.result.onPause.get()) {                                                                              //
          if (Meteor.status().connected) {                                                                             //
            if (self.collection.debug) {                                                                               //
              console.info('[FilesCollection] [insert] [Tracker] [continue]');                                         //
            }                                                                                                          //
            self.result["continue"]();                                                                                 //
          } else {                                                                                                     //
            if (self.collection.debug) {                                                                               //
              console.info('[FilesCollection] [insert] [Tracker] [pause]');                                            //
            }                                                                                                          //
            self.result.pause();                                                                                       //
          }                                                                                                            //
        }                                                                                                              //
      });                                                                                                              //
      if (this.worker) {                                                                                               //
        this.worker.onmessage = function (evt) {                                                                       //
          if (evt.data.error) {                                                                                        //
            if (self.collection.debug) {                                                                               //
              console.warn(evt.data.error);                                                                            //
            }                                                                                                          //
            self.emitEvent('proceedChunk', [evt.data.chunkId, evt.data.start]);                                        //
          } else {                                                                                                     //
            self.emitEvent('sendChunk', [evt]);                                                                        //
          }                                                                                                            //
        };                                                                                                             //
        this.worker.onerror = function (e) {                                                                           //
          self.emitEvent('end', [e.message]);                                                                          //
        };                                                                                                             //
      }                                                                                                                //
      if (this.collection.debug) {                                                                                     //
        if (this.worker) {                                                                                             //
          console.info('[FilesCollection] [insert] using WebWorkers');                                                 //
        } else {                                                                                                       //
          console.info('[FilesCollection] [insert] using MainThread');                                                 //
        }                                                                                                              //
      }                                                                                                                //
      self.emitEvent('prepare');                                                                                       //
      return this.result;                                                                                              //
    };                                                                                                                 //
                                                                                                                       //
    UploadInstance.prototype.manual = function () {                                                                    //
      var self;                                                                                                        //
      self = this;                                                                                                     //
      this.result.start = function () {                                                                                //
        self.emitEvent('start');                                                                                       //
      };                                                                                                               //
      this.result.pipe = function (func) {                                                                             //
        self.pipe(func);                                                                                               //
        return this;                                                                                                   //
      };                                                                                                               //
      return this.result;                                                                                              //
    };                                                                                                                 //
                                                                                                                       //
    return UploadInstance;                                                                                             //
  }() : void 0;                                                                                                        //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Client                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name _FileUpload                                                                                                    //
  @class FileUpload                                                                                                    //
  @summary Internal Class, instance of this class is returned from `insert()` method                                   //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype._FileUpload = Meteor.isClient ? FileUpload = function () {                                 //
    FileUpload.prototype.__proto__ = EventEmitter.prototype;                                                           //
                                                                                                                       //
    function FileUpload(config1) {                                                                                     //
      var self;                                                                                                        //
      this.config = config1;                                                                                           //
      EventEmitter.call(this);                                                                                         //
      self = this;                                                                                                     //
      this.file = _.extend(this.config.file, this.config.fileData);                                                    //
      this.state = new ReactiveVar('active');                                                                          //
      this.onPause = new ReactiveVar(false);                                                                           //
      this.progress = new ReactiveVar(0);                                                                              //
      this.estimateTime = new ReactiveVar(1000);                                                                       //
      this.estimateSpeed = new ReactiveVar(0);                                                                         //
      this.estimateTimer = Meteor.setInterval(function () {                                                            //
        var _currentTime;                                                                                              //
        if (self.state.get() === 'active') {                                                                           //
          _currentTime = self.estimateTime.get();                                                                      //
          if (_currentTime > 1000) {                                                                                   //
            self.estimateTime.set(_currentTime - 1000);                                                                //
          }                                                                                                            //
        }                                                                                                              //
      }, 1000);                                                                                                        //
    }                                                                                                                  //
                                                                                                                       //
    FileUpload.prototype.continueFunc = function () {};                                                                //
                                                                                                                       //
    FileUpload.prototype.pause = function () {                                                                         //
      if (this.config.debug) {                                                                                         //
        console.info('[FilesCollection] [insert] [.pause()]');                                                         //
      }                                                                                                                //
      if (!this.onPause.get()) {                                                                                       //
        this.onPause.set(true);                                                                                        //
        this.state.set('paused');                                                                                      //
        this.emitEvent('pause', [this.file]);                                                                          //
      }                                                                                                                //
    };                                                                                                                 //
                                                                                                                       //
    FileUpload.prototype["continue"] = function () {                                                                   //
      if (this.config.debug) {                                                                                         //
        console.info('[FilesCollection] [insert] [.continue()]');                                                      //
      }                                                                                                                //
      if (this.onPause.get()) {                                                                                        //
        this.onPause.set(false);                                                                                       //
        this.state.set('active');                                                                                      //
        this.emitEvent('continue', [this.file]);                                                                       //
        this.continueFunc();                                                                                           //
      }                                                                                                                //
    };                                                                                                                 //
                                                                                                                       //
    FileUpload.prototype.toggle = function () {                                                                        //
      if (this.config.debug) {                                                                                         //
        console.info('[FilesCollection] [insert] [.toggle()]');                                                        //
      }                                                                                                                //
      if (this.onPause.get()) {                                                                                        //
        this["continue"]();                                                                                            //
      } else {                                                                                                         //
        this.pause();                                                                                                  //
      }                                                                                                                //
    };                                                                                                                 //
                                                                                                                       //
    FileUpload.prototype.abort = function () {                                                                         //
      if (this.config.debug) {                                                                                         //
        console.info('[FilesCollection] [insert] [.abort()]');                                                         //
      }                                                                                                                //
      window.removeEventListener('beforeunload', this.config.beforeunload, false);                                     //
      this.config.onAbort && this.config.onAbort.call(this, this.file);                                                //
      this.emitEvent('abort', [this.file]);                                                                            //
      this.pause();                                                                                                    //
      this.config._onEnd();                                                                                            //
      this.state.set('aborted');                                                                                       //
      if (this.config.debug) {                                                                                         //
        console.timeEnd('insert ' + this.config.file.name);                                                            //
      }                                                                                                                //
      Meteor.call(this.config._Abort, this.config.fileId);                                                             //
    };                                                                                                                 //
                                                                                                                       //
    return FileUpload;                                                                                                 //
  }() : void 0;                                                                                                        //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name remove                                                                                                         //
  @param {String|Object} selector - Mongo-Style selector (http://docs.meteor.com/api/collections.html#selectors)       //
  @param {Function} callback - Callback with one `error` argument                                                      //
  @summary Remove documents from the collection                                                                        //
  @returns {FilesCollection} Instance                                                                                  //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.remove = function (selector, callback) {                                                   //
    var docs, files, self;                                                                                             //
    if (selector == null) {                                                                                            //
      selector = {};                                                                                                   //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  //
      console.info("[FilesCollection] [remove(" + JSON.stringify(selector) + ")]");                                    //
    }                                                                                                                  //
    check(selector, Match.OneOf(Object, String));                                                                      //
    check(callback, Match.Optional(Function));                                                                         //
    if (Meteor.isClient) {                                                                                             //
      if (this.allowClientCode) {                                                                                      //
        Meteor.call(this._methodNames._Remove, selector, callback || NOOP);                                            //
      } else {                                                                                                         //
        callback && callback(new Meteor.Error(401, '[FilesCollection] [remove] Run code from client is not allowed!'));
        if (this.debug) {                                                                                              //
          console.warn('[FilesCollection] [remove] Run code from client is not allowed!');                             //
        }                                                                                                              //
      }                                                                                                                //
    } else {                                                                                                           //
      files = this.collection.find(selector);                                                                          //
      if (files.count() > 0) {                                                                                         //
        self = this;                                                                                                   //
        files.forEach(function (file) {                                                                                //
          self.unlink(file);                                                                                           //
        });                                                                                                            //
      }                                                                                                                //
      if (this.onAfterRemove) {                                                                                        //
        self = this;                                                                                                   //
        docs = files.fetch();                                                                                          //
        this.collection.remove(selector, function () {                                                                 //
          callback && callback.apply(this, arguments);                                                                 //
          self.onAfterRemove(docs);                                                                                    //
        });                                                                                                            //
      } else {                                                                                                         //
        this.collection.remove(selector, callback || NOOP);                                                            //
      }                                                                                                                //
    }                                                                                                                  //
    return this;                                                                                                       //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name update                                                                                                         //
  @see http://docs.meteor.com/#/full/update                                                                            //
  @summary link Mongo.Collection update method                                                                         //
  @returns {Mongo.Collection} Instance                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.update = function () {                                                                     //
    this.collection.update.apply(this.collection, arguments);                                                          //
    return this.collection;                                                                                            //
  };                                                                                                                   //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name deny                                                                                                           //
  @param {Object} rules                                                                                                //
  @see  https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                             //
  @summary link Mongo.Collection deny methods                                                                          //
  @returns {Mongo.Collection} Instance                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.deny = Meteor.isServer ? function (rules) {                                                //
    this.collection.deny(rules);                                                                                       //
    return this.collection;                                                                                            //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name allow                                                                                                          //
  @param {Object} rules                                                                                                //
  @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                             //
  @summary link Mongo.Collection allow methods                                                                         //
  @returns {Mongo.Collection} Instance                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.allow = Meteor.isServer ? function (rules) {                                               //
    this.collection.allow(rules);                                                                                      //
    return this.collection;                                                                                            //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name denyClient                                                                                                     //
  @see https://docs.meteor.com/api/collections.html#Mongo-Collection-deny                                              //
  @summary Shorthands for Mongo.Collection deny method                                                                 //
  @returns {Mongo.Collection} Instance                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.denyClient = Meteor.isServer ? function () {                                               //
    this.collection.deny({                                                                                             //
      insert: function () {                                                                                            //
        function insert() {                                                                                            //
          return true;                                                                                                 //
        }                                                                                                              //
                                                                                                                       //
        return insert;                                                                                                 //
      }(),                                                                                                             //
      update: function () {                                                                                            //
        function update() {                                                                                            //
          return true;                                                                                                 //
        }                                                                                                              //
                                                                                                                       //
        return update;                                                                                                 //
      }(),                                                                                                             //
      remove: function () {                                                                                            //
        function remove() {                                                                                            //
          return true;                                                                                                 //
        }                                                                                                              //
                                                                                                                       //
        return remove;                                                                                                 //
      }()                                                                                                              //
    });                                                                                                                //
    return this.collection;                                                                                            //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name allowClient                                                                                                    //
  @see https://docs.meteor.com/api/collections.html#Mongo-Collection-allow                                             //
  @summary Shorthands for Mongo.Collection allow method                                                                //
  @returns {Mongo.Collection} Instance                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.allowClient = Meteor.isServer ? function () {                                              //
    this.collection.allow({                                                                                            //
      insert: function () {                                                                                            //
        function insert() {                                                                                            //
          return true;                                                                                                 //
        }                                                                                                              //
                                                                                                                       //
        return insert;                                                                                                 //
      }(),                                                                                                             //
      update: function () {                                                                                            //
        function update() {                                                                                            //
          return true;                                                                                                 //
        }                                                                                                              //
                                                                                                                       //
        return update;                                                                                                 //
      }(),                                                                                                             //
      remove: function () {                                                                                            //
        function remove() {                                                                                            //
          return true;                                                                                                 //
        }                                                                                                              //
                                                                                                                       //
        return remove;                                                                                                 //
      }()                                                                                                              //
    });                                                                                                                //
    return this.collection;                                                                                            //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name unlink                                                                                                         //
  @param {Object} fileRef - fileObj                                                                                    //
  @param {String} version - [Optional] file's version                                                                  //
  @summary Unlink files and it's versions from FS                                                                      //
  @returns {FilesCollection} Instance                                                                                  //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.unlink = Meteor.isServer ? function (fileRef, version) {                                   //
    var ref, ref1;                                                                                                     //
    if (this.debug) {                                                                                                  //
      console.info("[FilesCollection] [unlink(" + fileRef._id + ", " + version + ")]");                                //
    }                                                                                                                  //
    if (version) {                                                                                                     //
      if (((ref = fileRef.versions) != null ? ref[version] : void 0) && ((ref1 = fileRef.versions[version]) != null ? ref1.path : void 0)) {
        fs.unlink(fileRef.versions[version].path, NOOP);                                                               //
      }                                                                                                                //
    } else {                                                                                                           //
      if (fileRef.versions && !_.isEmpty(fileRef.versions)) {                                                          //
        _.each(fileRef.versions, function (vRef) {                                                                     //
          return bound(function () {                                                                                   //
            fs.unlink(vRef.path, NOOP);                                                                                //
          });                                                                                                          //
        });                                                                                                            //
      } else {                                                                                                         //
        fs.unlink(fileRef.path, NOOP);                                                                                 //
      }                                                                                                                //
    }                                                                                                                  //
    return this;                                                                                                       //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name _404                                                                                                           //
  @summary Internal method, used to return 404 error                                                                   //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype._404 = Meteor.isServer ? function (http) {                                                 //
    var text;                                                                                                          //
    if (this.debug) {                                                                                                  //
      console.warn("[FilesCollection] [download(" + http.request.originalUrl + ")] [_404] File not found");            //
    }                                                                                                                  //
    text = 'File Not Found :(';                                                                                        //
    http.response.writeHead(404, {                                                                                     //
      'Content-Length': text.length,                                                                                   //
      'Content-Type': 'text/plain'                                                                                     //
    });                                                                                                                //
    http.response.end(text);                                                                                           //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name download                                                                                                       //
  @param {Object} http    - Server HTTP object                                                                         //
  @param {String} version - Requested file version                                                                     //
  @param {Object} fileRef - Requested file Object                                                                      //
  @summary Initiates the HTTP response                                                                                 //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.download = Meteor.isServer ? function (http, version, fileRef) {                           //
    var self, vRef;                                                                                                    //
    if (version == null) {                                                                                             //
      version = 'original';                                                                                            //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  //
      console.info("[FilesCollection] [download(" + http.request.originalUrl + ", " + version + ")]");                 //
    }                                                                                                                  //
    if (fileRef) {                                                                                                     //
      if (_.has(fileRef, 'versions') && _.has(fileRef.versions, version)) {                                            //
        vRef = fileRef.versions[version];                                                                              //
        vRef._id = fileRef._id;                                                                                        //
      } else {                                                                                                         //
        vRef = fileRef;                                                                                                //
      }                                                                                                                //
    } else {                                                                                                           //
      vRef = false;                                                                                                    //
    }                                                                                                                  //
    if (!vRef || !_.isObject(vRef)) {                                                                                  //
      return this._404(http);                                                                                          //
    } else if (fileRef) {                                                                                              //
      self = this;                                                                                                     //
      if (this.downloadCallback) {                                                                                     //
        if (!this.downloadCallback.call(_.extend(http, this._getUser(http)), fileRef)) {                               //
          return this._404(http);                                                                                      //
        }                                                                                                              //
      }                                                                                                                //
      if (this.interceptDownload && _.isFunction(this.interceptDownload)) {                                            //
        if (this.interceptDownload(http, fileRef, version) === true) {                                                 //
          return;                                                                                                      //
        }                                                                                                              //
      }                                                                                                                //
      fs.stat(vRef.path, function (statErr, stats) {                                                                   //
        return bound(function () {                                                                                     //
          var responseType;                                                                                            //
          if (statErr || !stats.isFile()) {                                                                            //
            return self._404(http);                                                                                    //
          }                                                                                                            //
          if (stats.size !== vRef.size && !self.integrityCheck) {                                                      //
            vRef.size = stats.size;                                                                                    //
          }                                                                                                            //
          if (stats.size !== vRef.size && self.integrityCheck) {                                                       //
            responseType = '400';                                                                                      //
          }                                                                                                            //
          return self.serve(http, fileRef, vRef, version, null, responseType || '200');                                //
        });                                                                                                            //
      });                                                                                                              //
    } else {                                                                                                           //
      return this._404(http);                                                                                          //
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Server                                                                                                        //
  @memberOf FilesCollection                                                                                            //
  @name serve                                                                                                          //
  @param {Object} http    - Server HTTP object                                                                         //
  @param {Object} fileRef - Requested file Object                                                                      //
  @param {Object} vRef    - Requested file version Object                                                              //
  @param {String} version - Requested file version                                                                     //
  @param {stream.Readable|null} readableStream - Readable stream, which serves binary file data                        //
  @param {String} responseType - Response code                                                                         //
  @param {Boolean} force200 - Force 200 response code over 206                                                         //
  @summary Handle and reply to incoming request                                                                        //
  @returns {undefined}                                                                                                 //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.serve = Meteor.isServer ? function (http, fileRef, vRef, version, readableStream, responseType, force200) {
    var array, dispositionEncoding, dispositionName, dispositionType, end, headers, key, partiral, reqRange, self, start, stream, streamErrorHandler, take, text, value;
    if (version == null) {                                                                                             //
      version = 'original';                                                                                            //
    }                                                                                                                  //
    if (readableStream == null) {                                                                                      //
      readableStream = null;                                                                                           //
    }                                                                                                                  //
    if (responseType == null) {                                                                                        //
      responseType = '200';                                                                                            //
    }                                                                                                                  //
    if (force200 == null) {                                                                                            //
      force200 = false;                                                                                                //
    }                                                                                                                  //
    self = this;                                                                                                       //
    partiral = false;                                                                                                  //
    reqRange = false;                                                                                                  //
    if (http.params.query.download && http.params.query.download === 'true') {                                         //
      dispositionType = 'attachment; ';                                                                                //
    } else {                                                                                                           //
      dispositionType = 'inline; ';                                                                                    //
    }                                                                                                                  //
    dispositionName = "filename=\"" + encodeURIComponent(fileRef.name) + "\"; filename=*UTF-8\"" + encodeURIComponent(fileRef.name) + "\"; ";
    dispositionEncoding = 'charset=utf-8';                                                                             //
    http.response.setHeader('Content-Disposition', dispositionType + dispositionName + dispositionEncoding);           //
    if (http.request.headers.range && !force200) {                                                                     //
      partiral = true;                                                                                                 //
      array = http.request.headers.range.split(/bytes=([0-9]*)-([0-9]*)/);                                             //
      start = parseInt(array[1]);                                                                                      //
      end = parseInt(array[2]);                                                                                        //
      if (isNaN(end)) {                                                                                                //
        end = vRef.size - 1;                                                                                           //
      }                                                                                                                //
      take = end - start;                                                                                              //
    } else {                                                                                                           //
      start = 0;                                                                                                       //
      end = vRef.size - 1;                                                                                             //
      take = vRef.size;                                                                                                //
    }                                                                                                                  //
    if (partiral || http.params.query.play && http.params.query.play === 'true') {                                     //
      reqRange = {                                                                                                     //
        start: start,                                                                                                  //
        end: end                                                                                                       //
      };                                                                                                               //
      if (isNaN(start) && !isNaN(end)) {                                                                               //
        reqRange.start = end - take;                                                                                   //
        reqRange.end = end;                                                                                            //
      }                                                                                                                //
      if (!isNaN(start) && isNaN(end)) {                                                                               //
        reqRange.start = start;                                                                                        //
        reqRange.end = start + take;                                                                                   //
      }                                                                                                                //
      if (start + take >= vRef.size) {                                                                                 //
        reqRange.end = vRef.size - 1;                                                                                  //
      }                                                                                                                //
      if (self.strict && (reqRange.start >= vRef.size - 1 || reqRange.end > vRef.size - 1)) {                          //
        responseType = '416';                                                                                          //
      } else {                                                                                                         //
        responseType = '206';                                                                                          //
      }                                                                                                                //
    } else {                                                                                                           //
      responseType = '200';                                                                                            //
    }                                                                                                                  //
    streamErrorHandler = function () {                                                                                 //
      function streamErrorHandler(error) {                                                                             //
        http.response.writeHead(500);                                                                                  //
        http.response.end(error.toString());                                                                           //
        if (self.debug) {                                                                                              //
          console.error("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [500]", error);                 //
        }                                                                                                              //
      }                                                                                                                //
                                                                                                                       //
      return streamErrorHandler;                                                                                       //
    }();                                                                                                               //
    headers = _.isFunction(self.responseHeaders) ? self.responseHeaders(responseType, fileRef, vRef, version) : self.responseHeaders;
    if (!headers['Cache-Control']) {                                                                                   //
      http.response.setHeader('Cache-Control', self.cacheControl);                                                     //
    }                                                                                                                  //
    for (key in meteorBabelHelpers.sanitizeForInObject(headers)) {                                                     //
      value = headers[key];                                                                                            //
      http.response.setHeader(key, value);                                                                             //
    }                                                                                                                  //
    switch (responseType) {                                                                                            //
      case '400':                                                                                                      //
        if (self.debug) {                                                                                              //
          console.warn("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [400] Content-Length mismatch!");
        }                                                                                                              //
        text = 'Content-Length mismatch!';                                                                             //
        http.response.writeHead(400, {                                                                                 //
          'Content-Type': 'text/plain',                                                                                //
          'Content-Length': text.length                                                                                //
        });                                                                                                            //
        http.response.end(text);                                                                                       //
        break;                                                                                                         //
      case '404':                                                                                                      //
        return self._404(http);                                                                                        //
        break;                                                                                                         //
      case '416':                                                                                                      //
        if (self.debug) {                                                                                              //
          console.warn("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [416] Content-Range is not specified!");
        }                                                                                                              //
        http.response.writeHead(416);                                                                                  //
        http.response.end();                                                                                           //
        break;                                                                                                         //
      case '200':                                                                                                      //
        if (self.debug) {                                                                                              //
          console.info("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [200]");                         //
        }                                                                                                              //
        stream = readableStream || fs.createReadStream(vRef.path);                                                     //
        if (readableStream) {                                                                                          //
          http.response.writeHead(200);                                                                                //
        }                                                                                                              //
        stream.on('open', function () {                                                                                //
          http.response.writeHead(200);                                                                                //
        }).on('error', streamErrorHandler).on('end', function () {                                                     //
          http.response.end();                                                                                         //
        });                                                                                                            //
        if (self.throttle) {                                                                                           //
          stream.pipe(new Throttle({                                                                                   //
            bps: self.throttle,                                                                                        //
            chunksize: self.chunkSize                                                                                  //
          }));                                                                                                         //
        }                                                                                                              //
        stream.pipe(http.response);                                                                                    //
        break;                                                                                                         //
      case '206':                                                                                                      //
        if (self.debug) {                                                                                              //
          console.info("[FilesCollection] [serve(" + vRef.path + ", " + version + ")] [206]");                         //
        }                                                                                                              //
        http.response.setHeader('Content-Range', "bytes " + reqRange.start + "-" + reqRange.end + "/" + vRef.size);    //
        stream = readableStream || fs.createReadStream(vRef.path, {                                                    //
          start: reqRange.start,                                                                                       //
          end: reqRange.end                                                                                            //
        });                                                                                                            //
        if (readableStream) {                                                                                          //
          http.response.writeHead(206);                                                                                //
        }                                                                                                              //
        stream.on('open', function () {                                                                                //
          http.response.writeHead(206);                                                                                //
        }).on('error', streamErrorHandler).on('end', function () {                                                     //
          http.response.end();                                                                                         //
        });                                                                                                            //
        if (self.throttle) {                                                                                           //
          stream.pipe(new Throttle({                                                                                   //
            bps: self.throttle,                                                                                        //
            chunksize: self.chunkSize                                                                                  //
          }));                                                                                                         //
        }                                                                                                              //
        stream.pipe(http.response);                                                                                    //
        break;                                                                                                         //
    }                                                                                                                  //
  } : void 0;                                                                                                          //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Anywhere                                                                                                      //
  @memberOf FilesCollection                                                                                            //
  @name link                                                                                                           //
  @param {Object} fileRef - File reference object                                                                      //
  @param {String} version - Version of file you would like to request                                                  //
  @summary Returns downloadable URL                                                                                    //
  @returns {String} Empty string returned in case if file not found in DB                                              //
   */                                                                                                                  //
                                                                                                                       //
  FilesCollection.prototype.link = function (fileRef, version) {                                                       //
    if (version == null) {                                                                                             //
      version = 'original';                                                                                            //
    }                                                                                                                  //
    if (this.debug) {                                                                                                  //
      console.info("[FilesCollection] [link(" + (fileRef != null ? fileRef._id : void 0) + ", " + version + ")]");     //
    }                                                                                                                  //
    check(fileRef, Object);                                                                                            //
    check(version, String);                                                                                            //
    if (!fileRef) {                                                                                                    //
      return '';                                                                                                       //
    }                                                                                                                  //
    return formatFleURL(fileRef, version);                                                                             //
  };                                                                                                                   //
                                                                                                                       //
  return FilesCollection;                                                                                              //
}();                                                                                                                   //
                                                                                                                       //
/*                                                                                                                     //
@locus Anywhere                                                                                                        //
@private                                                                                                               //
@name formatFleURL                                                                                                     //
@param {Object} fileRef - File reference object                                                                        //
@param {String} version - [Optional] Version of file you would like build URL for                                      //
@summary Returns formatted URL for file                                                                                //
@returns {String} Downloadable link                                                                                    //
 */                                                                                                                    //
                                                                                                                       //
formatFleURL = function formatFleURL(fileRef, version) {                                                               //
  var ext, ref, root;                                                                                                  //
  if (version == null) {                                                                                               //
    version = 'original';                                                                                              //
  }                                                                                                                    //
  check(fileRef, Object);                                                                                              //
  check(version, String);                                                                                              //
  root = __meteor_runtime_config__.ROOT_URL.replace(/\/+$/, '');                                                       //
  if ((ref = fileRef.extension) != null ? ref.length : void 0) {                                                       //
    ext = '.' + fileRef.extension;                                                                                     //
  } else {                                                                                                             //
    ext = '';                                                                                                          //
  }                                                                                                                    //
  if (fileRef["public"] === true) {                                                                                    //
    return root + (version === 'original' ? fileRef._downloadRoute + "/" + fileRef._id + ext : fileRef._downloadRoute + "/" + version + "-" + fileRef._id + ext);
  } else {                                                                                                             //
    return root + (fileRef._downloadRoute + "/" + fileRef._collectionName + "/" + fileRef._id + "/" + version + "/" + fileRef._id + ext);
  }                                                                                                                    //
};                                                                                                                     //
                                                                                                                       //
if (Meteor.isClient) {                                                                                                 //
                                                                                                                       //
  /*                                                                                                                   //
  @locus Client                                                                                                        //
  @TemplateHelper                                                                                                      //
  @name fileURL                                                                                                        //
  @param {Object} fileRef - File reference object                                                                      //
  @param {String} version - [Optional] Version of file you would like to request                                       //
  @summary Get download URL for file by fileRef, even without subscription                                             //
  @example {{fileURL fileRef}}                                                                                         //
  @returns {String}                                                                                                    //
   */                                                                                                                  //
  Template.registerHelper('fileURL', function (fileRef, version) {                                                     //
    if (!fileRef || !_.isObject(fileRef)) {                                                                            //
      return void 0;                                                                                                   //
    }                                                                                                                  //
    version = !version || !_.isString(version) ? 'original' : version;                                                 //
    if (fileRef._id) {                                                                                                 //
      return formatFleURL(fileRef, version);                                                                           //
    } else {                                                                                                           //
      return '';                                                                                                       //
    }                                                                                                                  //
  });                                                                                                                  //
}exports.FilesCollection = FilesCollection;                                                                            //
                                                                                                                       //
                                                                                                                       //
Meteor.Files = FilesCollection;                                                                                        //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"event-emitter.jsx":["babel-runtime/helpers/typeof",function(require,exports,module){

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                     //
// packages/ostrio_files/event-emitter.jsx                                                                             //
//                                                                                                                     //
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                       //
var _typeof2 = require('babel-runtime/helpers/typeof');                                                                //
                                                                                                                       //
var _typeof3 = _interopRequireDefault(_typeof2);                                                                       //
                                                                                                                       //
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }                      //
                                                                                                                       //
/*!                                                                                                                    //
 * EventEmitter v4.2.11 - git.io/ee                                                                                    //
 * Unlicense - http://unlicense.org/                                                                                   //
 * Oliver Caldwell - http://oli.me.uk/                                                                                 //
 * @preserve                                                                                                           //
 */                                                                                                                    //
                                                                                                                       //
;(function () {module.export({EventEmitter:function(){return EventEmitter}});                                          // 8
  /**                                                                                                                  //
   * Class for managing events.                                                                                        //
   * Can be extended to provide event functionality in other classes.                                                  //
   *                                                                                                                   //
   * @class EventEmitter Manages event registering and emitting.                                                       //
   */                                                                                                                  //
  function EventEmitter() {}                                                                                           // 15
                                                                                                                       //
  // Shortcuts to improve speed and size                                                                               //
  var proto = EventEmitter.prototype;                                                                                  // 18
  var exports = this;                                                                                                  // 19
  var originalGlobalValue = exports.EventEmitter;                                                                      // 20
                                                                                                                       //
  /**                                                                                                                  //
   * Finds the index of the listener for the event in its storage array.                                               //
   *                                                                                                                   //
   * @param {Function[]} listeners Array of listeners to search through.                                               //
   * @param {Function} listener Method to look for.                                                                    //
   * @return {Number} Index of the specified listener, -1 if not found                                                 //
   * @api private                                                                                                      //
   */                                                                                                                  //
  function indexOfListener(listeners, listener) {                                                                      // 30
    var i = listeners.length;                                                                                          // 31
    while (i--) {                                                                                                      // 32
      if (listeners[i].listener === listener) {                                                                        // 33
        return i;                                                                                                      // 34
      }                                                                                                                // 35
    }                                                                                                                  // 36
                                                                                                                       //
    return -1;                                                                                                         // 38
  }                                                                                                                    // 39
                                                                                                                       //
  /**                                                                                                                  //
   * Alias a method while keeping the context correct, to allow for overwriting of target method.                      //
   *                                                                                                                   //
   * @param {String} name The name of the target method.                                                               //
   * @return {Function} The aliased method                                                                             //
   * @api private                                                                                                      //
   */                                                                                                                  //
  function alias(name) {                                                                                               // 48
    return function aliasClosure() {                                                                                   // 49
      return this[name].apply(this, arguments);                                                                        // 50
    };                                                                                                                 // 51
  }                                                                                                                    // 52
                                                                                                                       //
  /**                                                                                                                  //
   * Returns the listener array for the specified event.                                                               //
   * Will initialise the event object and listener arrays if required.                                                 //
   * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
   * Each property in the object response is an array of listener functions.                                           //
   *                                                                                                                   //
   * @param {String|RegExp} evt Name of the event to return the listeners from.                                        //
   * @return {Function[]|Object} All listener functions for the event.                                                 //
   */                                                                                                                  //
  proto.getListeners = function getListeners(evt) {                                                                    // 63
    var events = this._getEvents();                                                                                    // 64
    var response = void 0;                                                                                             // 65
    var key = void 0;                                                                                                  // 66
                                                                                                                       //
    // Return a concatenated array of all matching events if                                                           //
    // the selector is a regular expression.                                                                           //
    if (evt instanceof RegExp) {                                                                                       // 70
      response = {};                                                                                                   // 71
      for (key in events) {                                                                                            // 72
        if (events.hasOwnProperty(key) && evt.test(key)) {                                                             // 73
          response[key] = events[key];                                                                                 // 74
        }                                                                                                              // 75
      }                                                                                                                // 76
    } else {                                                                                                           // 77
      response = events[evt] || (events[evt] = []);                                                                    // 79
    }                                                                                                                  // 80
                                                                                                                       //
    return response;                                                                                                   // 82
  };                                                                                                                   // 83
                                                                                                                       //
  /**                                                                                                                  //
   * Takes a list of listener objects and flattens it into a list of listener functions.                               //
   *                                                                                                                   //
   * @param {Object[]} listeners Raw listener objects.                                                                 //
   * @return {Function[]} Just the listener functions.                                                                 //
   */                                                                                                                  //
  proto.flattenListeners = function flattenListeners(listeners) {                                                      // 91
    var flatListeners = [];                                                                                            // 92
    var i = void 0;                                                                                                    // 93
                                                                                                                       //
    for (i = 0; i < listeners.length; i += 1) {                                                                        // 95
      flatListeners.push(listeners[i].listener);                                                                       // 96
    }                                                                                                                  // 97
                                                                                                                       //
    return flatListeners;                                                                                              // 99
  };                                                                                                                   // 100
                                                                                                                       //
  /**                                                                                                                  //
   * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
   *                                                                                                                   //
   * @param {String|RegExp} evt Name of the event to return the listeners from.                                        //
   * @return {Object} All listener functions for an event in an object.                                                //
   */                                                                                                                  //
  proto.getListenersAsObject = function getListenersAsObject(evt) {                                                    // 108
    var listeners = this.getListeners(evt);                                                                            // 109
    var response = void 0;                                                                                             // 110
                                                                                                                       //
    if (listeners instanceof Array) {                                                                                  // 112
      response = {};                                                                                                   // 113
      response[evt] = listeners;                                                                                       // 114
    }                                                                                                                  // 115
                                                                                                                       //
    return response || listeners;                                                                                      // 117
  };                                                                                                                   // 118
                                                                                                                       //
  /**                                                                                                                  //
   * Adds a listener function to the specified event.                                                                  //
   * The listener will not be added if it is a duplicate.                                                              //
   * If the listener returns true then it will be removed after it is called.                                          //
   * If you pass a regular expression as the event name then the listener will be added to all events that match it.   //
   *                                                                                                                   //
   * @param {String|RegExp} evt Name of the event to attach the listener to.                                           //
   * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
   * @return {Object} Current instance of EventEmitter for chaining.                                                   //
   */                                                                                                                  //
  proto.addListener = function addListener(evt, listener) {                                                            // 130
    var listeners = this.getListenersAsObject(evt);                                                                    // 131
    var listenerIsWrapped = (typeof listener === 'undefined' ? 'undefined' : (0, _typeof3['default'])(listener)) === 'object';
    var key = void 0;                                                                                                  // 133
                                                                                                                       //
    for (key in listeners) {                                                                                           // 135
      if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {                         // 136
        listeners[key].push(listenerIsWrapped ? listener : {                                                           // 137
          listener: listener,                                                                                          // 138
          once: false                                                                                                  // 139
        });                                                                                                            // 137
      }                                                                                                                // 141
    }                                                                                                                  // 142
                                                                                                                       //
    return this;                                                                                                       // 144
  };                                                                                                                   // 145
                                                                                                                       //
  /**                                                                                                                  //
   * Alias of addListener                                                                                              //
   */                                                                                                                  //
  proto.on = alias('addListener');                                                                                     // 150
                                                                                                                       //
  /**                                                                                                                  //
   * Semi-alias of addListener. It will add a listener that will be                                                    //
   * automatically removed after its first execution.                                                                  //
   *                                                                                                                   //
   * @param {String|RegExp} evt Name of the event to attach the listener to.                                           //
   * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
   * @return {Object} Current instance of EventEmitter for chaining.                                                   //
   */                                                                                                                  //
  proto.addOnceListener = function addOnceListener(evt, listener) {                                                    // 160
    return this.addListener(evt, {                                                                                     // 161
      listener: listener,                                                                                              // 162
      once: true                                                                                                       // 163
    });                                                                                                                // 161
  };                                                                                                                   // 165
                                                                                                                       //
  /**                                                                                                                  //
   * Alias of addOnceListener.                                                                                         //
   */                                                                                                                  //
  proto.once = alias('addOnceListener');                                                                               // 170
                                                                                                                       //
  /**                                                                                                                  //
   * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
   * You need to tell it what event names should be matched by a regex.                                                //
   *                                                                                                                   //
   * @param {String} evt Name of the event to create.                                                                  //
   * @return {Object} Current instance of EventEmitter for chaining.                                                   //
   */                                                                                                                  //
  proto.defineEvent = function defineEvent(evt) {                                                                      // 179
    this.getListeners(evt);                                                                                            // 180
    return this;                                                                                                       // 181
  };                                                                                                                   // 182
                                                                                                                       //
  /**                                                                                                                  //
   * Uses defineEvent to define multiple events.                                                                       //
   *                                                                                                                   //
   * @param {String[]} evts An array of event names to define.                                                         //
   * @return {Object} Current instance of EventEmitter for chaining.                                                   //
   */                                                                                                                  //
  proto.defineEvents = function defineEvents(evts) {                                                                   // 190
    for (var i = 0; i < evts.length; i += 1) {                                                                         // 191
      this.defineEvent(evts[i]);                                                                                       // 192
    }                                                                                                                  // 193
    return this;                                                                                                       // 194
  };                                                                                                                   // 195
                                                                                                                       //
  /**                                                                                                                  //
   * Removes a listener function from the specified event.                                                             //
   * When passed a regular expression as the event name, it will remove the listener from all events that match it.    //
   *                                                                                                                   //
   * @param {String|RegExp} evt Name of the event to remove the listener from.                                         //
   * @param {Function} listener Method to remove from the event.                                                       //
   * @return {Object} Current instance of EventEmitter for chaining.                                                   //
   */                                                                                                                  //
  proto.removeListener = function removeListener(evt, listener) {                                                      // 205
    var listeners = this.getListenersAsObject(evt);                                                                    // 206
    var index = void 0;                                                                                                // 207
    var key = void 0;                                                                                                  // 208
                                                                                                                       //
    for (key in listeners) {                                                                                           // 210
      if (listeners.hasOwnProperty(key)) {                                                                             // 211
        index = indexOfListener(listeners[key], listener);                                                             // 212
                                                                                                                       //
        if (index !== -1) {                                                                                            // 214
          listeners[key].splice(index, 1);                                                                             // 215
        }                                                                                                              // 216
      }                                                                                                                // 217
    }                                                                                                                  // 218
                                                                                                                       //
    return this;                                                                                                       // 220
  };                                                                                                                   // 221
                                                                                                                       //
  /**                                                                                                                  //
   * Alias of removeListener                                                                                           //
   */                                                                                                                  //
  proto.off = alias('removeListener');                                                                                 // 226
                                                                                                                       //
  /**                                                                                                                  //
   * Adds listeners in bulk using the manipulateListeners method.                                                      //
   * If you pass an object as the second argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
   * You can also pass it a regular expression to add the array of listeners to all events that match it.              //
   * Yeah, this function does quite a bit. That's probably a bad thing.                                                //
   *                                                                                                                   //
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to add.                                   //
   * @return {Object} Current instance of EventEmitter for chaining.                                                   //
   */                                                                                                                  //
  proto.addListeners = function addListeners(evt, listeners) {                                                         // 238
    // Pass through to manipulateListeners                                                                             //
    return this.manipulateListeners(false, evt, listeners);                                                            // 240
  };                                                                                                                   // 241
                                                                                                                       //
  /**                                                                                                                  //
   * Removes listeners in bulk using the manipulateListeners method.                                                   //
   * If you pass an object as the second argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
   * You can also pass it an event name and an array of listeners to be removed.                                       //
   * You can also pass it a regular expression to remove the listeners from all events that match it.                  //
   *                                                                                                                   //
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to remove.                                //
   * @return {Object} Current instance of EventEmitter for chaining.                                                   //
   */                                                                                                                  //
  proto.removeListeners = function removeListeners(evt, listeners) {                                                   // 253
    // Pass through to manipulateListeners                                                                             //
    return this.manipulateListeners(true, evt, listeners);                                                             // 255
  };                                                                                                                   // 256
                                                                                                                       //
  /**                                                                                                                  //
   * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
   * The first argument will determine if the listeners are removed (true) or added (false).                           //
   * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
   * You can also pass it an event name and an array of listeners to be added/removed.                                 //
   * You can also pass it a regular expression to manipulate the listeners of all events that match it.                //
   *                                                                                                                   //
   * @param {Boolean} remove True if you want to remove listeners, false if you want to add.                           //
   * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
   * @param {Function[]} [listeners] An optional array of listener functions to add/remove.                            //
   * @return {Object} Current instance of EventEmitter for chaining.                                                   //
   */                                                                                                                  //
  proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {                                   // 270
    var i = void 0;                                                                                                    // 271
    var value = void 0;                                                                                                // 272
    var single = remove ? this.removeListener : this.addListener;                                                      // 273
    var multiple = remove ? this.removeListeners : this.addListeners;                                                  // 274
                                                                                                                       //
    // If evt is an object then pass each of its properties to this method                                             //
    if ((typeof evt === 'undefined' ? 'undefined' : (0, _typeof3['default'])(evt)) === 'object' && !(evt instanceof RegExp)) {
      for (i in evt) {                                                                                                 // 278
        if (evt.hasOwnProperty(i) && (value = evt[i])) {                                                               // 279
          // Pass the single listener straight through to the singular method                                          //
          if (typeof value === 'function') {                                                                           // 281
            single.call(this, i, value);                                                                               // 282
          } else {                                                                                                     // 283
            // Otherwise pass back to the multiple function                                                            //
            multiple.call(this, i, value);                                                                             // 286
          }                                                                                                            // 287
        }                                                                                                              // 288
      }                                                                                                                // 289
    } else {                                                                                                           // 290
      // So evt must be a string                                                                                       //
      // And listeners must be an array of listeners                                                                   //
      // Loop over it and pass each one to the multiple method                                                         //
      i = listeners.length;                                                                                            // 295
      while (i--) {                                                                                                    // 296
        single.call(this, evt, listeners[i]);                                                                          // 297
      }                                                                                                                // 298
    }                                                                                                                  // 299
                                                                                                                       //
    return this;                                                                                                       // 301
  };                                                                                                                   // 302
                                                                                                                       //
  /**                                                                                                                  //
   * Removes all listeners from a specified event.                                                                     //
   * If you do not specify an event then all listeners will be removed.                                                //
   * That means every event will be emptied.                                                                           //
   * You can also pass a regex to remove all events that match it.                                                     //
   *                                                                                                                   //
   * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
   * @return {Object} Current instance of EventEmitter for chaining.                                                   //
   */                                                                                                                  //
  proto.removeEvent = function removeEvent(evt) {                                                                      // 313
    var type = typeof evt === 'undefined' ? 'undefined' : (0, _typeof3['default'])(evt);                               // 314
    var events = this._getEvents();                                                                                    // 315
    var key = void 0;                                                                                                  // 316
                                                                                                                       //
    // Remove different things depending on the state of evt                                                           //
    if (type === 'string') {                                                                                           // 319
      // Remove all listeners for the specified event                                                                  //
      delete events[evt];                                                                                              // 321
    } else if (evt instanceof RegExp) {                                                                                // 322
      // Remove all events matching the regex.                                                                         //
      for (key in events) {                                                                                            // 325
        if (events.hasOwnProperty(key) && evt.test(key)) {                                                             // 326
          delete events[key];                                                                                          // 327
        }                                                                                                              // 328
      }                                                                                                                // 329
    } else {                                                                                                           // 330
      // Remove all listeners in all events                                                                            //
      delete this._events;                                                                                             // 333
    }                                                                                                                  // 334
                                                                                                                       //
    return this;                                                                                                       // 336
  };                                                                                                                   // 337
                                                                                                                       //
  /**                                                                                                                  //
   * Alias of removeEvent.                                                                                             //
   *                                                                                                                   //
   * Added to mirror the node API.                                                                                     //
   */                                                                                                                  //
  proto.removeAllListeners = alias('removeEvent');                                                                     // 344
                                                                                                                       //
  /**                                                                                                                  //
   * Emits an event of your choice.                                                                                    //
   * When emitted, every listener attached to that event will be executed.                                             //
   * If you pass the optional argument array then those arguments will be passed to every listener upon execution.     //
   * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.              //
   * So they will not arrive within the array on the other side, they will be separate.                                //
   * You can also pass a regular expression to emit to all events that match it.                                       //
   *                                                                                                                   //
   * @param {String|RegExp} evt Name of the event to emit and execute listeners for.                                   //
   * @param {Array} [args] Optional array of arguments to be passed to each listener.                                  //
   * @return {Object} Current instance of EventEmitter for chaining.                                                   //
   */                                                                                                                  //
  proto.emitEvent = function emitEvent(evt, args) {                                                                    // 358
    var listenersMap = this.getListenersAsObject(evt);                                                                 // 359
    var listeners = void 0;                                                                                            // 360
    var listener = void 0;                                                                                             // 361
    var i = void 0;                                                                                                    // 362
    var key = void 0;                                                                                                  // 363
    var response = void 0;                                                                                             // 364
                                                                                                                       //
    for (key in listenersMap) {                                                                                        // 366
      if (listenersMap.hasOwnProperty(key)) {                                                                          // 367
        listeners = listenersMap[key].slice(0);                                                                        // 368
        i = listeners.length;                                                                                          // 369
                                                                                                                       //
        while (i--) {                                                                                                  // 371
          // If the listener returns true then it shall be removed from the event                                      //
          // The function is executed either with a basic call or an apply if there is an args array                   //
          listener = listeners[i];                                                                                     // 374
                                                                                                                       //
          if (listener.once === true) {                                                                                // 376
            this.removeListener(evt, listener.listener);                                                               // 377
          }                                                                                                            // 378
                                                                                                                       //
          response = listener.listener.apply(this, args || []);                                                        // 380
                                                                                                                       //
          if (response === this._getOnceReturnValue()) {                                                               // 382
            this.removeListener(evt, listener.listener);                                                               // 383
          }                                                                                                            // 384
        }                                                                                                              // 385
      }                                                                                                                // 386
    }                                                                                                                  // 387
                                                                                                                       //
    return this;                                                                                                       // 389
  };                                                                                                                   // 390
                                                                                                                       //
  /**                                                                                                                  //
   * Alias of emitEvent                                                                                                //
   */                                                                                                                  //
  proto.trigger = alias('emitEvent');                                                                                  // 395
                                                                                                                       //
  /**                                                                                                                  //
   * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
   * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.           //
   *                                                                                                                   //
   * @param {String|RegExp} evt Name of the event to emit and execute listeners for.                                   //
   * @param {...*} Optional additional arguments to be passed to each listener.                                        //
   * @return {Object} Current instance of EventEmitter for chaining.                                                   //
   */                                                                                                                  //
  proto.emit = function emit(evt) {                                                                                    // 405
    var args = Array.prototype.slice.call(arguments, 1);                                                               // 406
    return this.emitEvent(evt, args);                                                                                  // 407
  };                                                                                                                   // 408
                                                                                                                       //
  /**                                                                                                                  //
   * Sets the current value to check against when executing listeners. If a                                            //
   * listeners return value matches the one set here then it will be removed                                           //
   * after execution. This value defaults to true.                                                                     //
   *                                                                                                                   //
   * @param {*} value The new value to check for when executing listeners.                                             //
   * @return {Object} Current instance of EventEmitter for chaining.                                                   //
   */                                                                                                                  //
  proto.setOnceReturnValue = function setOnceReturnValue(value) {                                                      // 418
    this._onceReturnValue = value;                                                                                     // 419
    return this;                                                                                                       // 420
  };                                                                                                                   // 421
                                                                                                                       //
  /**                                                                                                                  //
   * Fetches the current value to check against when executing listeners. If                                           //
   * the listeners return value matches this one then it should be removed                                             //
   * automatically. It will return true by default.                                                                    //
   *                                                                                                                   //
   * @return {*|Boolean} The current value to check for or the default, true.                                          //
   * @api private                                                                                                      //
   */                                                                                                                  //
  proto._getOnceReturnValue = function _getOnceReturnValue() {                                                         // 431
    if (this.hasOwnProperty('_onceReturnValue')) {                                                                     // 432
      return this._onceReturnValue;                                                                                    // 433
    } else {                                                                                                           // 434
      return true;                                                                                                     // 436
    }                                                                                                                  // 437
  };                                                                                                                   // 438
                                                                                                                       //
  /**                                                                                                                  //
   * Fetches the events object and creates one if required.                                                            //
   *                                                                                                                   //
   * @return {Object} The events storage object.                                                                       //
   * @api private                                                                                                      //
   */                                                                                                                  //
  proto._getEvents = function _getEvents() {                                                                           // 446
    return this._events || (this._events = {});                                                                        // 447
  };                                                                                                                   // 448
                                                                                                                       //
  /**                                                                                                                  //
   * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.            //
   *                                                                                                                   //
   * @return {Function} Non conflicting EventEmitter class.                                                            //
   */                                                                                                                  //
  EventEmitter.noConflict = function noConflict() {                                                                    // 455
    exports.EventEmitter = originalGlobalValue;                                                                        // 456
    return EventEmitter;                                                                                               // 457
  };                                                                                                                   // 458
                                                                                                                       //
  // Expose the class                                                                                                  //
                                                                                                                       // 461
}).call(this);                                                                                                         // 462
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}]}}}},{"extensions":[".js",".json",".coffee",".jsx"]});
require("./node_modules/meteor/ostrio:files/files.coffee.js");

/* Exports */
if (typeof Package === 'undefined') Package = {};
(function (pkg, symbols) {
  for (var s in symbols)
    (s in pkg) || (pkg[s] = symbols[s]);
})(Package['ostrio:files'] = {}, {
  FilesCollection: FilesCollection
});

})();

//# sourceMappingURL=ostrio_files.js.map
