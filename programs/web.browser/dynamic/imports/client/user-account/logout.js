function(t,e,o){let a,l;o.watch(t("meteor/meteor"),{Meteor(t){a=t}},0),o.watch(t("meteor/templating"),{Template(t){l=t}},1),o.watch(t("./logout.jade")),l.logout.events({"click [data-logout]"(t){t.preventDefault(),a.logout()}})}

