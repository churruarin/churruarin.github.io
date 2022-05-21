var LinkYT;
var online = false;

const settings = {

};
const urls = {
  urlonline:
    "https://sheets.googleapis.com/v4/spreadsheets/1A2JFdnLfTCNeWCui3_IZ69X201WRHVHr72rwh6n-1oA/values/UpdatedToday?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc"
};

async function isOnline() {
  var x;
    await $.getJSON(urls.urlonline).done(function (jsonurl) {
      x = jsonata('{"online":$.values[0][0],"link":$.values[1][0]}').evaluate(
        jsonurl
      );
    });
    
   return x;
}


async function check() {
  var y = await isOnline()
  if(y.online != true) {
    window.setTimeout(checkFlag, 30000); /* this checks the flag every 100 milliseconds*/
 } else {
location.href = x.link;
 }
}


$(document).ready(function () {
  

//check()



});


