// 앱 껍데기만 캐시한다. 데이터는 항상 서버에서.
// 배포할 때 index.html 의 APP_VERSION 과 같은 값으로 올린다 — 이름이 바뀌어야 옛 캐시가 버려진다.
var CACHE = "yd-1.1.3";
var ASSETS = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icon-192.png", "./logo-pig-t.png", "./splash.png", "./logo-pig.png", "./logo-pig-sm.png", "./icon-512.png", "./icon-maskable-192.png", "./icon-maskable-512.png", "./apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"];
self.addEventListener("install", function(e){ e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); })); });
self.addEventListener("activate", function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);})); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener("fetch", function(e){
  var url = new URL(e.request.url);
  var isAsset = ASSETS.some(function(a){ return e.request.url === new URL(a, self.location).href; });
  if(!isAsset) return; // API 요청은 건드리지 않음
  e.respondWith(fetch(e.request).then(function(r){ var copy=r.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, copy); }); return r; }).catch(function(){ return caches.match(e.request); }));
});
