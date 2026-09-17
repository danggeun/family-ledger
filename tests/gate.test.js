// 새 가족 만들기 잠금 — 주인 가족만 보이고, 열면 시간이 지나 저절로 잠긴다
const {chromium}=require('playwright');
const path=require('path');
let pass=0,fail=0; const T=(n,ok)=>{ok?pass++:fail++;console.log((ok?'OK   ':'FAIL ')+n);};
const SEED=()=>{localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K7PM-3QRA'},children:[
 {id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:10000,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'}],entries:[]}));};
(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(__dirname,'../index.html')); await p.evaluate(SEED); await p.reload(); await p.waitForTimeout(600);
const row=()=>p.$('.srow.tap:has-text("새 가족 만들기")');
const rowVal=()=>p.$eval('.srow.tap:has-text("새 가족 만들기") .val',e=>e.textContent);
const until=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).openUntil||null);

await p.click('.gear'); await p.waitForTimeout(400);
T('주인이면 줄이 보인다', !!(await row()));
T('처음엔 잠김', (await rowVal())==='잠김');
await (await row()).click(); await p.waitForTimeout(300);
T('시트 열림', /잠겨 있어요/.test(await p.textContent('.sheet .note')));
T('잠겨 있을 땐 "지금 잠그기"가 없다', !(await p.$('.sheet button:has-text("지금 잠그기")')));
await p.click('.sheet .btn.pri'); await p.waitForTimeout(400);
T('열면 시트가 닫힌다', !(await p.$('.sheet')));
T('열림이 저장된다', !!(await until()));
T('줄에 남은 시간', /^\d+분 남음$/.test(await rowVal()));
await (await row()).click(); await p.waitForTimeout(300);
T('열려 있으면 안내가 바뀐다', /저절로 잠겨요/.test(await p.textContent('.sheet .note')));
await p.click('.sheet button:has-text("지금 잠그기")'); await p.waitForTimeout(400);
T('잠그면 되돌아간다', (await rowVal())==='잠김' && (await until())===null);

// 시간이 지나면 저절로 잠긴 것으로 보인다
await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('yd_local_v1'));
  d.openUntil=new Date(Date.now()-60000).toISOString(); localStorage.setItem('yd_local_v1',JSON.stringify(d));});
await p.reload(); await p.waitForTimeout(500); await p.click('.gear'); await p.waitForTimeout(400);
T('지난 시각이면 잠김으로 보인다', (await rowVal())==='잠김');

// 주인이 아니면 줄 자체가 없다
await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('yd_local_v1')); delete d.family;
  localStorage.setItem('yd_local_v1',JSON.stringify(d));});
await p.reload(); await p.waitForTimeout(600);
const gear=await p.$('.gear'); if(gear){ await gear.click(); await p.waitForTimeout(400); }
T('주인이 아니면 줄이 없다', !(await row()));

console.log(`\n${pass} passed, ${fail} failed`); console.log('errors:',errs.join('|')||'none'); await b.close(); process.exit(fail?1:0);})();
