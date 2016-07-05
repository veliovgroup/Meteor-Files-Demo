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
this._app = {                                                          // 2
  NOOP: function() {}                                                  //
};                                                                     //
                                                                       //
Package['kadira:flow-router'] = Package['ostrio:flow-router-extra'];   // 3
                                                                       //
if (Meteor.isClient) {                                                 // 5
  window.IS_RENDERED = false;                                          //
  if (!ClientStorage.has('blamed') || !_.isArray(ClientStorage.get('blamed'))) {
    ClientStorage.set('blamed', []);                                   //
  }                                                                    //
  if (!ClientStorage.has('unlist') || !_.isBoolean(ClientStorage.get('unlist'))) {
    ClientStorage.set('unlist', true);                                 //
  }                                                                    //
  if (!ClientStorage.has('secured') || !_.isBoolean(ClientStorage.get('secured'))) {
    ClientStorage.set('secured', false);                               //
  }                                                                    //
  if (!ClientStorage.has('userOnly') || !_.isBoolean(ClientStorage.get('userOnly'))) {
    ClientStorage.set('userOnly', false);                              //
  }                                                                    //
  _app.subs = new SubsManager();                                       //
  _app.blamed = new ReactiveVar(ClientStorage.get('blamed'));          //
  _app.unlist = new ReactiveVar(ClientStorage.get('unlist'));          //
  _app.secured = new ReactiveVar(ClientStorage.get('secured'));        //
  _app.uploads = new ReactiveVar(false);                               //
  _app.userOnly = new ReactiveVar(ClientStorage.get('userOnly'));      //
  _app.storeTTL = 86400000;                                            //
  _app.currentUrl = function() {                                       //
    return Meteor.absoluteUrl((FlowRouter.current().path || document.location.pathname).replace(/^\//g, '')).split('?')[0].split('#')[0].replace('!', '');
  };                                                                   //
  _app.storeTTLUser = 432000000;                                       //
  _app.showProjectInfo = new ReactiveVar(false);                       //
  _app.serviceConfiguration = new ReactiveVar({});                     //
  Meteor.call('getServiceConfiguration', function(error, serviceConfiguration) {
    if (error) {                                                       //
      console.error(error);                                            //
    } else {                                                           //
      _app.serviceConfiguration.set(serviceConfiguration);             //
    }                                                                  //
  });                                                                  //
  Meteor.autorun(function() {                                          //
    ClientStorage.set('blamed', _app.blamed.get());                    //
  });                                                                  //
  Meteor.autorun(function() {                                          //
    ClientStorage.set('unlist', _app.unlist.get());                    //
  });                                                                  //
  Meteor.autorun(function() {                                          //
    ClientStorage.set('secured', _app.secured.get());                  //
  });                                                                  //
  Meteor.autorun(function() {                                          //
    ClientStorage.set('userOnly', _app.userOnly.get());                //
  });                                                                  //
  if (!ClientStorage.has('uploadTransport')) {                         //
    ClientStorage.set('uploadTransport', 'ddp');                       //
  }                                                                    //
  Template.registerHelper('urlCurrent', function() {                   //
    return _app.currentUrl();                                          //
  });                                                                  //
  Template.registerHelper('url', function(string) {                    //
    if (string == null) {                                              //
      string = null;                                                   //
    }                                                                  //
    return Meteor.absoluteUrl(string);                                 //
  });                                                                  //
  Template.registerHelper('filesize', function(size) {                 //
    if (size == null) {                                                //
      size = 0;                                                        //
    }                                                                  //
    return filesize(size);                                             //
  });                                                                  //
  Template.registerHelper('extless', function(filename) {              //
    var parts;                                                         // 52
    if (filename == null) {                                            //
      filename = '';                                                   //
    }                                                                  //
    parts = filename.split('.');                                       //
    if (parts.length > 1) {                                            //
      parts.pop();                                                     //
    }                                                                  //
    return parts.join('.');                                            // 54
  });                                                                  //
  Template.registerHelper('DateToISO', function(time) {                //
    if (!time) {                                                       //
      return 0;                                                        // 56
    }                                                                  //
    if (_.isString(time) || _.isNumber(time)) {                        //
      time = new Date(time);                                           //
    }                                                                  //
    return time.toISOString();                                         //
  });                                                                  //
  Template._404.onRendered(function() {                                //
    window.IS_RENDERED = true;                                         //
  });                                                                  //
  Template._layout.helpers({                                           //
    showProjectInfo: function() {                                      //
      return _app.showProjectInfo.get();                               //
    }                                                                  //
  });                                                                  //
  Template._layout.events({                                            //
    'click [data-show-project-info]': function(e, template) {          //
      e.preventDefault();                                              //
      $('.gh-ribbon').toggle();                                        //
      _app.showProjectInfo.set(!_app.showProjectInfo.get());           //
      return false;                                                    //
    }                                                                  //
  });                                                                  //
  marked.setOptions({                                                  //
    highlight: function(code) {                                        //
      return hljs.highlightAuto(code).value;                           //
    },                                                                 //
    renderer: new marked.Renderer(),                                   //
    gfm: true,                                                         //
    tables: true,                                                      //
    breaks: false,                                                     //
    pedantic: false,                                                   //
    sanitize: true,                                                    //
    smartLists: true,                                                  //
    smartypants: false                                                 //
  });                                                                  //
  Meteor.startup(function() {                                          //
    $('html').attr('itemscope', '');                                   //
    $('html').attr('itemtype', 'http://schema.org/WebPage');           //
    $('html').attr('xmlns:og', 'http://ogp.me/ns#');                   //
    $('html').attr('xml:lang', 'en');                                  //
    return $('html').attr('lang', 'en');                               //
  });                                                                  //
}                                                                      //
                                                                       //
/////////////////////////////////////////////////////////////////////////

}).call(this);

//# sourceMappingURL=__globals.coffee.js.map
