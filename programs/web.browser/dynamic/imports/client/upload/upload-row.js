function(t,e,i){let n,s,o;i.watch(t("meteor/momentjs:moment"),{moment(t){n=t}},0),i.watch(t("meteor/mrt:filesize"),{filesize(t){s=t}},1),i.watch(t("meteor/templating"),{Template(t){o=t}},2),i.watch(t("./upload-row.jade")),o.uploadRow.helpers({estimateBitrate:function(){return s(this.estimateSpeed.get(),{bits:!0})+"/s"},getProgressClass:function(){let t=5*Math.ceil(this.progress.get()/5);return t>100&&(t=100),t},estimateDuration:function(){const t=n.duration(this.estimateTime.get());let e=""+t.hours();e.length<=1&&(e="0"+e);let i=""+t.minutes();i.length<=1&&(i="0"+i);let s=""+t.seconds();return s.length<=1&&(s="0"+s),e+":"+i+":"+s}}),o.uploadRow.events({"click [data-toggle-upload]"(t){return t.preventDefault(),this.toggle(),!1}})}

