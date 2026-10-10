// 화면 스냅샷 — 리팩터(1.3.0)의 통과 조건. 열 화면을 고정 날짜·고정 시드로 찍어 tests/snapshots/ 의 기준과 픽셀 단위로 비교한다.
// 기준을 다시 찍으려면 SNAP=update. 화면을 일부러 바꾼 버전에서만 기준을 갱신한다.
const {T, done, launch, localPage, seed, settle}=require('./_harness');
const path=require('path'); const fs=require('fs');
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

// 찍기 전 — 화면이 멈추고(전환·popstate·안내의 자리 잡기) 그림(돼지)까지 다 받아 그린 뒤
async function still(p){
  await settle(p);
  await p.waitForFunction(()=>{ const u=window.__app.S.ui, d=((history.state&&history.state.d)||0)-u.navBase;
    return !u.backing && u.navStack.length<=Math.max(0,d) && !u.tourSettling && [...document.images].every(i=>i.complete); });
  await settle(p);
}

(async()=>{
const b=await launch();
async function open(tour, kids, entries, sel){
  const a=await localPage(b, {tour, clock:FIXED, context:{reducedMotion:'reduce'}});
  await seed(a.p, kids, entries, sel, tour);                   // 아이가 없으면 가족도 없음 = 시작 화면
  await still(a.p);
  return a;
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
await a.p.click('.memo'); await a.p.keyboard.type('용돈'); await a.p.click('.amt'); await a.p.keyboard.type('3000'); await a.p.evaluate(()=>document.activeElement.blur()); await still(a.p);
await snap(a.p,'02-entry-plus');
await a.p.click('.memo'); await still(a.p);                                                // 칩이 뜬 상태
await snap(a.p,'03-entry-chips');
await a.p.evaluate(()=>document.activeElement.blur()); await a.p.click('.thead'); await still(a.p);
await a.p.click('.balbtn'); await still(a.p);
await snap(a.p,'04-kid');
await a.p.click('.kid .x'); await still(a.p);
await a.p.click('.row:has-text("젤리")'); await still(a.p);
await snap(a.p,'05-edit-sheet');
await a.p.click('.sheet button:has-text("취소")'); await still(a.p);
await a.p.click('.gear'); await still(a.p);
await snap(a.p,'06-settings');
await a.p.click('.card.week .srow >> nth=0'); await still(a.p);
await snap(a.p,'07-week-sheet');
await a.ctx.close();

a=await open(false, [KIDS[0]], [E('e1','k1','2026-10-10','젤리',-19800)]);       // 마이너스 잔액
await a.p.click('.balbtn'); await still(a.p);
await snap(a.p,'08-kid-negative');
await a.ctx.close();

a=await open(false, [], []);                                                     // 시작 화면
await snap(a.p,'09-start');
await a.ctx.close();

a=await open(true, KIDS, []);                                                     // 안내 1단계
await snap(a.p,'10-tour-1');
for(let i=0;i<5;i++){ await a.p.click('.tour-card .ok'); await still(a.p); }   // sign·bal·swipe·press·edit → gear
await a.p.click('.gear'); await still(a.p);
await snap(a.p,'11-tour-7');
await a.ctx.close();

await done(b);
})();
