// 매주 용돈(요약 행 + 시트) · 아이 색 6종 · 설정 화면 엣지 스와이프
const {T, done, launch, localPage, seed, settle, touch, KID, idle}=require('./_harness');
(async()=>{
const b=await launch();
const {p}=await localPage(b);
await seed(p, [KID('k1','서윤','pink',0,10000,{weekly_on:true,weekly_dow:6,weekly_amount:3000,weekly_start:'2026-09-01',created_at:'2026-07-01'}),
               KID('k2','하준','yellow',1,0,{created_at:'2026-07-01'})], []);
// 닫기·뒤로는 history.back() → popstate 라 한 박자 늦고, 아이를 바꾸면 옛 화면 복사본(.ghost)이 타이머로 빠진다 — 둘 다 끝날 때까지
const calm=()=>idle(p);
const click=async(sel)=>{ await p.click(sel); await calm(); };
// 손가락 끌기 — 하네스가 이벤트 시각을 찍으므로 "빠르게 튕기기" 속도가 부하와 무관하게 정확하다. 끝나면 전환(.2s)까지 기다린다
const drag=await touch(p);
const swipe=async(x0,y0,x1,y1,steps,ms)=>{ await drag(x0,y0,x1,y1,ms,true,steps); await calm(); };
// 엣지 스와이프로 나가면 .17초 타이머 뒤 history.back() — 홈이 그려질 때까지(안 오면 아래 T 가 실패로 센다)
const home=()=>p.waitForFunction(()=>!!document.querySelector('.bal')).then(()=>calm(),()=>{});
const amt=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).children[0].weekly_amount);

// ── 1. 매주 용돈 — 요약 행 + 시트 ──
await click('.gear');
const rowTxt=async(i)=>p.$eval('.srow.tap >> nth='+i, e=>e.textContent);
T('요약 행: 켜진 아이', /토요일 · 3,000원/.test(await rowTxt(0)));
T('요약 행: 꺼진 아이 "안 함"', /안 함/.test(await rowTxt(1)));
T('인라인 입력칸 없음(설정이 길어지지 않음)', (await p.$$('.srow input[inputmode=numeric]')).length===0 && (await p.$$('.tog')).length===0 && (await p.$$('.srow.tap')).length>=3);
await click('.srow.tap >> nth=0');
T('시트 열림', !!(await p.$('.sheet')) && /서윤 · 매주 용돈/.test(await p.textContent('.sheet h3')));
T('요일·금액 칸 있음', (await p.$$('.sheet .dow button')).length===7 && !!(await p.$('.sheet .box input')));
await click('.sheet .tabs button:has-text("안 함")');
T('안 함이면 요일·금액 숨김', (await p.$$('.sheet .dow')).length===0);
await click('.sheet .tabs button:has-text("매주")');
await p.fill('.sheet .box input',''); await click('.sheet .btn.pri');
T('금액 없이 저장 → 막힘', !!(await p.$('.sheet')));
await p.fill('.sheet .box input','5000'); await p.click('.sheet .dow button:has-text("수")');
await click('.sheet .btn.pri');
T('저장 후 시트 닫힘', !(await p.$('.sheet')));
T('요약 행 갱신', /수요일 · 5,000원/.test(await rowTxt(0)));
T('저장됨', (await amt())===5000 && await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).children[0].weekly_dow===3));
await click('.srow.tap >> nth=0');
await p.fill('.sheet .box input','9000'); await click('.sheet .btn:has-text("취소")');
T('취소면 안 바뀜', (await amt())===5000 && /5,000원/.test(await rowTxt(0)));
await click('.srow.tap >> nth=0');
await p.click('.sheet .tabs button:has-text("안 함")'); await click('.sheet .btn.pri');
T('끄면 "안 함"', /안 함/.test(await rowTxt(0)) && await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).children[0].weekly_on===false));

// ── 2. 색 ──
const sw=await p.$$eval('.srow .swatch button',es=>es.slice(0,6).map(e=>e.style.backgroundColor));
T('6색 순서', sw.join('|')==='rgb(30, 136, 229)|rgb(29, 185, 84)|rgb(255, 196, 0)|rgb(255, 122, 26)|rgb(255, 61, 143)|rgb(139, 79, 232)');
T('핑크 #FF3D8F', sw[4]==='rgb(255, 61, 143)');
T('노랑 #FFC400', sw[2]==='rgb(255, 196, 0)');
T('색칩 6개', (await p.$$('.swatch button')).length===12);   // 아이 2명 × 6
await click('.nav .back');
await click('.bar .k:nth-child(2)');
T('노랑 아이 탭 밑줄', await p.$eval('.bar .k.on',e=>getComputedStyle(e,'::after').backgroundColor==='rgb(255, 196, 0)'));

// ── 3. 엣지 스와이프 ──
await click('.gear');
await swipe(10,400,220,410,12,180); await home();
T('가장자리에서 넓게 끌기 → 홈', !!(await p.$('.bal')));
await click('.gear');
await swipe(10,400,60,405,8,400);
T('짧게 끌다 놓으면 원위치', !!(await p.$('.nav h2')) && await p.$eval('.page',e=>e.style.transform===''));
await swipe(150,400,380,405,12,180);
T('가운데서 시작하면 무시', !!(await p.$('.nav h2')));
await swipe(10,300,20,600,12,180);
T('세로로 끌면 무시(스크롤)', !!(await p.$('.nav h2')));
await swipe(8,400,110,402,5,90); await home();
T('짧아도 빠르면 홈', !!(await p.$('.bal')));

await done(b);
})();
