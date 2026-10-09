// 1.2.0 — 처음 안내(어두운 막 + 눌러볼 곳) · 사용법 페이지 · 안드로이드 설치 버튼
const {chromium}=require('playwright');
const path=require('path');
let pass=0,fail=0; const T=(n,ok)=>{ ok?pass++:fail++; console.log((ok?'OK   ':'FAIL ')+n); };
const KIDS=[{id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:16300,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'},
            {id:'k2',name:'하준',color:'yellow',sort:1,opening_balance:5000,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'}];
const E=(id,memo,amount,date)=>({id,child_id:'k1',entry_date:date,memo,amount,auto_key:null,created_by:'me',updated_by:'me',created_at:date+'T09:00:00Z'});
(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
await ctx.addInitScript(require('./_env').LOCAL_RAW);          // 안내를 끄지 않는 환경
const p=await ctx.newPage(); require('./_env').guard(p); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
const cdp=await ctx.newCDPSession(p);
await p.goto('file://'+path.resolve(__dirname,'../index.html'));
// tour: undefined 면 yd_tour 를 지운다(= 이 판을 처음 여는 기기), 문자열이면 그대로
const load=async(kids,entries,tour)=>{ await p.evaluate(({kids,entries,tour})=>{
    localStorage.clear();
    localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K7PM-3QRA'},children:kids,entries})); localStorage.setItem('yd_sel','k1');
    if(tour) localStorage.setItem('yd_tour',tour); },{kids,entries,tour});
  await p.waitForTimeout(150); await p.reload(); await p.waitForTimeout(500); };
// 카드: 제목|점 (켜진 점 번호 / 점 수). 끝 단계는 점이 숨는다 → '|'
const card=()=>p.$eval('.tour:not(.hide) .tour-card',e=>{ const d=[...e.querySelectorAll('.dots i')], on=d.findIndex(x=>x.classList.contains('on'));
  return e.querySelector('.tc-title').childNodes[0].textContent+'|'+(e.querySelector('.dots').style.visibility==='hidden'?'':(on+1)+' / '+d.length); }).catch(()=>null);
const tour=()=>p.evaluate(()=>localStorage.getItem('yd_tour'));
const press=async(sel,ms)=>{ const box=await p.$eval(sel,e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x,y:box.y}]}); await p.waitForTimeout(ms);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await p.waitForTimeout(300); };
const swipe=async(x0,y0,x1,y1)=>{ await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});
  for(let i=1;i<=6;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/6,y:y0+(y1-y0)*i/6}]}); await p.waitForTimeout(30); }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await p.waitForTimeout(400); };

// ── 기존 사용자(이 판을 처음 여는데 이미 기록이 있다) → 안내 없음 ──
await load(KIDS,[E('e1','간식',-800,'2026-10-08')]);
T('기존 사용자: 안내가 안 뜬다', !(await p.$('.tour-card')) && (await tour())==='done');

