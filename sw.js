// 앱 껍데기만 캐시한다. 데이터는 항상 서버에서.
// 배포할 때 index.html 의 APP_VERSION 과 같은 값으로 올린다 — 이름이 바뀌어야 옛 캐시가 버려진다.
var CACHE = "yd-1.3.5";
var ASSETS = ["./", "./index.html", "./config.js", "./manifest.webmanifest", "./icon-192.png", "./logo-pig-t.png", "./logo-pig.png", "./logo-pig-sm.png", "./icon-512.png", "./icon-maskable-192.png", "./icon-maskable-512.png", "./apple-touch-icon.png",
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"];
var SLOW = 4000;   // 이만큼 기다려도 안 오면 캐시로 (연결은 됐는데 안 나가는 상태에서 흰 화면으로 멈추지 않게)
// 하나가 안 받아져도 설치는 된다 — addAll 은 하나라도 실패하면 통째로 실패해 그 기기는 오프라인 지원이 아예 없는 채로 남았다.
// 빠진 건 다음에 받을 때(fetch 핸들러) 채워진다.
self.addEventListener("install", function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    // cache:"reload" — 브라우저 HTTP 캐시(Pages 는 10분)를 건너뛰고 서버에서 새로 받는다. 안 그러면 배포 직후 설치가 옛 파일을 담을 수 있다
    return Promise.all(ASSETS.map(function(a){ return c.add(new Request(a, {cache:"reload"})).catch(function(){}); }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function(e){ e.waitUntil(caches.keys().then(function(ks){ return Promise.all(ks.filter(function(k){return k!==CACHE;}).map(function(k){return caches.delete(k);})); }).then(function(){ return self.clients.claim(); })); });
self.addEventListener("fetch", function(e){
  var isAsset = ASSETS.some(function(a){ return e.request.url === new URL(a, self.location).href; });
  if(!isAsset) return; // API 요청은 건드리지 않음
  // 네트워크 우선. 정상 응답(ok)만 캐시에 넣는다 — 호스팅 장애의 503/404 본문이 멀쩡한 캐시를 덮어쓰지 않게.
  var fromCache = function(){ return caches.match(e.request); };
  // 호스팅이 503/404 를 주면 캐시에 안 넣을 뿐 아니라 보여주지도 않는다 — 캐시가 있으면 그걸로(GitHub Pages 장애 때 깃허브 오류 페이지가 떴다)
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
