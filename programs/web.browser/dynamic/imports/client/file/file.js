function(e,t,i){let l,s,a,n,o,r;i.watch(e("meteor/http"),{HTTP(e){l=e}},0),i.watch(e("meteor/meteor"),{Meteor(e){s=e}},1),i.watch(e("meteor/templating"),{Template(e){a=e}},2),i.watch(e("meteor/reactive-var"),{ReactiveVar(e){n=e}},3),i.watch(e("/imports/lib/core.js"),{_app(e){o=e},Collections(e){r=e}},4),i.watch(e("./file.jade"));let h=!1;const c=new n(!1),d=new n(!1),f=new n(!1),p=new n(!1),w=new n(!1),g=new n(!1);a.file.onRendered(function(){if(g.set(!1),d.set(!1),this.data.file){if(this.data.file.isText||this.data.file.isJSON)this.data.file.size<65536?l.call("GET",this.data.file.link(),(e,t)=>{f.set(!0),e?console.error(e):~[500,404,400].indexOf(t.statusCode)||(t.content.length<65536?d.set(t.content):g.set(!0))}):g.set(!0);else if(this.data.file.isImage){const e=new Image;if(/png|jpe?g/i.test(this.data.file.type)){let t;e.onload=(()=>{f.set(!0)}),e.onerror=(()=>{p.set(!0)}),null!=this.data.file.versions&&null!=this.data.file.versions.preview&&this.data.file.versions.preview.extension?e.src=this.data.file.link("preview"):t=r.files.find(this.data.file._id).observeChanges({changed:(i,l)=>{null!=l&&null!=l.versions&&null!=l.versions.preview&&l.versions.preview.extension&&(e.src=this.data.file.link("preview"),t.stop())}})}else e.onload=(()=>{c.set(!0)}),e.onerror=(()=>{p.set(!0)}),e.src=this.data.file.link()}else if(this.data.file.isVideo){const e=o.getElementFromView(this.view._domrange.parentElement,this.data.file._id);if(!e)return;if(e.canPlayType(this.data.file.type)){const t=e.play();("[object Promise]"===Object.prototype.toString.call(t)||"[object Object]"===Object.prototype.toString.call(t)&&t.then&&"[object Function]"===Object.prototype.toString.call(t.then))&&t.then(o.NOOP).catch(o.NOOP)}else p.set(!0)}else if(this.data.file.isAudio){const e=o.getElementFromView(this.view._domrange.parentElement,this.data.file._id);if(!e)return;if(e.canPlayType(this.data.file.type)){const t=e.play();("[object Promise]"===Object.prototype.toString.call(t)||"[object Object]"===Object.prototype.toString.call(t)&&t.then&&"[object Function]"===Object.prototype.toString.call(t.then))&&t.then(o.NOOP).catch(o.NOOP)}else p.set(!0)}window.IS_RENDERED=!0}else window.IS_RENDERED=!0}),a.file.helpers({warning:()=>g.get(),getCode(){return this.type&&~this.type.indexOf("/")?this.type.split("/")[1]:""},isBlamed(){return!!~o.blamed.get().indexOf(this._id)},showInfo:()=>w.get(),showError:()=>p.get(),fetchedText:()=>d.get(),showPreview:()=>f.get(),showOriginal:()=>c.get()}),a.file.events({"click [data-blame]"(e){e.preventDefault();const t=o.blamed.get();return~t.indexOf(this._id)?(t.splice(t.indexOf(this._id),1),o.blamed.set(t),s.call("unblame",this._id)):(t.push(this._id),o.blamed.set(t),s.call("blame",this._id)),!1},"click [data-show-info]":e=>(e.preventDefault(),w.set(!w.get()),!1),"touchmove .file-overlay":e=>(e.preventDefault(),!1),"touchmove .file"(e,t){t.$(e.currentTarget).height()<t.$(".file-table").height()&&(t.$("a.show-info").hide(),t.$("h1.file-title").hide(),t.$("a.download-file").hide(),h&&s.clearTimeout(h),h=s.setTimeout(()=>{t.$("a.show-info").show(),t.$("h1.file-title").show(),t.$("a.download-file").show()},768))}})}

