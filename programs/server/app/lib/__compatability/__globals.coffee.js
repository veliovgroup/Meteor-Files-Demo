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
  storeTTL: 259200000                                                  // 3
};                                                                     //
                                                                       //
if (Meteor.isClient) {                                                 // 6
  Template.registerHelper('filesize', function(size) {                 // 7
    return filesize(size);                                             //
  });                                                                  //
  Template.registerHelper('extless', function(filename) {              // 7
    return filename.split('.')[0];                                     //
  });                                                                  //
  marked.setOptions({                                                  // 7
    highlight: function(code) {                                        // 11
      return hljs.highlightAuto(code).value;                           //
    },                                                                 //
    renderer: new marked.Renderer(),                                   // 11
    gfm: true,                                                         // 11
    tables: true,                                                      // 11
    breaks: false,                                                     // 11
    pedantic: false,                                                   // 11
    sanitize: true,                                                    // 11
    smartLists: true,                                                  // 11
    smartypants: false                                                 // 11
  });                                                                  //
}                                                                      //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=__globals.coffee.js.map
