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
T('새 기기: 1단계 "− 를 눌러 받은 돈으로" (1 / 10)', (await card())==='− 를 눌러 받은 돈으로 바꿔 보세요|1 / 10' && (await tour())==='new');
T('첫 카드엔 × 위에 "언제든 그만두기" 말풍선', (await p.textContent('.tour-card .skip-hint'))==='언제든 그만두기' && await p.$eval('.tour-card .skip-hint',e=>e.style.display!=='none'));
T('어두운 막과 밝은 구멍이 있다', !!(await p.$('.tour-spot')) && (await p.$$('.tour-block')).length===4);
const tabBox=await p.$eval('.bar .k >> nth=1',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
await p.mouse.click(tabBox.x,tabBox.y); await p.waitForTimeout(300);
T('막 밖(아이 탭)을 눌러도 아무 일 없다', (await p.textContent('.bar .k.on'))==='서윤' && (await card())==='− 를 눌러 받은 돈으로 바꿔 보세요|1 / 10');
const gearBox=await p.$eval('.gear',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
await p.mouse.click(gearBox.x,gearBox.y); await p.waitForTimeout(300);
T('설정도 안 열린다', !(await p.$('.nav h2')));
await p.click('.entry .sign'); await p.waitForTimeout(300);
T('부호를 + 로 바꾸면 그 자리에서 "+ 가 됐어요" + 진한 다음 (휙 안 넘어간다)', (await card())==='이제 받은 돈이에요|1 / 10' && await p.$eval('.entry .sign',e=>e.textContent==='+') && (await p.textContent('.tour-card .ok'))==='다음' && !(await p.$eval('.tour-card .ok',e=>e.classList.contains('soft'))));
await p.click('.entry .sign'); await p.waitForTimeout(300);
T('다시 − 로 돌리면 1단계 글로', (await card())==='− 를 눌러 받은 돈으로 바꿔 보세요|1 / 10');
T('+ 가 된 카드부터는 말풍선 없음', await p.evaluate(async()=>{ document.querySelector('.entry .sign').click(); await new Promise(r=>setTimeout(r,250)); return document.querySelector('.tour-card .skip-hint').style.display==='none'; }));
await p.click('.entry .sign'); await p.waitForTimeout(250);
await p.click('.entry .sign'); await p.waitForTimeout(300); await p.click('.tour-card .ok'); await p.waitForTimeout(400);
T('다음 → 2단계 잔액', (await card())==='잔액을 눌러 보세요|2 / 10');
// 구멍 안의 잔액은 진짜로 눌린다
await p.click('.balbtn'); await p.waitForTimeout(400);
T('잔액을 누르면 그림이 열리고, 위에 한 줄 — 아무 데나 누르면 닫혀요 · 좌우로 밀면 다른 아이', !!(await p.$('.kid')) && !(await p.$('.tour.hide')) && (await p.textContent('.tour-card.hint .tc-title'))==='아무 데나 누르면 닫혀요' && (await p.textContent('.tour-card.hint .tc-body'))==='좌우로 밀면 다른 아이');
T('그 한 줄엔 막도 점도 버튼도 없다', await p.$eval('.tour-card.hint',e=>getComputedStyle(e.querySelector('.tc-foot')).display==='none' && getComputedStyle(e.querySelector('.skip')).display==='none' && getComputedStyle(e).pointerEvents==='none'));
T('아이 화면은 그대로 (글자 없음·버튼 하나)', (await p.$$('.kid button')).length===1);
{ const hb=await p.$eval('.tour-card.hint',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}); await p.mouse.click(hb.x,hb.y); await p.waitForTimeout(400); }
T('그 한 줄을 눌러도 그림이 닫힌다 (눌림이 통과)', !(await p.$('.kid')));
T('닫으면 3단계 밀기', (await card())==='좌우로 밀어 보세요|3 / 10');
T('2단계 제목에 방향 화살표', (await p.$$('.tour-card .tc-chev i')).length===3);
T('레이어는 하나뿐 (단계가 바뀌어도 새로 만들지 않는다)', (await p.$$('.tour')).length===1);

// ── 2단계: 밝은 띠에서 밀거나, 이름을 누르거나, 어두운 데서 밀어도 ──
await swipe(300,100,90,100);
T('밀면 4단계 길게 누르기', (await card())==='이 줄을 길게 눌러 보세요|4 / 10' && (await p.textContent('.bar .k.on'))==='하준');
await load(KIDS,[]); await p.click('.entry .sign'); await p.waitForTimeout(200); await p.click('.tour-card .ok'); await p.waitForTimeout(300); await p.click('.balbtn'); await p.waitForTimeout(300); await p.click('.kid .x'); await p.waitForTimeout(400);
await p.click('.bar .k >> nth=1'); await p.waitForTimeout(400);
T('이름을 눌러도 4단계', (await card())==='이 줄을 길게 눌러 보세요|4 / 10');
await load(KIDS,[]); await p.click('.entry .sign'); await p.waitForTimeout(200); await p.click('.tour-card .ok'); await p.waitForTimeout(300); await p.click('.balbtn'); await p.waitForTimeout(300); await p.click('.kid .x'); await p.waitForTimeout(400);
await swipe(300,600,90,600);                                        // 아래쪽 아무 데나
T('아무 데서나 밀어도 4단계', (await card())==='이 줄을 길게 눌러 보세요|4 / 10');

// ── 3단계: 예시 줄을 길게 누르면 그 금액 그림. 기록은 안 생긴다 ──
T('예시 줄이 있다 (오늘 · 젤리 · −800)', await p.$eval('.tour-sample.on .row.sample',e=>/젤리/.test(e.textContent) && /800/.test(e.textContent)));
await p.click('.row.sample'); await p.waitForTimeout(300);
T('예시 줄을 짧게 누르면 아무 일 없다', !(await p.$('.sheet')) && !!(await p.$('.tour-card')));
await press('.row.sample', 700);
T('길게 누르면 한 줄 그림 (젤리 −800)', !!(await p.$('.kid.one')) && (await p.textContent('.kid.one .ka b'))==='−800' && (await p.textContent('.kid.one .kn'))==='젤리');
T('그 위에도 한 줄 — 아무 데나 누르면 닫혀요, 예시 줄은 안 보인다', (await p.textContent('.tour-card.hint .tc-title'))==='아무 데나 누르면 닫혀요' && !(await p.$('.tour-sample.on')));
T('진짜 기록은 하나도 안 생겼다', await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).entries.length===0));
await p.waitForTimeout(600);                                       // 손 뗀 뒤 500ms 는 click 을 삼킨다(길게 누르기 규칙)
await p.click('.kid.one .x'); await p.waitForTimeout(400);
T('닫으면 5단계 "이번엔 짧게 눌러 보세요"', (await card())==='이번엔 짧게 눌러 보세요|5 / 10' && !!(await p.$('.tour-sample.on')));
await p.click('.row.sample'); await p.waitForTimeout(400);
T('짧게 누르면 고치기 시트가 뜨고 그 위에 설명 카드', !!(await p.$('.sheet')) && !(await p.$('.tour.hide')) && (await card())==='기록 고치기|5 / 10' && await p.$eval('.tour-card',e=>e.classList.contains('up')));
T('카드는 시트 위에 있다', await p.evaluate(()=>document.querySelector('.tour-card').getBoundingClientRect().bottom <= document.querySelector('.sheet').getBoundingClientRect().top));
{ const sb=await p.$eval('.sheet .btn.pri',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}); await p.mouse.click(sb.x,sb.y); await p.waitForTimeout(300); }
T('시트는 만질 수 없다 (저장이 안 눌린다)', !!(await p.$('.sheet')) && await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).entries.length===0));
await p.click('.tour-card .ok'); await p.waitForTimeout(500);
T('다음 → 시트가 닫히고 6단계 "⚙ 를 눌러 설정으로"', !(await p.$('.sheet')) && (await card())==='오른쪽 위 톱니를 눌러 설정으로 가 볼게요|6 / 10');
const sg0=await p.textContent('.entry .sign');
{ const sb=await p.$eval('.entry .sign',e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}); await p.mouse.click(sb.x,sb.y); await p.waitForTimeout(200); }
T('막 밖(부호)은 안 눌린다', (await p.textContent('.entry .sign'))===sg0);
await p.click('.gear'); await p.waitForTimeout(500);
T('설정이 열리고 7단계 아이 이름과 색 — 아이 카드가 밝다', !!(await p.$('.nav h2')) && (await card())==='아이 이름과 색|7 / 10' && !!(await p.$('.card.color')));
const spotOn=async sel=>{ const a=await p.$eval(sel,e=>e.getBoundingClientRect()), b=await p.$eval('.tour-spot',e=>e.getBoundingClientRect()); return b.top<=a.top+1 && b.bottom>=a.bottom-1 && b.left<=a.left+1 && b.right>=a.right-1; };
T('밝은 구멍이 아이 카드를 감싼다', await spotOn('.card.color'));
await p.click('.card.color .swatch button >> nth=3'); await p.waitForTimeout(300);
T('구멍 안의 색은 진짜로 바뀐다 (안내는 그대로)', await p.$eval('.card.color .swatch button >> nth=3',e=>e.classList.contains('on')) && (await card())==='아이 이름과 색|7 / 10');
await p.click('.tour-card .ok'); await p.waitForTimeout(500);
T('다음 → 8단계 "서윤 줄을 눌러 보세요"', (await card())==='서윤 줄을 눌러 보세요|8 / 10' && await spotOn('.card.week'));
T('설명 단계는 진한 "다음", 해 볼 단계는 연한 "다음"', (await p.textContent('.tour-card .ok'))==='다음' && await p.$eval('.tour-card .ok',e=>e.classList.contains('soft')));
await p.click('.tour-card .prev'); await p.waitForTimeout(400);
T('이전 → 7단계로', (await card())==='아이 이름과 색|7 / 10' && (await p.textContent('.tour-card .ok'))==='다음' && !(await p.$eval('.tour-card .ok',e=>e.classList.contains('soft'))));
await p.click('.tour-card .prev'); await p.waitForTimeout(600);
T('설정 첫 단계에서 이전 → 설정이 닫히고 6단계 ⚙', !(await p.$('.nav h2')) && (await card())==='오른쪽 위 톱니를 눌러 설정으로 가 볼게요|6 / 10');
await p.click('.gear'); await p.waitForTimeout(400); await p.click('.tour-card .ok'); await p.waitForTimeout(400);
await p.click('.card.week .srow >> nth=0'); await p.waitForTimeout(400);
await p.click('.tour-card .prev'); await p.waitForTimeout(500);
T('시트 위에서 이전 → 시트만 닫히고 8단계 그대로', !(await p.$('.sheet')) && (await card())==='서윤 줄을 눌러 보세요|8 / 10');
await p.click('.card.week .srow >> nth=0'); await p.waitForTimeout(400);
T('줄을 누르면 매주 용돈 시트가 뜨고 그 위에 설명', !!(await p.$('.sheet')) && (await card())==='매주 용돈|8 / 10' && await p.$eval('.tour-card',e=>e.classList.contains('up')));
await p.click('.tour-card .ok'); await p.waitForTimeout(500);
T('다음 → 시트가 닫히고 9단계 내보내기', !(await p.$('.sheet')) && (await card())==='기록 내보내기|9 / 10' && await spotOn('.card.export'));
await p.click('.tour-card .ok'); await p.waitForTimeout(500);
T('다음 → 10단계 "‹ 로 나가면 끝" — 버튼은 "끝", 화면은 맨 위', (await card())==='‹ 를 눌러 나가면 끝이에요|10 / 10' && (await p.textContent('.tour-card .ok'))==='끝' && (await p.evaluate(()=>window.scrollY))===0);
await p.click('.nav .back'); await p.waitForTimeout(500);
T('나가면 홈에서 마지막 한 장 "이제 진짜로 적어 보세요" — 점 없음, 버튼은 시작, 돼지', !(await p.$('.nav h2')) && (await card())==='다 됐어요|' && (await p.textContent('.tour-card .ok'))==='시작' && !!(await p.$('.tour-card.done .tc-pig')));
await p.click('.tour-card .ok'); await p.waitForTimeout(500);
T('시작 → 끝, 레이어가 치워지고 done, 키보드는 안 뜬다', !(await p.$('.tour')) && (await tour())==='done' && await p.evaluate(()=>document.activeElement!==document.querySelector('input.memo')));
T('밀어서 하준으로 갔었어도 끝나면 시작하던 서윤 홈', (await p.textContent('.bar .k.on'))==='서윤' && await p.evaluate(()=>localStorage.getItem('yd_sel')==='k1'));
T('안내에서 바꾼 부호는 되돌아온다 (−)', await p.$eval('.entry .sign',e=>e.textContent==='−'));
// 설정 단계 중간에 뒤로 가기로 나가도 끝
await load(KIDS,[]); for(let i=0;i<5;i++){ await p.click('.tour-card .ok'); await p.waitForTimeout(300); } await p.click('.gear'); await p.waitForTimeout(400);
T('(중간) 7단계', (await card())==='아이 이름과 색|7 / 10');
await p.goBack(); await p.waitForTimeout(500);
T('설정 단계 중간에 뒤로 가기로 나가도 끝 (다시 안 뜬다)', !(await p.$('.nav h2')) && !(await p.$('.tour')) && (await tour())==='done');
// "다음"은 안 해 보고 넘어가기, "그만하기"는 전체 끝
await load(KIDS,[]);
T('구석 × 는 그만하기, 해 볼 단계의 오른쪽은 연한 "다음", 1단계엔 이전 없음', (await p.getAttribute('.tour-card .skip','aria-label'))==='그만하기' && (await p.textContent('.tour-card .ok'))==='다음' && await p.$eval('.tour-card .ok',e=>e.classList.contains('soft')) && await p.$eval('.tour-card .prev',e=>e.style.display==='none'));
await p.click('.tour-card .ok'); await p.waitForTimeout(400);
T('1단계에서 다음 → 부호는 그대로 −, 2단계', (await card())==='잔액을 눌러 보세요|2 / 10' && await p.$eval('.entry .sign',e=>e.textContent==='−'));
for(let i=0;i<8;i++){ await p.click('.tour-card .ok'); await p.waitForTimeout(350); }
T('다음만 눌러도 설정까지 가고 10단계', !!(await p.$('.nav h2')) && (await card())==='‹ 를 눌러 나가면 끝이에요|10 / 10');
await p.click('.tour-card .ok'); await p.waitForTimeout(600);
T('"끝"을 누르면 설정이 닫히고 홈에서 마지막 한 장', !(await p.$('.nav h2')) && (await card())==='다 됐어요|');
await p.click('.tour-card .skip'); await p.waitForTimeout(400);
T('× 로도 끝', !(await p.$('.tour')) && (await tour())==='done');
await p.waitForTimeout(150); await p.reload(); await p.waitForTimeout(500);
T('다시는 안 뜬다', !(await p.$('.tour-card')));

