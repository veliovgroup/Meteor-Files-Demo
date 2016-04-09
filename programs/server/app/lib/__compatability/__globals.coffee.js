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
}                                                                      //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=__globals.coffee.js.map
