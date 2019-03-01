
var CACHE = 'pwabuilder-precache';
var precacheFiles = [
 'index.html',
 'favicon.ico', 
 'app/inicio.html', 
 'app/menu.html', 
 'app/css/PTSans.css', 
 'app/css/bootstrap-theme.min.css', 
 'app/css/bootstrap.min.css', 
 'app/fonts/PTSans-bold.woff2', 
 'app/fonts/PTSans.woff2', 
 'app/fonts/glyphicons-halflings-regular.woff2', 
 'app/js/angular-route.min.js', 
 'app/js/angular.min.js', 
 'app/js/bootstrap.min.js', 
 'app/js/config.js', 
 'app/js/jquery.min.js', 
 'app/js/json3.min.js', 
 'app/js/jsonQ.min.js', 
 'app/js/script.js', 
 'app/predicacion/campaña.html', 
 'app/predicacion/grupos.html', 
 'app/predicacion/informar.html', 
 'app/predicacion/publica.html', 
 'app/predicacion/salidas.html', 
 'app/predicacion/telefonica.html', 
 'app/predicacion/territorios.html', 
 'app/reuniones/emision.html', 
 'app/reuniones/programa.html', 
 'app/util/util.html',
 'manifest.json'
    ];

var precacheFilesCors = [
 '//docs.google.com/spreadsheets/d/1BzuB98iqVhP6h2hr6RJELaRFOc9O2A5bj74mvQyapSQ/pubhtml',
 '//docs.google.com/spreadsheets/d/1JuiB_XVz-jO_0Yrzu82pF2d3cbWkDhBwhcp5wF2lOrA/pubhtml?gid=0&single=false&widget=false&headers=false&chrome=false',
 '//fonts.googleapis.com/css?kit=g_LZtaoq_teJt-nj1lQIUoSKLf7XBDVIYWf0YGjmOuE',
 '//ssl.gstatic.com/docs/spreadsheets/publishheader.png',
 '//ssl.gstatic.com/docs/spreadsheets/waffle_sprite53.png',
 'static/territorios.html',
 '//cartodb-libs.global.ssl.fastly.net/cartodb.js/v3/3.15/themes/css/cartodb.css',
 '//cartodb-libs.global.ssl.fastly.net/cartodb.js/v3/3.15.9/cartodb.js',
 '//maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js',
 '//ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js'
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
