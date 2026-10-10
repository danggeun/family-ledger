// 한 바퀴 — 첫 시작 · 적기 · 날짜 칩 · 용도 칩 · 고치기 · 지우기 · 매주 용돈 · 새로고침 · 건너뛰기
const {T, done, launch, localPage, ready, settle, idle}=require('./_harness');
(async()=>{
const b=await launch();
const {p}=await localPage(b);                 // 빈 저장소 = 시작 화면

// 닫기·뒤로는 history.back() → popstate 라 한 박자 늦고, 아이를 바꾸면 옛 화면 복사본(.ghost)이 타이머로 빠진다 — 둘 다 끝날 때까지
const calm=()=>idle(p);
const click=async(sel)=>{ await p.click(sel); await calm(); };
const curBal=()=>p.$eval('.bal b',e=>e.textContent);
const tab=async(i)=>{const ts=await p.$$('.bar .k');await ts[i].click();await calm();};

// 1) 첫 시작
T('첫 시작 화면', await p.$('text=새로 시작하기')!==null);
await click('text=새로 시작하기');
T('아이 2명 기본', (await p.$$('.pair input:not(.r)')).length===2);
const opens=await p.$$('.pair input.r');
await opens[0].fill('10000'); await opens[1].fill('5000');
await p.click('text=시작'); await p.waitForFunction(()=>!!document.querySelector('.bal')); await settle(p);

// 2) 홈
T('아이 탭 2개', (await p.$$('.bar .k')).length===2);
T('첫째 시작 잔액', (await curBal())==='10,000');
await tab(1); T('둘째 시작 잔액', (await curBal())==='5,000');
T('둘째 빈 통장', (await p.$('.empty-msg'))!==null);
await tab(0);

// 3) 나감 1,500
await p.fill('input.memo','문구점 색연필');
await p.fill('input.amt','1500');
T('금액 콤마', (await p.$eval('input.amt',e=>e.value))==='1,500');
await click('.entry .ok');
T('저장 후 잔액 8,500', (await curBal())==='8,500');
T('입력칸 비워짐', (await p.$eval('input.memo',e=>e.value))==='');
T('통장 줄 표시', /오늘.*문구점.*−1,500.*8,500/s.test(await p.$eval('.row',e=>e.textContent)));

// 4) 들어옴 +5,000, 어제
await click('.entry .dbtn');
T('날짜 칩 열림', (await p.$('.chips.dates'))!==null);
await click('.chips.dates button:has-text("어제")');
T('날짜 버튼 어제', (await p.$eval('.entry .dbtn',e=>e.textContent))==='어제');
await p.click('.entry .sign');
await p.fill('input.memo','할머니');await p.fill('input.amt','5000');
await click('.entry .ok');
T('잔액 13,500', (await curBal())==='13,500');
const rows=await p.$$eval('.row',es=>es.map(e=>e.textContent));
T('오늘이 위, 어제가 아래', rows[0].includes('오늘') && rows[1].includes('어제'));
T('누적 총액', rows[1].includes('15,000') && rows[0].includes('13,500'));
// 5) 최근 용도 칩
await p.focus('input.memo'); await settle(p);
const chips=await p.$$eval('.chips button',es=>es.map(e=>e.textContent));
T('최근 용도 칩', chips.includes('할머니') && chips.includes('문구점 색연필'));
await click('.chips button:has-text("할머니")');
T('칩 탭 → 용도 채움', (await p.$eval('input.memo',e=>e.value))==='할머니');
await p.fill('input.memo','');
await click('.thead');   // 적는 중엔 첫 탭이 키보드만 내린다

// 6) 편집
await click('.row >> nth=0');
T('편집 시트', (await p.$('.sheet'))!==null);
await p.fill('.sheet input.r','2000');
await click('.sheet button:has-text("저장")');
T('편집 반영 13,000', (await curBal())==='13,000');

// 7) 삭제 2단계
await click('.row >> nth=0');
await click('.sheet button:has-text("삭제")');
T('삭제 확인 문구', (await p.$('.sheet button:has-text("정말 삭제")'))!==null);
await click('.sheet button:has-text("정말 삭제")');
T('삭제 후 15,000', (await curBal())==='15,000');

// 7-b) 칩은 딴 데를 누르면 닫힌다
await click('input.memo');
T('용도를 누르면 최근 용도 칩', (await p.$$('.chips button')).length>0);
await click('.thead');
T('딴 데를 누르면 칩이 닫힌다', (await p.$$('.chips button')).length===0);
await click('.dbtn');
T('날짜 칩도 열리고', (await p.$$('.chips.dates button')).length>0);
await click('.thead');
T('딴 데를 누르면 날짜 칩도 닫힌다', (await p.$$('.chips.dates button')).length===0);

// 8) 자동 용돈
await click('.gear');
T('설정 화면', (await p.$('h2:has-text("설정")'))!==null);
// 매주 용돈: 요약 행 → 시트 (안 함/매주 · 요일 · 금액 · 저장)
await click('.srow.tap >> nth=0');
await click('.sheet .tabs button:has-text("매주")');
const DOW=["일","월","화","수","목","금","토"];
await click('.sheet .dow button:has-text("'+DOW[new Date().getDay()]+'")');
await p.fill('.sheet .box input','2000');
await click('.sheet .btn.pri');
T('요약 행에 요일·금액', /요일 · 2,000원/.test(await p.$eval('.srow.tap >> nth=0',e=>e.textContent)));
await click('.nav .back');
const rows2=await p.$$eval('.row',es=>es.map(e=>e.textContent));
T('오늘 자동 용돈 줄', rows2.some(r=>r.includes('용돈')&&r.includes('+2,000')));
T('잔액 17,000', (await curBal())==='17,000');
T('"자동" 표시', (await p.$('.row.auto'))!==null);

// 9) 새로고침
await p.reload(); await ready(p);
T('새로고침 후 17,000', (await curBal())==='17,000');
T('자동 중복 없음', (await p.$$('.row.auto')).length===1);

// 10) 자동 줄 건너뛰기
await click('.row.auto');
T('건너뛰기 버튼', (await p.$('.sheet button:has-text("이번 주 건너뛰기")'))!==null);
await click('.sheet button:has-text("이번 주 건너뛰기")');
await click('.sheet button:has-text("정말 건너뛰기")');
T('건너뛴 뒤 15,000', (await curBal())==='15,000');
await p.reload(); await ready(p);
T('새로고침해도 안 돌아옴', (await p.$$('.row.auto')).length===0 && (await curBal())==='15,000');

await done(b);
})();
