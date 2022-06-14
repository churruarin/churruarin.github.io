var yt = {
  online : false,
  link : undefined
}
const settings = {

};
var urls = {
  urlonline:
    "https://sheets.googleapis.com/v4/spreadsheets/1A2JFdnLfTCNeWCui3_IZ69X201WRHVHr72rwh6n-1oA/values/UpdatedToday?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc"
};

function isOnline() {
  var x;
   $.getJSON(urls.urlonline).done(function (jsonurl) {
      x = jsonata('{"online":($toMillis($now(undefined,"-0300"))-$toMillis($.values[0][0]))>0 and ($toMillis($now(undefined,"-0300"))-$toMillis($.values[0][0]))<20000000,"now":$toMillis($now(undefined,"-0300")),"link":$.values[1][0]}').evaluate(jsonurl);
      console.log(x)
    if(x.online == true) {
      console.log(x.link);

    //location.href = x.link; 
    $("#btnPlay").attr("href", x.link);
    $("#btnShare").attr("href", "https://wa.me/?text=" + encodeURIComponent(x.link));
           $("#pnlEspera").addClass("hidden");
      $("#pnlLinkYoutube").removeClass("hidden");
      $("#spLink").text(x.link);
      $("#ifYT").attr("src", youtubelink(x.link)); 
      $("#aLink").attr("href", x.link); 
   } else {
    console.log("offline");
  window.setTimeout(isOnline, 30000); 
   };

   yt = x;
   return x;
    });

};
function youtubelink(link) {
  var pattern2 = /(?:http?s?:\/\/)?(?:www\.|m\.)?(?:youtube\.com|youtu\.be)\/(?:watch\?v=)?(.+)/g;
  var replacement = 'https://www.youtube.com/embed/$1?autoplay=1';
  var html = link.replace(pattern2, replacement);
  return html;
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
  
  $.ajaxSetup({ cache: false });
isOnline();



});
