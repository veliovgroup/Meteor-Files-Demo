function(t,o,e){var n=void 0;e.watch(t("meteor/meteor"),{Meteor:function(t){n=t}},0);var a=void 0;e.watch(t("meteor/templating"),{Template:function(t){a=t}},1),e.watch(t("./logout.jade")),a.logout.events({"click [data-logout]":function(t){t.preventDefault(),n.logout()}})}

