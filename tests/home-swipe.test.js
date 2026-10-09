// 홈에서 좌우로 밀어 아이 바꾸기 — 탭을 누른 것과 같은 결과, 아이 화면과 같은 손맛
const {chromium}=require('playwright');
const path=require('path');
let pass=0,fail=0; const T=(n,ok)=>{ ok?pass++:fail++; console.log((ok?'OK   ':'FAIL ')+n); };
const E=(id,cid,memo,amount,date)=>({id,child_id:cid,entry_date:date,memo,amount,auto_key:null,created_by:'me',updated_by:'me',created_at:date+'T09:00:00Z'});
const SEED=(kids,entries)=>{localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K7PM'},children:kids,entries}));localStorage.setItem('yd_sel','k1');};
const KIDS=[{id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:16300,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'},
            {id:'k2',name:'하준',color:'yellow',sort:1,opening_balance:5000,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'}];
const ENTRIES=[E('e1','k1','간식',-800,'2026-09-18'),E('e2','k1','용돈',3000,'2026-09-17'),E('e3','k2','젤리',-500,'2026-09-18')];
(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await ctx.addInitScript(require('./_env').LOCAL);
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const cdp=await ctx.newCDPSession(p);
await p.goto('file://'+path.resolve(__dirname,'../index.html'));
const load=async(kids,entries)=>{ await p.evaluate(s=>eval(s),`(${SEED.toString()})(${JSON.stringify(kids)},${JSON.stringify(entries)})`); await p.reload(); await p.waitForTimeout(600); };
const swipe=async(x0,y0,x1,y1,ms=180)=>{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});
  for(let i=1;i<=6;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/6,y:y0+(y1-y0)*i/6}]}); await p.waitForTimeout(ms/6); }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await p.waitForTimeout(350);
};
const who=()=>p.textContent('.bar .k.on');
const rowY=async()=>{ const r=await p.$eval('.row',e=>e.getBoundingClientRect()); return r.y+r.height/2; };

await load(KIDS,ENTRIES);
T('처음은 서윤', (await who())==='서윤');
let y=await rowY();
await swipe(300,y,90,y);
T('왼쪽으로 밀면 다음 아이(하준)', (await who())==='하준');
T('진짜로 바뀐다 — 저장된 선택도 하준', await p.evaluate(()=>localStorage.getItem('yd_sel'))==='k2');
T('잔액도 하준 것', (await p.textContent('.balbtn b'))==='4,500');
T('아이 화면과 같은 방향으로 미끄러진다', await p.$eval('.screen',e=>e.classList.contains('slide-l')));
T('끌기가 만든 click 으로 시트가 열리지 않는다', !(await p.$('.sheet')) && !(await p.$('.kid')));
y=await rowY();
await swipe(90,y,300,y);
T('오른쪽으로 밀면 되돌아온다(서윤)', (await who())==='서윤' && await p.$eval('.screen',e=>e.classList.contains('slide-r')));
await swipe(90,y,300,y);
T('첫 아이에서 더 밀어도 그대로 (돌지 않는다)', (await who())==='서윤');
await swipe(300,y,90,y); await swipe(300,y,90,y);
T('마지막 아이에서 더 밀어도 그대로', (await who())==='하준');
await swipe(90,y,300,y);

// 안 바뀌어야 하는 것들
await swipe(300,400,260,720);
T('세로로 밀면 그대로', (await who())==='서윤');
await swipe(300,y,270,y);
T('살짝 밀면 그대로', (await who())==='서윤');
await swipe(20,y,300,y);
T('가장자리에서 시작하면 그대로 (안드로이드 뒤로 가기 몫)', (await who())==='서윤');
const ey=await p.$eval('input.memo',e=>{const r=e.getBoundingClientRect(); return r.y+r.height/2;});
await swipe(300,ey,90,ey);
T('입력줄 위에서 시작하면 그대로', (await who())==='서윤');

// 적는 중에는 무시 — 적던 게 날아가지 않는다
await p.click('input.memo'); await p.type('input.memo','장난감'); await p.waitForTimeout(200);
y=await rowY();
await swipe(300,y,90,y);
T('적는 중에 밀면 그대로, 적던 것도 그대로', (await who())==='서윤' && (await p.$eval('input.memo',e=>e.value))==='장난감');
await p.click('.thead'); await p.waitForTimeout(300);      // 나가기만 (금액 없으면 비워진다)

// 금액까지 쳐서 남아 있는 입력도, 아이를 바꾸면 탭과 똑같이 비워진다
await p.click('input.amt'); await p.keyboard.type('500'); await p.click('.thead'); await p.waitForTimeout(300);
T('금액을 친 입력은 밖을 눌러도 남는다', (await p.$eval('input.amt',e=>e.value))==='500');
y=await rowY();
await swipe(300,y,90,y);
T('밀어서 아이를 바꾸면 적던 게 비워진다 (탭과 같다)', (await who())==='하준' && (await p.$eval('input.amt',e=>e.value))==='');

// 탭도 같은 길 — 같은 방향으로 미끄러진다
await p.click('.bar .k >> nth=0'); await p.waitForTimeout(300);
T('탭을 눌러도 같은 방향으로 미끄러진다', (await who())==='서윤' && await p.$eval('.screen',e=>e.classList.contains('slide-r')));

// 밀고 나서 바로 누르는 건 먹지 않는다
y=await rowY();
await swipe(300,y,90,y);
await p.click('.row >> nth=0'); await p.waitForTimeout(300);
T('민 직후 일부러 누른 줄은 열린다', !!(await p.$('.sheet')));
await p.click('.sheet button:has-text("취소")'); await p.waitForTimeout(300);

// 아이가 하나면 아무 일 없다
await load([KIDS[0]],ENTRIES);
y=await rowY();
await swipe(300,y,90,y);
T('아이가 한 명이면 그대로', !!(await p.$('.balbtn')) && !(await p.$('.sheet')));

console.log(`\n${pass} passed, ${fail} failed`); console.log('errors:',errs.join('|')||'none'); await b.close(); process.exit(fail||errs.length?1:0);})();
