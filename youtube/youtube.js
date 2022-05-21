var LinkYT;
var online;

const settings = {

};
const urls = {
  urllinkYT:
    "https://sheets.googleapis.com/v4/spreadsheets/1A2JFdnLfTCNeWCui3_IZ69X201WRHVHr72rwh6n-1oA/values/LinkYT?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc",
  urlonline:
    "https://sheets.googleapis.com/v4/spreadsheets/1A2JFdnLfTCNeWCui3_IZ69X201WRHVHr72rwh6n-1oA/values/UpdatedToday?alt=json&key=AIzaSyCz4sutc6Z6Hh5FtBTB53I8-ljkj6XWpPc"
};

async function isOnline() {
    await $.getJSON(urls.urlonline).done(function (jsonurl) {
      online = jsonata('$.values.($)').evaluate(
        jsonurl
      );
    });
  return online;
}

async function link() {
  await $.getJSON(urls.urllinkYT).done(function (jsonurl) {
    linkYT = jsonata('$.values.($)').evaluate(
      jsonurl
    );
  });
return linkYT;
}


