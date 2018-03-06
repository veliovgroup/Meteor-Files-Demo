function(t,e,o){var n,a;o.watch(t("meteor/meteor"),{Meteor:function(t){n=t}},0),o.watch(t("meteor/templating"),{Template:function(t){a=t}},1),o.watch(t("./logout.jade")),a.logout.events({"click [data-logout]":function(t){t.preventDefault(),n.logout()}})}

