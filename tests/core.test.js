const {chromium}=require('playwright');
const path=require('path');
(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error'&&!/ERR_|Failed to load resource/.test(m.text()))errs.push('console: '+m.text());});
await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.waitForTimeout(800);

let pass=0,fail=0;
const T=(l,c)=>{c?pass++:fail++;console.log((c?'OK  ':'FAIL')+' '+l);};
const curBal=()=>p.$eval('.bal b',e=>e.textContent);
const tab=async(i)=>{const ts=await p.$$('.bar .k');await ts[i].click();await p.waitForTimeout(160);};

// 1) 첫 시작
T('첫 시작 화면', await p.$('text=새로 시작하기')!==null);
await p.click('text=새로 시작하기');await p.waitForTimeout(200);
T('아이 2명 기본', (await p.$$('.pair input:not(.r)')).length===2);
const opens=await p.$$('.pair input.r');
await opens[0].fill('10000'); await opens[1].fill('5000');
await p.click('text=시작');await p.waitForTimeout(500);

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
await p.click('.entry .ok');await p.waitForTimeout(350);
T('저장 후 잔액 8,500', (await curBal())==='8,500');
T('입력칸 비워짐', (await p.$eval('input.memo',e=>e.value))==='');
T('통장 줄 표시', /오늘.*문구점.*−1,500.*8,500/s.test(await p.$eval('.row',e=>e.textContent)));

// 4) 들어옴 +5,000, 어제
await p.click('.entry .dbtn');await p.waitForTimeout(200);
T('날짜 칩 열림', (await p.$('.chips.dates'))!==null);
await p.click('.chips.dates button:has-text("어제")');await p.waitForTimeout(200);
T('날짜 버튼 어제', (await p.$eval('.entry .dbtn',e=>e.textContent))==='어제');
await p.click('.entry .sign');
await p.fill('input.memo','할머니');await p.fill('input.amt','5000');
await p.click('.entry .ok');await p.waitForTimeout(350);
T('잔액 13,500', (await curBal())==='13,500');
const rows=await p.$$eval('.row',es=>es.map(e=>e.textContent));
T('오늘이 위, 어제가 아래', rows[0].includes('오늘') && rows[1].includes('어제'));
T('누적 총액', rows[1].includes('15,000') && rows[0].includes('13,500'));
// 5) 최근 용도 칩
await p.focus('input.memo');await p.waitForTimeout(250);
const chips=await p.$$eval('.chips button',es=>es.map(e=>e.textContent));
T('최근 용도 칩', chips.includes('할머니') && chips.includes('문구점 색연필'));
await p.click('.chips button:has-text("할머니")');await p.waitForTimeout(150);
T('칩 탭 → 용도 채움', (await p.$eval('input.memo',e=>e.value))==='할머니');
await p.fill('input.memo','');
await p.click('.thead');await p.waitForTimeout(250);   // 적는 중엔 첫 탭이 키보드만 내린다

// 6) 편집
await p.click('.row >> nth=0');await p.waitForTimeout(250);
T('편집 시트', (await p.$('.sheet'))!==null);
await p.fill('.sheet input.r','2000');
await p.click('.sheet button:has-text("저장")');await p.waitForTimeout(350);
T('편집 반영 13,000', (await curBal())==='13,000');

// 7) 삭제 2단계
await p.click('.row >> nth=0');await p.waitForTimeout(250);
await p.click('.sheet button:has-text("삭제")');await p.waitForTimeout(150);
T('삭제 확인 문구', (await p.$('.sheet button:has-text("정말 삭제")'))!==null);
await p.click('.sheet button:has-text("정말 삭제")');await p.waitForTimeout(350);
T('삭제 후 15,000', (await curBal())==='15,000');

// 7-b) 칩은 딴 데를 누르면 닫힌다
await p.click('input.memo'); await p.waitForTimeout(250);
T('용도를 누르면 최근 용도 칩', (await p.$$('.chips button')).length>0);
await p.click('.thead'); await p.waitForTimeout(300);
T('딴 데를 누르면 칩이 닫힌다', (await p.$$('.chips button')).length===0);
await p.click('.dbtn'); await p.waitForTimeout(250);
T('날짜 칩도 열리고', (await p.$$('.chips.dates button')).length>0);
await p.click('.thead'); await p.waitForTimeout(300);
T('딴 데를 누르면 날짜 칩도 닫힌다', (await p.$$('.chips.dates button')).length===0);

// 8) 자동 용돈
await p.click('.gear');await p.waitForTimeout(300);
T('설정 화면', (await p.$('h2:has-text("설정")'))!==null);
// 매주 용돈: 요약 행 → 시트 (안 함/매주 · 요일 · 금액 · 저장)
await p.click('.srow.tap >> nth=0');await p.waitForTimeout(300);
await p.click('.sheet .tabs button:has-text("매주")');await p.waitForTimeout(200);
const DOW=["일","월","화","수","목","금","토"];
await p.click('.sheet .dow button:has-text("'+DOW[new Date().getDay()]+'")');await p.waitForTimeout(200);
await p.fill('.sheet .box input','2000');
await p.click('.sheet .btn.pri');await p.waitForTimeout(500);
T('요약 행에 요일·금액', /요일 · 2,000원/.test(await p.$eval('.srow.tap >> nth=0',e=>e.textContent)));
await p.click('.nav .back');await p.waitForTimeout(400);
const rows2=await p.$$eval('.row',es=>es.map(e=>e.textContent));
T('오늘 자동 용돈 줄', rows2.some(r=>r.includes('용돈')&&r.includes('+2,000')));
T('잔액 17,000', (await curBal())==='17,000');
T('"자동" 표시', (await p.$('.row.auto'))!==null);

// 9) 새로고침
await p.reload();await p.waitForTimeout(900);
T('새로고침 후 17,000', (await curBal())==='17,000');
T('자동 중복 없음', (await p.$$('.row.auto')).length===1);

// 10) 자동 줄 건너뛰기
await p.click('.row.auto');await p.waitForTimeout(250);
T('건너뛰기 버튼', (await p.$('.sheet button:has-text("이번 주 건너뛰기")'))!==null);
await p.click('.sheet button:has-text("이번 주 건너뛰기")');await p.waitForTimeout(150);
await p.click('.sheet button:has-text("정말 건너뛰기")');await p.waitForTimeout(350);
T('건너뛴 뒤 15,000', (await curBal())==='15,000');
await p.reload();await p.waitForTimeout(900);
T('새로고침해도 안 돌아옴', (await p.$$('.row.auto')).length===0 && (await curBal())==='15,000');
console.log('\n'+pass+' passed, '+fail+' failed');
console.log('errors:', errs.length?errs.join(' | '):'none');
await b.close();
process.exit(fail?1:0);
})();
