function(e,t,o){let l,n;o.link("meteor/meteor",{Meteor(e){l=e}},0),o.link("meteor/templating",{Template(e){n=e}},1),o.link("./logout.jade"),n.logout.events({"click [data-logout]"(e){e.preventDefault(),l.logout()}})}

