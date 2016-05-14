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
  Template.registerHelper('filesize', function(size) {                 // 8
    if (size == null) {                                                //
      size = 0;                                                        //
    }                                                                  //
    return filesize(size);                                             //
  });                                                                  //
  Template.registerHelper('extless', function(filename) {              // 8
    if (filename == null) {                                            //
      filename = '';                                                   //
    }                                                                  //
    return filename.split('.')[0];                                     //
  });                                                                  //
  marked.setOptions({                                                  // 8
    highlight: function(code) {                                        // 12
      return hljs.highlightAuto(code).value;                           //
    },                                                                 //
    renderer: new marked.Renderer(),                                   // 12
    gfm: true,                                                         // 12
    tables: true,                                                      // 12
    breaks: false,                                                     // 12
    pedantic: false,                                                   // 12
    sanitize: true,                                                    // 12
    smartLists: true,                                                  // 12
    smartypants: false                                                 // 12
  });                                                                  //
}                                                                      //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=__globals.coffee.js.map