// ── 새 기기 → 1단계 잔액. 막이 다른 곳을 막는다 ──
await load(KIDS,[]);
T('새 기기: 1단계 "잔액을 눌러 보세요" (1 / 3)', (await card())==='잔액을 눌러 보세요|1 / 3' && (await tour())==='new');
T('어두운 막과 밝은 구멍이 있다', !!(await p.$('.tour-spot')) && (await p.$$('.tour-block')).length===4);
const tabBox=await p.$eval('.bar .k >> nth=1',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
await p.mouse.click(tabBox.x,tabBox.y); await p.waitForTimeout(300);
T('막 밖(아이 탭)을 눌러도 아무 일 없다', (await p.textContent('.bar .k.on'))==='서윤' && (await card())==='잔액을 눌러 보세요|1 / 3');
const gearBox=await p.$eval('.gear',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
await p.mouse.click(gearBox.x,gearBox.y); await p.waitForTimeout(300);
T('설정도 안 열린다', !(await p.$('.nav h2')));
// 구멍 안의 잔액은 진짜로 눌린다
await p.click('.balbtn'); await p.waitForTimeout(400);
T('잔액을 누르면 그림이 열린다 (안내는 숨는다)', !!(await p.$('.kid')) && !!(await p.$('.tour.hide')));
T('아이 화면은 그대로 (글자 없음·버튼 하나)', (await p.$$('.kid button')).length===1);
await p.click('.kid .x'); await p.waitForTimeout(400);
T('닫으면 2단계 밀기', (await card())==='좌우로 밀어 보세요|2 / 3');
T('2단계 제목에 방향 화살표', (await p.$$('.tour-card .tc-chev i')).length===3);
T('레이어는 하나뿐 (단계가 바뀌어도 새로 만들지 않는다)', (await p.$$('.tour')).length===1);

// ── 2단계: 밝은 띠에서 밀거나, 이름을 누르거나, 어두운 데서 밀어도 ──
await swipe(300,100,90,100);
T('밀면 3단계 길게 누르기', (await card())==='이 줄을 길게 눌러 보세요|3 / 3' && (await p.textContent('.bar .k.on'))==='하준');
await load(KIDS,[]); await p.click('.balbtn'); await p.waitForTimeout(300); await p.click('.kid .x'); await p.waitForTimeout(400);
await p.click('.bar .k >> nth=1'); await p.waitForTimeout(400);
T('이름을 눌러도 3단계', (await card())==='이 줄을 길게 눌러 보세요|3 / 3');
await load(KIDS,[]); await p.click('.balbtn'); await p.waitForTimeout(300); await p.click('.kid .x'); await p.waitForTimeout(400);
await swipe(300,600,90,600);                                        // 어두운 데
T('어두운 데서 밀어도 3단계', (await card())==='이 줄을 길게 눌러 보세요|3 / 3');

// ── 3단계: 예시 줄을 길게 누르면 그 금액 그림. 기록은 안 생긴다 ──
T('예시 줄이 있다 (오늘 · 젤리 · −800)', await p.$eval('.tour-sample.on .row.sample',e=>/젤리/.test(e.textContent) && /800/.test(e.textContent)));
await p.click('.row.sample'); await p.waitForTimeout(300);
T('예시 줄을 짧게 누르면 아무 일 없다', !(await p.$('.sheet')) && !!(await p.$('.tour-card')));
await press('.row.sample', 700);
T('길게 누르면 한 줄 그림 (젤리 −800)', !!(await p.$('.kid.one')) && (await p.textContent('.kid.one .ka b'))==='−800' && (await p.textContent('.kid.one .kn'))==='젤리');
T('진짜 기록은 하나도 안 생겼다', await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).entries.length===0));
await p.waitForTimeout(600);                                       // 손 뗀 뒤 500ms 는 click 을 삼킨다(길게 누르기 규칙)
await p.click('.kid.one .x'); await p.waitForTimeout(400);
T('닫으면 "다 됐어요"', (await card())==='다 됐어요|');
await p.click('.tour-card .ok'); await p.waitForTimeout(500);
T('확인하면 끝 — 레이어가 치워지고 done', !(await p.$('.tour')) && (await tour())==='done');
await p.waitForTimeout(150); await p.reload(); await p.waitForTimeout(500);
T('다시는 안 뜬다', !(await p.$('.tour-card')));

// ── 아이가 하나면 밀기 단계가 없다 (1 / 2 → 2 / 2) ──
await load([KIDS[0]],[]);
T('아이 하나: 1 / 2', (await card())==='잔액을 눌러 보세요|1 / 2');
await p.click('.balbtn'); await p.waitForTimeout(300); await p.click('.kid .x'); await p.waitForTimeout(400);
T('바로 길게 누르기 (2 / 2)', (await card())==='이 줄을 길게 눌러 보세요|2 / 2');

// ── 그만하기 · 하다 말고 끄면 처음부터 ──
await p.click('.tour-card .skip'); await p.waitForTimeout(500);
T('건너뛰기 → 끝, done', !(await p.$('.tour')) && (await tour())==='done');
await load(KIDS,[],'new');
T('하다 말고 껐으면(new) 처음부터', (await card())==='잔액을 눌러 보세요|1 / 3');

