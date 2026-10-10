// 1.1.9 — 서비스워커: 하나가 안 받아져도 설치되고, 장애 응답은 캐시를 덮지 않고, 안 오면 4초 뒤 캐시로.
// 서비스워커는 file:// 에서 안 되므로 테스트 안에서 http 서버를 띄운다. "끊김"은 소켓을 끊어서 만든다.
const {chromium}=require('playwright');
const http=require('http'), fs=require('fs'), path=require('path');
let pass=0,fail=0; const T=(n,ok)=>{ok?pass++:fail++;console.log((ok?'OK   ':'FAIL ')+n);};
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const knobs={notFound:new Set(['/logo-pig.png']), status:200, delayIndex:0, down:false};
const srv=http.createServer((req,res)=>{
  if(knobs.down){ req.socket.destroy(); return; }
  let u=decodeURIComponent(req.url.split('?')[0]); if(u==='/') u='/index.html';
  if(knobs.notFound.has(u)){ res.writeHead(404); res.end('no'); return; }
  const f=path.join(ROOT,u);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){ res.writeHead(404); res.end(); return; }
  const send=()=>{
    if(u==='/index.html' && knobs.status!==200){ res.writeHead(knobs.status,{'Content-Type':'text/html'}); res.end('<h1>down</h1>'); return; }
    res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(f).pipe(res);
  };
  if(u==='/index.html' && knobs.delayIndex) setTimeout(send, knobs.delayIndex); else send();
});
(async()=>{
await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const BASE='http://127.0.0.1:'+srv.address().port+'/';
const b=await chromium.launch(Object.assign({args:['--no-proxy-server']}, process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{}));
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await ctx.addInitScript(require('./_env').LOCAL);
const p=await ctx.newPage(); require('./_env').guard(p); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const seed=()=>localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K7PM'},children:[
  {id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:16300,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'}],entries:[]}));

// ── M6: 자산 하나(logo-pig.png)가 404 여도 설치된다 ──
await p.goto(BASE+'index.html'); await p.evaluate(seed);
await p.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
await p.waitForTimeout(1500);                                   // install 의 add 들이 끝날 시간
const cached=await p.evaluate(async()=>{ const ks=await caches.keys(); const c=await caches.open(ks[0]);
  return {names:ks, index:!!(await c.match('./index.html')), config:!!(await c.match('./config.js')), splash:!!(await c.match('./logo-pig.png')), pig:!!(await c.match('./logo-pig-sm.png'))}; });
const VER=(fs.readFileSync(path.join(ROOT,'index.html'),'utf8').match(/APP_VERSION = "([^"]+)"/)||[])[1];
T('M6 캐시 이름 = yd-'+VER+' (index.html 의 APP_VERSION 과 같다)', cached.names.length===1 && cached.names[0]==='yd-'+VER);
T('M6 하나가 404 여도 설치되고 나머지는 캐시됨', cached.index && cached.config && cached.pig && !cached.splash);
await p.reload(); await p.waitForTimeout(800);
T('워커가 페이지를 맡는다', await p.evaluate(()=>!!navigator.serviceWorker.controller));
T('정상: 홈이 뜬다', (await p.textContent('.balbtn b'))==='16,300');

// ── M5: 503 은 캐시를 덮지 않는다 ──
knobs.status=503;
await p.reload(); await p.waitForTimeout(800);
T('M5 서버가 503 이면 캐시의 멀쩡한 index 로 (1.2.3 — 전엔 503 본문이 그대로 보였다)', !/<h1>down/.test(await p.content()) && (await p.textContent('.balbtn b'))==='16,300');
knobs.status=200; knobs.down=true;                                // 이제 아예 끊김
await p.reload(); await p.waitForTimeout(1500);
T('M5 끊기면 캐시의 멀쩡한 index (503 본문이 아니다)', !/<h1>down/.test(await p.content()) && (await p.textContent('.balbtn b'))==='16,300');

// ── M5: 연결은 됐는데 안 오면 4초 뒤 캐시로 ──
knobs.down=false; knobs.delayIndex=8000;
const t0=Date.now(); await p.reload({waitUntil:'domcontentloaded'}); await p.waitForSelector('.balbtn b',{timeout:7000}); const dt=Date.now()-t0;
T('M5 느린 서버: 4초쯤 뒤 캐시로 뜬다 ('+dt+'ms)', dt>3500 && dt<7000 && (await p.textContent('.balbtn b'))==='16,300');
knobs.delayIndex=0; await p.waitForTimeout(8500);                  // 늦게 온 응답이 캐시에 들어가는 것까지 기다린다

// ── 오프라인에서 열기 ──
knobs.down=true;
await p.reload(); await p.waitForTimeout(1500);
T('오프라인: 기록이 그대로 보인다', (await p.textContent('.balbtn b'))==='16,300');
T('콘솔 에러 없음', errs.length===0);

await ctx.close(); await b.close(); srv.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);})();
