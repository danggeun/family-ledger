// 홈에서 좌우로 밀어 아이 바꾸기 — 탭을 누른 것과 같은 결과, 아이 화면과 같은 손맛
const {T, done, launch, localPage, seed, settle, touch}=require('./_harness');
const E=(id,cid,memo,amount,date)=>({id,child_id:cid,entry_date:date,memo,amount,auto_key:null,created_by:'me',updated_by:'me',created_at:date+'T09:00:00Z'});
const KIDS=[{id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:16300,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'},
            {id:'k2',name:'하준',color:'yellow',sort:1,opening_balance:5000,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'}];
const ENTRIES=[E('e1','k1','간식',-800,'2026-09-18'),E('e2','k1','용돈',3000,'2026-09-17'),E('e3','k2','젤리',-500,'2026-09-18')];

(async()=>{
const b=await launch();
const {p}=await localPage(b);
const cdp=await p.context().newCDPSession(p);
const swipe=await touch(p);
const who=()=>p.textContent('.bar .k.on');
const rowY=async()=>{ const r=await p.$eval('.row',e=>e.getBoundingClientRect()); return r.y+r.height/2; };
const click=async(sel)=>{ await p.click(sel); await settle(p); };
// 실제 손가락 탭(터치) — 마우스 클릭과 달리 누른 버튼에 포커스가 남는다(폰과 같은 조건)
const tap=async(sel)=>{ const r=await p.$eval(sel,e=>{const b=e.getBoundingClientRect(); return {x:b.x+b.width/2,y:b.y+b.height/2};});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[r]}); await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await settle(p); };

await seed(p, KIDS, ENTRIES);
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
await p.click('input.memo'); await p.type('input.memo','장난감'); await settle(p);
y=await rowY();
await swipe(300,y,90,y);
T('적는 중에 밀면 그대로, 적던 것도 그대로', (await who())==='서윤' && (await p.$eval('input.memo',e=>e.value))==='장난감');
await click('.thead');      // 나가기만 (금액 없으면 비워진다)

// 금액까지 쳐서 남아 있는 입력도, 아이를 바꾸면 탭과 똑같이 비워진다
await p.click('input.amt'); await p.keyboard.type('500'); await click('.thead');
T('금액을 친 입력은 밖을 눌러도 남는다', (await p.$eval('input.amt',e=>e.value))==='500');
y=await rowY();
await swipe(300,y,90,y);
T('밀어서 아이를 바꾸면 적던 게 비워진다 (탭과 같다)', (await who())==='하준' && (await p.$eval('input.amt',e=>e.value))==='');

// 탭도 같은 길 — 같은 방향으로 미끄러진다
await click('.bar .k >> nth=0');
T('탭을 눌러도 같은 방향으로 미끄러진다', (await who())==='서윤' && await p.$eval('.screen',e=>e.classList.contains('slide-r')));

// 밀고 나서 바로 누르는 건 먹지 않는다
y=await rowY();
await swipe(300,y,90,y);
await click('.row >> nth=0');
T('민 직후 일부러 누른 줄은 열린다', !!(await p.$('.sheet')));
await click('.sheet button:has-text("취소")');

// 1.3.1: −/+ 를 누르면 그 버튼에 포커스가 남는다 — 그걸 "적는 중"으로 읽어 밀기가 안 먹었다 (1.1.7 부터)
await seed(p, KIDS, ENTRIES);
await tap('.entry .sign');
T('부호를 누르면 + 가 되고 그 버튼에 포커스가 남는다(실제 폰과 같은 조건)', (await p.textContent('.entry .sign'))==='+' && await p.evaluate(()=>document.activeElement.classList.contains('sign')));
y=await rowY();
await swipe(300,y,90,y);
T('부호를 누른 뒤 밀어도 옆 아이로 간다 (부호는 탭처럼 비워진다)', (await who())==='하준' && (await p.textContent('.entry .sign'))==='−');
await tap('.entry .sign'); await tap('.entry .sign');
await tap('.row');
T('부호를 누른 뒤 목록 줄을 누르면 고치기 시트가 바로 열린다', !!(await p.$('.sheet')));
if(await p.$('.sheet')) await click('.sheet button:has-text("취소")');

// 아이가 하나면 아무 일 없다
await seed(p, [KIDS[0]], ENTRIES);
y=await rowY();
await swipe(300,y,90,y);
T('아이가 한 명이면 그대로', !!(await p.$('.balbtn')) && !(await p.$('.sheet')));

await done(b);
})();
