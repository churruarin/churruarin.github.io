var yt = {
  online : false,
  link : undefined
}
const settings = {

};
const urls = {
  urlonline:
    "https://sheets.googleapis.com/v4/spreadsheets/1A2JFdnLfTCNeWCui3_IZ69X201WRHVHr72rwh6n-1oA/values/UpdatedToday?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc"
};

function isOnline() {
  var x;
   $.getJSON(urls.urlonline).done(function (jsonurl) {
      x = jsonata('{"online":($toMillis($now(undefined,"-0300"))-$toMillis($.values[0][0]))>0 and ($toMillis($now(undefined,"-0300"))-$toMillis($.values[0][0]))<14400000,"now":$toMillis($now(undefined,"-0300")),"link":$.values[1][0]}').evaluate(jsonurl);
      console.log(x)
    if(x.online == true) {
      console.log(x.link);

    location.href = x.link; 
           $("#pnlEspera").addClass("hidden");
      $("#pnlLinkYoutube").removeClass("hidden");
      $("#spLink").text(x.link);
      $("#aLink").attr("href", x.link); 
   } else {
    console.log("offline");
  window.setTimeout(isOnline, 30000); 
   };

   yt = x;
   return x;
    });

};

/*
function check() {
  isOnline();
  
  if(yt.online == true) {
    console.log("online");
  location.href = yt.link; 
    
 } else {
  console.log("offline");
window.setTimeout(check, 50000); 
 }
};

*/
$(document).ready(function () {
  

isOnline();



});


