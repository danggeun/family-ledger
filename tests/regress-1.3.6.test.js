// 1.3.6 — 처음 안내에 가족 코드(동기화) 단계가 없던 것 · supabase-js 를 바깥 CDN 대신 저장소에서(vendor/).
const {T, done, launch, localPage, fakePage, section, seed, idle, resume, KID}=require('./_harness');
const path=require('path'), http=require('http'), fs=require('fs');

(async()=>{
const b=await launch();

await section('안내의 가족 코드 단계', async()=>{
  const a=await fakePage(b, {});
  await a.p.click('.gear'); await idle(a.p);
  await a.p.evaluate(()=>{ window.__app.S.tour={step:'sync', sel0:'k1'}; });
  await resume(a.p); await idle(a.p);
  const c=await a.p.$eval('.tour:not(.hide) .tour-card',e=>({t:e.querySelector('.tc-title').textContent, dots:e.querySelectorAll('.dots i').length,
    on:[...e.querySelectorAll('.dots i')].findIndex(x=>x.classList.contains('on'))+1}));
  T('동기화 단계: "가족 코드" (10 / 11) — 전엔 설정의 동기화를 안내가 건너뛰었다', c.t==='가족 코드' && c.dots===11 && c.on===10);
  const inSpot=await a.p.evaluate(()=>{ const s=document.querySelector('.tour-spot').getBoundingClientRect(), r=document.querySelector('.card.sync').getBoundingClientRect();
    return s.top<=r.top+1 && s.bottom>=r.bottom-1 && s.left<=r.left+1 && s.right>=r.right-1; });
  T('밝은 구멍이 가족 코드 줄을 감싼다', inSpot);
  await a.p.click('.tour-card .ok'); await idle(a.p);
  T('다음 → 마지막 "‹ 를 눌러 나가면 끝"', (await a.p.textContent('.tour-card .tc-title')).indexOf('나가면 끝')>0);
  await a.ctx.close();
});

await section('이 기기 전용 모드엔 그 단계가 없다', async()=>{
  const {p, ctx}=await localPage(b, {tour:true});
  await seed(p, [KID('k1','서윤','pink',0,10000), KID('k2','하준','yellow',1,5000)], [], 'k1', true);
  const dots=await p.$$eval('.tour:not(.hide) .tour-card .dots i',es=>es.length);
  T('로컬 모드 안내는 10단계 그대로', dots===10);
  await ctx.close();
});

await section('저장소의 supabase-js 가 진짜로 뜬다', async()=>{
  // http 로 열어(파일 주소로는 상대 경로 스크립트가 다르게 돈다) 설정만 준 페이지 — 서버는 없어도 라이브러리는 와야 한다
  const root=path.resolve(__dirname,'..');
  const srv=http.createServer((q,r)=>{ const f=path.join(root, decodeURIComponent(q.url.split('?')[0]).replace(/^\/+/,'') || 'index.html');
    if(!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ r.writeHead(404); return r.end(); }
    r.writeHead(200,{'content-type': f.endsWith('.js') ? 'application/javascript' : f.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/octet-stream'}); fs.createReadStream(f).pipe(r); });
  await new Promise(r=>srv.listen(0,r)); const port=srv.address().port;
  const ctx=await b.newContext();
  await ctx.route('https://x.supabase.co/**', r=>r.abort());                        // 서버는 없다 — 라이브러리만 본다
  await ctx.addInitScript(()=>{ Object.defineProperty(window,'APP_CONFIG',{value:{SUPABASE_URL:'https://x.supabase.co',SUPABASE_ANON_KEY:'k'},writable:false,configurable:false}); });
  const p=await ctx.newPage(); await p.goto('http://localhost:'+port+'/index.html');
  const ok=await p.waitForFunction(()=>window.supabase && typeof window.supabase.createClient==='function', null, {timeout:8000}).then(()=>true,()=>false);
  T('vendor/supabase-js 가 로드되어 createClient 가 있다(같은 주소, CDN 없이)', ok);
  await ctx.close(); srv.close();
});

await done(b);
})();
