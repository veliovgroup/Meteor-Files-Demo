function(){Template.__checkName("index"),Template.index=new Template("Template.index",function(){var e=this;return HTML.DIV({class:function(){return["col-50"," ","sm-row"," ",Blaze.Unless(function(){return Spacebars.dataMustache(e.lookup("compare"),Spacebars.dot(e.lookup("latest"),"count"),"or",e.lookup("uploads"))},function(){return"no-file"})]}},Blaze.If(function(){return Spacebars.dataMustache(e.lookup("compare"),Spacebars.dot(e.lookup("latest"),"count"),"or",e.lookup("uploads"))},function(){return HTML.DIV({class:"listing"},HTML.TABLE({class:"table"},HTML.TBODY(Blaze.Each(function(){return Spacebars.call(e.lookup("uploads"))},function(){return Spacebars.include(e.lookupTemplate("uploadRow"))}),"\n",Blaze.Each(function(){return Spacebars.call(Spacebars.dot(e.lookup("latest"),"each"))},function(){return Spacebars.include(e.lookupTemplate("listingRow"))}),"\n",Blaze.If(function(){return Spacebars.dataMustache(e.lookup("compare"),e.lookup("filesLength"),">",Spacebars.dot(e.lookup("latest"),"count"))},function(){return HTML.TR(HTML.TD({"data-load-more":"",colspan:"3"},HTML.H3({class:["no-margin"," ","center"]},Blaze.If(function(){return Spacebars.call(e.lookup("loadMore"))},function(){return HTML.I({class:["la"," ","la-circle-o-notch"," ","la-spin"]})},function(){return"Load More"}))))}))))},function(){return HTML.H3({class:"files-note"},Blaze.If(function(){return Spacebars.call(e.lookup("userOnly"))},function(){return"You have no uploaded files"},function(){return"Be the first to upload a file"}))}))})}

