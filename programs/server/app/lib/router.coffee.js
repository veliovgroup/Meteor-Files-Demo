(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// lib/router.coffee.js                                                //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Router.configure({                                                     // 1
  layoutTemplate: '_layout',                                           // 2
  loadingTemplate: '_loading',                                         // 2
  notFoundTemplate: '_404',                                            // 2
  title: 'Meteor Files: Upload, Server and Manage files'               // 2
});                                                                    //
                                                                       //
Router.plugin('dataNotFound', {                                        // 1
  notFoundTemplate: Router.options.notFoundTemplate                    // 7
});                                                                    //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=router.coffee.js.map
