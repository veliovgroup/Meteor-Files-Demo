var require = meteorInstall({"lib":{"__compatability":{"__globals.coffee.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// lib/__compatability/__globals.coffee.js                                                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var _el;                                                                                                              // 1
                                                                                                                      //
this.Collections = {};                                                                                                // 1
                                                                                                                      //
this._app = {                                                                                                         // 2
  NOOP: function() {}                                                                                                 //
};                                                                                                                    //
                                                                                                                      //
Package['kadira:flow-router'] = Package['ostrio:flow-router-extra'];                                                  // 3
                                                                                                                      //
if (Meteor.isClient) {                                                                                                // 5
  window.IS_RENDERED = false;                                                                                         //
  if (window.requestAnimFrame == null) {                                                                              //
    window.requestAnimFrame = (function() {                                                                           //
      return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function(callback) {
        window.setTimeout(callback, 1000 / 60);                                                                       //
      };                                                                                                              //
    })();                                                                                                             //
  }                                                                                                                   //
  if (!ClientStorage.has('blamed') || !_.isArray(ClientStorage.get('blamed'))) {                                      //
    ClientStorage.set('blamed', []);                                                                                  //
  }                                                                                                                   //
  if (!ClientStorage.has('unlist') || !_.isBoolean(ClientStorage.get('unlist'))) {                                    //
    ClientStorage.set('unlist', true);                                                                                //
  }                                                                                                                   //
  if (!ClientStorage.has('secured') || !_.isBoolean(ClientStorage.get('secured'))) {                                  //
    ClientStorage.set('secured', false);                                                                              //
  }                                                                                                                   //
  if (!ClientStorage.has('userOnly') || !_.isBoolean(ClientStorage.get('userOnly'))) {                                //
    ClientStorage.set('userOnly', false);                                                                             //
  }                                                                                                                   //
  _el = null;                                                                                                         //
  $(window).on('dragenter dragover', function(e) {                                                                    //
    var uf;                                                                                                           // 18
    e.preventDefault();                                                                                               //
    e.stopPropagation();                                                                                              //
    _el = e.target;                                                                                                   //
    uf = document.getElementById('uploadFile');                                                                       //
    if (!~uf.className.indexOf('file-over')) {                                                                        //
      uf.className += ' file-over';                                                                                   //
    }                                                                                                                 //
    return false;                                                                                                     // 24
  });                                                                                                                 //
  $(window).on('dragleave', function(e) {                                                                             //
    var uf;                                                                                                           // 26
    e.preventDefault();                                                                                               //
    e.stopPropagation();                                                                                              //
    if (_el === e.target) {                                                                                           //
      uf = document.getElementById('uploadFile');                                                                     //
      if (!!~uf.className.indexOf('file-over')) {                                                                     //
        uf.className = uf.className.replace(' file-over', '');                                                        //
      }                                                                                                               //
    }                                                                                                                 //
    return false;                                                                                                     // 32
  });                                                                                                                 //
  $(window).on('drop', function(e) {                                                                                  //
    var uf;                                                                                                           // 34
    e.preventDefault();                                                                                               //
    e.stopPropagation();                                                                                              //
    uf = document.getElementById('uploadFile');                                                                       //
    if (!!~uf.className.indexOf('file-over')) {                                                                       //
      uf.className = uf.className.replace(' file-over', '');                                                          //
    }                                                                                                                 //
    return false;                                                                                                     // 39
  });                                                                                                                 //
  _app.subs = new SubsManager();                                                                                      //
  _app.blamed = new ReactiveVar(ClientStorage.get('blamed'));                                                         //
  _app.unlist = new ReactiveVar(ClientStorage.get('unlist'));                                                         //
  _app.secured = new ReactiveVar(ClientStorage.get('secured'));                                                       //
  _app.uploads = new ReactiveVar(false);                                                                              //
  _app.userOnly = new ReactiveVar(ClientStorage.get('userOnly'));                                                     //
  _app.storeTTL = 86400000;                                                                                           //
  _app.currentUrl = function() {                                                                                      //
    return Meteor.absoluteUrl((FlowRouter.current().path || document.location.pathname).replace(/^\//g, '')).split('?')[0].split('#')[0].replace('!', '');
  };                                                                                                                  //
  _app.storeTTLUser = 432000000;                                                                                      //
  _app.showProjectInfo = new ReactiveVar(false);                                                                      //
  _app.serviceConfiguration = new ReactiveVar({});                                                                    //
  Meteor.call('getServiceConfiguration', function(error, serviceConfiguration) {                                      //
    if (error) {                                                                                                      //
      console.error(error);                                                                                           //
    } else {                                                                                                          //
      _app.serviceConfiguration.set(serviceConfiguration);                                                            //
    }                                                                                                                 //
  });                                                                                                                 //
  Meteor.autorun(function() {                                                                                         //
    ClientStorage.set('blamed', _app.blamed.get());                                                                   //
  });                                                                                                                 //
  Meteor.autorun(function() {                                                                                         //
    ClientStorage.set('unlist', _app.unlist.get());                                                                   //
  });                                                                                                                 //
  Meteor.autorun(function() {                                                                                         //
    ClientStorage.set('secured', _app.secured.get());                                                                 //
  });                                                                                                                 //
  Meteor.autorun(function() {                                                                                         //
    ClientStorage.set('userOnly', _app.userOnly.get());                                                               //
  });                                                                                                                 //
  if (!ClientStorage.has('uploadTransport')) {                                                                        //
    ClientStorage.set('uploadTransport', 'ddp');                                                                      //
  }                                                                                                                   //
  Template.registerHelper('urlCurrent', function() {                                                                  //
    return _app.currentUrl();                                                                                         //
  });                                                                                                                 //
  Template.registerHelper('url', function(string) {                                                                   //
    if (string == null) {                                                                                             //
      string = null;                                                                                                  //
    }                                                                                                                 //
    return Meteor.absoluteUrl(string);                                                                                //
  });                                                                                                                 //
  Template.registerHelper('filesize', function(size) {                                                                //
    if (size == null) {                                                                                               //
      size = 0;                                                                                                       //
    }                                                                                                                 //
    return filesize(size);                                                                                            //
  });                                                                                                                 //
  Template.registerHelper('extless', function(filename) {                                                             //
    var parts;                                                                                                        // 81
    if (filename == null) {                                                                                           //
      filename = '';                                                                                                  //
    }                                                                                                                 //
    parts = filename.split('.');                                                                                      //
    if (parts.length > 1) {                                                                                           //
      parts.pop();                                                                                                    //
    }                                                                                                                 //
    return parts.join('.');                                                                                           // 83
  });                                                                                                                 //
  Template.registerHelper('DateToISO', function(time) {                                                               //
    if (!time) {                                                                                                      //
      return 0;                                                                                                       // 85
    }                                                                                                                 //
    if (_.isString(time) || _.isNumber(time)) {                                                                       //
      time = new Date(time);                                                                                          //
    }                                                                                                                 //
    return time.toISOString();                                                                                        //
  });                                                                                                                 //
  Template._404.onRendered(function() {                                                                               //
    window.IS_RENDERED = true;                                                                                        //
  });                                                                                                                 //
  Template._layout.helpers({                                                                                          //
    showProjectInfo: function() {                                                                                     //
      return _app.showProjectInfo.get();                                                                              //
    }                                                                                                                 //
  });                                                                                                                 //
  Template._layout.events({                                                                                           //
    'click [data-show-project-info]': function(e, template) {                                                         //
      e.preventDefault();                                                                                             //
      $('.gh-ribbon').toggle();                                                                                       //
      _app.showProjectInfo.set(!_app.showProjectInfo.get());                                                          //
      return false;                                                                                                   //
    }                                                                                                                 //
  });                                                                                                                 //
  marked.setOptions({                                                                                                 //
    highlight: function(code) {                                                                                       //
      return hljs.highlightAuto(code).value;                                                                          //
    },                                                                                                                //
    renderer: new marked.Renderer(),                                                                                  //
    gfm: true,                                                                                                        //
    tables: true,                                                                                                     //
    breaks: false,                                                                                                    //
    pedantic: false,                                                                                                  //
    sanitize: true,                                                                                                   //
    smartLists: true,                                                                                                 //
    smartypants: false                                                                                                //
  });                                                                                                                 //
  Meteor.startup(function() {                                                                                         //
    var FPS, regStop;                                                                                                 // 116
    $('html').attr('itemscope', '');                                                                                  //
    $('html').attr('itemtype', 'http://schema.org/WebPage');                                                          //
    $('html').attr('xmlns:og', 'http://ogp.me/ns#');                                                                  //
    $('html').attr('xml:lang', 'en');                                                                                 //
    $('html').attr('lang', 'en');                                                                                     //
    FPS = new FPSMeter({                                                                                              //
      ui: true,                                                                                                       //
      reactive: false                                                                                                 //
    });                                                                                                               //
    FPS.start();                                                                                                      //
    regStop = function() {                                                                                            //
      $('#__FPSMeter').click(function() {                                                                             //
        if (FPS.isRunning) {                                                                                          //
          FPS.isRunning = false;                                                                                      //
        } else {                                                                                                      //
          FPS.stop();                                                                                                 //
          window.requestAnimFrame(function() {                                                                        //
            FPS.start();                                                                                              //
            regStop();                                                                                                //
          });                                                                                                         //
        }                                                                                                             //
      });                                                                                                             //
    };                                                                                                                //
    regStop();                                                                                                        //
  });                                                                                                                 //
}                                                                                                                     //
                                                                                                                      //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"files.collection.coffee.js":function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// lib/files.collection.coffee.js                                                                                     //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var Dropbox, Request, _origRemove, bound, client, fs, knox, ref, ref1, ref2, ref3, useDropBox, useS3;                 // 4
                                                                                                                      //
useDropBox = false;                                                                                                   // 4
                                                                                                                      //
useS3 = false;                                                                                                        // 12
                                                                                                                      //
if (Meteor.isServer) {                                                                                                // 14
  if ((ref = process.env) != null ? ref.DROPBOX : void 0) {                                                           //
    Meteor.settings.dropbox = (ref1 = JSON.parse(process.env.DROPBOX)) != null ? ref1.dropbox : void 0;               //
  } else if ((ref2 = process.env) != null ? ref2.S3 : void 0) {                                                       //
    Meteor.settings.s3 = (ref3 = JSON.parse(process.env.S3)) != null ? ref3.s3 : void 0;                              //
  }                                                                                                                   //
  if (Meteor.settings.dropbox && Meteor.settings.dropbox.key && Meteor.settings.dropbox.secret && Meteor.settings.dropbox.token) {
    useDropBox = true;                                                                                                //
    Dropbox = Npm.require('dropbox');                                                                                 //
    Request = Npm.require('request');                                                                                 //
    fs = Npm.require('fs');                                                                                           //
    bound = Meteor.bindEnvironment(function(callback) {                                                               //
      return callback();                                                                                              // 25
    });                                                                                                               //
    client = new Dropbox.Client({                                                                                     //
      key: Meteor.settings.dropbox.key,                                                                               //
      secret: Meteor.settings.dropbox.secret,                                                                         //
      token: Meteor.settings.dropbox.token                                                                            //
    });                                                                                                               //
  } else if (Meteor.settings.s3 && Meteor.settings.s3.key && Meteor.settings.s3.secret && Meteor.settings.s3.bucket && Meteor.settings.s3.region && Meteor.settings.s3.cfdomain) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;                                                                     //
    useS3 = true;                                                                                                     //
    knox = Npm.require('knox');                                                                                       //
    Request = Npm.require('request');                                                                                 //
    bound = Meteor.bindEnvironment(function(callback) {                                                               //
      return callback();                                                                                              // 40
    });                                                                                                               //
    client = knox.createClient({                                                                                      //
      key: Meteor.settings.s3.key,                                                                                    //
      secret: Meteor.settings.s3.secret,                                                                              //
      bucket: Meteor.settings.s3.bucket,                                                                              //
      region: Meteor.settings.s3.region                                                                               //
    });                                                                                                               //
    Meteor.settings.s3.cfdomain = Meteor.settings.s3.cfdomain.replace(/\/+$/, '');                                    //
  }                                                                                                                   //
}                                                                                                                     //
                                                                                                                      //
Collections.files = new FilesCollection({                                                                             // 50
  storagePath: 'assets/app/uploads/uploadedFiles',                                                                    //
  collectionName: 'uploadedFiles',                                                                                    //
  allowClientCode: true,                                                                                              //
  "protected": function(fileObj) {                                                                                    //
    var ref4, ref5;                                                                                                   // 58
    if (fileObj) {                                                                                                    //
      if (!((ref4 = fileObj.meta) != null ? ref4.secured : void 0)) {                                                 //
        return true;                                                                                                  // 60
      } else if (((ref5 = fileObj.meta) != null ? ref5.secured : void 0) && this.userId === fileObj.userId) {         //
        return true;                                                                                                  // 62
      }                                                                                                               //
    }                                                                                                                 //
    return false;                                                                                                     // 63
  },                                                                                                                  //
  onBeforeRemove: function(cursor) {                                                                                  //
    var res, self;                                                                                                    // 65
    self = this;                                                                                                      //
    res = cursor.map(function(file) {                                                                                 //
      if ((file != null ? file.userId : void 0) && _.isString(file.userId)) {                                         //
        return file.userId === self.userId;                                                                           // 68
      } else {                                                                                                        //
        return false;                                                                                                 // 70
      }                                                                                                               //
    });                                                                                                               //
    return !~res.indexOf(false);                                                                                      // 71
  },                                                                                                                  //
  onBeforeUpload: function() {                                                                                        //
    if (this.file.size <= 1024 * 1024 * 128) {                                                                        //
      return true;                                                                                                    //
    } else {                                                                                                          //
      return "Max. file size is 128MB you've tried to upload " + (filesize(this.file.size));                          //
    }                                                                                                                 //
  },                                                                                                                  //
  downloadCallback: function(fileObj) {                                                                               //
    var ref4;                                                                                                         // 75
    if (((ref4 = this.params) != null ? ref4.query.download : void 0) === 'true') {                                   //
      Collections.files.collection.update(fileObj._id, {                                                              //
        $inc: {                                                                                                       //
          'meta.downloads': 1                                                                                         //
        }                                                                                                             //
      });                                                                                                             //
    }                                                                                                                 //
    return true;                                                                                                      // 77
  },                                                                                                                  //
  interceptDownload: function(http, fileRef, version) {                                                               //
    var path, ref4, ref5, ref6;                                                                                       // 79
    if (useDropBox || useS3) {                                                                                        //
      path = fileRef != null ? (ref4 = fileRef.versions) != null ? (ref5 = ref4[version]) != null ? (ref6 = ref5.meta) != null ? ref6.pipeFrom : void 0 : void 0 : void 0 : void 0;
      if (path) {                                                                                                     //
        this.serve(http, fileRef, fileRef.versions[version], version, Request({                                       //
          url: path,                                                                                                  //
          headers: _.pick(http.request.headers, 'range', 'accept-language', 'accept', 'cache-control', 'pragma', 'connection', 'upgrade-insecure-requests', 'user-agent')
        }));                                                                                                          //
        return true;                                                                                                  // 97
      } else {                                                                                                        //
        return false;                                                                                                 // 101
      }                                                                                                               //
    } else {                                                                                                          //
      return false;                                                                                                   // 103
    }                                                                                                                 //
  }                                                                                                                   //
});                                                                                                                   //
                                                                                                                      //
if (Meteor.isServer) {                                                                                                // 105
  Collections.files.denyClient();                                                                                     //
  Collections.files.on('afterUpload', function(fileRef) {                                                             //
    var makeUrl, readFile, self, sendToStorage, writeToDB;                                                            // 109
    self = this;                                                                                                      //
    if (useDropBox) {                                                                                                 //
      makeUrl = function(stat, fileRef, version, triesUrl) {                                                          //
        if (triesUrl == null) {                                                                                       //
          triesUrl = 0;                                                                                               //
        }                                                                                                             //
        client.makeUrl(stat.path, {                                                                                   //
          long: true,                                                                                                 //
          downloadHack: true                                                                                          //
        }, function(error, xml) {                                                                                     //
          return bound(function() {                                                                                   //
            var upd;                                                                                                  // 114
            if (error) {                                                                                              //
              if (triesUrl < 10) {                                                                                    //
                Meteor.setTimeout(function() {                                                                        //
                  makeUrl(stat, fileRef, version, ++triesUrl);                                                        //
                }, 2048);                                                                                             //
              } else {                                                                                                //
                console.error(error, {                                                                                //
                  triesUrl: triesUrl                                                                                  //
                });                                                                                                   //
              }                                                                                                       //
            } else if (xml) {                                                                                         //
              upd = {                                                                                                 //
                $set: {}                                                                                              //
              };                                                                                                      //
              upd['$set']["versions." + version + ".meta.pipeFrom"] = xml.url;                                        //
              upd['$set']["versions." + version + ".meta.pipePath"] = stat.path;                                      //
              self.collection.update({                                                                                //
                _id: fileRef._id                                                                                      //
              }, upd, function(error) {                                                                               //
                if (error) {                                                                                          //
                  console.error(error);                                                                               //
                } else {                                                                                              //
                  self.unlink(self.collection.findOne(fileRef._id), version);                                         //
                }                                                                                                     //
              });                                                                                                     //
            } else {                                                                                                  //
              if (triesUrl < 10) {                                                                                    //
                Meteor.setTimeout(function() {                                                                        //
                  makeUrl(stat, fileRef, version, ++triesUrl);                                                        //
                }, 2048);                                                                                             //
              } else {                                                                                                //
                console.error("client.makeUrl doesn't returns xml", {                                                 //
                  triesUrl: triesUrl                                                                                  //
                });                                                                                                   //
              }                                                                                                       //
            }                                                                                                         //
          });                                                                                                         //
        });                                                                                                           //
      };                                                                                                              //
      writeToDB = function(fileRef, version, data, triesSend) {                                                       //
        if (triesSend == null) {                                                                                      //
          triesSend = 0;                                                                                              //
        }                                                                                                             //
        client.writeFile(fileRef._id + "-" + version + "." + fileRef.extension, data, function(error, stat) {         //
          return bound(function() {                                                                                   //
            if (error) {                                                                                              //
              if (triesSend < 10) {                                                                                   //
                Meteor.setTimeout(function() {                                                                        //
                  writeToDB(fileRef, version, data, ++triesSend);                                                     //
                }, 2048);                                                                                             //
              } else {                                                                                                //
                console.error(error, {                                                                                //
                  triesSend: triesSend                                                                                //
                });                                                                                                   //
              }                                                                                                       //
            } else {                                                                                                  //
              makeUrl(stat, fileRef, version);                                                                        //
            }                                                                                                         //
          });                                                                                                         //
        });                                                                                                           //
      };                                                                                                              //
      readFile = function(fileRef, vRef, version, triesRead) {                                                        //
        if (triesRead == null) {                                                                                      //
          triesRead = 0;                                                                                              //
        }                                                                                                             //
        fs.readFile(vRef.path, function(error, data) {                                                                //
          return bound(function() {                                                                                   //
            if (error) {                                                                                              //
              if (triesRead < 10) {                                                                                   //
                readFile(fileRef, vRef, version, ++triesRead);                                                        //
              } else {                                                                                                //
                console.error(error);                                                                                 //
              }                                                                                                       //
            } else {                                                                                                  //
              writeToDB(fileRef, version, data);                                                                      //
            }                                                                                                         //
          });                                                                                                         //
        });                                                                                                           //
      };                                                                                                              //
      sendToStorage = function(fileRef) {                                                                             //
        _.each(fileRef.versions, function(vRef, version) {                                                            //
          readFile(fileRef, vRef, version);                                                                           //
        });                                                                                                           //
      };                                                                                                              //
    } else if (useS3) {                                                                                               //
      sendToStorage = function(fileRef) {                                                                             //
        _.each(fileRef.versions, function(vRef, version) {                                                            //
          var filePath;                                                                                               // 189
          filePath = "files/" + (Random.id()) + "-" + version + "." + fileRef.extension;                              //
          client.putFile(vRef.path, filePath, function(error, res) {                                                  //
            return bound(function() {                                                                                 //
              var upd;                                                                                                // 191
              if (error) {                                                                                            //
                console.error(error);                                                                                 //
              } else {                                                                                                //
                upd = {                                                                                               //
                  $set: {}                                                                                            //
                };                                                                                                    //
                upd['$set']["versions." + version + ".meta.pipeFrom"] = Meteor.settings.s3.cfdomain + '/' + filePath;
                upd['$set']["versions." + version + ".meta.pipePath"] = filePath;                                     //
                self.collection.update({                                                                              //
                  _id: fileRef._id                                                                                    //
                }, upd, function(error) {                                                                             //
                  if (error) {                                                                                        //
                    console.error(error);                                                                             //
                  } else {                                                                                            //
                    self.unlink(self.collection.findOne(fileRef._id), version);                                       //
                  }                                                                                                   //
                });                                                                                                   //
              }                                                                                                       //
            });                                                                                                       //
          });                                                                                                         //
        });                                                                                                           //
      };                                                                                                              //
    }                                                                                                                 //
    if (!!~['png', 'jpg', 'jpeg'].indexOf((fileRef.extension || '').toLowerCase())) {                                 //
      _app.createThumbnails(self, fileRef, function(fileRef) {                                                        //
        if (useDropBox || useS3) {                                                                                    //
          sendToStorage(self.collection.findOne(fileRef._id));                                                        //
        }                                                                                                             //
      });                                                                                                             //
    } else {                                                                                                          //
      if (useDropBox || useS3) {                                                                                      //
        sendToStorage(fileRef);                                                                                       //
      }                                                                                                               //
    }                                                                                                                 //
  });                                                                                                                 //
  if (useDropBox || useS3) {                                                                                          //
    _origRemove = Collections.files.remove;                                                                           //
    Collections.files.remove = function(search) {                                                                     //
      var cursor;                                                                                                     // 227
      cursor = this.collection.find(search);                                                                          //
      cursor.forEach(function(fileRef) {                                                                              //
        _.each(fileRef.versions, function(vRef, version) {                                                            //
          var ref4;                                                                                                   // 230
          if (vRef != null ? (ref4 = vRef.meta) != null ? ref4.pipePath : void 0 : void 0) {                          //
            if (useDropBox) {                                                                                         //
              client.remove(vRef.meta.pipePath, function(error) {                                                     //
                return bound(function() {                                                                             //
                  if (error) {                                                                                        //
                    console.error(error);                                                                             //
                  }                                                                                                   //
                });                                                                                                   //
              });                                                                                                     //
            } else {                                                                                                  //
              client.deleteFile(vRef.meta.pipePath, function(error) {                                                 //
                return bound(function() {                                                                             //
                  if (error) {                                                                                        //
                    console.error(error);                                                                             //
                  }                                                                                                   //
                });                                                                                                   //
              });                                                                                                     //
            }                                                                                                         //
          }                                                                                                           //
        });                                                                                                           //
      });                                                                                                             //
      _origRemove.call(this, search);                                                                                 //
    };                                                                                                                //
  }                                                                                                                   //
  Meteor.setInterval(function() {                                                                                     //
    Collections.files.remove({                                                                                        //
      'meta.expireAt': {                                                                                              //
        $lte: new Date((+(new Date)) + 120000)                                                                        //
      }                                                                                                               //
    }, _app.NOOP);                                                                                                    //
  }, 120000);                                                                                                         //
  Meteor.publish('latest', function(take, userOnly) {                                                                 //
    var selector;                                                                                                     // 262
    if (take == null) {                                                                                               //
      take = 10;                                                                                                      //
    }                                                                                                                 //
    if (userOnly == null) {                                                                                           //
      userOnly = false;                                                                                               //
    }                                                                                                                 //
    check(take, Number);                                                                                              //
    check(userOnly, Boolean);                                                                                         //
    if (userOnly && this.userId) {                                                                                    //
      selector = {                                                                                                    //
        userId: this.userId                                                                                           //
      };                                                                                                              //
    } else {                                                                                                          //
      selector = {                                                                                                    //
        $or: [                                                                                                        //
          {                                                                                                           //
            'meta.unlisted': false,                                                                                   //
            'meta.secured': false,                                                                                    //
            'meta.blamed': {                                                                                          //
              $lt: 3                                                                                                  //
            }                                                                                                         //
          }, {                                                                                                        //
            userId: this.userId                                                                                       //
          }                                                                                                           //
        ]                                                                                                             //
      };                                                                                                              //
    }                                                                                                                 //
    return Collections.files.find(selector, {                                                                         // 276
      limit: take,                                                                                                    //
      sort: {                                                                                                         //
        'meta.created_at': -1                                                                                         //
      },                                                                                                              //
      fields: {                                                                                                       //
        _id: 1,                                                                                                       //
        name: 1,                                                                                                      //
        size: 1,                                                                                                      //
        meta: 1,                                                                                                      //
        type: 1,                                                                                                      //
        isPDF: 1,                                                                                                     //
        isText: 1,                                                                                                    //
        isJSON: 1,                                                                                                    //
        isVideo: 1,                                                                                                   //
        isAudio: 1,                                                                                                   //
        isImage: 1,                                                                                                   //
        userId: 1,                                                                                                    //
        'versions.thumbnail40.extension': 1,                                                                          //
        'versions.preview.extension': 1,                                                                              //
        extension: 1,                                                                                                 //
        _collectionName: 1,                                                                                           //
        _downloadRoute: 1                                                                                             //
      }                                                                                                               //
    }).cursor;                                                                                                        //
  });                                                                                                                 //
  Meteor.publish('file', function(_id) {                                                                              //
    check(_id, String);                                                                                               //
    return Collections.files.find({                                                                                   // 301
      $or: [                                                                                                          //
        {                                                                                                             //
          _id: _id,                                                                                                   //
          'meta.secured': false                                                                                       //
        }, {                                                                                                          //
          _id: _id,                                                                                                   //
          'meta.secured': true,                                                                                       //
          userId: this.userId                                                                                         //
        }                                                                                                             //
      ]                                                                                                               //
    }, {                                                                                                              //
      fields: {                                                                                                       //
        _id: 1,                                                                                                       //
        name: 1,                                                                                                      //
        size: 1,                                                                                                      //
        type: 1,                                                                                                      //
        meta: 1,                                                                                                      //
        isPDF: 1,                                                                                                     //
        isText: 1,                                                                                                    //
        isJSON: 1,                                                                                                    //
        isVideo: 1,                                                                                                   //
        isAudio: 1,                                                                                                   //
        isImage: 1,                                                                                                   //
        extension: 1,                                                                                                 //
        'versions.preview.extension': 1,                                                                              //
        _collectionName: 1,                                                                                           //
        _downloadRoute: 1                                                                                             //
      }                                                                                                               //
    }).cursor;                                                                                                        //
  });                                                                                                                 //
  Meteor.methods({                                                                                                    //
    filesLenght: function(userOnly) {                                                                                 //
      var selector;                                                                                                   // 331
      if (userOnly == null) {                                                                                         //
        userOnly = false;                                                                                             //
      }                                                                                                               //
      check(userOnly, Boolean);                                                                                       //
      if (userOnly && this.userId) {                                                                                  //
        selector = {                                                                                                  //
          userId: this.userId                                                                                         //
        };                                                                                                            //
      } else {                                                                                                        //
        selector = {                                                                                                  //
          $or: [                                                                                                      //
            {                                                                                                         //
              'meta.unlisted': false,                                                                                 //
              'meta.secured': false,                                                                                  //
              'meta.blamed': {                                                                                        //
                $lt: 3                                                                                                //
              }                                                                                                       //
            }, {                                                                                                      //
              userId: this.userId                                                                                     //
            }                                                                                                         //
          ]                                                                                                           //
        };                                                                                                            //
      }                                                                                                               //
      return Collections.files.find(selector).count();                                                                // 344
    },                                                                                                                //
    unblame: function(_id) {                                                                                          //
      check(_id, String);                                                                                             //
      Collections.files.update({                                                                                      //
        _id: _id                                                                                                      //
      }, {                                                                                                            //
        $inc: {                                                                                                       //
          'meta.blamed': -1                                                                                           //
        }                                                                                                             //
      }, _app.NOOP);                                                                                                  //
      return true;                                                                                                    // 349
    },                                                                                                                //
    blame: function(_id) {                                                                                            //
      check(_id, String);                                                                                             //
      Collections.files.update({                                                                                      //
        _id: _id                                                                                                      //
      }, {                                                                                                            //
        $inc: {                                                                                                       //
          'meta.blamed': 1                                                                                            //
        }                                                                                                             //
      }, _app.NOOP);                                                                                                  //
      return true;                                                                                                    // 354
    },                                                                                                                //
    changeAccess: function(_id) {                                                                                     //
      var file;                                                                                                       // 357
      check(_id, String);                                                                                             //
      if (Meteor.userId()) {                                                                                          //
        file = Collections.files.findOne({                                                                            //
          _id: _id,                                                                                                   //
          userId: Meteor.userId()                                                                                     //
        });                                                                                                           //
        if (file) {                                                                                                   //
          Collections.files.update(_id, {                                                                             //
            $set: {                                                                                                   //
              'meta.unlisted': file.meta.unlisted ? false : true                                                      //
            }                                                                                                         //
          }, _app.NOOP);                                                                                              //
          return true;                                                                                                // 362
        }                                                                                                             //
      }                                                                                                               //
      throw new Meteor.Error(401, 'Access denied!');                                                                  // 363
    },                                                                                                                //
    changePrivacy: function(_id) {                                                                                    //
      var file;                                                                                                       // 366
      check(_id, String);                                                                                             //
      if (Meteor.userId()) {                                                                                          //
        file = Collections.files.findOne({                                                                            //
          _id: _id,                                                                                                   //
          userId: Meteor.userId()                                                                                     //
        });                                                                                                           //
        if (file) {                                                                                                   //
          Collections.files.update(_id, {                                                                             //
            $set: {                                                                                                   //
              'meta.unlisted': true,                                                                                  //
              'meta.secured': file.meta.secured ? false : true                                                        //
            }                                                                                                         //
          }, _app.NOOP);                                                                                              //
          return true;                                                                                                // 371
        }                                                                                                             //
      }                                                                                                               //
      throw new Meteor.Error(401, 'Access denied!');                                                                  // 372
    }                                                                                                                 //
  });                                                                                                                 //
}                                                                                                                     //
                                                                                                                      //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}},"server":{"image-processing.coffee.js":function(require){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// server/image-processing.coffee.js                                                                                  //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var bound, fs;                                                                                                        // 1
                                                                                                                      //
bound = Meteor.bindEnvironment(function(callback) {                                                                   // 1
  return callback();                                                                                                  // 1
});                                                                                                                   // 1
                                                                                                                      //
fs = Npm.require('fs-extra');                                                                                         // 2
                                                                                                                      //
_app.createThumbnails = function(collection, fileRef, cb) {                                                           // 4
  var finish, isLast;                                                                                                 // 5
  check(fileRef, Object);                                                                                             //
  isLast = false;                                                                                                     //
  finish = function(error) {                                                                                          //
    return bound(function() {                                                                                         //
      if (error) {                                                                                                    //
        console.error("[_app.createThumbnails] [finish]", error);                                                     //
      } else {                                                                                                        //
        if (isLast) {                                                                                                 //
          cb && cb(fileRef);                                                                                          //
        }                                                                                                             //
      }                                                                                                               //
      return true;                                                                                                    // 14
    });                                                                                                               //
  };                                                                                                                  //
  fs.exists(fileRef.path, function(exists) {                                                                          //
    return bound(function() {                                                                                         //
      var image, sizes;                                                                                               // 17
      if (!exists) {                                                                                                  //
        throw Meteor.log.error("File " + fileRef.path + " not found in [createThumbnails] Method");                   // 17
      }                                                                                                               //
      image = gm(fileRef.path);                                                                                       //
      sizes = {                                                                                                       //
        preview: {                                                                                                    //
          width: 400                                                                                                  //
        },                                                                                                            //
        thumbnail40: {                                                                                                //
          width: 40,                                                                                                  //
          square: true                                                                                                //
        }                                                                                                             //
      };                                                                                                              //
      return image.size(function(error, features) {                                                                   //
        return bound(function() {                                                                                     //
          var i;                                                                                                      // 29
          if (error) {                                                                                                //
            throw new Meteor.Error("[_app.createThumbnails] [_.each sizes]", error);                                  // 29
          }                                                                                                           //
          i = 0;                                                                                                      //
          collection.collection.update(fileRef._id, {                                                                 //
            $set: {                                                                                                   //
              'meta.width': features.width,                                                                           //
              'meta.height': features.height                                                                          //
            }                                                                                                         //
          }, _app.NOOP);                                                                                              //
          return _.each(sizes, function(size, name) {                                                                 //
            var copyPaste, heightNew, heightRatio, img, path, updateAndSave, widthNew, widthRatio, x, y;              // 39
            path = (collection.storagePath(fileRef)) + "/" + name + "-" + fileRef._id + "." + fileRef.extension;      //
            copyPaste = function() {                                                                                  //
              fs.copy(fileRef.path, path, function(error) {                                                           //
                return bound(function() {                                                                             //
                  var upd;                                                                                            // 43
                  if (error) {                                                                                        //
                    console.error("[_app.createThumbnails] [_.each sizes] [fs.copy]", error);                         //
                  } else {                                                                                            //
                    upd = {                                                                                           //
                      $set: {}                                                                                        //
                    };                                                                                                //
                    upd['$set']['versions.' + name] = {                                                               //
                      path: path,                                                                                     //
                      size: fileRef.size,                                                                             //
                      type: fileRef.type,                                                                             //
                      extension: fileRef.extension,                                                                   //
                      meta: {                                                                                         //
                        width: features.width,                                                                        //
                        height: features.height                                                                       //
                      }                                                                                               //
                    };                                                                                                //
                    collection.collection.update(fileRef._id, upd, function(error) {                                  //
                      ++i;                                                                                            //
                      if (i === Object.keys(sizes).length) {                                                          //
                        isLast = true;                                                                                //
                      }                                                                                               //
                      return finish(error);                                                                           //
                    });                                                                                               //
                  }                                                                                                   //
                });                                                                                                   //
              });                                                                                                     //
            };                                                                                                        //
            if (!!~['jpg', 'jpeg', 'png'].indexOf(fileRef.extension.toLowerCase())) {                                 //
              img = gm(fileRef.path).define('filter:support=2').define('jpeg:fancy-upsampling=false').define('jpeg:fancy-upsampling=off').define('png:compression-filter=5').define('png:compression-level=9').define('png:compression-strategy=1').define('png:exclude-chunk=all').noProfile().strip().dither(false).filter('Triangle');
              updateAndSave = function(error) {                                                                       //
                return bound(function() {                                                                             //
                  if (error) {                                                                                        //
                    console.error("[_app.createThumbnails] [_.each sizes] [img.resize]", error);                      //
                  } else {                                                                                            //
                    fs.stat(path, function(err, stat) {                                                               //
                      return bound(function() {                                                                       //
                        gm(path).size(function(error, imgInfo) {                                                      //
                          return bound(function() {                                                                   //
                            var upd;                                                                                  // 71
                            if (error) {                                                                              //
                              console.error("[_app.createThumbnails] [_.each sizes] [img.resize] [fs.stat] [gm(path).size]", error);
                            } else {                                                                                  //
                              upd = {                                                                                 //
                                $set: {}                                                                              //
                              };                                                                                      //
                              upd['$set']['versions.' + name] = {                                                     //
                                path: path,                                                                           //
                                size: stat.size,                                                                      //
                                type: fileRef.type,                                                                   //
                                extension: fileRef.extension,                                                         //
                                meta: {                                                                               //
                                  width: imgInfo.width,                                                               //
                                  height: imgInfo.height                                                              //
                                }                                                                                     //
                              };                                                                                      //
                              collection.collection.update(fileRef._id, upd, function(error) {                        //
                                ++i;                                                                                  //
                                if (i === Object.keys(sizes).length) {                                                //
                                  isLast = true;                                                                      //
                                }                                                                                     //
                                return finish(error);                                                                 //
                              });                                                                                     //
                            }                                                                                         //
                          });                                                                                         //
                        });                                                                                           //
                      });                                                                                             //
                    });                                                                                               //
                  }                                                                                                   //
                });                                                                                                   //
              };                                                                                                      //
              if (!size.square) {                                                                                     //
                if (features.width > size.width) {                                                                    //
                  img.resize(size.width).interlace('Line').write(path, updateAndSave);                                //
                } else {                                                                                              //
                  copyPaste();                                                                                        //
                }                                                                                                     //
              } else {                                                                                                //
                x = 0;                                                                                                //
                y = 0;                                                                                                //
                widthRatio = features.width / size.width;                                                             //
                heightRatio = features.height / size.width;                                                           //
                widthNew = size.width;                                                                                //
                heightNew = size.width;                                                                               //
                if (heightRatio < widthRatio) {                                                                       //
                  widthNew = (size.width * features.width) / features.height;                                         //
                  x = (widthNew - size.width) / 2;                                                                    //
                }                                                                                                     //
                if (heightRatio > widthRatio) {                                                                       //
                  heightNew = (size.width * features.height) / features.width;                                        //
                  y = (heightNew - size.width) / 2;                                                                   //
                }                                                                                                     //
                img.resize(widthNew, heightNew).crop(size.width, size.width, x, y).interlace('Line').write(path, updateAndSave);
              }                                                                                                       //
            } else {                                                                                                  //
              copyPaste();                                                                                            //
            }                                                                                                         //
          });                                                                                                         //
        });                                                                                                           //
      });                                                                                                             //
    });                                                                                                               //
  });                                                                                                                 //
  return true;                                                                                                        // 117
};                                                                                                                    // 4
                                                                                                                      //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"service-configurations.coffee.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// server/service-configurations.coffee.js                                                                            //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
var _sc;                                                                                                              // 1
                                                                                                                      //
_sc = {};                                                                                                             // 1
                                                                                                                      //
ServiceConfiguration.configurations.remove({});                                                                       // 2
                                                                                                                      //
if (process.env['ACCOUNTS_METEOR_ID'] && process.env['ACCOUNTS_METEOR_SEC']) {                                        // 4
  _sc.meteor = true;                                                                                                  //
  ServiceConfiguration.configurations.upsert({                                                                        //
    service: 'meteor-developer'                                                                                       //
  }, {                                                                                                                //
    $set: {                                                                                                           //
      secret: process.env['ACCOUNTS_METEOR_SEC'],                                                                     //
      clientId: process.env['ACCOUNTS_METEOR_ID'],                                                                    //
      loginStyle: 'redirect'                                                                                          //
    }                                                                                                                 //
  });                                                                                                                 //
}                                                                                                                     //
                                                                                                                      //
if (process.env['ACCOUNTS_GITHUB_ID'] && process.env['ACCOUNTS_GITHUB_SEC']) {                                        // 14
  _sc.github = true;                                                                                                  //
  ServiceConfiguration.configurations.upsert({                                                                        //
    service: 'github'                                                                                                 //
  }, {                                                                                                                //
    $set: {                                                                                                           //
      secret: process.env['ACCOUNTS_GITHUB_SEC'],                                                                     //
      clientId: process.env['ACCOUNTS_GITHUB_ID'],                                                                    //
      loginStyle: 'redirect'                                                                                          //
    }                                                                                                                 //
  });                                                                                                                 //
}                                                                                                                     //
                                                                                                                      //
if (process.env['ACCOUNTS_TWITTER_ID'] && process.env['ACCOUNTS_TWITTER_SEC']) {                                      // 24
  _sc.twitter = true;                                                                                                 //
  ServiceConfiguration.configurations.upsert({                                                                        //
    service: 'twitter'                                                                                                //
  }, {                                                                                                                //
    $set: {                                                                                                           //
      loginStyle: 'redirect',                                                                                         //
      secret: process.env['ACCOUNTS_TWITTER_SEC'],                                                                    //
      consumerKey: process.env['ACCOUNTS_TWITTER_ID']                                                                 //
    }                                                                                                                 //
  });                                                                                                                 //
}                                                                                                                     //
                                                                                                                      //
if (process.env['ACCOUNTS_FACEBOOK_ID'] && process.env['ACCOUNTS_FACEBOOK_SEC']) {                                    // 34
  _sc.facebook = true;                                                                                                //
  ServiceConfiguration.configurations.upsert({                                                                        //
    service: 'facebook'                                                                                               //
  }, {                                                                                                                //
    $set: {                                                                                                           //
      secret: process.env['ACCOUNTS_FACEBOOK_SEC'],                                                                   //
      appId: process.env['ACCOUNTS_FACEBOOK_ID'],                                                                     //
      loginStyle: 'redirect'                                                                                          //
    }                                                                                                                 //
  });                                                                                                                 //
}                                                                                                                     //
                                                                                                                      //
Meteor.methods({                                                                                                      // 44
  getServiceConfiguration: function() {                                                                               //
    return _sc;                                                                                                       // 46
  }                                                                                                                   //
});                                                                                                                   //
                                                                                                                      //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

},"spiderable.js":function(){

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                    //
// server/spiderable.js                                                                                               //
//                                                                                                                    //
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                      //
// WebApp.connectHandlers.use(new Spiderable({                                                                        // 1
//   rootURL: 'https://files.veliov.com',                                                                             // 2
//   serviceURL: 'https://render.ostr.io',                                                                            // 3
//   auth: 'xxx:yyy'                                                                                                  // 4
// }));                                                                                                               // 5
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{"extensions":[".js",".json",".coffee"]});
require("./lib/__compatability/__globals.coffee.js");
require("./lib/files.collection.coffee.js");
require("./server/image-processing.coffee.js");
require("./server/service-configurations.coffee.js");
require("./server/spiderable.js");
//# sourceMappingURL=app.js.map
