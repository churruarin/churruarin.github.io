var yt;
const settings = {

};
const urls = {
  urlonline:
    "https://sheets.googleapis.com/v4/spreadsheets/1A2JFdnLfTCNeWCui3_IZ69X201WRHVHr72rwh6n-1oA/values/UpdatedToday?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc"
};

function isOnline() {
  var x;
   $.getJSON(urls.urlonline).done(function (jsonurl) {
      x = jsonata('{"online":$.values[0][0],"link":$.values[1][0]}').evaluate(
        jsonurl
    );
   yt = x;
   return x;
    });

};


function check() {
  var y = isOnline();
  if(y.online != true) {
    window.setTimeout(check, 30000); 
 } else {
location.href = y.link;
 }
};


$(document).ready(function () {
  

check();



});


