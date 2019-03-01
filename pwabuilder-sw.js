
var CACHE = 'pwabuilder-precache';
var precacheFiles = [
 'index.html',
 'favicon.ico', 
 'app/inicio.html', 
 'app/menu.html', 
 'app/css/PTSans.css', 
 'app/css/bootstrap.min.css', 
 'app/fonts/PTSans-bold.woff2', 
 'app/fonts/PTSans.woff2', 
 'app/fonts/glyphicons-halflings-regular.woff2', 
 'app/js/config.js', 
 'app/js/script.js', 
 'app/predicacion/campaña.html', 
 'app/predicacion/grupos.html', 
 'app/predicacion/informar.html', 
 'app/predicacion/publica.html', 
 'app/predicacion/salidas.html', 
 'app/predicacion/telefonica.html', 
 'app/predicacion/territorios.html', 
 'app/predicacion/territorios_offline.html',
 'app/reuniones/emision.html', 
 'app/reuniones/programa.html', 
 'app/util/util.html',
 'manifest.json',
 '//cartocdn-gusc.global.ssl.fastly.net/abelbour/api/v1/map/static/bbox/92e7ecdffa05ca22406477b1df7aee0f:1551406728475/-60.502903,-31.763288,-60.477172,-31.727341/1200/2000.jpg?loc=parana1',
 '//cartocdn-gusc.global.ssl.fastly.net/abelbour/api/v1/map/static/bbox/92e7ecdffa05ca22406477b1df7aee0f:1551406728475/-60.477172,-31.763288,-60.451487,-31.727341/1200/2000.jpg?loc=parana2',
 '//cartocdn-gusc.global.ssl.fastly.net/abelbour/api/v1/map/static/bbox/92e7ecdffa05ca22406477b1df7aee0f:1551406728475/-60.08291959762573,-31.58966745708685,-60.0586724281311,-31.573307117448653/1200/950.jpg?loc=cerrito',
 '//cartocdn-gusc.global.ssl.fastly.net/abelbour/api/v1/map/static/bbox/7cb7e85f4704d6c7da59610fd67311c7:1542137119044/-60.50501346588134,-31.76480766594335,-60.450639724731445,-31.7266340593787/1300/1100.jpg?loc=grupos'
    ];

var precacheFilesCors = [
 '//docs.google.com/spreadsheets/d/1BzuB98iqVhP6h2hr6RJELaRFOc9O2A5bj74mvQyapSQ/pubhtml',
 '//docs.google.com/spreadsheets/d/1JuiB_XVz-jO_0Yrzu82pF2d3cbWkDhBwhcp5wF2lOrA/pubhtml?gid=0&single=false&widget=false&headers=false&chrome=false',
 '//fonts.googleapis.com/css?kit=g_LZtaoq_teJt-nj1lQIUoSKLf7XBDVIYWf0YGjmOuE',
 '//ssl.gstatic.com/docs/spreadsheets/publishheader.png',
 '//ssl.gstatic.com/docs/spreadsheets/waffle_sprite53.png',
 '//cartodb-libs.global.ssl.fastly.net/cartodb.js/v3/3.15/themes/css/cartodb.css',
 '//cartodb-libs.global.ssl.fastly.net/cartodb.js/v3/3.15.9/cartodb.js',
 '//ajax.googleapis.com/ajax/libs/angularjs/1.7.7/angular.min.js',
 '//ajax.googleapis.com/ajax/libs/angularjs/1.7.7/angular-route.min.js',
 '//ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js',
 '//maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js',
 '//cdnjs.cloudflare.com/ajax/libs/json3/3.3.2/json3.min.js',
 '//cdnjs.cloudflare.com/ajax/libs/es7-shim/6.0.0/es7-shim.min.js',
 '//ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js',
 '//fonts.googleapis.com/icon?family=Material+Icons'
    ];

var precacheFilesNoCors = [
  '//docs.google.com/static/spreadsheets2/client/css/471841686-waffle_k_ltr.css'
    ];

//Install stage sets up the cache-array to configure pre-cache content
self.addEventListener('install', function(evt) {
  console.log('[PWA Builder] The service worker is being installed.');
  evt.waitUntil(precache().then(function() {
    console.log('[PWA Builder] Skip waiting on install');
    return self.skipWaiting();
  }));
});


//allow sw to control of current page
self.addEventListener('activate', function(event) {
  console.log('[PWA Builder] Claiming clients for current page');
  return self.clients.claim();
});

self.addEventListener('fetch', function(evt) {
  console.log('[PWA Builder] The service worker is serving the asset.'+ evt.request.url);
  evt.respondWith(fromCache(evt.request).catch(fromServer(evt.request)));
  evt.waitUntil(update(evt.request));
});


function precache() {
 caches.open(CACHE)
      .then(function(cache) {
        console.log('Opened cache');
        // Magic is here. Look the  mode: 'no-cors' part.
        cache.addAll(precacheFilesCors.map(function(precacheFilesCors) {
           return new Request(precacheFilesCors, { mode: 'cors' });
        })).then(function() {
          console.log('All resources have been fetched and cached.');
        });
      });
  caches.open(CACHE)
      .then(function(cache) {
        console.log('Opened cache');
        // Magic is here. Look the  mode: 'no-cors' part.
        cache.addAll(precacheFilesNoCors.map(function(precacheFilesNoCors) {
           return new Request(precacheFilesNoCors, { mode: 'no-cors' });
        })).then(function() {
          console.log('All resources have been fetched and cached.');
        });
      });
  return caches.open(CACHE).then(function (cache) {
    return cache.addAll(precacheFiles);
  });
}

function fromCache(request) {
  //we pull files from the cache first thing so we can show them fast
  return caches.open(CACHE).then(function (cache) {
    return cache.match(request).then(function (matching) {
      return matching || Promise.reject('no-match');
    });
  });
}

function update(request) {
  //this is where we call the server to get the newest version of the 
  //file to use the next time we show view
  return caches.open(CACHE).then(function (cache) {
    return fetch(request).then(function (response) {
      return cache.put(request, response);
    });
  });
}

function fromServer(request){
  //this is the fallback if it is not in the cache to go to the server and get it
  return fetch(request).then(function(response){ return response});
}
