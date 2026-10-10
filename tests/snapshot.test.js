// 화면 스냅샷 — 리팩터(1.3.0)의 통과 조건. 열 화면을 고정 날짜·고정 시드로 찍어 tests/snapshots/ 의 기준과 픽셀 단위로 비교한다.
// 기준을 다시 찍으려면 SNAP=update. 화면을 일부러 바꾼 버전에서만 기준을 갱신한다.
const {chromium}=require('playwright');
const path=require('path'); const fs=require('fs');
let pass=0,fail=0; const T=(n,ok)=>{ok?pass++:fail++;console.log((ok?'OK   ':'FAIL ')+n);};
const APP='file://'+path.resolve(__dirname,'../index.html');
const DIR=path.resolve(__dirname,'snapshots'); fs.mkdirSync(DIR,{recursive:true});
const UPDATE=process.env.SNAP==='update';
const FIXED='2026-10-10T12:00:00+09:00';                      // "오늘"이 바뀌어도 화면이 같게

const KIDS=[{id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:16300,weekly_on:true,weekly_dow:6,weekly_amount:3000,weekly_start:'2026-09-12',created_at:'2026-07-01T09:00:00Z'},
            {id:'k2',name:'하준',color:'yellow',sort:1,opening_balance:5000,weekly_on:false,weekly_amount:0,created_at:'2026-07-01T09:00:00Z'}];
const E=(id,cid,date,memo,amount,extra)=>Object.assign({id,child_id:cid,entry_date:date,memo,amount,auto_key:null,created_by:'me',created_at:date+'T09:00:00Z'},extra||{});
const ENTRIES=[
  E('a1','k1','2026-09-12','용돈',3000,{auto_key:'w:2026-09-12'}), E('a2','k1','2026-09-19','용돈',3000,{auto_key:'w:2026-09-19',skipped:true}),
  E('a3','k1','2026-09-26','용돈',3000,{auto_key:'w:2026-09-26'}), E('a4','k1','2026-10-03','용돈',3000,{auto_key:'w:2026-10-03'}), E('a5','k1','2026-10-10','용돈',3000,{auto_key:'w:2026-10-10'}),
  E('e1','k1','2026-10-10','젤리',-800), E('e2','k1','2026-10-05','할머니',5000), E('e3','k1','2026-10-03','스티커',-1500),
  E('e4','k1','2026-09-28','아이스크림',-1200), E('e5','k1','2026-09-22','문구점 (연필·지우개)',-2300), E('e6','k1','2026-09-15','',-500), E('e7','k1','2026-09-12','심부름',1000),
  E('e8','k2','2026-10-08','젤리',-700), E('e9','k2','2026-09-30','용돈(큰아빠)',10000)];

(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const errs=[];
async function open(tour, kids, entries, sel){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  await ctx.addInitScript(tour?require('./_env').LOCAL_RAW:require('./_env').LOCAL);
  await ctx.addInitScript((fixed)=>{ const R=Date, t=new R(fixed).getTime();   // 시계 고정
    window.Date=class extends R{ constructor(...a){ if(a.length) super(...a); else super(t); } static now(){ return t; } }; }, FIXED);
  const p=await ctx.newPage(); require('./_env').guard(p); p.on('pageerror',e=>errs.push(e.message)); await p.goto(APP);
  await p.evaluate(({kids,entries,sel,tour})=>{ localStorage.clear(); localStorage.setItem('yd_tour',tour?'new':'done');
    localStorage.setItem('yd_local_v1',JSON.stringify({family:kids.length?{id:'f1',code:'K7PM-3QRA'}:null,children:kids,entries})); localStorage.setItem('yd_sel',sel||'k1'); },{kids,entries,sel,tour});   // 아이가 없으면 가족도 없음 = 시작 화면
  await p.waitForTimeout(150); await p.reload(); await p.waitForTimeout(700);
  return {ctx,p};
}
async function snap(p, name, opts){
  const file=path.join(DIR, name+'.png');
  const buf=await p.screenshot(Object.assign({fullPage:false, animations:'disabled', caret:'hide'}, opts||{}));
  if(UPDATE || !fs.existsSync(file)){ fs.writeFileSync(file, buf); T('[기준 저장] '+name, true); return; }
  const same=fs.readFileSync(file).equals(buf);
  if(!same) fs.writeFileSync(path.join(DIR, name+'.actual.png'), buf);
  T(name+(same?'':' — 기준과 다름 → '+name+'.actual.png'), same);
}

let a=await open(false, KIDS, ENTRIES);
await snap(a.p,'01-home');
await a.p.click('.memo'); await a.p.keyboard.type('용돈'); await a.p.click('.amt'); await a.p.keyboard.type('3000'); await a.p.evaluate(()=>document.activeElement.blur()); await a.p.waitForTimeout(150);
await snap(a.p,'02-entry-plus');
await a.p.click('.memo'); await a.p.waitForTimeout(200);                                   // 칩이 뜬 상태
await snap(a.p,'03-entry-chips');
await a.p.evaluate(()=>document.activeElement.blur()); await a.p.click('.thead'); await a.p.waitForTimeout(200);
await a.p.click('.balbtn'); await a.p.waitForTimeout(400);
await snap(a.p,'04-kid');
await a.p.click('.kid .x'); await a.p.waitForTimeout(300);
await a.p.click('.row:has-text("젤리")'); await a.p.waitForTimeout(400);
await snap(a.p,'05-edit-sheet');
await a.p.click('.sheet button:has-text("취소")'); await a.p.waitForTimeout(300);
await a.p.click('.gear'); await a.p.waitForTimeout(400);
await snap(a.p,'06-settings');
await a.p.click('.card.week .srow >> nth=0'); await a.p.waitForTimeout(400);
await snap(a.p,'07-week-sheet');
await a.ctx.close();

a=await open(false, [KIDS[0]], [E('e1','k1','2026-10-10','젤리',-19800)]);       // 마이너스 잔액
await a.p.click('.balbtn'); await a.p.waitForTimeout(400);
await snap(a.p,'08-kid-negative');
await a.ctx.close();

a=await open(false, [], []);                                                     // 시작 화면
await snap(a.p,'09-start');
await a.ctx.close();

a=await open(true, KIDS, []);                                                     // 안내 1단계
await a.p.waitForTimeout(600);
await snap(a.p,'10-tour-1');
for(let i=0;i<5;i++){ await a.p.click('.tour-card .ok'); await a.p.waitForTimeout(300); }   // sign·bal·swipe·press·edit → gear
await a.p.click('.gear'); await a.p.waitForTimeout(700);
await snap(a.p,'11-tour-7');
await a.ctx.close();

T('콘솔 에러 없음', errs.length===0); if(errs.length) console.log(errs);
await b.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})();
