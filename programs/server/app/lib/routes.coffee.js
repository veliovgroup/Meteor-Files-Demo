(function(){

/////////////////////////////////////////////////////////////////////////
//                                                                     //
// lib/routes.coffee.js                                                //
//                                                                     //
/////////////////////////////////////////////////////////////////////////
                                                                       //
__coffeescriptShare = typeof __coffeescriptShare === 'object' ? __coffeescriptShare : {}; var share = __coffeescriptShare;
Router.map(function() {                                                // 1
  this.route('index', {                                                // 2
    template: 'index',                                                 // 3
    path: '/',                                                         // 3
    waitOn: function() {                                               // 3
      return _app.subs.subscribe('latest', 50);                        //
    }                                                                  //
  });                                                                  //
  return this.route('file', {                                          //
    template: 'file',                                                  // 8
    path: '/:_id',                                                     // 8
    waitOn: function() {                                               // 8
      return _app.subs.subscribe('file', this.params._id);             //
    },                                                                 //
    data: function() {                                                 // 8
      return Collections.files.collection.findOne(this.params._id);    //
    },                                                                 //
    title: function() {                                                // 8
      var file;                                                        // 13
      file = this.data();                                              // 13
      if (this.params._id && file) {                                   // 14
        return "View File: " + file.name;                              // 14
      }                                                                //
    }                                                                  //
  });                                                                  //
});                                                                    // 1
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=routes.coffee.js.map
