// 서비스워커: 하나가 안 받아져도 설치, 장애 응답은 캐시를 덮지 않음, 안 오면 4초 뒤 캐시로.
// file:// 에선 서비스워커가 안 되므로 http 서버를 띄운다. "끊김"은 소켓을 끊어서 만든다.
const {chromium}=require('playwright');
const http=require('http'), fs=require('fs'), path=require('path');
const env=require('./_env');
const {T, done, errs, section, settle, ready, VP, watch}=require('./_harness');
const ROOT=path.resolve(__dirname,'..');
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
const knobs={notFound:new Set(['/logo-pig.png']), status:200, delayIndex:0, down:false};
// 응답마다 X-Serial 번호: 늦게 온 index 가 캐시에 들어갔는지 확인용
let serial=0, lateSent=null;
const srv=http.createServer((req,res)=>{
  if(knobs.down){ req.socket.destroy(); return; }
  let u=decodeURIComponent(req.url.split('?')[0]); if(u==='/') u='/index.html';
  if(knobs.notFound.has(u)){ res.writeHead(404); res.end('no'); return; }
  const f=path.join(ROOT,u);
  if(!fs.existsSync(f)||fs.statSync(f).isDirectory()){ res.writeHead(404); res.end(); return; }
  const send=()=>{
    const s=++serial;
    if(u==='/index.html' && knobs.status!==200){ res.writeHead(knobs.status,{'Content-Type':'text/html','X-Serial':String(s)}); res.end('<h1>down</h1>'); return s; }
    res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store','X-Serial':String(s)});
    fs.createReadStream(f).pipe(res); return s;
  };
  if(u==='/index.html' && knobs.delayIndex){ const late=lateSent; setTimeout(()=>late.resolve(send()), knobs.delayIndex); } else send();
});
const deferred=()=>{ let resolve; const pr=new Promise(r=>resolve=r); pr.resolve=resolve; return pr; };


(async()=>{
await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const BASE='http://127.0.0.1:'+srv.address().port+'/';
const b=await chromium.launch(Object.assign({args:['--no-proxy-server']}, process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{}));
const ctx=await b.newContext(VP);
await ctx.addInitScript(env.LOCAL);
const p=await ctx.newPage(); watch(p);
const seed=()=>localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K7PM'},children:[
  {id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:16300,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'}],entries:[]}));
// 새로고침 뒤 앱이든 장애 본문(<h1>down)이든 그려질 때까지
const shown=async()=>{
  await p.waitForFunction(()=>/down/.test((document.querySelector('h1')||{}).textContent||'')
    || (window.__app && window.__app.S.screen!=='loading' && document.getElementById('app').children.length>0));
  await settle(p);
};
const bal=()=>p.$eval('.balbtn b',e=>e.textContent).catch(()=>null);   // 없으면 기다리지 않고 null

// ── M6: 자산 하나(logo-pig.png)가 404 여도 설치된다
await section('M6 설치', async()=>{
  await p.goto(BASE+'index.html'); await ready(p); await p.evaluate(seed);
  // 설치(waitUntil)가 끝나야 활성화된다. 설치가 깨지면 영영 안 오니 상한을 넉넉히 둔다
  await p.evaluate(()=>{ window.__swOn=false; navigator.serviceWorker.ready.then(r=>{ const w=r.active, on=()=>{ if(w.state==='activated') window.__swOn=true; };
    on(); w.addEventListener('statechange', on); }); });
  await p.waitForFunction(()=>window.__swOn, null, {timeout:20000});
  const cached=await p.evaluate(async()=>{ const ks=await caches.keys(); const c=await caches.open(ks[0]);
    return {names:ks, index:!!(await c.match('./index.html')), config:!!(await c.match('./config.js')), splash:!!(await c.match('./logo-pig.png')), pig:!!(await c.match('./logo-pig-sm.png'))}; });
  const VER=(fs.readFileSync(path.join(ROOT,'index.html'),'utf8').match(/APP_VERSION = "([^"]+)"/)||[])[1];
  T('M6 캐시 이름 = yd-'+VER+' (index.html 의 APP_VERSION 과 같다)', cached.names.length===1 && cached.names[0]==='yd-'+VER);
  T('M6 하나가 404 여도 설치되고 나머지는 캐시됨', cached.index && cached.config && cached.pig && !cached.splash);
  await p.reload(); await ready(p);
  T('워커가 페이지를 맡는다', await p.evaluate(()=>!!navigator.serviceWorker.controller));
  T('정상: 홈이 뜬다', (await p.textContent('.balbtn b'))==='16,300');
});

// ── M5: 503 은 캐시를 덮지 않는다
await section('M5 장애 응답', async()=>{
  knobs.status=503;
  await p.reload(); await shown();
  T('M5 서버가 503 이면 캐시의 멀쩡한 index 로 (1.2.3 — 전엔 503 본문이 그대로 보였다)', !/<h1>down/.test(await p.content()) && (await bal())==='16,300');
  knobs.status=200; knobs.down=true;                                // 이제 아예 끊김
  await p.reload(); await shown();
  T('M5 끊기면 캐시의 멀쩡한 index (503 본문이 아니다)', !/<h1>down/.test(await p.content()) && (await bal())==='16,300');
});

// ── M5: 연결은 됐는데 안 오면 4초 뒤 캐시로
await section('M5 느린 서버', async()=>{
  knobs.down=false; knobs.delayIndex=8000; lateSent=deferred();
  // 진짜 시간: 서비스워커의 4초(SLOW) 경주 자체를 잰다(걸린 시간이 판정)
  const t0=Date.now(); await p.reload({waitUntil:'domcontentloaded'}); await p.waitForSelector('.balbtn b',{timeout:7000}); const dt=Date.now()-t0;
  T('M5 느린 서버: 4초쯤 뒤 캐시로 뜬다 ('+dt+'ms)', dt>3500 && dt<7000 && (await p.textContent('.balbtn b'))==='16,300');
  knobs.delayIndex=0;
  // 진짜 시간: 서버가 8초 붙잡은 응답이 캐시에 들어갈 때까지(X-Serial 로 확인)
  const late=String(await Promise.race([lateSent, new Promise((_,no)=>setTimeout(()=>no(new Error('늦은 index 요청이 서버에 안 왔다')), 15000))]));   // 상한일 뿐
  const ok=await p.evaluate((s)=>new Promise(res=>{ const end=performance.now()+10000;
    const tick=()=>caches.match('./index.html').then(r=>{ if(r && r.headers.get('X-Serial')===s) res(true); else if(performance.now()>end) res(false); else requestAnimationFrame(tick); });
    tick(); }), late);
  if(!ok) throw new Error('늦게 온 index('+late+')가 캐시에 안 들어갔다');
  await settle(p);
});

// ── 오프라인에서 열기
await section('오프라인', async()=>{
  knobs.down=true;
  await p.reload(); await shown();
  T('오프라인: 기록이 그대로 보인다', (await bal())==='16,300');
});

await ctx.close(); srv.close();
await done(b);
})();
