// 시트를 아래로 밀어 닫기 · 누가 적었는지
const {T, done, launch, localPage, seed, ready, settle, touch, back: backOnce, idle, until}=require('./_harness');
// 앱 타이머(0.1~0.5초)·popstate 로 오는 결과를 기다린다. 2초 안에 안 오면 안 온 것 — 던지지 않고 판정은 뒤의 T 가 한다
(async()=>{
const b=await launch();
const {p}=await localPage(b);
const t=new Date().toISOString().slice(0,10);
await seed(p, [{id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:10000,weekly_on:false,weekly_amount:0,created_at:'2026-01-01'}],
  [{id:'e1',child_id:'k1',entry_date:t,memo:'젤리',amount:-800,auto_key:null,created_by:'me',created_at:t+'T09:00:00Z'},
   {id:'e2',child_id:'k1',entry_date:t,memo:'할머니',amount:5000,auto_key:null,created_by:'other',created_at:t+'T10:00:00Z'}]);
const swipe=await touch(p);
// 세로로 끌기. 이벤트 시각을 직접 찍어 속도가 기계 부하와 상관없이 ms 대로다. 손을 뗀 직후 돌아온다
const drag=(from,to,steps,ms)=>swipe(195,from,195,to,ms,false,steps);
const click=async(sel)=>{ await p.click(sel); await idle(p); };
const back=()=>backOnce(p);
// 누가 적었는지
await click('.row >> nth=1');
T('내가 적은 줄', /내가 적었어요/.test(await p.textContent('.sheet .f')));
const top=await p.$eval('.sheet',e=>e.getBoundingClientRect().top);
await drag(top+40, top+340, 12, 200);
await until(p, ()=>!document.querySelector('.sheet')); await idle(p);      // 밀려 내려간 뒤(0.17초) 닫힌다
T('아래로 밀면 닫힌다', !(await p.$('.sheet')));
await click('.row >> nth=0');
T('다른 기기가 적은 줄', /다른 기기에서 적었어요/.test(await p.textContent('.sheet .f')));
// 조금만 밀면 제자리
await drag(top+40, top+80, 8, 400); await idle(p);                           // 제자리로 돌아오는 0.2초 + (잘못 닫혔다면) 닫힘까지
T('조금 밀면 안 닫힌다', !!(await p.$('.sheet')) && await p.$eval('.sheet',e=>e.style.transform===''));
// 위로 밀면 무시
await drag(top+120, top+40, 8, 200); await idle(p);
T('위로 밀면 무시', !!(await p.$('.sheet')));
await back();
// 자동 줄에는 안 붙는다
await p.evaluate((t)=>{const d=JSON.parse(localStorage.getItem('yd_local_v1'));
  d.entries.push({id:'e3',child_id:'k1',entry_date:t,memo:'용돈',amount:3000,auto_key:'w:'+t,created_by:'other',created_at:t+'T11:00:00Z'});
  localStorage.setItem('yd_local_v1',JSON.stringify(d));}, t);
await p.reload(); await ready(p);
await click('.row.auto');
T('자동 줄에는 누가 적었는지 안 붙는다', !/적었어요/.test(await p.textContent('.sheet .f')));
// 받은 돈 / 쓴 돈이 시트 안에서도 구분된다
await back();
await click('.row >> nth=1');   // 받은 돈 줄
T('받은 돈이면 고른 칸이 초록', (await p.$eval('.sheet .tabs button.on',e=>getComputedStyle(e).color))==='rgb(27, 122, 90)');
T('받은 돈이면 금액도 초록', (await p.$eval('.sheet input.r',e=>getComputedStyle(e).color))==='rgb(27, 122, 90)');
await click('.sheet .tabs button:has-text("쓴 돈")');
T('쓴 돈으로 바꾸면 검정', (await p.$eval('.sheet .tabs button.on',e=>getComputedStyle(e).color))==='rgb(17, 19, 23)'
  && (await p.$eval('.sheet input.r',e=>getComputedStyle(e).color))==='rgb(17, 19, 23)');

// ── 시트 안 Enter: 금액 → 용도, 용도 → 저장 (홈 입력줄과 같은 순서). 키보드의 "다음/완료"가 이것 ──
await click('.sheet button:has-text("취소")');
await click('.row:not(.auto) >> nth=0');
T('시트 순서는 입력줄과 같다: 날짜 → 용도 → 금액 (1.2.6)', (await p.$$eval('.sheet .f label',es=>es.map(e=>e.textContent).join(' '))).startsWith('날짜 용도 금액'));
T('시트 용도칸은 "다음", 금액칸은 "완료"', await p.$eval('.sheet input[type=text]',e=>e.enterKeyHint==='next') && await p.$eval('.sheet input.r',e=>e.enterKeyHint==='done'));
await p.click('.sheet input[type=text]'); await p.keyboard.press('End'); await p.keyboard.type(' 더'); await p.keyboard.press('Enter'); await settle(p);
T('용도칸에서 Enter → 금액칸으로', await p.evaluate(()=>document.activeElement && document.activeElement.classList.contains('r') && document.activeElement.closest('.sheet')!==null));
await p.keyboard.press('Enter'); await idle(p);
T('금액칸에서 Enter → 저장되고 시트 닫힘', !(await p.$('.sheet')) && /더/.test(await p.textContent('.row:not(.auto) >> nth=0')));
T('시트는 화면 높이 안에서 스크롤 (키보드가 뜨면 화면이 줄어든다)', await p.evaluate(()=>{ const m=document.querySelector('meta[name=viewport]').content; return /interactive-widget=resizes-content/.test(m); }));

await done(b);
})();
