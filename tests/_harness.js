// 테스트 공통 — 브라우저 띄우기, T()/done(), 로컬 모드 페이지와 시드, 터치 스와이프.
// 새 테스트는 이걸 쓴다. (옛 파일들은 각자 같은 코드를 갖고 있다 — 동작은 같다)
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

// 로컬 모드 페이지. tour=true 면 처음 안내가 켜진 채(LOCAL_RAW). clock: '2026-10-10T12:00:00+09:00' 처럼 고정
async function localPage(browser, opts){
  opts=opts||{};
  const ctx=await browser.newContext(Object.assign({}, VP, opts.context||{}));
  await ctx.addInitScript(opts.tour ? env.LOCAL_RAW : env.LOCAL);
  if(opts.clock) await ctx.addInitScript(CLOCK, opts.clock);
  if(opts.init) await ctx.addInitScript(opts.init, opts.initArg);
  const p=await ctx.newPage(); p.setDefaultTimeout(8000); env.guard(p); p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{ if(m.type()==='error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });   // 옛 파일들과 같은 기준
  await p.goto(APP);
  return {ctx, p};
}
// 가짜 Supabase 페이지(tests/_fake.js). fake 는 FAKE 의 옵션(kids·ents·mode …). 홈이 뜰 때까지 기다린다
async function fakePage(browser, fake, opts){
  opts=opts||{};
  const {FAKE}=require('./_fake');
  const ctx=await browser.newContext(Object.assign({}, VP, opts.context||{}));
  await ctx.addInitScript(FAKE, fake||{});
  if(opts.clock) await ctx.addInitScript(CLOCK, opts.clock);
  const p=await ctx.newPage(); p.setDefaultTimeout(8000); env.guard(p); p.on('pageerror',e=>errs.push(e.message));
  p.on('console',m=>{ if(m.type()==='error' && !/ERR_|Failed to load resource/.test(m.text())) errs.push('console: '+m.text()); });
  await p.goto(APP);
  if(opts.wait!==false) await p.waitForSelector(opts.wait||'.balbtn', {timeout:8000});
  return {ctx, p};
}
// 로컬 저장소에 가족·아이·기록을 넣고 새로고침
async function seed(p, kids, entries, sel, tour){
  await p.evaluate(({kids,entries,sel,tour})=>{ localStorage.clear(); localStorage.setItem('yd_tour', tour?'new':'done');
    localStorage.setItem('yd_local_v1', JSON.stringify({family:{id:'f1',code:'K7PM-3QRA'},children:kids,entries})); localStorage.setItem('yd_sel', sel||'k1'); },{kids,entries,sel,tour:!!tour});
  await p.waitForTimeout(150); await p.reload(); await p.waitForTimeout(600);
}
const KID=(id,name,color,sort,open,extra)=>Object.assign({id,name,color,sort,opening_balance:open,weekly_on:false,weekly_amount:0,created_at:'2026-07-01T09:00:00Z'},extra||{});
const E=(id,cid,date,memo,amount,extra)=>Object.assign({id,child_id:cid,entry_date:date,memo,amount,auto_key:null,created_by:'me',created_at:date+'T09:00:00Z'},extra||{});

// 손가락 끌기 (CDP 터치 이벤트). settle=false 면 끝나자마자 돌아온다(전환 첫 프레임을 볼 때)
function swiper(cdp, p){
  return async function(x0,y0,x1,y1,ms,settle){
    ms=ms||180;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});
    for(let i=1;i<=6;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/6, y:y0+(y1-y0)*i/6}]}); await p.waitForTimeout(ms/6); }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    if(settle!==false) await p.waitForTimeout(350);
  };
}
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const addDays=(s,n)=>{ const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+n); return ymd(d); };
const today=()=>ymd(new Date());

module.exports={APP, VP, T, done, errs, section, launch, localPage, fakePage, CLOCK, seed, KID, E, swiper, ymd, addDays, today};
