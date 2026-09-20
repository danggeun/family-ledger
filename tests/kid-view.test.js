// 아이에게 보여주기 — 잔액을 누르면 돼지저금통과 지폐·동전 그림
const {chromium}=require('playwright');
const path=require('path');
let pass=0,fail=0; const T=(n,ok)=>{ ok?pass++:fail++; console.log((ok?'OK   ':'FAIL ')+n); };
const SEED=(a,b)=>{localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K7PM'},children:[
  {id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:a,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'},
  {id:'k2',name:'하준',color:'yellow',sort:1,opening_balance:b,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'}],entries:[]}));};
(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(__dirname,'../index.html'));
await p.evaluate((s)=>eval(s),`(${SEED.toString()})(16300,0)`); await p.reload(); await p.waitForTimeout(600);
const rows=()=>p.$$eval('.kid .money .row',es=>es.map(e=>({n:e.querySelectorAll('svg').length, t:e.querySelector('svg text')?.textContent, x:e.querySelector('.xn')?.textContent||''})));

T('잔액이 버튼', !!(await p.$('button.balbtn')));
T('잔액 옆 작은 돼지', await p.$eval('.balbtn img.pig',e=>/logo-pig-sm\.png$/.test(e.src)));
await p.click('.balbtn'); await p.waitForTimeout(300);
T('아이 화면 열림', !!(await p.$('.kid')));
T('배경 크림(로고 타일 색)', await p.$eval('.kid',e=>getComputedStyle(e).backgroundColor==='rgb(253, 246, 231)'));
T('큰 돼지', await p.$eval('.kid img.pig',e=>/logo-pig\.png$/.test(e.src) && e.getBoundingClientRect().width===222));
T('이름·금액', (await p.textContent('.kid .kn'))==='서윤' && (await p.textContent('.kid .ka b'))==='16,300');
T('이름은 아이 색 (핑크 원색)', await p.$eval('.kid .kn',e=>getComputedStyle(e).color==='rgb(255, 61, 143)'));
T('이름 24px', await p.$eval('.kid .kn',e=>getComputedStyle(e).fontSize==='24px'));
let r=await rows();
T('16,300 = 10000·5000·1000·100×3', r.length===4 && r[0].t==='10000'&&r[0].n===1 && r[1].t==='5000' && r[2].t==='1000' && r[3].t==='100'&&r[3].n===3);
T('×n 없음', r.every(x=>x.x===''));
T('문구·버튼 없음(닫기만)', (await p.$$('.kid button')).length===1);
await p.click('.kid .ka'); await p.waitForTimeout(200);
T('아무 데나 누르면 닫힘', !(await p.$('.kid')));
await p.click('.balbtn'); await p.waitForTimeout(200); await p.click('.kid .x'); await p.waitForTimeout(200);
T('✕로도 닫힘', !(await p.$('.kid')));

await p.evaluate((s)=>eval(s),`(${SEED.toString()})(84950,0)`); await p.reload(); await p.waitForTimeout(500);
await p.click('.balbtn'); await p.waitForTimeout(300); r=await rows();
T('84,950 = 6줄', r.length===6 && r.map(x=>x.t).join()==='50000,10000,1000,500,100,50');
T('1만 3장·1천 4장 부채꼴', r[1].n===3 && r[2].n===4);
T('한 화면에 들어감', await p.$eval('.kid',e=>e.scrollHeight<=e.clientHeight+1));
await p.click('.kid'); await p.waitForTimeout(150);

await p.evaluate((s)=>eval(s),`(${SEED.toString()})(300000,0)`); await p.reload(); await p.waitForTimeout(500);
await p.click('.balbtn'); await p.waitForTimeout(300); r=await rows();
T('30만 = 50000 5장 + ×6', r.length===1 && r[0].n===5 && r[0].x==='×6');
await p.click('.kid'); await p.waitForTimeout(150);

// 줄이 많으면 돼지를 줄여서라도 한 화면에
await p.evaluate((s)=>eval(s),`(${SEED.toString()})(99990,0)`); await p.reload(); await p.waitForTimeout(500);
await p.click('.balbtn'); await p.waitForTimeout(400);
T('99,990 = 8줄, 돼지를 줄여 한 화면에', (await rows()).length===8
  && await p.$eval('.kid',e=>e.classList.contains('tight') && e.scrollHeight<=e.clientHeight+1));
await p.click('.kid'); await p.waitForTimeout(150);
await p.evaluate((s)=>eval(s),`(${SEED.toString()})(16300,0)`); await p.reload(); await p.waitForTimeout(500);
await p.click('.balbtn'); await p.waitForTimeout(350);
T('금액이 작으면 돼지는 원래 크기', await p.$eval('.kid img.pig',e=>e.getBoundingClientRect().width===222));
await p.click('.kid'); await p.waitForTimeout(150);

await p.click('.bar .k:nth-child(2)'); await p.waitForTimeout(200); await p.click('.balbtn'); await p.waitForTimeout(300);
T('0원이면 줄 없음, 화면은 뜸', !!(await p.$('.kid')) && (await rows()).length===0 && (await p.textContent('.kid .kn'))==='하준');
T('노랑 아이 이름색 (금색)', await p.$eval('.kid .kn',e=>getComputedStyle(e).color==='rgb(183, 141, 0)'));

console.log(`\n${pass} passed, ${fail} failed`); console.log('errors:',errs.join('|')||'none'); await b.close(); process.exit(fail?1:0);})();
