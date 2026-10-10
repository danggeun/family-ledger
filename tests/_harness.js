// 테스트 공통 — 모든 테스트 파일이 이걸 쓴다.
// 브라우저 띄우기 · T()/done() · 로컬/가짜 서버 페이지 · 시드 · 기다리기(ready/settle) · 터치 스와이프 · 시계 고정.
//
// 기다리기 규칙: 고정 시간(waitForTimeout)으로 기다리지 않는다 — 느린 기계·동시 실행에서 깨지고, 빠른 기계에선 시간을 버린다.
//   ready(p)   부팅이 끝날 때까지 — "불러오는 중"이 다른 화면으로 바뀌었고 진행 중인 reload 가 없다(부팅·새로고침 뒤)
//   settle(p)  돌고 있는 애니메이션·전환이 끝날 때까지(무한 반복 장식은 빼고) + 두 프레임
//   idle(p)    화면이 멈출 때까지 — 닫기(history.back → popstate, 비동기)가 끝났고 복사본(.ghost)·안내 자기 교정도 끝났다
//   back(p)    뒤로 가기 한 번이 처리될 때까지 · popped/reloaded/toasted(p, act) — act 뒤 그 일이 한 번 일어날 때까지
//   until(p, fn) 조건이 2초 안에 참이 되는지(던지지 않는다 — 판정은 뒤의 T 가)
//   그 밖엔 기다리는 "결과"를 직접: p.waitForFunction
//   진짜 시간이 조건인 것(길게 누르기 0.5초, 토스트가 사라지는 1.8초)만 waitForTimeout 을 쓰고 이유를 적는다.
const {chromium}=require('playwright');
const path=require('path');
const env=require('./_env');

const APP='file://'+path.resolve(__dirname,'../index.html');
const VP={viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true};

let pass=0, fail=0;
const errs=[];
function T(name, ok){ ok?pass++:fail++; console.log((ok?'OK   ':'FAIL ')+name); }
async function done(browser){
  T('콘솔 에러 없음', errs.length===0); if(errs.length) console.log(errs);
  if(browser) await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail?1:0);
}
// 한 덩어리가 던져도(기다리던 게 안 와도) 나머지는 계속 돈다 — 그 덩어리는 실패로 센다
async function section(name, fn){ try{ await fn(); }catch(e){ T(name+' — 중단: '+String(e.message||e).split('\n')[0], false); } }
function launch(){ return chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{}); }

// 시계 고정 — new Date()·Date.now() 가 그 시각을 준다(날짜에 기대는 테스트용)
const CLOCK=(fixed)=>{ const R=Date, t=new R(fixed).getTime();
  window.Date=class extends R{ constructor(...a){ if(a.length) super(...a); else super(t); } static now(){ return t; } }; };

