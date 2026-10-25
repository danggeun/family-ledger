// 앱 껍데기만 캐시한다. 데이터는 항상 서버에서.
// 배포 때 index.html 의 APP_VERSION 과 같이 올린다. 이름이 바뀌어야 옛 캐시가 버려진다.
var CACHE = "yd-1.3.10";
var ASSETS = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icon-192.png", "./logo-pig-t.png", "./logo-pig.png", "./logo-pig-sm.png", "./icon-512.png", "./icon-maskable-192.png", "./icon-maskable-512.png", "./apple-touch-icon.png",
  "./vendor/supabase-js-2.45.4.js"];
var SLOW = 4000;   // ms. 네트워크가 이보다 늦으면 캐시로(연결만 되고 응답이 없을 때 흰 화면 방지)
// addAll 대신 하나씩: 하나가 실패해도 설치는 되고 빠진 건 fetch 때 채워진다.
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    // cache:"reload": HTTP 캐시(Pages 10분)를 건너뛴다. 아니면 배포 직후 설치가 옛 파일을 담는다
    return Promise.all(ASSETS.map(function(a){ return c.add(new Request(a, {cache:"reload"})).catch(function(){}); }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);})); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener("fetch", function(e){
  var isAsset = ASSETS.some(function(a){ return e.request.url === new URL(a, self.location).href; });
  if(!isAsset) return; // API 요청은 건드리지 않음
  // 네트워크 우선. 오류 응답(503/404)은 캐시에 넣지도 보여주지도 않고, 캐시가 있으면 캐시로.
  var fromCache = function(){ return caches.match(e.request); };
  var net = fetch(e.request).then(function(r){
    if(r.ok || r.type==="opaque"){ var copy=r.clone(); caches.open(CACHE).then(function(c){ c.put(e.request, copy); }); return r; }
    return fromCache().then(function(m){ return m || r; });
  });
  var slow = new Promise(function(res){ setTimeout(function(){ fromCache().then(function(m){ if(m) res(m); }); }, SLOW); });
  e.respondWith(Promise.race([
    net.catch(function(){ return fromCache().then(function(m){ return m || Response.error(); }); }),
    slow
  ]));
});
