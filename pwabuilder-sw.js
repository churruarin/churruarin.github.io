//This is the service worker with the Cache-first network

var CACHE = 'pwabuilder-precache';
var precacheFiles = [
 'index.html',
 'favicon.ico', 
 'inicio.html', 
 'menu.html', 
 'css/PTSans.css', 
 'css/bootstrap-theme.min.css', 
 'css/bootstrap.min.css', 
 'css/cartodb.css', 
 'css/jquery-select-step.css', 
 'css/jquery.bootstrap-touchspin.min.css', 
 'fonts/PTSans-bold.woff2', 
 'fonts/PTSans.woff2', 
 'fonts/glyphicons-halflings-regular.eot', 
 'fonts/glyphicons-halflings-regular.svg', 
 'fonts/glyphicons-halflings-regular.ttf', 
 'fonts/glyphicons-halflings-regular.woff', 
 'fonts/glyphicons-halflings-regular.woff2', 
 'js/angular-route.min.js', 
 'js/angular.min.js', 
 'js/bootstrap.js', 
 'js/bootstrap.min.js', 
 'js/config.js', 
 'js/jquery-select-step.js', 
 'js/jquery.bootstrap-touchspin.min.js', 
 'js/jquery.min.js', 
 'js/json3.min.js', 
 'js/jsonQ.min.js', 
 'js/script.js', 
 'js/viz.json', 
 'predicacion/campaña.html', 
 'predicacion/grupos.html', 
 'predicacion/informar.html', 
 'predicacion/publica.html', 
 'predicacion/salidas.html', 
 'predicacion/telefonica.html', 
 'predicacion/territorios.html', 
 'reuniones/emision.html', 
 'reuniones/programa.html', 
 'static/index.html', 
 'util/util.html',
 'manifest.json'
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
  return caches.open(CACHE).then(function (cache) {
    return cache.addAll(precacheFiles);
  });
const reqprograma = new Request('https://docs.google.com/spreadsheets/d/1BzuB98iqVhP6h2hr6RJELaRFOc9O2A5bj74mvQyapSQ/pubhtml', { mode: 'no-cors' });
fetch(reqprograma).then(response => cache.put(reqprograma, response));
 const reqsalidas = new Request('https://docs.google.com/spreadsheets/d/1JuiB_XVz-jO_0Yrzu82pF2d3cbWkDhBwhcp5wF2lOrA/pubhtml?gid=0&single=false&widget=false&headers=false&chrome=false', { mode: 'no-cors' });
fetch(reqsalidas).then(response => cache.put(reqsalidas, response));
 
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
