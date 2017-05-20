var require = meteorInstall({"lib":{"__compatibility":{"__globals.js":["meteor/underscore","meteor/jquery","meteor/meteor","meteor/ostrio:fps-meter","meteor/templating","meteor/ostrio:flow-router-extra","meteor/reactive-var","meteor/ostrio:cstorage",function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// lib/__compatibility/__globals.js                                                                                  //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
module.export({                                                                                                      // 1
  _app: function () {                                                                                                // 1
    return _app;                                                                                                     // 1
  },                                                                                                                 // 1
  Collections: function () {                                                                                         // 1
    return Collections;                                                                                              // 1
  }                                                                                                                  // 1
});                                                                                                                  // 1
                                                                                                                     //
var _ = void 0;                                                                                                      // 1
                                                                                                                     //
module.importSync("meteor/underscore", {                                                                             // 1
  _: function (v) {                                                                                                  // 1
    _ = v;                                                                                                           // 1
  }                                                                                                                  // 1
}, 0);                                                                                                               // 1
var $ = void 0;                                                                                                      // 1
module.importSync("meteor/jquery", {                                                                                 // 1
  $: function (v) {                                                                                                  // 1
    $ = v;                                                                                                           // 1
  }                                                                                                                  // 1
}, 1);                                                                                                               // 1
var Meteor = void 0;                                                                                                 // 1
module.importSync("meteor/meteor", {                                                                                 // 1
  Meteor: function (v) {                                                                                             // 1
    Meteor = v;                                                                                                      // 1
  }                                                                                                                  // 1
}, 2);                                                                                                               // 1
var FPSMeter = void 0;                                                                                               // 1
module.importSync("meteor/ostrio:fps-meter", {                                                                       // 1
  FPSMeter: function (v) {                                                                                           // 1
    FPSMeter = v;                                                                                                    // 1
  }                                                                                                                  // 1
}, 3);                                                                                                               // 1
var Template = void 0;                                                                                               // 1
module.importSync("meteor/templating", {                                                                             // 1
  Template: function (v) {                                                                                           // 1
    Template = v;                                                                                                    // 1
  }                                                                                                                  // 1
}, 4);                                                                                                               // 1
var FlowRouter = void 0;                                                                                             // 1
module.importSync("meteor/ostrio:flow-router-extra", {                                                               // 1
  FlowRouter: function (v) {                                                                                         // 1
    FlowRouter = v;                                                                                                  // 1
  }                                                                                                                  // 1
}, 5);                                                                                                               // 1
var ReactiveVar = void 0;                                                                                            // 1
module.importSync("meteor/reactive-var", {                                                                           // 1
  ReactiveVar: function (v) {                                                                                        // 1
    ReactiveVar = v;                                                                                                 // 1
  }                                                                                                                  // 1
}, 6);                                                                                                               // 1
var ClientStorage = void 0;                                                                                          // 1
module.importSync("meteor/ostrio:cstorage", {                                                                        // 1
  ClientStorage: function (v) {                                                                                      // 1
    ClientStorage = v;                                                                                               // 1
  }                                                                                                                  // 1
}, 7);                                                                                                               // 1
var Collections = {};                                                                                                // 10
var _app = {                                                                                                         // 11
  NOOP: function () {}                                                                                               // 11
};                                                                                                                   // 11
                                                                                                                     //
if (Meteor.isClient) {                                                                                               // 13
  window.IS_RENDERED = false;                                                                                        // 14
                                                                                                                     //
  if (!window.requestAnimFrame) {                                                                                    // 15
    window.requestAnimFrame = function () {                                                                          // 16
      return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || function (callback) {
        window.setTimeout(callback, 1000 / 60);                                                                      // 18
      };                                                                                                             // 19
    }();                                                                                                             // 20
  }                                                                                                                  // 21
                                                                                                                     //
  if (!ClientStorage.has('blamed') || !_.isArray(ClientStorage.get('blamed'))) {                                     // 22
    ClientStorage.set('blamed', []);                                                                                 // 23
  }                                                                                                                  // 24
                                                                                                                     //
  if (!ClientStorage.has('unlist') || !_.isBoolean(ClientStorage.get('unlist'))) {                                   // 25
    ClientStorage.set('unlist', true);                                                                               // 26
  }                                                                                                                  // 27
                                                                                                                     //
  if (!ClientStorage.has('secured') || !_.isBoolean(ClientStorage.get('secured'))) {                                 // 28
    ClientStorage.set('secured', false);                                                                             // 29
  }                                                                                                                  // 30
                                                                                                                     //
  if (!ClientStorage.has('userOnly') || !_.isBoolean(ClientStorage.get('userOnly'))) {                               // 31
    ClientStorage.set('userOnly', false);                                                                            // 32
  }                                                                                                                  // 33
                                                                                                                     //
  var _el = null;                                                                                                    // 35
  $(window).on('dragenter dragover', function (e) {                                                                  // 36
    e.preventDefault();                                                                                              // 37
    e.stopPropagation();                                                                                             // 38
    _el = e.target;                                                                                                  // 39
    var uf = document.getElementById('uploadFile');                                                                  // 40
                                                                                                                     //
    if (!~uf.className.indexOf('file-over')) {                                                                       // 41
      uf.className += ' file-over';                                                                                  // 42
    }                                                                                                                // 43
                                                                                                                     //
    return false;                                                                                                    // 44
  });                                                                                                                // 45
  $(window).on('dragleave', function (e) {                                                                           // 47
    e.preventDefault();                                                                                              // 48
    e.stopPropagation();                                                                                             // 49
                                                                                                                     //
    if (_el === e.target) {                                                                                          // 50
      var uf = document.getElementById('uploadFile');                                                                // 51
                                                                                                                     //
      if (!!~uf.className.indexOf('file-over')) {                                                                    // 52
        uf.className = uf.className.replace(' file-over', '');                                                       // 53
      }                                                                                                              // 54
    }                                                                                                                // 55
                                                                                                                     //
    return false;                                                                                                    // 56
  });                                                                                                                // 57
  $(window).on('drop', function (e) {                                                                                // 59
    e.preventDefault();                                                                                              // 60
    e.stopPropagation();                                                                                             // 61
    var uf = document.getElementById('uploadFile');                                                                  // 62
                                                                                                                     //
    if (!!~uf.className.indexOf('file-over')) {                                                                      // 63
      uf.className = uf.className.replace(' file-over', '');                                                         // 64
    }                                                                                                                // 65
                                                                                                                     //
    return false;                                                                                                    // 66
  });                                                                                                                // 67
  _app.subs = new SubsManager();                                                                                     // 69
  _app.blamed = new ReactiveVar(ClientStorage.get('blamed'));                                                        // 70
  _app.unlist = new ReactiveVar(ClientStorage.get('unlist'));                                                        // 71
  _app.secured = new ReactiveVar(ClientStorage.get('secured'));                                                      // 72
  _app.uploads = new ReactiveVar(false);                                                                             // 73
  _app.userOnly = new ReactiveVar(ClientStorage.get('userOnly'));                                                    // 74
  _app.storeTTL = 86400000;                                                                                          // 75
                                                                                                                     //
  _app.currentUrl = function () {                                                                                    // 76
    return Meteor.absoluteUrl((FlowRouter.current().path || document.location.pathname).replace(/^\//g, '')).split('?')[0].split('#')[0].replace('!', '');
  };                                                                                                                 // 78
                                                                                                                     //
  _app.storeTTLUser = 432000000;                                                                                     // 79
  _app.showProjectInfo = new ReactiveVar(false);                                                                     // 80
  _app.serviceConfiguration = new ReactiveVar({});                                                                   // 81
  Meteor.call('getServiceConfiguration', function (error, serviceConfiguration) {                                    // 83
    if (error) {                                                                                                     // 84
      console.error(error);                                                                                          // 85
    } else {                                                                                                         // 86
      _app.serviceConfiguration.set(serviceConfiguration);                                                           // 87
    }                                                                                                                // 88
  });                                                                                                                // 89
  Meteor.autorun(function () {                                                                                       // 91
    ClientStorage.set('blamed', _app.blamed.get());                                                                  // 92
  });                                                                                                                // 93
  Meteor.autorun(function () {                                                                                       // 95
    ClientStorage.set('unlist', _app.unlist.get());                                                                  // 96
  });                                                                                                                // 97
  Meteor.autorun(function () {                                                                                       // 99
    ClientStorage.set('secured', _app.secured.get());                                                                // 100
  });                                                                                                                // 101
  Meteor.autorun(function () {                                                                                       // 103
    ClientStorage.set('userOnly', _app.userOnly.get());                                                              // 104
  });                                                                                                                // 105
                                                                                                                     //
  if (!ClientStorage.has('uploadTransport')) {                                                                       // 107
    ClientStorage.set('uploadTransport', 'ddp');                                                                     // 108
  }                                                                                                                  // 109
                                                                                                                     //
  Template.registerHelper('urlCurrent', function () {                                                                // 111
    return _app.currentUrl();                                                                                        // 112
  });                                                                                                                // 113
  Template.registerHelper('url', function () {                                                                       // 115
    var string = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : null;                           // 115
    return Meteor.absoluteUrl(string);                                                                               // 116
  });                                                                                                                // 117
  Template.registerHelper('filesize', function () {                                                                  // 119
    var size = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;                                // 119
    return filesize(size);                                                                                           // 120
  });                                                                                                                // 121
  Template.registerHelper('extless', function () {                                                                   // 123
    var filename = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';                           // 123
    var parts = filename.split('.');                                                                                 // 124
                                                                                                                     //
    if (parts.length > 1) {                                                                                          // 125
      parts.pop();                                                                                                   // 126
    }                                                                                                                // 127
                                                                                                                     //
    return parts.join('.');                                                                                          // 128
  });                                                                                                                // 129
  Template.registerHelper('DateToISO', function () {                                                                 // 131
    var time = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;                                // 131
                                                                                                                     //
    if (_.isString(time) || _.isNumber(time)) {                                                                      // 132
      time = new Date(time);                                                                                         // 133
    }                                                                                                                // 134
                                                                                                                     //
    return time.toISOString();                                                                                       // 135
  });                                                                                                                // 136
                                                                                                                     //
  Template._404.onRendered(function () {                                                                             // 138
    window.IS_RENDERED = true;                                                                                       // 139
  });                                                                                                                // 140
                                                                                                                     //
  Template._layout.helpers({                                                                                         // 142
    showProjectInfo: function () {                                                                                   // 143
      return _app.showProjectInfo.get();                                                                             // 144
    }                                                                                                                // 145
  });                                                                                                                // 142
                                                                                                                     //
  Template._layout.events({                                                                                          // 147
    'click [data-show-project-info]': function (e) {                                                                 // 148
      e.preventDefault();                                                                                            // 149
                                                                                                                     //
      _app.showProjectInfo.set(!_app.showProjectInfo.get());                                                         // 150
                                                                                                                     //
      return false;                                                                                                  // 151
    }                                                                                                                // 152
  });                                                                                                                // 147
                                                                                                                     //
  marked.setOptions({                                                                                                // 154
    highlight: function (code) {                                                                                     // 155
      return hljs.highlightAuto(code).value;                                                                         // 156
    },                                                                                                               // 157
    renderer: new marked.Renderer(),                                                                                 // 158
    gfm: true,                                                                                                       // 159
    tables: true,                                                                                                    // 160
    breaks: false,                                                                                                   // 161
    pedantic: false,                                                                                                 // 162
    sanitize: true,                                                                                                  // 163
    smartLists: true,                                                                                                // 164
    smartypants: false                                                                                               // 165
  });                                                                                                                // 154
  Meteor.startup(function () {                                                                                       // 168
    $('html').attr('itemscope', '');                                                                                 // 169
    $('html').attr('itemtype', 'http://schema.org/WebPage');                                                         // 170
    $('html').attr('xmlns:og', 'http://ogp.me/ns#');                                                                 // 171
    $('html').attr('xml:lang', 'en');                                                                                // 172
    $('html').attr('lang', 'en');                                                                                    // 173
    var FPS = new FPSMeter({                                                                                         // 175
      ui: true,                                                                                                      // 176
      reactive: false                                                                                                // 177
    });                                                                                                              // 175
    FPS.start();                                                                                                     // 180
                                                                                                                     //
    var regStop = function () {                                                                                      // 181
      $('#__FPSMeter').click(function () {                                                                           // 182
        if (FPS.isRunning) {                                                                                         // 183
          FPS.isRunning = false;                                                                                     // 184
        } else {                                                                                                     // 185
          FPS.stop();                                                                                                // 186
          window.requestAnimFrame(function () {                                                                      // 187
            FPS.start();                                                                                             // 188
            regStop();                                                                                               // 189
          });                                                                                                        // 190
        }                                                                                                            // 191
      });                                                                                                            // 192
    };                                                                                                               // 193
                                                                                                                     //
    regStop();                                                                                                       // 195
  });                                                                                                                // 196
}                                                                                                                    // 197
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}]},"files.collection.js":["meteor/underscore","meteor/check","meteor/meteor","meteor/random","meteor/ostrio:files","/lib/__compatibility/__globals.js","fs-extra","dropbox","stream","aws-sdk/clients/s3","request","meteor-node-stubs/deps/stream",function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// lib/files.collection.js                                                                                           //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
var _ = void 0;                                                                                                      // 1
                                                                                                                     //
module.importSync("meteor/underscore", {                                                                             // 1
  _: function (v) {                                                                                                  // 1
    _ = v;                                                                                                           // 1
  }                                                                                                                  // 1
}, 0);                                                                                                               // 1
var check = void 0;                                                                                                  // 1
module.importSync("meteor/check", {                                                                                  // 1
  check: function (v) {                                                                                              // 1
    check = v;                                                                                                       // 1
  }                                                                                                                  // 1
}, 1);                                                                                                               // 1
var Meteor = void 0;                                                                                                 // 1
module.importSync("meteor/meteor", {                                                                                 // 1
  Meteor: function (v) {                                                                                             // 1
    Meteor = v;                                                                                                      // 1
  }                                                                                                                  // 1
}, 2);                                                                                                               // 1
var Random = void 0;                                                                                                 // 1
module.importSync("meteor/random", {                                                                                 // 1
  Random: function (v) {                                                                                             // 1
    Random = v;                                                                                                      // 1
  }                                                                                                                  // 1
}, 3);                                                                                                               // 1
var FilesCollection = void 0;                                                                                        // 1
module.importSync("meteor/ostrio:files", {                                                                           // 1
  FilesCollection: function (v) {                                                                                    // 1
    FilesCollection = v;                                                                                             // 1
  }                                                                                                                  // 1
}, 4);                                                                                                               // 1
                                                                                                                     //
var _app = void 0,                                                                                                   // 1
    Collections = void 0;                                                                                            // 1
                                                                                                                     //
module.importSync("/lib/__compatibility/__globals.js", {                                                             // 1
  _app: function (v) {                                                                                               // 1
    _app = v;                                                                                                        // 1
  },                                                                                                                 // 1
  Collections: function (v) {                                                                                        // 1
    Collections = v;                                                                                                 // 1
  }                                                                                                                  // 1
}, 5);                                                                                                               // 1
// DropBox usage:                                                                                                    // 8
// Read: https://github.com/VeliovGroup/Meteor-Files/wiki/DropBox-Integration                                        // 9
// env.var example: DROPBOX='{"dropbox":{"key": "xxx", "secret": "xxx", "token": "xxx"}}'                            // 10
var useDropBox = false; // AWS:S3 usage:                                                                             // 11
// Read: https://github.com/VeliovGroup/Meteor-Files/wiki/AWS-S3-Integration                                         // 14
// env.var example: S3='{"s3":{"key": "xxx", "secret": "xxx", "bucket": "xxx", "region": "xxx""}}'                   // 15
                                                                                                                     //
var useS3 = false;                                                                                                   // 16
var request = void 0,                                                                                                // 17
    bound = void 0,                                                                                                  // 17
    fs = void 0,                                                                                                     // 17
    client = void 0,                                                                                                 // 17
    sendToStorage = void 0,                                                                                          // 17
    s3Conf = void 0,                                                                                                 // 17
    dbConf = void 0,                                                                                                 // 17
    stream = void 0;                                                                                                 // 17
                                                                                                                     //
if (Meteor.isServer) {                                                                                               // 19
  fs = require('fs-extra');                                                                                          // 20
                                                                                                                     //
  if (process.env.DROPBOX) {                                                                                         // 22
    Meteor.settings.dropbox = JSON.parse(process.env.DROPBOX).dropbox;                                               // 23
  } else if (process.env.S3) {                                                                                       // 24
    Meteor.settings.s3 = JSON.parse(process.env.S3).s3;                                                              // 25
  }                                                                                                                  // 26
                                                                                                                     //
  s3Conf = Meteor.settings.s3 || {};                                                                                 // 28
  dbConf = Meteor.settings.dropbox || {};                                                                            // 29
                                                                                                                     //
  if (dbConf && dbConf.key && dbConf.secret && dbConf.token) {                                                       // 31
    useDropBox = true;                                                                                               // 32
                                                                                                                     //
    var Dropbox = require('dropbox');                                                                                // 33
                                                                                                                     //
    client = new Dropbox.Client({                                                                                    // 35
      key: dbConf.key,                                                                                               // 36
      secret: dbConf.secret,                                                                                         // 37
      token: dbConf.token                                                                                            // 38
    });                                                                                                              // 35
  } else if (s3Conf && s3Conf.key && s3Conf.secret && s3Conf.bucket && s3Conf.region) {                              // 40
    useS3 = true;                                                                                                    // 41
    stream = require('stream');                                                                                      // 42
                                                                                                                     //
    var S3 = require('aws-sdk/clients/s3');                                                                          // 43
                                                                                                                     //
    client = new S3({                                                                                                // 45
      secretAccessKey: s3Conf.secret,                                                                                // 46
      accessKeyId: s3Conf.key,                                                                                       // 47
      region: s3Conf.region,                                                                                         // 48
      sslEnabled: false,                                                                                             // 49
      httpOptions: {                                                                                                 // 50
        timeout: 6000,                                                                                               // 51
        agent: false                                                                                                 // 52
      }                                                                                                              // 50
    });                                                                                                              // 45
  }                                                                                                                  // 55
                                                                                                                     //
  if (useS3 || useDropBox) {                                                                                         // 57
    request = require('request');                                                                                    // 58
    bound = Meteor.bindEnvironment(function (callback) {                                                             // 59
      return callback();                                                                                             // 60
    });                                                                                                              // 61
  }                                                                                                                  // 62
}                                                                                                                    // 63
                                                                                                                     //
Collections.files = new FilesCollection({                                                                            // 65
  // debug: true,                                                                                                    // 66
  // throttle: false,                                                                                                // 67
  chunkSize: 1024 * 768,                                                                                             // 68
  storagePath: 'assets/app/uploads/uploadedFiles',                                                                   // 69
  collectionName: 'uploadedFiles',                                                                                   // 70
  allowClientCode: true,                                                                                             // 71
  "protected": function (fileObj) {                                                                                  // 65
    if (fileObj) {                                                                                                   // 73
      if (!(fileObj.meta && fileObj.meta.secured)) {                                                                 // 74
        return true;                                                                                                 // 75
      } else if (fileObj.meta && fileObj.meta.secured === true && this.userId === fileObj.userId) {                  // 76
        return true;                                                                                                 // 77
      }                                                                                                              // 78
    }                                                                                                                // 79
                                                                                                                     //
    return false;                                                                                                    // 80
  },                                                                                                                 // 81
  onBeforeRemove: function (cursor) {                                                                                // 82
    var _this = this;                                                                                                // 82
                                                                                                                     //
    var res = cursor.map(function (file) {                                                                           // 83
      if (file && file.userId && _.isString(file.userId)) {                                                          // 84
        return file.userId === _this.userId;                                                                         // 85
      }                                                                                                              // 86
                                                                                                                     //
      return false;                                                                                                  // 87
    });                                                                                                              // 88
    return !~res.indexOf(false);                                                                                     // 89
  },                                                                                                                 // 90
  onBeforeUpload: function () {                                                                                      // 91
    if (this.file.size <= 1024 * 1024 * 128) {                                                                       // 92
      return true;                                                                                                   // 93
    }                                                                                                                // 94
                                                                                                                     //
    return "Max. file size is 128MB you've tried to upload " + filesize(this.file.size);                             // 95
  },                                                                                                                 // 96
  downloadCallback: function (fileObj) {                                                                             // 97
    if (this.params && this.params.query && this.params.query.download === 'true') {                                 // 98
      Collections.files.collection.update(fileObj._id, {                                                             // 99
        $inc: {                                                                                                      // 100
          'meta.downloads': 1                                                                                        // 101
        }                                                                                                            // 100
      }, _app.NOOP);                                                                                                 // 99
    }                                                                                                                // 104
                                                                                                                     //
    return true;                                                                                                     // 105
  },                                                                                                                 // 106
  interceptDownload: function (http, fileRef, version) {                                                             // 107
    var path = void 0;                                                                                               // 108
                                                                                                                     //
    if (useDropBox) {                                                                                                // 109
      path = fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipeFrom ? fileRef.versions[version].meta.pipeFrom : void 0;
                                                                                                                     //
      if (path) {                                                                                                    // 111
        // If file is successfully moved to Storage                                                                  // 112
        // We will pipe request to Storage                                                                           // 113
        // So, original link will stay always secure                                                                 // 114
        // To force ?play and ?download parameters                                                                   // 116
        // and to keep original file name, content-type,                                                             // 117
        // content-disposition and cache-control                                                                     // 118
        // we're using low-level .serve() method                                                                     // 119
        this.serve(http, fileRef, fileRef.versions[version], version, request({                                      // 120
          url: path,                                                                                                 // 121
          headers: _.pick(http.request.headers, 'range', 'cache-control', 'connection')                              // 122
        }));                                                                                                         // 120
        return true;                                                                                                 // 124
      } // While file is not yet uploaded to Storage                                                                 // 125
      // We will serve file from FS                                                                                  // 127
                                                                                                                     //
                                                                                                                     //
      return false;                                                                                                  // 128
    } else if (useS3) {                                                                                              // 129
      path = fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipePath ? fileRef.versions[version].meta.pipePath : void 0;
                                                                                                                     //
      if (path) {                                                                                                    // 131
        // If file is successfully moved to Storage                                                                  // 132
        // We will pipe request to Storage                                                                           // 133
        // So, original link will stay always secure                                                                 // 134
        // To force ?play and ?download parameters                                                                   // 136
        // and to keep original file name, content-type,                                                             // 137
        // content-disposition and cache-control                                                                     // 138
        // we're using low-level .serve() method                                                                     // 139
        var opts = {                                                                                                 // 140
          Bucket: s3Conf.bucket,                                                                                     // 141
          Key: path                                                                                                  // 142
        };                                                                                                           // 140
                                                                                                                     //
        if (http.request.headers.range) {                                                                            // 145
          var vRef = fileRef.versions[version];                                                                      // 146
                                                                                                                     //
          var range = _.clone(http.request.headers.range);                                                           // 147
                                                                                                                     //
          var array = range.split(/bytes=([0-9]*)-([0-9]*)/);                                                        // 148
          var start = parseInt(array[1]);                                                                            // 149
          var end = parseInt(array[2]);                                                                              // 150
                                                                                                                     //
          if (isNaN(end)) {                                                                                          // 151
            // Request data from AWS:S3 by small chunks                                                              // 152
            end = start + this.chunkSize - 1;                                                                        // 153
                                                                                                                     //
            if (end >= vRef.size) {                                                                                  // 154
              end = vRef.size - 1;                                                                                   // 155
            }                                                                                                        // 156
          }                                                                                                          // 157
                                                                                                                     //
          opts.Range = "bytes=" + start + "-" + end;                                                                 // 158
          http.request.headers.range = "bytes=" + start + "-" + end;                                                 // 159
        }                                                                                                            // 160
                                                                                                                     //
        var fileColl = this;                                                                                         // 162
        client.getObject(opts, function (error) {                                                                    // 163
          if (error) {                                                                                               // 164
            console.error(error);                                                                                    // 165
                                                                                                                     //
            if (!http.response.finished) {                                                                           // 166
              http.response.end();                                                                                   // 167
            }                                                                                                        // 168
          } else {                                                                                                   // 169
            if (http.request.headers.range && this.httpResponse.headers['content-range']) {                          // 170
              // Set proper range header in according to what is returned from AWS:S3                                // 171
              http.request.headers.range = this.httpResponse.headers['content-range'].split('/')[0].replace('bytes ', 'bytes=');
            }                                                                                                        // 173
                                                                                                                     //
            var dataStream = new stream.PassThrough();                                                               // 175
            fileColl.serve(http, fileRef, fileRef.versions[version], version, dataStream);                           // 176
            dataStream.end(this.data.Body);                                                                          // 177
          }                                                                                                          // 178
        });                                                                                                          // 179
        return true;                                                                                                 // 181
      } // While file is not yet uploaded to Storage                                                                 // 182
      // We will serve file from FS                                                                                  // 184
                                                                                                                     //
                                                                                                                     //
      return false;                                                                                                  // 185
    }                                                                                                                // 186
                                                                                                                     //
    return false;                                                                                                    // 187
  }                                                                                                                  // 188
});                                                                                                                  // 65
                                                                                                                     //
if (Meteor.isServer) {                                                                                               // 191
  Collections.files.denyClient();                                                                                    // 192
  Collections.files.on('afterUpload', function (fileRef) {                                                           // 193
    var _this2 = this;                                                                                               // 193
                                                                                                                     //
    if (useDropBox) {                                                                                                // 194
      var makeUrl = function (stat, fileRef, version) {                                                              // 195
        var triesUrl = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;                        // 195
        client.makeUrl(stat.path, {                                                                                  // 196
          long: true,                                                                                                // 197
          downloadHack: true                                                                                         // 198
        }, function (error, xml) {                                                                                   // 196
          bound(function () {                                                                                        // 200
            // Store downloadable link in file's meta object                                                         // 201
            if (error) {                                                                                             // 202
              if (triesUrl < 10) {                                                                                   // 203
                Meteor.setTimeout(function () {                                                                      // 204
                  makeUrl(stat, fileRef, version, ++triesUrl);                                                       // 205
                }, 2048);                                                                                            // 206
              } else {                                                                                               // 207
                console.error(error, {                                                                               // 208
                  triesUrl: triesUrl                                                                                 // 209
                });                                                                                                  // 208
              }                                                                                                      // 211
            } else if (xml) {                                                                                        // 212
              var upd = {                                                                                            // 213
                $set: {}                                                                                             // 213
              };                                                                                                     // 213
              upd['$set']['versions.' + version + '.meta.pipeFrom'] = xml.url;                                       // 214
              upd['$set']['versions.' + version + '.meta.pipePath'] = stat.path;                                     // 215
                                                                                                                     //
              _this2.collection.update({                                                                             // 216
                _id: fileRef._id                                                                                     // 217
              }, upd, function (updError) {                                                                          // 216
                if (updError) {                                                                                      // 219
                  console.error(updError);                                                                           // 220
                } else {                                                                                             // 221
                  // Unlink original files from FS                                                                   // 222
                  // after successful upload to DropBox                                                              // 223
                  _this2.unlink(_this2.collection.findOne(fileRef._id), version);                                    // 224
                }                                                                                                    // 225
              });                                                                                                    // 226
            } else {                                                                                                 // 227
              if (triesUrl < 10) {                                                                                   // 228
                Meteor.setTimeout(function () {                                                                      // 229
                  // Generate downloadable link                                                                      // 230
                  makeUrl(stat, fileRef, version, ++triesUrl);                                                       // 231
                }, 2048);                                                                                            // 232
              } else {                                                                                               // 233
                console.error("client.makeUrl doesn't returns xml", {                                                // 234
                  triesUrl: triesUrl                                                                                 // 235
                });                                                                                                  // 234
              }                                                                                                      // 237
            }                                                                                                        // 238
          });                                                                                                        // 239
        });                                                                                                          // 240
      };                                                                                                             // 241
                                                                                                                     //
      var writeToDB = function (fileRef, version, data) {                                                            // 243
        var triesSend = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;                       // 243
        // DropBox already uses random URLs                                                                          // 244
        // No need to use random file names                                                                          // 245
        client.writeFile(fileRef._id + '-' + version + '.' + fileRef.extension, data, function (error, stat) {       // 246
          bound(function () {                                                                                        // 247
            if (error) {                                                                                             // 248
              if (triesSend < 10) {                                                                                  // 249
                Meteor.setTimeout(function () {                                                                      // 250
                  // Write file to DropBox                                                                           // 251
                  writeToDB(fileRef, version, data, ++triesSend);                                                    // 252
                }, 2048);                                                                                            // 253
              } else {                                                                                               // 254
                console.error(error, {                                                                               // 255
                  triesSend: triesSend                                                                               // 256
                });                                                                                                  // 255
              }                                                                                                      // 258
            } else {                                                                                                 // 259
              makeUrl(stat, fileRef, version);                                                                       // 260
            }                                                                                                        // 261
          });                                                                                                        // 262
        });                                                                                                          // 263
      };                                                                                                             // 264
                                                                                                                     //
      var readFile = function (fileRef, vRef, version) {                                                             // 266
        var triesRead = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;                       // 266
        fs.readFile(vRef.path, function (error, data) {                                                              // 267
          bound(function () {                                                                                        // 268
            if (error) {                                                                                             // 269
              if (triesRead < 10) {                                                                                  // 270
                readFile(fileRef, vRef, version, ++triesRead);                                                       // 271
              } else {                                                                                               // 272
                console.error(error);                                                                                // 273
              }                                                                                                      // 274
            } else {                                                                                                 // 275
              writeToDB(fileRef, version, data);                                                                     // 276
            }                                                                                                        // 277
          });                                                                                                        // 278
        });                                                                                                          // 279
      };                                                                                                             // 280
                                                                                                                     //
      sendToStorage = function (fileRef) {                                                                           // 282
        _.each(fileRef.versions, function (vRef, version) {                                                          // 283
          readFile(fileRef, vRef, version);                                                                          // 284
        });                                                                                                          // 285
      };                                                                                                             // 286
    } else if (useS3) {                                                                                              // 287
      sendToStorage = function (fileRef) {                                                                           // 288
        _.each(fileRef.versions, function (vRef, version) {                                                          // 289
          // We use Random.id() instead of real file's _id                                                           // 290
          // to secure files from reverse engineering                                                                // 291
          // As after viewing this code it will be easy                                                              // 292
          // to get access to unlisted and protected files                                                           // 293
          var filePath = 'files/' + Random.id() + '-' + version + '.' + fileRef.extension;                           // 294
          client.putObject({                                                                                         // 296
            StorageClass: 'STANDARD',                                                                                // 297
            Bucket: s3Conf.bucket,                                                                                   // 298
            Key: filePath,                                                                                           // 299
            Body: fs.createReadStream(vRef.path),                                                                    // 300
            ContentType: vRef.type                                                                                   // 301
          }, function (error) {                                                                                      // 296
            bound(function () {                                                                                      // 303
              if (error) {                                                                                           // 304
                console.error(error);                                                                                // 305
              } else {                                                                                               // 306
                var upd = {                                                                                          // 307
                  $set: {}                                                                                           // 307
                };                                                                                                   // 307
                upd['$set']['versions.' + version + '.meta.pipePath'] = filePath;                                    // 308
                                                                                                                     //
                _this2.collection.update({                                                                           // 309
                  _id: fileRef._id                                                                                   // 310
                }, upd, function (updError) {                                                                        // 309
                  if (updError) {                                                                                    // 312
                    console.error(updError);                                                                         // 313
                  } else {                                                                                           // 314
                    // Unlink original file from FS                                                                  // 315
                    // after successful upload to AWS:S3                                                             // 316
                    _this2.unlink(_this2.collection.findOne(fileRef._id), version);                                  // 317
                  }                                                                                                  // 318
                });                                                                                                  // 319
              }                                                                                                      // 320
            });                                                                                                      // 321
          });                                                                                                        // 322
        });                                                                                                          // 323
      };                                                                                                             // 324
    }                                                                                                                // 325
                                                                                                                     //
    if (/png|jpe?g/i.test(fileRef.extension || '')) {                                                                // 327
      _app.createThumbnails(this, fileRef, function (error, fileRef) {                                               // 328
        if (error) {                                                                                                 // 329
          console.error(error);                                                                                      // 330
        }                                                                                                            // 331
                                                                                                                     //
        if (useDropBox || useS3) {                                                                                   // 332
          sendToStorage(_this2.collection.findOne(fileRef._id));                                                     // 333
        }                                                                                                            // 334
      });                                                                                                            // 335
    } else {                                                                                                         // 336
      if (useDropBox || useS3) {                                                                                     // 337
        sendToStorage(fileRef);                                                                                      // 338
      }                                                                                                              // 339
    }                                                                                                                // 340
  }); // This line now commented due to Heroku usage                                                                 // 341
  // Collections.files.collection._ensureIndex {'meta.expireAt': 1}, {expireAfterSeconds: 0, background: true}       // 344
  // Intercept FileCollection's remove method                                                                        // 346
  // to remove file from DropBox or AWS S3                                                                           // 347
                                                                                                                     //
  if (useDropBox || useS3) {                                                                                         // 348
    var _origRemove = Collections.files.remove;                                                                      // 349
                                                                                                                     //
    Collections.files.remove = function (search) {                                                                   // 350
      var cursor = this.collection.find(search);                                                                     // 351
      cursor.forEach(function (fileRef) {                                                                            // 352
        _.each(fileRef.versions, function (vRef) {                                                                   // 353
          if (vRef && vRef.meta && vRef.meta.pipePath != null) {                                                     // 354
            if (useDropBox) {                                                                                        // 355
              // DropBox usage:                                                                                      // 356
              client.remove(vRef.meta.pipePath, function (error) {                                                   // 357
                bound(function () {                                                                                  // 358
                  if (error) {                                                                                       // 359
                    console.error(error);                                                                            // 360
                  }                                                                                                  // 361
                });                                                                                                  // 362
              });                                                                                                    // 363
            } else {                                                                                                 // 364
              // AWS:S3 usage:                                                                                       // 365
              client.deleteObject({                                                                                  // 366
                Bucket: s3Conf.bucket,                                                                               // 367
                Key: vRef.meta.pipePath                                                                              // 368
              }, function (error) {                                                                                  // 366
                bound(function () {                                                                                  // 370
                  if (error) {                                                                                       // 371
                    console.error(error);                                                                            // 372
                  }                                                                                                  // 373
                });                                                                                                  // 374
              });                                                                                                    // 375
            }                                                                                                        // 376
          }                                                                                                          // 377
        });                                                                                                          // 378
      }); // Call original method                                                                                    // 379
                                                                                                                     //
      _origRemove.call(this, search);                                                                                // 381
    };                                                                                                               // 382
  } // Remove all files on server load/reload, useful while testing/development                                      // 383
  // Meteor.startup -> Collections.files.remove {}                                                                   // 386
  // Remove files along with MongoDB records two minutes before expiration date                                      // 388
  // If we have 'expireAfterSeconds' index on 'meta.expireAt' field,                                                 // 389
  // it won't remove files themselves.                                                                               // 390
                                                                                                                     //
                                                                                                                     //
  Meteor.setInterval(function () {                                                                                   // 391
    Collections.files.remove({                                                                                       // 392
      'meta.expireAt': {                                                                                             // 393
        $lte: new Date(+new Date() + 120000)                                                                         // 394
      }                                                                                                              // 393
    }, _app.NOOP);                                                                                                   // 392
  }, 120000);                                                                                                        // 397
  Meteor.publish('latest', function () {                                                                             // 399
    var take = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;                               // 399
    var userOnly = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;                        // 399
    check(take, Number);                                                                                             // 400
    check(userOnly, Boolean);                                                                                        // 401
    var selector = void 0;                                                                                           // 403
                                                                                                                     //
    if (userOnly && this.userId) {                                                                                   // 404
      selector = {                                                                                                   // 405
        userId: this.userId                                                                                          // 406
      };                                                                                                             // 405
    } else {                                                                                                         // 408
      selector = {                                                                                                   // 409
        $or: [{                                                                                                      // 410
          'meta.unlisted': false,                                                                                    // 412
          'meta.secured': false,                                                                                     // 413
          'meta.blamed': {                                                                                           // 414
            $lt: 3                                                                                                   // 415
          }                                                                                                          // 414
        }, {                                                                                                         // 411
          userId: this.userId                                                                                        // 418
        }]                                                                                                           // 417
      };                                                                                                             // 409
    }                                                                                                                // 422
                                                                                                                     //
    return Collections.files.find(selector, {                                                                        // 424
      limit: take,                                                                                                   // 425
      sort: {                                                                                                        // 426
        'meta.created_at': -1                                                                                        // 427
      },                                                                                                             // 426
      fields: {                                                                                                      // 429
        _id: 1,                                                                                                      // 430
        name: 1,                                                                                                     // 431
        size: 1,                                                                                                     // 432
        meta: 1,                                                                                                     // 433
        type: 1,                                                                                                     // 434
        isPDF: 1,                                                                                                    // 435
        isText: 1,                                                                                                   // 436
        isJSON: 1,                                                                                                   // 437
        isVideo: 1,                                                                                                  // 438
        isAudio: 1,                                                                                                  // 439
        isImage: 1,                                                                                                  // 440
        userId: 1,                                                                                                   // 441
        'versions.thumbnail40.extension': 1,                                                                         // 442
        'versions.preview.extension': 1,                                                                             // 443
        extension: 1,                                                                                                // 444
        _collectionName: 1,                                                                                          // 445
        _downloadRoute: 1                                                                                            // 446
      }                                                                                                              // 429
    }).cursor;                                                                                                       // 424
  });                                                                                                                // 449
  Meteor.publish('file', function (_id) {                                                                            // 451
    check(_id, String);                                                                                              // 452
    return Collections.files.find({                                                                                  // 453
      $or: [{                                                                                                        // 454
        _id: _id,                                                                                                    // 456
        'meta.secured': false                                                                                        // 457
      }, {                                                                                                           // 455
        _id: _id,                                                                                                    // 459
        'meta.secured': true,                                                                                        // 460
        userId: this.userId                                                                                          // 461
      }]                                                                                                             // 458
    }, {                                                                                                             // 453
      fields: {                                                                                                      // 465
        _id: 1,                                                                                                      // 466
        name: 1,                                                                                                     // 467
        size: 1,                                                                                                     // 468
        type: 1,                                                                                                     // 469
        meta: 1,                                                                                                     // 470
        isPDF: 1,                                                                                                    // 471
        isText: 1,                                                                                                   // 472
        isJSON: 1,                                                                                                   // 473
        isVideo: 1,                                                                                                  // 474
        isAudio: 1,                                                                                                  // 475
        isImage: 1,                                                                                                  // 476
        extension: 1,                                                                                                // 477
        'versions.preview.extension': 1,                                                                             // 478
        _collectionName: 1,                                                                                          // 479
        _downloadRoute: 1                                                                                            // 480
      }                                                                                                              // 465
    }).cursor;                                                                                                       // 464
  });                                                                                                                // 483
  Meteor.methods({                                                                                                   // 485
    filesLenght: function () {                                                                                       // 486
      var userOnly = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;                      // 486
      check(userOnly, Boolean);                                                                                      // 487
      var selector = void 0;                                                                                         // 489
                                                                                                                     //
      if (userOnly && this.userId) {                                                                                 // 490
        selector = {                                                                                                 // 491
          userId: this.userId                                                                                        // 492
        };                                                                                                           // 491
      } else {                                                                                                       // 494
        selector = {                                                                                                 // 495
          $or: [{                                                                                                    // 496
            'meta.unlisted': false,                                                                                  // 498
            'meta.secured': false,                                                                                   // 499
            'meta.blamed': {                                                                                         // 500
              $lt: 3                                                                                                 // 501
            }                                                                                                        // 500
          }, {                                                                                                       // 497
            userId: this.userId                                                                                      // 504
          }]                                                                                                         // 503
        };                                                                                                           // 495
      }                                                                                                              // 508
                                                                                                                     //
      return Collections.files.find(selector).count();                                                               // 509
    },                                                                                                               // 510
    unblame: function (_id) {                                                                                        // 511
      check(_id, String);                                                                                            // 512
      Collections.files.update({                                                                                     // 513
        _id: _id                                                                                                     // 514
      }, {                                                                                                           // 513
        $inc: {                                                                                                      // 516
          'meta.blamed': -1                                                                                          // 517
        }                                                                                                            // 516
      }, _app.NOOP);                                                                                                 // 515
      return true;                                                                                                   // 520
    },                                                                                                               // 521
    blame: function (_id) {                                                                                          // 522
      check(_id, String);                                                                                            // 523
      Collections.files.update({                                                                                     // 524
        _id: _id                                                                                                     // 525
      }, {                                                                                                           // 524
        $inc: {                                                                                                      // 527
          'meta.blamed': 1                                                                                           // 528
        }                                                                                                            // 527
      }, _app.NOOP);                                                                                                 // 526
      return true;                                                                                                   // 531
    },                                                                                                               // 532
    changeAccess: function (_id) {                                                                                   // 533
      check(_id, String);                                                                                            // 534
                                                                                                                     //
      if (Meteor.userId()) {                                                                                         // 535
        var file = Collections.files.findOne({                                                                       // 536
          _id: _id,                                                                                                  // 537
          userId: Meteor.userId()                                                                                    // 538
        });                                                                                                          // 536
                                                                                                                     //
        if (file) {                                                                                                  // 541
          Collections.files.update(_id, {                                                                            // 542
            $set: {                                                                                                  // 543
              'meta.unlisted': file.meta.unlisted ? false : true                                                     // 544
            }                                                                                                        // 543
          }, _app.NOOP);                                                                                             // 542
          return true;                                                                                               // 547
        }                                                                                                            // 548
      }                                                                                                              // 549
                                                                                                                     //
      throw new Meteor.Error(401, 'Access denied!');                                                                 // 550
    },                                                                                                               // 551
    changePrivacy: function (_id) {                                                                                  // 552
      check(_id, String);                                                                                            // 553
                                                                                                                     //
      if (Meteor.userId()) {                                                                                         // 554
        var file = Collections.files.findOne({                                                                       // 555
          _id: _id,                                                                                                  // 556
          userId: Meteor.userId()                                                                                    // 557
        });                                                                                                          // 555
                                                                                                                     //
        if (file) {                                                                                                  // 560
          Collections.files.update(_id, {                                                                            // 561
            $set: {                                                                                                  // 562
              'meta.unlisted': true,                                                                                 // 563
              'meta.secured': file.meta.secured ? false : true                                                       // 564
            }                                                                                                        // 562
          }, _app.NOOP);                                                                                             // 561
          return true;                                                                                               // 567
        }                                                                                                            // 568
      }                                                                                                              // 569
                                                                                                                     //
      throw new Meteor.Error(401, 'Access denied!');                                                                 // 570
    }                                                                                                                // 571
  });                                                                                                                // 485
}                                                                                                                    // 573
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}]},"server":{"image-processing.js":["meteor/underscore","/lib/__compatibility/__globals.js","meteor/check","meteor/meteor","fs-extra","gm",function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// server/image-processing.js                                                                                        //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
var _ = void 0;                                                                                                      // 1
                                                                                                                     //
module.importSync("meteor/underscore", {                                                                             // 1
  _: function (v) {                                                                                                  // 1
    _ = v;                                                                                                           // 1
  }                                                                                                                  // 1
}, 0);                                                                                                               // 1
                                                                                                                     //
var _app = void 0;                                                                                                   // 1
                                                                                                                     //
module.importSync("/lib/__compatibility/__globals.js", {                                                             // 1
  _app: function (v) {                                                                                               // 1
    _app = v;                                                                                                        // 1
  }                                                                                                                  // 1
}, 1);                                                                                                               // 1
var check = void 0;                                                                                                  // 1
module.importSync("meteor/check", {                                                                                  // 1
  check: function (v) {                                                                                              // 1
    check = v;                                                                                                       // 1
  }                                                                                                                  // 1
}, 2);                                                                                                               // 1
var Meteor = void 0;                                                                                                 // 1
module.importSync("meteor/meteor", {                                                                                 // 1
  Meteor: function (v) {                                                                                             // 1
    Meteor = v;                                                                                                      // 1
  }                                                                                                                  // 1
}, 3);                                                                                                               // 1
var fs = void 0;                                                                                                     // 1
module.importSync("fs-extra", {                                                                                      // 1
  "default": function (v) {                                                                                          // 1
    fs = v;                                                                                                          // 1
  }                                                                                                                  // 1
}, 4);                                                                                                               // 1
var gm = void 0;                                                                                                     // 1
module.importSync("gm", {                                                                                            // 1
  "default": function (v) {                                                                                          // 1
    gm = v;                                                                                                          // 1
  }                                                                                                                  // 1
}, 5);                                                                                                               // 1
var bound = Meteor.bindEnvironment(function (callback) {                                                             // 9
  return callback();                                                                                                 // 10
});                                                                                                                  // 11
                                                                                                                     //
_app.createThumbnails = function (collection, fileRef, cb) {                                                         // 13
  check(fileRef, Object);                                                                                            // 14
  var isLast = false;                                                                                                // 16
                                                                                                                     //
  var finish = function (error) {                                                                                    // 17
    bound(function () {                                                                                              // 18
      if (error) {                                                                                                   // 19
        console.error('[_app.createThumbnails] [finish]', error);                                                    // 20
        cb && cb(error);                                                                                             // 21
      } else {                                                                                                       // 22
        if (isLast) {                                                                                                // 23
          cb && cb(void 0, fileRef);                                                                                 // 24
        }                                                                                                            // 25
      }                                                                                                              // 26
                                                                                                                     //
      return true;                                                                                                   // 27
    });                                                                                                              // 28
  };                                                                                                                 // 29
                                                                                                                     //
  fs.exists(fileRef.path, function (exists) {                                                                        // 31
    bound(function () {                                                                                              // 32
      if (!exists) {                                                                                                 // 33
        throw Meteor.log.error('File ' + fileRef.path + ' not found in [createThumbnails] Method');                  // 34
      }                                                                                                              // 35
                                                                                                                     //
      var image = gm(fileRef.path);                                                                                  // 36
      var sizes = {                                                                                                  // 37
        preview: {                                                                                                   // 38
          width: 400                                                                                                 // 39
        },                                                                                                           // 38
        thumbnail40: {                                                                                               // 41
          width: 40,                                                                                                 // 42
          square: true                                                                                               // 43
        }                                                                                                            // 41
      };                                                                                                             // 37
      image.size(function (error, features) {                                                                        // 47
        bound(function () {                                                                                          // 48
          if (error) {                                                                                               // 49
            console.error('[_app.createThumbnails] [_.each sizes]', error);                                          // 50
            finish(Meteor.Error('[_app.createThumbnails] [_.each sizes]', error));                                   // 51
            return;                                                                                                  // 52
          }                                                                                                          // 53
                                                                                                                     //
          var i = 0;                                                                                                 // 55
          collection.collection.update(fileRef._id, {                                                                // 56
            $set: {                                                                                                  // 57
              'meta.width': features.width,                                                                          // 58
              'meta.height': features.height,                                                                        // 59
              'versions.original.meta.width': features.width,                                                        // 60
              'versions.original.meta.height': features.height                                                       // 61
            }                                                                                                        // 57
          }, _app.NOOP);                                                                                             // 56
                                                                                                                     //
          _.each(sizes, function (size, name) {                                                                      // 65
            var path = collection.storagePath(fileRef) + '/' + name + '-' + fileRef._id + '.' + fileRef.extension;   // 66
                                                                                                                     //
            var copyPaste = function () {                                                                            // 67
              fs.copy(fileRef.path, path, function (fsCopyError) {                                                   // 68
                bound(function () {                                                                                  // 69
                  if (fsCopyError) {                                                                                 // 70
                    console.error('[_app.createThumbnails] [_.each sizes] [fs.copy]', fsCopyError);                  // 71
                    finish(fsCopyError);                                                                             // 72
                    return;                                                                                          // 73
                  }                                                                                                  // 74
                                                                                                                     //
                  var upd = {                                                                                        // 76
                    $set: {}                                                                                         // 76
                  };                                                                                                 // 76
                  upd['$set']['versions.' + name] = {                                                                // 77
                    path: path,                                                                                      // 78
                    size: fileRef.size,                                                                              // 79
                    type: fileRef.type,                                                                              // 80
                    extension: fileRef.extension,                                                                    // 81
                    meta: {                                                                                          // 82
                      width: features.width,                                                                         // 83
                      height: features.height                                                                        // 84
                    }                                                                                                // 82
                  };                                                                                                 // 77
                  collection.collection.update(fileRef._id, upd, function (colUpdError) {                            // 87
                    ++i;                                                                                             // 88
                                                                                                                     //
                    if (i === Object.keys(sizes).length) {                                                           // 89
                      isLast = true;                                                                                 // 90
                    }                                                                                                // 91
                                                                                                                     //
                    finish(colUpdError);                                                                             // 92
                  });                                                                                                // 93
                });                                                                                                  // 94
              });                                                                                                    // 95
            };                                                                                                       // 96
                                                                                                                     //
            if (/png|jpe?g/i.test(fileRef.extension)) {                                                              // 98
              var img = gm(fileRef.path).quality(70).define('filter:support=2').define('jpeg:fancy-upsampling=false').define('jpeg:fancy-upsampling=off').define('png:compression-filter=5').define('png:compression-level=9').define('png:compression-strategy=1').define('png:exclude-chunk=all').autoOrient().noProfile().strip().dither(false).interlace('Line').filter('Triangle');
                                                                                                                     //
              var updateAndSave = function (upNSaveError) {                                                          // 115
                bound(function () {                                                                                  // 116
                  if (upNSaveError) {                                                                                // 117
                    console.error('[_app.createThumbnails] [_.each sizes] [img.resize]', upNSaveError);              // 118
                    finish(upNSaveError);                                                                            // 119
                    return;                                                                                          // 120
                  }                                                                                                  // 121
                                                                                                                     //
                  fs.stat(path, function (fsStatError, stat) {                                                       // 122
                    bound(function () {                                                                              // 123
                      if (fsStatError) {                                                                             // 124
                        console.error('[_app.createThumbnails] [_.each sizes] [img.resize] [fs.stat]', fsStatError);
                        finish(fsStatError);                                                                         // 126
                        return;                                                                                      // 127
                      }                                                                                              // 128
                                                                                                                     //
                      gm(path).size(function (gmSizeError, imgInfo) {                                                // 130
                        bound(function () {                                                                          // 131
                          if (gmSizeError) {                                                                         // 132
                            console.error('[_app.createThumbnails] [_.each sizes] [img.resize] [fs.stat] [gm(path).size]', gmSizeError);
                            finish(gmSizeError);                                                                     // 134
                            return;                                                                                  // 135
                          }                                                                                          // 136
                                                                                                                     //
                          var upd = {                                                                                // 137
                            $set: {}                                                                                 // 137
                          };                                                                                         // 137
                          upd['$set']['versions.' + name] = {                                                        // 138
                            path: path,                                                                              // 139
                            size: stat.size,                                                                         // 140
                            type: fileRef.type,                                                                      // 141
                            extension: fileRef.extension,                                                            // 142
                            meta: {                                                                                  // 143
                              width: imgInfo.width,                                                                  // 144
                              height: imgInfo.height                                                                 // 145
                            }                                                                                        // 143
                          };                                                                                         // 138
                          collection.collection.update(fileRef._id, upd, function (colUpdError) {                    // 149
                            ++i;                                                                                     // 150
                                                                                                                     //
                            if (i === Object.keys(sizes).length) {                                                   // 151
                              isLast = true;                                                                         // 152
                            }                                                                                        // 153
                                                                                                                     //
                            finish(colUpdError);                                                                     // 154
                          });                                                                                        // 155
                        });                                                                                          // 156
                      });                                                                                            // 157
                    });                                                                                              // 158
                  });                                                                                                // 159
                });                                                                                                  // 160
              };                                                                                                     // 161
                                                                                                                     //
              if (!size.square) {                                                                                    // 163
                if (features.width > size.width) {                                                                   // 164
                  img.resize(size.width).interlace('Line').write(path, updateAndSave);                               // 165
                } else {                                                                                             // 166
                  copyPaste();                                                                                       // 167
                }                                                                                                    // 168
              } else {                                                                                               // 169
                var x = 0;                                                                                           // 170
                var y = 0;                                                                                           // 171
                var widthRatio = features.width / size.width;                                                        // 172
                var heightRatio = features.height / size.width;                                                      // 173
                var widthNew = size.width;                                                                           // 174
                var heightNew = size.width;                                                                          // 175
                                                                                                                     //
                if (heightRatio < widthRatio) {                                                                      // 177
                  widthNew = size.width * features.width / features.height;                                          // 178
                  x = (widthNew - size.width) / 2;                                                                   // 179
                }                                                                                                    // 180
                                                                                                                     //
                if (heightRatio > widthRatio) {                                                                      // 182
                  heightNew = size.width * features.height / features.width;                                         // 183
                  y = (heightNew - size.width) / 2;                                                                  // 184
                }                                                                                                    // 185
                                                                                                                     //
                img.resize(widthNew, heightNew).crop(size.width, size.width, x, y).interlace('Line').write(path, updateAndSave);
              }                                                                                                      // 192
            } else {                                                                                                 // 193
              copyPaste();                                                                                           // 194
            }                                                                                                        // 195
          });                                                                                                        // 196
        });                                                                                                          // 197
      });                                                                                                            // 198
    });                                                                                                              // 199
  });                                                                                                                // 200
  return true;                                                                                                       // 201
};                                                                                                                   // 202
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"service-configurations.js":["meteor/meteor","meteor/service-configuration",function(require,exports,module){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// server/service-configurations.js                                                                                  //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
var Meteor = void 0;                                                                                                 // 1
module.importSync("meteor/meteor", {                                                                                 // 1
  Meteor: function (v) {                                                                                             // 1
    Meteor = v;                                                                                                      // 1
  }                                                                                                                  // 1
}, 0);                                                                                                               // 1
var ServiceConfiguration = void 0;                                                                                   // 1
module.importSync("meteor/service-configuration", {                                                                  // 1
  ServiceConfiguration: function (v) {                                                                               // 1
    ServiceConfiguration = v;                                                                                        // 1
  }                                                                                                                  // 1
}, 1);                                                                                                               // 1
var _sc = {};                                                                                                        // 4
ServiceConfiguration.configurations.remove({});                                                                      // 5
                                                                                                                     //
if (process.env.ACCOUNTS_METEOR_ID && process.env.ACCOUNTS_METEOR_SEC) {                                             // 7
  _sc.meteor = true;                                                                                                 // 8
  ServiceConfiguration.configurations.upsert({                                                                       // 9
    service: 'meteor-developer'                                                                                      // 10
  }, {                                                                                                               // 9
    $set: {                                                                                                          // 12
      secret: process.env.ACCOUNTS_METEOR_SEC,                                                                       // 13
      clientId: process.env.ACCOUNTS_METEOR_ID,                                                                      // 14
      loginStyle: 'redirect'                                                                                         // 15
    }                                                                                                                // 12
  });                                                                                                                // 11
}                                                                                                                    // 18
                                                                                                                     //
if (process.env.ACCOUNTS_GITHUB_ID && process.env.ACCOUNTS_GITHUB_SEC) {                                             // 20
  _sc.github = true;                                                                                                 // 21
  ServiceConfiguration.configurations.upsert({                                                                       // 22
    service: 'github'                                                                                                // 23
  }, {                                                                                                               // 22
    $set: {                                                                                                          // 25
      secret: process.env.ACCOUNTS_GITHUB_SEC,                                                                       // 26
      clientId: process.env.ACCOUNTS_GITHUB_ID,                                                                      // 27
      loginStyle: 'redirect'                                                                                         // 28
    }                                                                                                                // 25
  });                                                                                                                // 24
}                                                                                                                    // 31
                                                                                                                     //
if (process.env.ACCOUNTS_TWITTER_ID && process.env.ACCOUNTS_TWITTER_SEC) {                                           // 33
  _sc.twitter = true;                                                                                                // 34
  ServiceConfiguration.configurations.upsert({                                                                       // 35
    service: 'twitter'                                                                                               // 36
  }, {                                                                                                               // 35
    $set: {                                                                                                          // 38
      loginStyle: 'redirect',                                                                                        // 39
      secret: process.env.ACCOUNTS_TWITTER_SEC,                                                                      // 40
      consumerKey: process.env.ACCOUNTS_TWITTER_ID                                                                   // 41
    }                                                                                                                // 38
  });                                                                                                                // 37
}                                                                                                                    // 44
                                                                                                                     //
if (process.env.ACCOUNTS_FACEBOOK_ID && process.env.ACCOUNTS_FACEBOOK_SEC) {                                         // 46
  _sc.facebook = true;                                                                                               // 47
  ServiceConfiguration.configurations.upsert({                                                                       // 48
    service: 'facebook'                                                                                              // 49
  }, {                                                                                                               // 48
    $set: {                                                                                                          // 51
      secret: process.env.ACCOUNTS_FACEBOOK_SEC,                                                                     // 52
      appId: process.env.ACCOUNTS_FACEBOOK_ID,                                                                       // 53
      loginStyle: 'redirect'                                                                                         // 54
    }                                                                                                                // 51
  });                                                                                                                // 50
}                                                                                                                    // 57
                                                                                                                     //
Meteor.methods({                                                                                                     // 59
  getServiceConfiguration: function () {                                                                             // 60
    return _sc;                                                                                                      // 61
  }                                                                                                                  // 62
});                                                                                                                  // 59
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}],"spiderable.js":function(){

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//                                                                                                                   //
// server/spiderable.js                                                                                              //
//                                                                                                                   //
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                                                                                                                     //
// import { WebApp } from 'meteor/webapp';                                                                           // 1
// import Spiderable from 'meteor/ostrio:spiderable-middleware';                                                     // 2
//                                                                                                                   // 3
// WebApp.connectHandlers.use(new Spiderable({                                                                       // 4
//   rootURL: 'https://files.veliov.com',                                                                            // 5
//   serviceURL: 'https://render.ostr.io',                                                                           // 6
//   auth: 'xxx:yyy'                                                                                                 // 7
// }));                                                                                                              // 8
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

}}},{"extensions":[".js",".json"]});
require("./lib/__compatibility/__globals.js");
require("./lib/files.collection.js");
require("./server/image-processing.js");
require("./server/service-configurations.js");
require("./server/spiderable.js");
//# sourceMappingURL=app.js.map
