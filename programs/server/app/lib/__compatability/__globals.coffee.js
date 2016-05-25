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
  if (!ClientStorage.has('uploadTransport')) {                         // 8
    ClientStorage.set('uploadTransport', 'ddp');                       // 8
  }                                                                    //
  Template.registerHelper('filesize', function(size) {                 // 8
    if (size == null) {                                                //
      size = 0;                                                        //
    }                                                                  //
    return filesize(size);                                             //
  });                                                                  //
  Template.registerHelper('extless', function(filename) {              // 8
    var parts;                                                         // 11
    if (filename == null) {                                            //
      filename = '';                                                   //
    }                                                                  //
    parts = filename.split('.');                                       // 11
    if (parts.length > 1) {                                            // 12
      parts.pop();                                                     // 12
    }                                                                  //
    return parts.join('.');                                            // 13
  });                                                                  //
  marked.setOptions({                                                  // 8
    highlight: function(code) {                                        // 16
      return hljs.highlightAuto(code).value;                           //
    },                                                                 //
    renderer: new marked.Renderer(),                                   // 16
    gfm: true,                                                         // 16
    tables: true,                                                      // 16
    breaks: false,                                                     // 16
    pedantic: false,                                                   // 16
    sanitize: true,                                                    // 16
    smartLists: true,                                                  // 16
    smartypants: false                                                 // 16
  });                                                                  //
}                                                                      //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=__globals.coffee.js.map
