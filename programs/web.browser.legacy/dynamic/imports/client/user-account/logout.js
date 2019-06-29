function(t,e,o){var n,i;o.link("meteor/meteor",{Meteor:function(t){n=t}},0),o.link("meteor/templating",{Template:function(t){i=t}},1),o.link("./logout.jade"),i.logout.events({"click [data-logout]":function(t){t.preventDefault(),n.logout()}})}

