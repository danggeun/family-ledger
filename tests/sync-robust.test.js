// 1.1.9 — 동기화 모드의 정상 경로 밖: 부팅 실패 뒤 복구, 세션이 날아갔을 때, CDN 실패, 낙관 반영 되돌리기, 작은 결함들.
// 서버는 통째로 흉내 낸다(window.__fake). 실행 중에 mode 를 바꿔 "끊겼다 → 돌아왔다"를 만든다.
const {chromium}=require('playwright');
const path=require('path');
let pass=0,fail=0; const T=(n,ok)=>{ok?pass++:fail++;console.log((ok?'OK   ':'FAIL ')+n);};
const APP='file://'+path.resolve(__dirname,'../index.html');
const CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';

const {FAKE,CACHE}=require('./_fake');

(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const errs=[];
async function open(opt, seedCache, blockCdn){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  if(blockCdn){ await ctx.route(CDN, r=>r.abort());
    await ctx.addInitScript(()=>{ Object.defineProperty(window,'APP_CONFIG',{value:{SUPABASE_URL:'https://x.supabase.co',SUPABASE_ANON_KEY:'k'},writable:false,configurable:false}); }); }
  else await ctx.addInitScript(FAKE, opt||{});
  const p=await ctx.newPage(); require('./_env').guard(p); p.on('pageerror',e=>errs.push(e.message));
  await p.goto(APP); if(seedCache) await p.evaluate(CACHE);
  await p.waitForTimeout(150); await p.reload(); await p.waitForTimeout(blockCdn?1500:2500);
  return {ctx,p};
}
const fake=(p,fn)=>p.evaluate(fn);
const bal=(p)=>p.textContent('.balbtn b');
const calls=(p)=>p.evaluate(()=>window.__fake.calls);

// ── H1: 부팅 때 가족 확인이 실패 → 캐시 화면+배너 → 서버가 돌아오면 "다시" 한 번에 복구 ──
let a=await open({mode:'noinit'}, true);
T('H1 부팅 실패: 캐시 화면+배너', !!(await a.p.$('.offbar')) && (await bal(a.p))==='9,200');
T('H1 부팅 실패: 구독 없음', (await calls(a.p)).subscribe===0);
await fake(a.p,()=>{ window.__fake.mode='live'; });
await a.p.click('.offbar'); await a.p.waitForTimeout(1200);
T('H1 "다시" 한 번에 배너 사라짐', !(await a.p.$('.offbar')));
T('H1 서버 데이터로 바뀜 (캐시 9,200 → 서버 12,200)', (await bal(a.p))==='12,200');
T('H1 복구되며 구독 1회', (await calls(a.p)).subscribe===1);
await a.ctx.close();

// H1 앱 복귀(visibilitychange)로도 복구된다
a=await open({mode:'noinit'}, true);
await fake(a.p,()=>{ window.__fake.mode='live'; document.dispatchEvent(new Event('visibilitychange')); });
await a.p.waitForTimeout(1200);
T('H1 앱 복귀로도 복구', !(await a.p.$('.offbar')) && (await bal(a.p))==='12,200');
await a.ctx.close();

// ── H2: 세션이 날아가 새 익명 유저 → 가족 없음 → 캐시의 코드로 조용히 재참여 ──
a=await open({session:null, members:[]}, true);
T('H2 시작 화면이 아니다', !(await a.p.$('button:has-text("새로 시작하기")')));
T('H2 새 익명 로그인 1회', (await calls(a.p)).anon===1);
T('H2 캐시의 코드로 join_family 1회', (await calls(a.p)).join===1);
T('H2 홈에 서버 데이터', (await bal(a.p))==='12,200');
T('H2 구독 1회', (await calls(a.p)).subscribe===1);
await a.ctx.close();

// H2 캐시가 없으면(정말 처음인 기기) 시작 화면 — 참여 버튼도 있다
a=await open({session:null, members:[]}, false);
T('처음 기기: 시작 화면', !!(await a.p.$('button:has-text("새로 시작하기")')) && !!(await a.p.$('button:has-text("가족 코드로 참여")')));
T('처음 기기: join 안 부름', (await calls(a.p)).join===0);

// ── M3: 온보딩으로 들어온 세션에도 구독이 붙는다 (참여) ──
await a.p.click('button:has-text("가족 코드로 참여")'); await a.p.waitForTimeout(200);
await a.p.fill('input[placeholder="ABCD-1234"]','K7PM3QRA'); await a.p.click('button:has-text("참여")'); await a.p.waitForTimeout(1200);
T('참여 뒤 홈', !!(await a.p.$('.balbtn')));
T('참여 뒤 구독 1회', (await calls(a.p)).subscribe===1);
await a.ctx.close();

// M3 (새로 시작) + L5: 아이 저장이 실패해 다시 누를 때 가족을 또 만들지 않는다
a=await open({session:{user:{id:'u9'}}, members:[], kids:[], ents:[]}, false);
await a.p.click('button:has-text("새로 시작하기")'); await a.p.waitForTimeout(200);
await fake(a.p,()=>{ window.__fake.childFail=true; });
await a.p.fill('.pair input[placeholder="이름"]','서윤');
await a.p.click('button:has-text("시작")'); await a.p.waitForTimeout(800);
T('L5 아이 저장 실패: 시작 화면에 남는다', !!(await a.p.$('button:has-text("시작")')));
await fake(a.p,()=>{ window.__fake.childFail=false; });
await a.p.click('button:has-text("시작")'); await a.p.waitForTimeout(1500);
T('L5 다시 누르면 홈', !!(await a.p.$('.balbtn')));
T('L5 create_family 는 1회뿐', (await calls(a.p)).create===1);
T('M3 새로 시작 뒤 구독 1회', (await calls(a.p)).subscribe===1);
await a.ctx.close();

// ── H3: CDN 을 못 받으면 로컬로 새지 않는다 ──
a=await open(null, false, true);
T('H3 캐시 없음: 연결 실패 화면', /연결이 안 돼요/.test(await a.p.innerText('#app')));
T('H3 시작 화면이 아니다', !(await a.p.$('button:has-text("새로 시작하기")')));
T('H3 로컬 가족이 안 생겼다', await a.p.evaluate(()=>!localStorage.getItem('yd_local_v1')));
await a.ctx.close();
a=await open(null, true, true);
T('H3 캐시 있음: 마지막 화면+배너', !!(await a.p.$('.offbar')) && (await bal(a.p))==='9,200');
await a.p.click('.offbar'); await a.p.waitForTimeout(1500);
T('H3 CDN 이 계속 안 되면 "다시"를 눌러도 배너 그대로 (멈추지 않는다)', !!(await a.p.$('.offbar')) && (await bal(a.p))==='9,200');
await a.ctx.unroute(CDN); await a.ctx.route(CDN, r=>r.fulfill({contentType:'application/javascript', body:'('+FAKE.toString()+')({mode:"live"})'}));
await a.p.click('.offbar'); await a.p.waitForTimeout(1500);
T('H3 CDN 이 돌아오면 "다시" 한 번에 복구', !(await a.p.$('.offbar')) && (await bal(a.p))==='12,200');
await a.ctx.close();

// ── URL 정규화 ──
a=await open({}, false);
T('설정의 /rest/v1/ 와 끝 슬래시를 떼고 createClient', (await a.p.evaluate(()=>window.__fake.createClientArgs[0]))==='https://x.supabase.co');

// ── M2: 낙관 반영이 실패하면 되돌린다 (서버를 죽이고 하나씩) ──
const rowAmt=async(p,i)=>p.$$eval('.row:not(.open) .a',es=>es.map(e=>e.textContent))
  .then(x=>x[i]);
const rows=(p)=>p.$$eval('.row:not(.open)',es=>es.length);
await fake(a.p,()=>{ window.__fake.mode='dead'; });
// a) 고치기
await a.p.click('.row >> nth=0'); await a.p.waitForTimeout(250);
await a.p.fill('.sheet input.r','2000'); await a.p.click('.sheet button:has-text("저장")'); await a.p.waitForTimeout(2200);
T('M2 고치기 실패 → 원래 금액', (await rowAmt(a.p,0))==='−800' && (await bal(a.p))==='12,200');
// b) 삭제
await a.p.click('.row >> nth=0'); await a.p.waitForTimeout(250);
await a.p.click('.sheet button:has-text("삭제")'); await a.p.waitForTimeout(150);
await a.p.click('.sheet button:has-text("정말 삭제")'); await a.p.waitForTimeout(2200);
T('M2 삭제 실패 → 줄이 돌아온다', (await rows(a.p))===2 && (await bal(a.p))==='12,200');
// c) 자동 줄 건너뛰기
await a.p.click('.row.auto'); await a.p.waitForTimeout(250);
await a.p.click('.sheet button:has-text("이번 주 건너뛰기")'); await a.p.waitForTimeout(150);
await a.p.click('.sheet button:has-text("정말 건너뛰기")'); await a.p.waitForTimeout(2200);
T('M2 건너뛰기 실패 → 줄이 남는다', (await rows(a.p))===2 && !!(await a.p.$('.row.auto')));
// d) 처음 금액
await a.p.click('.row.open'); await a.p.waitForTimeout(250);
await a.p.fill('.sheet input.r','99999'); await a.p.click('.sheet button:has-text("저장")'); await a.p.waitForTimeout(2200);
T('M2 처음 금액 실패 → 원래 값', (await a.p.textContent('.row.open .t'))==='10,000');
// e) 매주 용돈
await a.p.click('.gear'); await a.p.waitForTimeout(400);
await a.p.click('.srow.tap:has-text("서윤")'); await a.p.waitForTimeout(250);
await a.p.click('.sheet .tabs button:has-text("매주")'); await a.p.waitForTimeout(150);
await a.p.fill('.sheet .box input','3000'); await a.p.click('.sheet .btn.pri'); await a.p.waitForTimeout(2200);
T('M2 매주 용돈 실패 → 안 함', /안 함/.test(await a.p.textContent('.srow.tap:has-text("서윤") .val')));
// f) 이름·색
await a.p.fill('.srow .nm >> nth=0','바꿈'); await a.p.press('.srow .nm >> nth=0','Tab'); await a.p.waitForTimeout(2200);
T('M2 이름 실패 → 원래 이름', (await a.p.$eval('.srow .nm >> nth=0',e=>e.value))==='서윤');
await a.p.click('.srow >> nth=0 >> .swatch button >> nth=2'); await a.p.waitForTimeout(2200);
T('M2 색 실패 → 원래 색', await a.p.$eval('.srow >> nth=0 >> .swatch button.on',e=>e.getAttribute('aria-label')==='pink'));
// g) 아이 지우기
await a.p.click('.kmore >> nth=1'); await a.p.waitForTimeout(250);
await a.p.click('.sheet button:has-text("지우기")'); await a.p.waitForTimeout(150);
await a.p.click('.sheet button:has-text("정말 지우기")'); await a.p.waitForTimeout(2200);
T('M2 아이 지우기 실패 → 둘 다 남는다', (await a.p.$$('.srow .nm')).length===2);
// 서버가 돌아오면 서버값 그대로 (아무것도 안 바뀌어 있어야 한다)
await fake(a.p,()=>{ window.__fake.mode='live'; });
await a.p.click('.nav .back'); await a.p.waitForTimeout(300); await a.p.click('.offbar'); await a.p.waitForTimeout(1200);
T('M2 서버는 그대로였다', (await bal(a.p))==='12,200' && (await rows(a.p))===2 && !(await a.p.$('.offbar')));

// ── L6: 저장 중인 줄은 누를 수 없다 ──
await fake(a.p,()=>{ window.__fake.insertDelay=1500; });
await a.p.click('input.memo'); await a.p.type('input.memo','사탕'); await a.p.click('input.amt'); await a.p.keyboard.type('500');
await a.p.click('.entry .ok'); await a.p.waitForTimeout(150);
await a.p.click('.row >> nth=0'); await a.p.waitForTimeout(300);
T('L6 저장 중인 줄을 눌러도 시트가 안 뜬다', !(await a.p.$('.sheet')) && (await rows(a.p))===3);
await a.p.waitForTimeout(1800);
await a.p.click('.row >> nth=0'); await a.p.waitForTimeout(300);
T('L6 저장되면 열린다', !!(await a.p.$('.sheet')));
await a.p.click('.sheet button:has-text("취소")'); await a.p.waitForTimeout(300);
await fake(a.p,()=>{ window.__fake.insertDelay=0; });

// ── L7: 적는 중에 서버가 바뀌어도 키보드가 안 내려간다, 떠나면 반영 ──
await a.p.click('input.memo'); await a.p.type('input.memo','장난감'); await a.p.waitForTimeout(100);
await fake(a.p,()=>{ window.__fake.ents.push({id:'e77',family_id:'f1',child_id:'k1',entry_date:'2026-09-15',memo:'새줄',amount:-100,auto_key:null,skipped:false,created_at:'2026-09-15T09:00:00Z'});
  document.dispatchEvent(new Event('visibilitychange')); });
await a.p.waitForTimeout(800);
T('L7 적는 중엔 포커스 유지', await a.p.evaluate(()=>document.activeElement.className==='memo') && (await a.p.$eval('input.memo',e=>e.value))==='장난감');
T('L7 아직 새 줄이 안 그려졌다', (await rows(a.p))===3);
await a.p.click('.thead'); await a.p.waitForTimeout(400);
T('L7 떠나면 반영', (await rows(a.p))===4);

// ── L1: 두 번 두드려도 한 칸만 ──
await a.p.click('.gear'); await a.p.waitForTimeout(400);
await a.p.click('.kmore >> nth=1'); await a.p.waitForTimeout(300);
await a.p.evaluate(()=>{ const d=document.querySelector('.dim'); d.click(); d.click(); }); await a.p.waitForTimeout(500);   // popstate 가 오기 전에 두 번
T('L1 딤 더블탭: 시트만 닫히고 설정은 남는다', !(await a.p.$('.sheet')) && !!(await a.p.$('.nav h2')));
// ── L2: 두 칸을 한 번에 건너뛰어도 따라온다 ──
await a.p.click('.kmore >> nth=1'); await a.p.waitForTimeout(300);
await a.p.evaluate(()=>history.go(-2)); await a.p.waitForTimeout(500);
T('L2 history.go(-2): 시트·설정 다 닫히고 홈', !(await a.p.$('.sheet')) && !(await a.p.$('.nav h2')) && !!(await a.p.$('.balbtn')));

// ── L3: 가운데 아이를 지운 뒤 추가해도 sort 가 안 겹친다 ──
await fake(a.p,()=>{ window.__fake.kids.push({id:'k3',family_id:'f1',name:'셋째',color:'blue',sort:2,opening_balance:0,weekly_on:false,weekly_amount:0,created_at:'2026-07-03T00:00:00Z'}); });
await a.p.click('.gear'); await a.p.waitForTimeout(400); await a.p.click('.nav .back'); await a.p.waitForTimeout(300);
await a.p.click('.offbar').catch(()=>{}); await fake(a.p,()=>document.dispatchEvent(new Event('visibilitychange'))); await a.p.waitForTimeout(800);
await a.p.click('.gear'); await a.p.waitForTimeout(400);
await a.p.click('.kmore >> nth=1'); await a.p.waitForTimeout(250);        // 하준(sort 1)
await a.p.click('.sheet button:has-text("지우기")'); await a.p.waitForTimeout(150);
await a.p.click('.sheet button:has-text("정말 지우기")'); await a.p.waitForTimeout(800);
await a.p.click('.addk'); await a.p.waitForTimeout(1000);
T('L3 새 아이의 sort = max+1 (3)', await a.p.evaluate(()=>{ const k=window.__fake.kids; return k[k.length-1].sort===3; }));

// ── M1: 금액칸을 아무리 다시 그려도 document 리스너는 하나 ──
const cdp=await a.ctx.newCDPSession(a.p);
async function selCount(){
  const {result}=await cdp.send('Runtime.evaluate',{expression:'document'});
  const {listeners}=await cdp.send('DOMDebugger.getEventListeners',{objectId:result.objectId});
  return listeners.filter(l=>l.type==='selectionchange').length;
}
await a.p.click('.nav .back'); await a.p.waitForTimeout(300);
const before=await selCount();
for(let i=0;i<20;i++){ await a.p.click('.bar .k >> nth='+(i%2)); await a.p.waitForTimeout(60); }
T('M1 render 20번 뒤에도 selectionchange 리스너 수 그대로 (1)', before===1 && (await selCount())===1);
await a.ctx.close();

console.log(`\n${pass} passed, ${fail} failed`); console.log('errors:',errs.join('|')||'none'); await b.close(); process.exit(fail||errs.length?1:0);})();