function watch(p){
  p.setDefaultTimeout(8000); env.guard(p);
  p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{ if(m.type()==='error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
}
// 부팅이 끝날 때까지. 서버 모드에선 screen 이 먼저 바뀌고 그 뒤 reload 가 그리므로 loading·"불러오는 중" 표시까지 본다.
// (실패하면 앱은 0.8초 뒤 한 번 더 해 본다 — 그 결과까지 보려면 reloaded())
async function ready(p){
  await p.waitForFunction(()=>window.__app && window.__app.S.screen!=='loading' && !window.__app.S.ui.loading
    && document.getElementById('app').children.length>0 && !document.querySelector('#app .load'));
  await settle(p);
}
// 화면이 멈출 때까지 — 닫기가 popstate 까지 처리됐고(방문 기록 깊이와 앱의 화면 스택이 맞다), 복사본이 치워졌고, 안내 자기 교정이 끝났다
async function idle(p){
  await p.waitForFunction(()=>{ const u=window.__app.S.ui, d=((history.state&&history.state.d)||0)-u.navBase;
    return !u.backing && u.navStack.length<=Math.max(0,d) && !document.querySelector('.ghost') && !u.tourSettling; });
  await settle(p);
}
// 뒤로 가기 한 번 — 화면 스택이 줄어들 때까지(안 줄면 그대로 두고 뒤의 T 가 실패로 센다)
async function back(p){
  const n=await p.evaluate(()=>window.__app.S.ui.navStack.length);
  await p.goBack();
  await p.waitForFunction(n=>window.__app.S.ui.navStack.length<n, n, {timeout:2000}).catch(()=>{});
  await idle(p);
}
const until=(p, fn, arg, ms)=>p.waitForFunction(fn, arg, {timeout:ms||2000}).then(()=>true, ()=>false);
// act 뒤 popstate 를 앱이 처리할 때까지 (앱의 리스너가 먼저 붙어 있어 먼저 돈다)
async function popped(p, act){
  await p.evaluate(()=>{ window.__popped=false; addEventListener('popstate',()=>{ window.__popped=true; },{once:true}); });
  await act();
  await p.waitForFunction(()=>window.__popped && !window.__app.S.ui.backing); await settle(p);
}
// act 뒤 reload 한 번이 끝날 때까지 — 성공이면 S.offline=false, 끝내 실패면 true 를 "적고" 그린다. 그 적기를 센다
// (실패 → 0.8초 쉼 → 한 번 더. 쉬는 동안은 loading 이 false 라 loading 만 보면 일찍 끝난다)
async function reloaded(p, act){
  const n=await p.evaluate(()=>{ const S=window.__app.S;
    if(!('__reloads' in S)){ let v=S.offline, k=0;
      Object.defineProperty(S,'offline',{get(){ return v; }, set(x){ v=x; k++; }, enumerable:true, configurable:true});
      Object.defineProperty(S,'__reloads',{get(){ return k; }}); }
    return S.__reloads; });
  await act();
  await p.waitForFunction((n)=>{ const S=window.__app.S; return S.__reloads>n && !S.ui.loading && !S.ui.backing; }, n);
  await settle(p);
}
// act 뒤 알림(토스트)이 새로 뜰 때까지 — 무슨 글이든. 판정은 뒤의 T 가 한다
async function toasted(p, act){
  await p.evaluate(()=>{ document.getElementById('toast').textContent=''; });
  await act();
  await p.waitForFunction(()=>document.getElementById('toast').textContent!==''); await settle(p);
}
// 일부러 끊은 경로에서 앱이 남기는 console.error(실패 원인 기록)는 에러가 아니다 — 그 글만 걸러낸다
const allowConsole=(re)=>{ for(let i=errs.length-1;i>=0;i--) if(/^console: /.test(errs[i]) && re.test(errs[i])) errs.splice(i,1); };
// 돌고 있는 애니메이션·전환이 다 끝날 때까지. 무한 반복(안내의 맥박, 아이 화면의 동전)은 끝이 없으니 뺀다
async function settle(p){
  await p.waitForFunction(()=>document.getAnimations().every(a=>{
    if(a.playState!=='running') return true;
    const t=a.effect && a.effect.getComputedTiming(); return t && t.iterations===Infinity;
  }));
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
}

// 로컬 모드 페이지. opts: tour(처음 안내 켠 채 = LOCAL_RAW) · clock('2026-10-10T12:00:00+09:00') · init/initArg(추가 init 스크립트) · context
async function localPage(browser, opts){
  opts=opts||{};
  const ctx=await browser.newContext(Object.assign({}, VP, opts.context||{}));
  await ctx.addInitScript(opts.tour ? env.LOCAL_RAW : env.LOCAL);
  if(opts.clock) await ctx.addInitScript(CLOCK, opts.clock);
  if(opts.init) await ctx.addInitScript(opts.init, opts.initArg);
  const p=await ctx.newPage(); watch(p);
  await p.goto(APP); await ready(p);
  return {ctx, p};
}
// 가짜 Supabase 페이지(tests/_fake.js). fake 는 FAKE 의 옵션(kids·ents·mode …). opts.cache=true 면 "마지막으로 받은 내용"을 미리 심는다
async function fakePage(browser, fake, opts){
  opts=opts||{};
  const {FAKE, CACHE}=require('./_fake');
  const ctx=await browser.newContext(Object.assign({}, VP, opts.context||{}));
  await ctx.addInitScript(FAKE, fake||{});
  if(opts.clock) await ctx.addInitScript(CLOCK, opts.clock);
  if(opts.init) await ctx.addInitScript(opts.init, opts.initArg);
  const p=await ctx.newPage(); watch(p);
  await p.goto(APP);
  if(opts.cache){ await p.evaluate(CACHE); await p.reload(); }
  if(opts.wait!==false) await ready(p);
  return {ctx, p};
}
// 로컬 저장소에 가족·아이·기록을 넣고 새로고침. kids 가 비면 가족도 없다(= 시작 화면)
async function seed(p, kids, entries, sel, tour){
  await p.evaluate(({kids,entries,sel,tour})=>{ localStorage.clear(); localStorage.setItem('yd_tour', tour?'new':'done');
    localStorage.setItem('yd_local_v1', JSON.stringify({family:kids.length?{id:'f1',code:'K7PM-3QRA'}:null,children:kids,entries:entries||[]}));
    localStorage.setItem('yd_sel', sel||'k1'); },{kids,entries,sel,tour:!!tour});
  await p.reload(); await ready(p);
}
const KID=(id,name,color,sort,open,extra)=>Object.assign({id,name,color,sort,opening_balance:open,weekly_on:false,weekly_amount:0,created_at:'2026-07-01T09:00:00Z'},extra||{});
const E=(id,cid,date,memo,amount,extra)=>Object.assign({id,child_id:cid,entry_date:date,memo,amount,auto_key:null,created_by:'me',created_at:date+'T09:00:00Z'},extra||{});
// 앱이 복귀했다고 알린다(visibilitychange → reload)
const resume=(p)=>p.evaluate(()=>{ Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true}); document.dispatchEvent(new Event('visibilitychange')); });
// 토스트에 그 글이 뜰 때까지
const toastLike=(p, re)=>p.waitForFunction((s)=>new RegExp(s).test(document.getElementById('toast').textContent), re.source||String(re));

