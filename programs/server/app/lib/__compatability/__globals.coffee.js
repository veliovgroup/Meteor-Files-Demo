(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// lib/__compatability/__globals.coffee.js                             //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
this.Collections = {};                                                 // 1
                                                                       //
this._app = {                                                          // 1
  subs: new SubsManager(),                                             // 3
  storeTTL: 259200000,                                                 // 3
  NOOP: function() {}                                                  // 3
};                                                                     //
                                                                       //
if (Meteor.isClient) {                                                 // 7
  if (!ClientStorage.has('blamed') || !_.isArray(ClientStorage.get('blamed'))) {
    ClientStorage.set('blamed', []);                                   // 8
  }                                                                    //
  _app.blamed = new ReactiveVar(ClientStorage.get('blamed'));          // 8
  Meteor.autorun(function() {                                          // 8
    ClientStorage.set('blamed', _app.blamed.get());                    // 11
  });                                                                  //
  if (!ClientStorage.has('uploadTransport')) {                         // 14
    ClientStorage.set('uploadTransport', 'ddp');                       // 14
  }                                                                    //
  Template.registerHelper('filesize', function(size) {                 // 8
    if (size == null) {                                                //
      size = 0;                                                        //
    }                                                                  //
    return filesize(size);                                             //
  });                                                                  //
  Template.registerHelper('extless', function(filename) {              // 8
    var parts;                                                         // 17
    if (filename == null) {                                            //
      filename = '';                                                   //
    }                                                                  //
    parts = filename.split('.');                                       // 17
    if (parts.length > 1) {                                            // 18
      parts.pop();                                                     // 18
    }                                                                  //
    return parts.join('.');                                            // 19
  });                                                                  //
  marked.setOptions({                                                  // 8
    highlight: function(code) {                                        // 22
      return hljs.highlightAuto(code).value;                           //
    },                                                                 //
    renderer: new marked.Renderer(),                                   // 22
    gfm: true,                                                         // 22
    tables: true,                                                      // 22
    breaks: false,                                                     // 22
    pedantic: false,                                                   // 22
    sanitize: true,                                                    // 22
    smartLists: true,                                                  // 22
    smartypants: false                                                 // 22
  });                                                                  //
}                                                                      //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=__globals.coffee.js.map
