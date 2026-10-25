// 테스트 공통: 브라우저, T()/done(), 로컬·가짜 서버 페이지, 시드, 기다리기, 터치, 시계 고정.
//
// 기다리기 규칙: 고정 시간(waitForTimeout)으로 기다리지 않는다. 느린 기계·동시 실행에서 깨진다.
//   ready(p)      부팅이 끝나고 진행 중인 reload 가 없을 때까지
//   settle(p)     돌고 있는 애니메이션·전환이 끝날 때까지(무한 반복 제외) + 두 프레임
//   idle(p)       닫기(history.back → popstate)·복사본(.ghost)·안내 자기 교정이 끝날 때까지
//   back(p)       뒤로 가기 한 번이 처리될 때까지
//   popped/reloaded/toasted(p, act)  act 뒤 그 일이 한 번 일어날 때까지
//   until(p, fn)  조건이 2초 안에 참이 되는지(던지지 않음, 판정은 뒤의 T)
//   그 밖엔 기다리는 결과를 p.waitForFunction 으로 직접 기다린다.
//   진짜 시간이 조건인 것(길게 누르기 0.5초, 토스트 사라짐 1.8초)만 waitForTimeout 을 쓰고 이유를 적는다.
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
// 던지면 그 덩어리만 실패로 세고 나머지는 계속 돈다
async function section(name, fn){ try{ await fn(); }catch(e){ T(name+' — 중단: '+String(e.message||e).split('\n')[0], false); } }
function launch(){ return chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{}); }

// new Date()·Date.now() 를 fixed 시각으로 고정(init 스크립트)
const CLOCK=(fixed)=>{ const R=Date, t=new R(fixed).getTime();
  window.Date=class extends R{ constructor(...a){ if(a.length) super(...a); else super(t); } static now(){ return t; } }; };

function watch(p){
  p.setDefaultTimeout(8000); env.guard(p);
  p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{ if(m.type()==='error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
}
// 서버 모드에선 screen 이 먼저 바뀌고 reload 가 나중에 그리므로 loading·"불러오는 중"까지 본다.
// 실패 뒤 0.8초 후 재시도의 결과까지 보려면 reloaded().
async function ready(p){
  await p.waitForFunction(()=>window.__app && window.__app.S.screen!=='loading' && !window.__app.S.ui.loading
    && document.getElementById('app').children.length>0 && !document.querySelector('#app .load'));
  await settle(p);
}
// 닫기 처리 완료 = 방문 기록 깊이와 화면 스택 길이가 맞다
async function idle(p){
  await p.waitForFunction(()=>{ const u=window.__app.S.ui, d=((history.state&&history.state.d)||0)-u.navBase;
    return !u.backing && u.navStack.length<=Math.max(0,d) && !document.querySelector('.ghost') && !u.tourSettling; });
  await settle(p);
}
// 스택이 안 줄어도 던지지 않는다(판정은 뒤의 T)
async function back(p){
  const n=await p.evaluate(()=>window.__app.S.ui.navStack.length);
  await p.goBack();
  await p.waitForFunction(n=>window.__app.S.ui.navStack.length<n, n, {timeout:2000}).catch(()=>{});
  await idle(p);
}
const until=(p, fn, arg, ms)=>p.waitForFunction(fn, arg, {timeout:ms||2000}).then(()=>true, ()=>false);
// 앱의 popstate 리스너가 먼저 붙어 있어 이 표시보다 먼저 돈다
async function popped(p, act){
  await p.evaluate(()=>{ window.__popped=false; addEventListener('popstate',()=>{ window.__popped=true; },{once:true}); });
  await act();
  await p.waitForFunction(()=>window.__popped && !window.__app.S.ui.backing); await settle(p);
}
// reload 는 끝날 때 성패와 무관하게 S.offline 을 쓰므로 그 쓰기 횟수를 센다.
// 재시도 전 0.8초 쉬는 동안엔 loading 이 false 라 loading 만 보면 일찍 끝난다.
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
// 글과 무관하게 새 토스트가 뜰 때까지(판정은 뒤의 T)
async function toasted(p, act){
  await p.evaluate(()=>{ document.getElementById('toast').textContent=''; });
  await act();
  await p.waitForFunction(()=>document.getElementById('toast').textContent!==''); await settle(p);
}
// 일부러 끊은 경로에서 앱이 남기는 console.error 를 errs 에서 뺀다
const allowConsole=(re)=>{ for(let i=errs.length-1;i>=0;i--) if(/^console: /.test(errs[i]) && re.test(errs[i])) errs.splice(i,1); };
// 무한 반복 애니메이션(안내 맥박, 아이 화면 동전)은 끝나지 않으니 뺀다
async function settle(p){
  await p.waitForFunction(()=>document.getAnimations().every(a=>{
    if(a.playState!=='running') return true;
    const t=a.effect && a.effect.getComputedTiming(); return t && t.iterations===Infinity;
  }));
  await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
}

// 로컬 모드 페이지. opts: tour(안내 켠 채), clock(ISO 시각), init/initArg(추가 init 스크립트), context
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
// 가짜 Supabase 페이지. fake: FAKE 옵션(kids·ents·mode …). opts.cache: 캐시를 미리 심음. opts.wait=false: ready 생략
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
// localStorage 에 가족·아이·기록을 넣고 새로고침. kids 가 비면 가족 없음(시작 화면)
async function seed(p, kids, entries, sel, tour){
  await p.evaluate(({kids,entries,sel,tour})=>{ localStorage.clear(); localStorage.setItem('yd_tour', tour?'new':'done');
    localStorage.setItem('yd_local_v1', JSON.stringify({family:kids.length?{id:'f1',code:'K7PM-3QRA'}:null,children:kids,entries:entries||[]}));
    localStorage.setItem('yd_sel', sel||'k1'); },{kids,entries,sel,tour:!!tour});
  await p.reload(); await ready(p);
}
const KID=(id,name,color,sort,open,extra)=>Object.assign({id,name,color,sort,opening_balance:open,weekly_on:false,weekly_amount:0,created_at:'2026-07-01T09:00:00Z'},extra||{});
const E=(id,cid,date,memo,amount,extra)=>Object.assign({id,child_id:cid,entry_date:date,memo,amount,auto_key:null,created_by:'me',created_at:date+'T09:00:00Z'},extra||{});
// 앱 복귀 흉내(visibilitychange → reload)
const resume=(p)=>p.evaluate(()=>{ Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true}); document.dispatchEvent(new Event('visibilitychange')); });
const toastLike=(p, re)=>p.waitForFunction((s)=>new RegExp(s).test(document.getElementById('toast').textContent), re.source||String(re));

// CDP 터치 끌기: swipe(x0,y0,x1,y1, ms=180, settleAfter=true, steps=6).
// 튕기기 판정은 이벤트 시각 차이만 보므로 timestamp 를 직접 찍어 부하와 무관하게 속도를 맞춘다.
// settleAfter=false 면 손을 뗀 직후 돌아온다(전환 첫 프레임 확인용).
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
