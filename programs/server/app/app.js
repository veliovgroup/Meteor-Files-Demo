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

}]},"files.collection.js":["meteor/underscore","meteor/check","meteor/meteor","meteor/random","meteor/ostrio:files","/lib/__compatibility/__globals.js","fs-extra","dropbox","aws-sdk/clients/s3","request",function(require,exports,module){

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
    dbConf = void 0;                                                                                                 // 17
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
                                                                                                                     //
    var S3 = require('aws-sdk/clients/s3');                                                                          // 42
                                                                                                                     //
    client = new S3({                                                                                                // 44
      secretAccessKey: s3Conf.secret,                                                                                // 45
      accessKeyId: s3Conf.key,                                                                                       // 46
      region: s3Conf.region,                                                                                         // 47
      sslEnabled: true                                                                                               // 48
    });                                                                                                              // 44
  }                                                                                                                  // 50
                                                                                                                     //
  if (useS3 || useDropBox) {                                                                                         // 52
    request = require('request');                                                                                    // 53
    bound = Meteor.bindEnvironment(function (callback) {                                                             // 54
      return callback();                                                                                             // 55
    });                                                                                                              // 56
  }                                                                                                                  // 57
}                                                                                                                    // 58
                                                                                                                     //
Collections.files = new FilesCollection({                                                                            // 60
  // debug: true,                                                                                                    // 61
  // throttle: false,                                                                                                // 62
  // chunkSize: 1024*1024,                                                                                           // 63
  storagePath: 'assets/app/uploads/uploadedFiles',                                                                   // 64
  collectionName: 'uploadedFiles',                                                                                   // 65
  allowClientCode: true,                                                                                             // 66
  "protected": function (fileObj) {                                                                                  // 60
    if (fileObj) {                                                                                                   // 68
      if (!(fileObj.meta && fileObj.meta.secured)) {                                                                 // 69
        return true;                                                                                                 // 70
      } else if (fileObj.meta && fileObj.meta.secured === true && this.userId === fileObj.userId) {                  // 71
        return true;                                                                                                 // 72
      }                                                                                                              // 73
    }                                                                                                                // 74
                                                                                                                     //
    return false;                                                                                                    // 75
  },                                                                                                                 // 76
  onBeforeRemove: function (cursor) {                                                                                // 77
    var _this = this;                                                                                                // 77
                                                                                                                     //
    var res = cursor.map(function (file) {                                                                           // 78
      if (file && file.userId && _.isString(file.userId)) {                                                          // 79
        return file.userId === _this.userId;                                                                         // 80
      }                                                                                                              // 81
                                                                                                                     //
      return false;                                                                                                  // 82
    });                                                                                                              // 83
    return !~res.indexOf(false);                                                                                     // 84
  },                                                                                                                 // 85
  onBeforeUpload: function () {                                                                                      // 86
    if (this.file.size <= 1024 * 1024 * 128) {                                                                       // 87
      return true;                                                                                                   // 88
    }                                                                                                                // 89
                                                                                                                     //
    return "Max. file size is 128MB you've tried to upload " + filesize(this.file.size);                             // 90
  },                                                                                                                 // 91
  downloadCallback: function (fileObj) {                                                                             // 92
    if (this.params && this.params.query && this.params.query.download === 'true') {                                 // 93
      Collections.files.collection.update(fileObj._id, {                                                             // 94
        $inc: {                                                                                                      // 95
          'meta.downloads': 1                                                                                        // 96
        }                                                                                                            // 95
      }, _app.NOOP);                                                                                                 // 94
    }                                                                                                                // 99
                                                                                                                     //
    return true;                                                                                                     // 100
  },                                                                                                                 // 101
  interceptDownload: function (http, fileRef, version) {                                                             // 102
    var path = void 0;                                                                                               // 103
                                                                                                                     //
    if (useDropBox) {                                                                                                // 104
      path = fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipeFrom ? fileRef.versions[version].meta.pipeFrom : void 0;
                                                                                                                     //
      if (path) {                                                                                                    // 106
        // If file is successfully moved to Storage                                                                  // 107
        // We will pipe request to Storage                                                                           // 108
        // So, original link will stay always secure                                                                 // 109
        // To force ?play and ?download parameters                                                                   // 111
        // and to keep original file name, content-type,                                                             // 112
        // content-disposition and cache-control                                                                     // 113
        // we're using low-level .serve() method                                                                     // 114
        this.serve(http, fileRef, fileRef.versions[version], version, request({                                      // 115
          url: path,                                                                                                 // 116
          headers: _.pick(http.request.headers, 'range', 'cache-control', 'connection')                              // 117
        }));                                                                                                         // 115
        return true;                                                                                                 // 119
      } // While file is not yet uploaded to Storage                                                                 // 120
      // We will serve file from FS                                                                                  // 122
                                                                                                                     //
                                                                                                                     //
      return false;                                                                                                  // 123
    } else if (useS3) {                                                                                              // 124
      path = fileRef && fileRef.versions && fileRef.versions[version] && fileRef.versions[version].meta && fileRef.versions[version].meta.pipePath ? fileRef.versions[version].meta.pipePath : void 0;
                                                                                                                     //
      if (path) {                                                                                                    // 126
        // If file is successfully moved to Storage                                                                  // 127
        // We will pipe request to Storage                                                                           // 128
        // So, original link will stay always secure                                                                 // 129
        // To force ?play and ?download parameters                                                                   // 131
        // and to keep original file name, content-type,                                                             // 132
        // content-disposition and cache-control                                                                     // 133
        // we're using low-level .serve() method                                                                     // 134
        this.serve(http, fileRef, fileRef.versions[version], version, client.getObject({                             // 135
          Bucket: s3Conf.bucket,                                                                                     // 136
          Key: path                                                                                                  // 137
        }).createReadStream());                                                                                      // 135
        return true;                                                                                                 // 139
      } // While file is not yet uploaded to Storage                                                                 // 140
      // We will serve file from FS                                                                                  // 142
                                                                                                                     //
                                                                                                                     //
      return false;                                                                                                  // 143
    }                                                                                                                // 144
                                                                                                                     //
    return false;                                                                                                    // 145
  }                                                                                                                  // 146
});                                                                                                                  // 60
                                                                                                                     //
