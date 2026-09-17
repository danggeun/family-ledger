// 시트를 아래로 밀어 닫기 · 누가 적었는지
const {chromium}=require('playwright');
const path=require('path');
let pass=0,fail=0; const T=(n,ok)=>{ok?pass++:fail++;console.log((ok?'OK   ':'FAIL ')+n);};
(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(__dirname,'../index.html'));
const t=new Date().toISOString().slice(0,10);
await p.evaluate((t)=>localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K'},children:[
 {id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:10000,weekly_on:false,weekly_amount:0,created_at:'2026-01-01'}],
 entries:[{id:'e1',child_id:'k1',entry_date:t,memo:'젤리',amount:-800,auto_key:null,created_by:'me',created_at:t+'T09:00:00Z'},
          {id:'e2',child_id:'k1',entry_date:t,memo:'할머니',amount:5000,auto_key:null,created_by:'other',created_at:t+'T10:00:00Z'}]})), t);
await p.reload(); await p.waitForTimeout(700);
const cdp=await ctx.newCDPSession(p);
async function drag(from,to,steps,ms){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:195,y:from}]});
  for(let i=1;i<=steps;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:195,y:from+(to-from)*i/steps}]}); await p.waitForTimeout(ms/steps); }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
// 누가 적었는지
await p.click('.row >> nth=1'); await p.waitForTimeout(350);
T('내가 적은 줄', /내가 적었어요/.test(await p.textContent('.sheet .f')));
const top=await p.$eval('.sheet',e=>e.getBoundingClientRect().top);
await drag(top+40, top+340, 12, 200); await p.waitForTimeout(450);
T('아래로 밀면 닫힌다', !(await p.$('.sheet')));
await p.click('.row >> nth=0'); await p.waitForTimeout(350);
T('다른 기기가 적은 줄', /다른 기기에서 적었어요/.test(await p.textContent('.sheet .f')));
// 조금만 밀면 제자리
await drag(top+40, top+80, 8, 400); await p.waitForTimeout(400);
T('조금 밀면 안 닫힌다', !!(await p.$('.sheet')) && await p.$eval('.sheet',e=>e.style.transform===''));
// 위로 밀면 무시
await drag(top+120, top+40, 8, 200); await p.waitForTimeout(350);
T('위로 밀면 무시', !!(await p.$('.sheet')));
await p.goBack(); await p.waitForTimeout(350);
// 자동 줄에는 안 붙는다
await p.evaluate((t)=>{const d=JSON.parse(localStorage.getItem('yd_local_v1'));
  d.entries.push({id:'e3',child_id:'k1',entry_date:t,memo:'용돈',amount:3000,auto_key:'w:'+t,created_by:'other',created_at:t+'T11:00:00Z'});
  localStorage.setItem('yd_local_v1',JSON.stringify(d));}, t);
await p.reload(); await p.waitForTimeout(700);
await p.click('.row.auto'); await p.waitForTimeout(350);
T('자동 줄에는 누가 적었는지 안 붙는다', !/적었어요/.test(await p.textContent('.sheet .f')));
// 받은 돈 / 쓴 돈이 시트 안에서도 구분된다
await p.goBack(); await p.waitForTimeout(300);
await p.click('.row >> nth=1'); await p.waitForTimeout(350);   // 받은 돈 줄
T('받은 돈이면 고른 칸이 초록', (await p.$eval('.sheet .tabs button.on',e=>getComputedStyle(e).color))==='rgb(27, 122, 90)');
T('받은 돈이면 금액도 초록', (await p.$eval('.sheet input.r',e=>getComputedStyle(e).color))==='rgb(27, 122, 90)');
await p.click('.sheet .tabs button:has-text("쓴 돈")'); await p.waitForTimeout(250);
T('쓴 돈으로 바꾸면 검정', (await p.$eval('.sheet .tabs button.on',e=>getComputedStyle(e).color))==='rgb(17, 19, 23)'
  && (await p.$eval('.sheet input.r',e=>getComputedStyle(e).color))==='rgb(17, 19, 23)');

console.log(`\n${pass} passed, ${fail} failed`); console.log('errors:',errs.join('|')||'none');
await b.close(); process.exit(fail?1:0);})();
