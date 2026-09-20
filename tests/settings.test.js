const {chromium}=require('playwright');
const path=require('path');
(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
p.on('console',m=>{if(m.type()==='error'&&!/ERR_|Failed to load resource/.test(m.text()))errs.push('console: '+m.text());});
await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.waitForTimeout(700);
let pass=0,fail=0;
const T=(l,c)=>{c?pass++:fail++;console.log((c?'OK  ':'FAIL')+' '+l);};
const bal=()=>p.$eval('.bal b',e=>e.textContent);

await p.click('text=새로 시작하기');await p.waitForTimeout(250);
const opens=await p.$$('.pair input.r');
await opens[0].fill('10000'); await opens[1].fill('5000');
await p.click('text=시작');await p.waitForTimeout(600);

// 1) 처음 금액 줄
T('빈 통장에도 처음 금액 줄', (await p.$('.row.open'))!==null);
T('처음 금액 = 시작 잔액', /처음 금액/.test(await p.$eval('.row.open',e=>e.textContent))
   && /10,000/.test(await p.$eval('.row.open',e=>e.textContent)));

// 2) 기록을 넣어도 맨 아래에 남는다
await p.fill('input.memo','젤리'); await p.fill('input.amt','800');
await p.click('.entry .ok'); await p.waitForTimeout(400);
const rows=await p.$$eval('.row',es=>es.map(e=>e.className));
T('처음 금액은 맨 마지막 줄', rows[rows.length-1].includes('open'));
T('잔액 9,200', (await bal())==='9,200');

// 3) 눌러서 고치기
await p.click('.row.open'); await p.waitForTimeout(300);
T('처음 금액 시트', (await p.$('.sheet h3'))!==null && (await p.$eval('.sheet h3',e=>e.textContent))==='처음 금액');
T('삭제 버튼 없음', (await p.$('.sheet .btn.danger'))===null);
await p.fill('.sheet input.r','12000');
await p.click('.sheet button:has-text("저장")'); await p.waitForTimeout(400);
T('고친 뒤 잔액 11,200', (await bal())==='11,200');
T('줄에도 반영', /12,000/.test(await p.$eval('.row.open',e=>e.textContent)));
await p.reload(); await p.waitForTimeout(800);
T('새로고침 후 유지', (await bal())==='11,200');

// 4) 설정 정리 확인
await p.click('.gear'); await p.waitForTimeout(400);
const txt=await p.$eval('.screen.page',e=>e.textContent);
const heads=await p.$$eval('.sec-h',es=>es.map(e=>e.textContent));
T('기본 4섹션이 이 순서로', JSON.stringify(heads.filter(h=>h!=='초대'))===JSON.stringify(['아이','매주 용돈','동기화','기록']));
T('초대는 주인에게만 (그 외 섹션은 늘지 않는다)', heads.length===(await p.$('.srow.tap:has-text("잠깐 열어두기")') ? 5 : 4));
T('시작 잔액 섹션 없음', !/시작 잔액/.test(txt));
T('홈 화면에 추가 안내 없음', !/홈 화면에 추가/.test(txt));
T('종이에 적어두셨던 문구 없음', !/종이에 적어/.test(txt));
T('붙여넣어 두면 안심 문구 없음', !/안심이에요/.test(txt));
T('며칠 안 열어봐도 문구 없음', !/며칠 안 열어/.test(txt));
T('두 폰이 같이 보는 중 문구 없음', !/두 폰이 같이/.test(txt));
T('내보내기가 눌리는 행', (await p.$('.srow.tap:has-text("내보내기")'))!==null
   && /\u203A/.test(await p.$eval('.srow.tap:has-text("내보내기")',e=>e.textContent)));
T('버전 오른정렬', (await p.$eval('.ver',e=>getComputedStyle(e).textAlign))==='right');
T('아이 추가는 맨 아래 버전 줄 왼쪽에', await p.$eval('.foot',e=>{
  const a=e.querySelector('.addk'), v=e.querySelector('.ver');
  return !!a && a.textContent==='아이 추가하기'
    && a.getBoundingClientRect().left < v.getBoundingClientRect().left;}));
T('아이 추가는 버전과 같은 톤', await p.$eval('.foot',e=>{
  const a=getComputedStyle(e.querySelector('.addk')), v=getComputedStyle(e.querySelector('.ver'));
  return a.fontSize===v.fontSize && a.color===v.color;}));
T('아이 섹션에는 추가 버튼이 없다', !(await p.$('.card + .link.sm')));
T('로컬은 연결 안 됨 표시', /연결 안 됨/.test(txt));
await p.click('.nav .back'); await p.waitForTimeout(400);
// 4-b) 색 규칙 — 잔액은 검정, 아이 색은 탭에만
T('잔액은 검정', (await p.$eval('.bal b',e=>getComputedStyle(e).color))==='rgb(17, 19, 23)');
const ul=await p.$eval('.bar .k.on',e=>getComputedStyle(e,'::after').backgroundColor);
T('선택 탭 밑줄이 아이 색', ul==='rgb(30, 136, 229)');
await p.click('.entry .sign'); await p.fill('input.memo','할머니'); await p.fill('input.amt','5000');
await p.click('.entry .ok'); await p.waitForTimeout(400);
T('받은 돈은 초록 유지', (await p.$eval('.row .a.in',e=>getComputedStyle(e).color))==='rgb(27, 122, 90)');

// 5) 아이 지우기
await p.click('.gear'); await p.waitForTimeout(350);
T('아이 2명이면 ⋯ 버튼 2개', (await p.$$('.kmore')).length===2);
await p.click('.kmore >> nth=1'); await p.waitForTimeout(300);
T('아이 시트 = 이름', (await p.$eval('.sheet h3',e=>e.textContent))==='둘째');
T('기록 없음 안내', /기록은 없어요/.test(await p.$eval('.sheet .note',e=>e.textContent)));
await p.click('.sheet button:has-text("지우기")'); await p.waitForTimeout(150);
T('2단계 확인', (await p.$('.sheet button:has-text("정말 지우기")'))!==null);
await p.click('.sheet button:has-text("정말 지우기")'); await p.waitForTimeout(400);
T('아이 1명 남음', (await p.$$('.srow .nm')).length===1);
T('1명이면 ⋯ 사라짐', (await p.$$('.kmore')).length===0);
await p.reload(); await p.waitForTimeout(800);
await p.click('.gear'); await p.waitForTimeout(350);
T('새로고침해도 안 돌아옴', (await p.$$('.srow .nm')).length===1);
await p.click('.nav .back'); await p.waitForTimeout(400);
T('홈 탭도 1개', (await p.$$('.bar .k')).length===1);

// 6) 처음 금액 줄 날짜
T('처음 금액 줄에 날짜', (await p.$eval('.row.open .d',e=>e.textContent)).length>0);
T('날짜가 오늘', (await p.$eval('.row.open .d',e=>e.textContent))==='오늘');

// 아이 추가 — 늘어난 줄이 화면 밖일 수 있어 토스트로 알린다 (아이 수를 바꾸므로 맨 끝에서)
await p.click('.gear'); await p.waitForTimeout(350);
const before=(await p.$$('.srow .nm')).length;
await p.click('.foot .addk'); await p.waitForTimeout(700);
T('아이가 한 명 늘어난다', (await p.$$('.srow .nm')).length===before+1);
T('추가하면 알려준다', /추가했어요/.test(await p.textContent('#toast')));

console.log('\n'+pass+' passed, '+fail+' failed');
console.log('errors:', errs.length?errs.join(' | '):'none');
await b.close(); process.exit(fail?1:0);
})();