/* 손가락 끌기 (CDP 터치). 이벤트마다 시각(timestamp)을 직접 찍는다 — 앱의 "빠르게 튕기기" 판정은 이벤트 시각 차이만 보므로,
   기계가 느리거나 테스트를 동시에 돌려도 속도가 ms 대로 정확하다(전엔 실제로 기다려서 부하가 걸리면 느린 끌기가 됐다).
   swipe(x0,y0,x1,y1, ms=180, settleAfter=true, steps=6). settleAfter=false 면 손을 뗀 직후 돌아온다(전환 첫 프레임을 볼 때) */
function swiper(cdp, p){
  return async function(x0,y0,x1,y1,ms,settleAfter,steps){
    ms=ms||180; steps=steps||6;
    const t0=Date.now()/1000, at=(i)=>t0+(ms/1000)*i/steps;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}],timestamp:at(0)});
    for(let i=1;i<=steps;i++) await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/steps, y:y0+(y1-y0)*i/steps}],timestamp:at(i)});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[],timestamp:at(steps)});
    if(settleAfter!==false) await settle(p);
  };
}
async function touch(p){ return swiper(await p.context().newCDPSession(p), p); }

const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const addDays=(s,n)=>{ const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+n); return ymd(d); };
const today=()=>ymd(new Date());

module.exports={APP, VP, T, done, errs, section, launch, watch, localPage, fakePage, CLOCK,
  ready, settle, idle, back, until, popped, reloaded, toasted, allowConsole,
  seed, KID, E, resume, toastLike, swiper, touch, ymd, addDays, today};