// ── 사용법 페이지 ──
await load(KIDS,[E('e1','간식',-800,'2026-10-08')],'done');
await p.click('.gear'); await p.waitForTimeout(400);
T('설정 맨 아래 줄: 아이 추가하기 · 사용법 · 버전', await p.$eval('.foot',e=>/아이 추가하기/.test(e.textContent) && /사용법/.test(e.textContent) && /v1\.2\.0/.test(e.textContent)));
await p.click('.help-link'); await p.waitForTimeout(400);
T('사용법이 열린다', !!(await p.$('.page.help')) && (await p.textContent('.help h2'))==='사용법');
const hl=await p.$$eval('.help .hl',es=>es.map(e=>e.textContent));
T('로컬 모드: 여덟 줄 (동기화 줄 없음)', hl.length===8 && /잔액을 누르면/.test(hl[0]) && /길게 누르면/.test(hl[1]) && /좌우로 밀면/.test(hl[2]) && /내보내기/.test(hl[7]));
await p.click('.help .back'); await p.waitForTimeout(400);
T('‹ 로 닫히고 설정으로', !(await p.$('.page.help')) && !!(await p.$('.nav h2')));
await p.click('.help-link'); await p.waitForTimeout(300); await p.goBack(); await p.waitForTimeout(400);
T('뒤로 가기로도 닫힌다', !(await p.$('.page.help')) && !!(await p.$('.nav h2')));
await p.click('.help-link'); await p.waitForTimeout(300);
await swipe(10,400,300,400);
T('왼쪽 가장자리 스와이프로도 닫힌다', !(await p.$('.page.help')) && !!(await p.$('.nav h2')));
await p.click('.help-link'); await p.waitForTimeout(300);
await p.click('.help button:has-text("처음 안내 다시 보기")'); await p.waitForTimeout(600);
T('처음 안내 다시 보기 → 홈에서 1단계', !(await p.$('.page.help')) && !(await p.$('.nav h2')) && (await card())==='잔액을 눌러 보세요|1 / 3');

// ── 안드로이드 설치 버튼 (시작 화면) ──
await p.evaluate(()=>localStorage.clear()); await p.waitForTimeout(150); await p.reload(); await p.waitForTimeout(500);
T('시작 화면: 이벤트가 없으면 설치 버튼 없음', !!(await p.$('button:has-text("새로 시작하기")')) && !(await p.$('button:has-text("홈 화면에 추가")')));
await p.evaluate(()=>{ window.__prompted=0; const e=new Event('beforeinstallprompt',{cancelable:true}); e.prompt=()=>{ window.__prompted++; }; e.userChoice=Promise.resolve({outcome:'accepted'}); window.dispatchEvent(e); });
await p.waitForTimeout(300);
T('beforeinstallprompt 가 오면 "홈 화면에 추가"', !!(await p.$('button:has-text("홈 화면에 추가")')));
await p.click('button:has-text("홈 화면에 추가")'); await p.waitForTimeout(300);
T('누르면 prompt() 하고 버튼은 사라진다', (await p.evaluate(()=>window.__prompted))===1 && !(await p.$('button:has-text("홈 화면에 추가")')));

// ── 온보딩으로 시작하면 바로 안내 ──
await p.click('button:has-text("새로 시작하기")'); await p.waitForTimeout(200);
await p.fill('.pair input[placeholder="이름"]','서윤'); await p.click('button:has-text("시작")'); await p.waitForTimeout(800);
T('새로 시작한 직후 홈에 안내 1단계 (처음 금액 0 이라도, 기본 아이 둘이라 1 / 3)', (await card())==='잔액을 눌러 보세요|1 / 3');

console.log(`\n${pass} passed, ${fail} failed`); console.log('errors:',errs.join('|')||'none'); await b.close(); process.exit(fail||errs.length?1:0);})();