// ── 아이가 하나면 밀기 단계가 없다 (1 / 2 → 2 / 2) ──
await load([KIDS[0]],[]);
T('아이 하나: 1 / 9', (await card())==='− 를 눌러 받은 돈으로 바꿔 보세요|1 / 9');
await p.click('.entry .sign'); await p.waitForTimeout(200); await p.click('.tour-card .ok'); await p.waitForTimeout(300); await p.click('.balbtn'); await p.waitForTimeout(300); await p.click('.kid .x'); await p.waitForTimeout(400);
T('바로 길게 누르기 (3 / 8)', (await card())==='이 줄을 길게 눌러 보세요|3 / 9');

// ── 그만하기 · 하다 말고 끄면 처음부터 ──
await p.click('.tour-card .skip'); await p.waitForTimeout(500);
T('그만하기 → 끝, done', !(await p.$('.tour')) && (await tour())==='done');
await load(KIDS,[],'new');
T('하다 말고 껐으면(new) 처음부터', (await card())==='− 를 눌러 받은 돈으로 바꿔 보세요|1 / 10');

// ── 설정의 "처음 안내 다시 보기" (글로 된 사용법은 없다) ──
await load(KIDS,[E('e1','간식',-800,'2026-10-08')],'done');
await p.click('.gear'); await p.waitForTimeout(400);
T('앱 섹션에 처음 안내 … [다시 보기] 줄, 맨 아래 줄은 전과 같다', (await p.textContent('.help-link'))==='처음 안내다시 보기›' && await p.$eval('.foot',(e,v)=>/아이 추가하기/.test(e.textContent) && e.textContent.includes('v'+v), require('../package.json').version));
T('사용법 페이지는 없다', !/사용법/.test(await p.textContent('.screen.page')));
await p.click('.help-link'); await p.waitForTimeout(600);
T('누르면 설정이 닫히고 홈에서 1단계', !(await p.$('.nav h2')) && (await card())==='− 를 눌러 받은 돈으로 바꿔 보세요|1 / 10' && (await tour())==='new');

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
T('새로 시작한 직후 홈에 안내 1단계 (처음 금액 0 이라도, 기본 아이 둘이라 1 / 9)', (await card())==='− 를 눌러 받은 돈으로 바꿔 보세요|1 / 10');

console.log(`\n${pass} passed, ${fail} failed`); console.log('errors:',errs.join('|')||'none'); await b.close(); process.exit(fail||errs.length?1:0);})();