if (Meteor.isServer) {                                                                                               // 149
  Collections.files.denyClient();                                                                                    // 150
  Collections.files.on('afterUpload', function (fileRef) {                                                           // 151
    var _this2 = this;                                                                                               // 151
                                                                                                                     //
    if (useDropBox) {                                                                                                // 152
      var makeUrl = function (stat, fileRef, version) {                                                              // 153
        var triesUrl = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;                        // 153
        client.makeUrl(stat.path, {                                                                                  // 154
          long: true,                                                                                                // 155
          downloadHack: true                                                                                         // 156
        }, function (error, xml) {                                                                                   // 154
          bound(function () {                                                                                        // 158
            // Store downloadable link in file's meta object                                                         // 159
            if (error) {                                                                                             // 160
              if (triesUrl < 10) {                                                                                   // 161
                Meteor.setTimeout(function () {                                                                      // 162
                  makeUrl(stat, fileRef, version, ++triesUrl);                                                       // 163
                }, 2048);                                                                                            // 164
              } else {                                                                                               // 165
                console.error(error, {                                                                               // 166
                  triesUrl: triesUrl                                                                                 // 167
                });                                                                                                  // 166
              }                                                                                                      // 169
            } else if (xml) {                                                                                        // 170
              var upd = {                                                                                            // 171
                $set: {}                                                                                             // 171
              };                                                                                                     // 171
              upd['$set']['versions.' + version + '.meta.pipeFrom'] = xml.url;                                       // 172
              upd['$set']['versions.' + version + '.meta.pipePath'] = stat.path;                                     // 173
                                                                                                                     //
              _this2.collection.update({                                                                             // 174
                _id: fileRef._id                                                                                     // 175
              }, upd, function (updError) {                                                                          // 174
                if (updError) {                                                                                      // 177
                  console.error(updError);                                                                           // 178
                } else {                                                                                             // 179
                  // Unlink original files from FS                                                                   // 180
                  // after successful upload to DropBox                                                              // 181
                  _this2.unlink(_this2.collection.findOne(fileRef._id), version);                                    // 182
                }                                                                                                    // 183
              });                                                                                                    // 184
            } else {                                                                                                 // 185
              if (triesUrl < 10) {                                                                                   // 186
                Meteor.setTimeout(function () {                                                                      // 187
                  // Generate downloadable link                                                                      // 188
                  makeUrl(stat, fileRef, version, ++triesUrl);                                                       // 189
                }, 2048);                                                                                            // 190
              } else {                                                                                               // 191
                console.error("client.makeUrl doesn't returns xml", {                                                // 192
                  triesUrl: triesUrl                                                                                 // 193
                });                                                                                                  // 192
              }                                                                                                      // 195
            }                                                                                                        // 196
          });                                                                                                        // 197
        });                                                                                                          // 198
      };                                                                                                             // 199
                                                                                                                     //
      var writeToDB = function (fileRef, version, data) {                                                            // 201
        var triesSend = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;                       // 201
        // DropBox already uses random URLs                                                                          // 202
        // No need to use random file names                                                                          // 203
        client.writeFile(fileRef._id + '-' + version + '.' + fileRef.extension, data, function (error, stat) {       // 204
          bound(function () {                                                                                        // 205
            if (error) {                                                                                             // 206
              if (triesSend < 10) {                                                                                  // 207
                Meteor.setTimeout(function () {                                                                      // 208
                  // Write file to DropBox                                                                           // 209
                  writeToDB(fileRef, version, data, ++triesSend);                                                    // 210
                }, 2048);                                                                                            // 211
              } else {                                                                                               // 212
                console.error(error, {                                                                               // 213
                  triesSend: triesSend                                                                               // 214
                });                                                                                                  // 213
              }                                                                                                      // 216
            } else {                                                                                                 // 217
              makeUrl(stat, fileRef, version);                                                                       // 218
            }                                                                                                        // 219
          });                                                                                                        // 220
        });                                                                                                          // 221
      };                                                                                                             // 222
                                                                                                                     //
      var readFile = function (fileRef, vRef, version) {                                                             // 224
        var triesRead = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;                       // 224
        fs.readFile(vRef.path, function (error, data) {                                                              // 225
          bound(function () {                                                                                        // 226
            if (error) {                                                                                             // 227
              if (triesRead < 10) {                                                                                  // 228
                readFile(fileRef, vRef, version, ++triesRead);                                                       // 229
              } else {                                                                                               // 230
                console.error(error);                                                                                // 231
              }                                                                                                      // 232
            } else {                                                                                                 // 233
              writeToDB(fileRef, version, data);                                                                     // 234
            }                                                                                                        // 235
          });                                                                                                        // 236
        });                                                                                                          // 237
      };                                                                                                             // 238
                                                                                                                     //
      sendToStorage = function (fileRef) {                                                                           // 240
        _.each(fileRef.versions, function (vRef, version) {                                                          // 241
          readFile(fileRef, vRef, version);                                                                          // 242
        });                                                                                                          // 243
      };                                                                                                             // 244
    } else if (useS3) {                                                                                              // 245
      sendToStorage = function (fileRef) {                                                                           // 246
        _.each(fileRef.versions, function (vRef, version) {                                                          // 247
          // We use Random.id() instead of real file's _id                                                           // 248
          // to secure files from reverse engineering                                                                // 249
          // As after viewing this code it will be easy                                                              // 250
          // to get access to unlisted and protected files                                                           // 251
          var filePath = 'files/' + Random.id() + '-' + version + '.' + fileRef.extension;                           // 252
          client.putObject({                                                                                         // 254
            ServerSideEncryption: 'AES256',                                                                          // 255
            StorageClass: 'STANDARD_IA',                                                                             // 256
            Bucket: s3Conf.bucket,                                                                                   // 257
            Key: filePath,                                                                                           // 258
            Body: fs.createReadStream(vRef.path),                                                                    // 259
            ContentType: vRef.type                                                                                   // 260
          }, function (error) {                                                                                      // 254
            bound(function () {                                                                                      // 262
              if (error) {                                                                                           // 263
                console.error(error);                                                                                // 264
              } else {                                                                                               // 265
                var upd = {                                                                                          // 266
                  $set: {}                                                                                           // 266
                };                                                                                                   // 266
                upd['$set']['versions.' + version + '.meta.pipePath'] = filePath;                                    // 267
                                                                                                                     //
                _this2.collection.update({                                                                           // 268
                  _id: fileRef._id                                                                                   // 269
                }, upd, function (error) {                                                                           // 268
                  if (error) {                                                                                       // 271
                    console.error(error);                                                                            // 272
                  } else {                                                                                           // 273
                    // Unlink original file from FS                                                                  // 274
                    // after successful upload to AWS:S3                                                             // 275
                    _this2.unlink(_this2.collection.findOne(fileRef._id), version);                                  // 276
                  }                                                                                                  // 277
                });                                                                                                  // 278
              }                                                                                                      // 279
            });                                                                                                      // 280
          });                                                                                                        // 281
        });                                                                                                          // 282
      };                                                                                                             // 283
    }                                                                                                                // 284
                                                                                                                     //
    if (/png|jpe?g/i.test(fileRef.extension || '')) {                                                                // 286
      _app.createThumbnails(this, fileRef, function (error, fileRef) {                                               // 287
        if (error) {                                                                                                 // 288
          console.error(error);                                                                                      // 289
        }                                                                                                            // 290
                                                                                                                     //
        if (useDropBox || useS3) {                                                                                   // 291
          sendToStorage(_this2.collection.findOne(fileRef._id));                                                     // 292
        }                                                                                                            // 293
      });                                                                                                            // 294
    } else {                                                                                                         // 295
      if (useDropBox || useS3) {                                                                                     // 296
        sendToStorage(fileRef);                                                                                      // 297
      }                                                                                                              // 298
    }                                                                                                                // 299
  }); // This line now commented due to Heroku usage                                                                 // 300
  // Collections.files.collection._ensureIndex {'meta.expireAt': 1}, {expireAfterSeconds: 0, background: true}       // 303
  // Intercept FileCollection's remove method                                                                        // 305
  // to remove file from DropBox or AWS S3                                                                           // 306
                                                                                                                     //
  if (useDropBox || useS3) {                                                                                         // 307
    var _origRemove = Collections.files.remove;                                                                      // 308
                                                                                                                     //
    Collections.files.remove = function (search) {                                                                   // 309
      var cursor = this.collection.find(search);                                                                     // 310
      cursor.forEach(function (fileRef) {                                                                            // 311
        _.each(fileRef.versions, function (vRef) {                                                                   // 312
          if (vRef && vRef.meta && vRef.meta.pipePath != null) {                                                     // 313
            if (useDropBox) {                                                                                        // 314
              // DropBox usage:                                                                                      // 315
              client.remove(vRef.meta.pipePath, function (error) {                                                   // 316
                bound(function () {                                                                                  // 317
                  if (error) {                                                                                       // 318
                    console.error(error);                                                                            // 319
                  }                                                                                                  // 320
                });                                                                                                  // 321
              });                                                                                                    // 322
            } else {                                                                                                 // 323
              // AWS:S3 usage:                                                                                       // 324
              client.deleteObject({                                                                                  // 325
                Bucket: s3Conf.bucket,                                                                               // 326
                Key: vRef.meta.pipePath                                                                              // 327
              }, function (error) {                                                                                  // 325
                bound(function () {                                                                                  // 329
                  if (error) {                                                                                       // 330
                    console.error(error);                                                                            // 331
                  }                                                                                                  // 332
                });                                                                                                  // 333
              });                                                                                                    // 334
            }                                                                                                        // 335
          }                                                                                                          // 336
        });                                                                                                          // 337
      }); // Call original method                                                                                    // 338
                                                                                                                     //
      _origRemove.call(this, search);                                                                                // 340
    };                                                                                                               // 341
  } // Remove all files on server load/reload, useful while testing/development                                      // 342
  // Meteor.startup -> Collections.files.remove {}                                                                   // 345
  // Remove files along with MongoDB records two minutes before expiration date                                      // 347
  // If we have 'expireAfterSeconds' index on 'meta.expireAt' field,                                                 // 348
  // it won't remove files themselves.                                                                               // 349
                                                                                                                     //
                                                                                                                     //
  Meteor.setInterval(function () {                                                                                   // 350
    Collections.files.remove({                                                                                       // 351
      'meta.expireAt': {                                                                                             // 352
        $lte: new Date(+new Date() + 120000)                                                                         // 353
      }                                                                                                              // 352
    }, _app.NOOP);                                                                                                   // 351
  }, 120000);                                                                                                        // 356
  Meteor.publish('latest', function () {                                                                             // 358
    var take = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;                               // 358
    var userOnly = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;                        // 358
    check(take, Number);                                                                                             // 359
    check(userOnly, Boolean);                                                                                        // 360
    var selector = void 0;                                                                                           // 362
                                                                                                                     //
    if (userOnly && this.userId) {                                                                                   // 363
      selector = {                                                                                                   // 364
        userId: this.userId                                                                                          // 365
      };                                                                                                             // 364
    } else {                                                                                                         // 367
      selector = {                                                                                                   // 368
        $or: [{                                                                                                      // 369
          'meta.unlisted': false,                                                                                    // 371
          'meta.secured': false,                                                                                     // 372
          'meta.blamed': {                                                                                           // 373
            $lt: 3                                                                                                   // 374
          }                                                                                                          // 373
        }, {                                                                                                         // 370
          userId: this.userId                                                                                        // 377
        }]                                                                                                           // 376
      };                                                                                                             // 368
    }                                                                                                                // 381
                                                                                                                     //
    return Collections.files.find(selector, {                                                                        // 383
      limit: take,                                                                                                   // 384
      sort: {                                                                                                        // 385
        'meta.created_at': -1                                                                                        // 386
      },                                                                                                             // 385
      fields: {                                                                                                      // 388
        _id: 1,                                                                                                      // 389
        name: 1,                                                                                                     // 390
        size: 1,                                                                                                     // 391
        meta: 1,                                                                                                     // 392
        type: 1,                                                                                                     // 393
        isPDF: 1,                                                                                                    // 394
        isText: 1,                                                                                                   // 395
        isJSON: 1,                                                                                                   // 396
        isVideo: 1,                                                                                                  // 397
        isAudio: 1,                                                                                                  // 398
        isImage: 1,                                                                                                  // 399
        userId: 1,                                                                                                   // 400
        'versions.thumbnail40.extension': 1,                                                                         // 401
        'versions.preview.extension': 1,                                                                             // 402
        extension: 1,                                                                                                // 403
        _collectionName: 1,                                                                                          // 404
        _downloadRoute: 1                                                                                            // 405
      }                                                                                                              // 388
    }).cursor;                                                                                                       // 383
  });                                                                                                                // 408
  Meteor.publish('file', function (_id) {                                                                            // 410
    check(_id, String);                                                                                              // 411
    return Collections.files.find({                                                                                  // 412
      $or: [{                                                                                                        // 413
        _id: _id,                                                                                                    // 415
        'meta.secured': false                                                                                        // 416
      }, {                                                                                                           // 414
        _id: _id,                                                                                                    // 418
        'meta.secured': true,                                                                                        // 419
        userId: this.userId                                                                                          // 420
      }]                                                                                                             // 417
    }, {                                                                                                             // 412
      fields: {                                                                                                      // 424
        _id: 1,                                                                                                      // 425
        name: 1,                                                                                                     // 426
        size: 1,                                                                                                     // 427
        type: 1,                                                                                                     // 428
        meta: 1,                                                                                                     // 429
        isPDF: 1,                                                                                                    // 430
        isText: 1,                                                                                                   // 431
        isJSON: 1,                                                                                                   // 432
        isVideo: 1,                                                                                                  // 433
        isAudio: 1,                                                                                                  // 434
        isImage: 1,                                                                                                  // 435
        extension: 1,                                                                                                // 436
        'versions.preview.extension': 1,                                                                             // 437
        _collectionName: 1,                                                                                          // 438
        _downloadRoute: 1                                                                                            // 439
      }                                                                                                              // 424
    }).cursor;                                                                                                       // 423
  });                                                                                                                // 442
  Meteor.methods({                                                                                                   // 444
    filesLenght: function () {                                                                                       // 445
      var userOnly = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;                      // 445
      check(userOnly, Boolean);                                                                                      // 446
      var selector = void 0;                                                                                         // 448
                                                                                                                     //
      if (userOnly && this.userId) {                                                                                 // 449
        selector = {                                                                                                 // 450
          userId: this.userId                                                                                        // 451
        };                                                                                                           // 450
      } else {                                                                                                       // 453
        selector = {                                                                                                 // 454
          $or: [{                                                                                                    // 455
            'meta.unlisted': false,                                                                                  // 457
            'meta.secured': false,                                                                                   // 458
            'meta.blamed': {                                                                                         // 459
              $lt: 3                                                                                                 // 460
            }                                                                                                        // 459
          }, {                                                                                                       // 456
            userId: this.userId                                                                                      // 463
          }]                                                                                                         // 462
        };                                                                                                           // 454
      }                                                                                                              // 467
                                                                                                                     //
      return Collections.files.find(selector).count();                                                               // 468
    },                                                                                                               // 469
    unblame: function (_id) {                                                                                        // 470
      check(_id, String);                                                                                            // 471
      Collections.files.update({                                                                                     // 472
        _id: _id                                                                                                     // 473
      }, {                                                                                                           // 472
        $inc: {                                                                                                      // 475
          'meta.blamed': -1                                                                                          // 476
        }                                                                                                            // 475
      }, _app.NOOP);                                                                                                 // 474
      return true;                                                                                                   // 479
    },                                                                                                               // 480
    blame: function (_id) {                                                                                          // 481
      check(_id, String);                                                                                            // 482
      Collections.files.update({                                                                                     // 483
        _id: _id                                                                                                     // 484
      }, {                                                                                                           // 483
        $inc: {                                                                                                      // 486
          'meta.blamed': 1                                                                                           // 487
        }                                                                                                            // 486
      }, _app.NOOP);                                                                                                 // 485
      return true;                                                                                                   // 490
    },                                                                                                               // 491
    changeAccess: function (_id) {                                                                                   // 492
      check(_id, String);                                                                                            // 493
                                                                                                                     //
      if (Meteor.userId()) {                                                                                         // 494
        var file = Collections.files.findOne({                                                                       // 495
          _id: _id,                                                                                                  // 496
          userId: Meteor.userId()                                                                                    // 497
        });                                                                                                          // 495
                                                                                                                     //
        if (file) {                                                                                                  // 500
          Collections.files.update(_id, {                                                                            // 501
            $set: {                                                                                                  // 502
              'meta.unlisted': file.meta.unlisted ? false : true                                                     // 503
            }                                                                                                        // 502
          }, _app.NOOP);                                                                                             // 501
          return true;                                                                                               // 506
        }                                                                                                            // 507
      }                                                                                                              // 508
                                                                                                                     //
      throw new Meteor.Error(401, 'Access denied!');                                                                 // 509
    },                                                                                                               // 510
    changePrivacy: function (_id) {                                                                                  // 511
      check(_id, String);                                                                                            // 512
                                                                                                                     //
      if (Meteor.userId()) {                                                                                         // 513
        var file = Collections.files.findOne({                                                                       // 514
          _id: _id,                                                                                                  // 515
          userId: Meteor.userId()                                                                                    // 516
        });                                                                                                          // 514
                                                                                                                     //
        if (file) {                                                                                                  // 519
          Collections.files.update(_id, {                                                                            // 520
            $set: {                                                                                                  // 521
              'meta.unlisted': true,                                                                                 // 522
              'meta.secured': file.meta.secured ? false : true                                                       // 523
            }                                                                                                        // 521
          }, _app.NOOP);                                                                                             // 520
          return true;                                                                                               // 526
        }                                                                                                            // 527
      }                                                                                                              // 528
                                                                                                                     //
      throw new Meteor.Error(401, 'Access denied!');                                                                 // 529
    }                                                                                                                // 530
  });                                                                                                                // 444
}                                                                                                                    // 532
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
// import { Spiderable } from 'meteor/ostrio:spiderable-middleware';                                                 // 2
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
