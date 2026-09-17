// 매주 용돈(요약 행 + 시트) · 아이 색 6종 · 설정 화면 엣지 스와이프
const {chromium}=require('playwright');
const path=require('path');
let pass=0,fail=0; const T=(n,ok)=>{ ok?pass++:fail++; console.log((ok?'OK   ':'FAIL ')+n); };
const SEED=()=>{localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K7PM'},children:[
  {id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:10000,weekly_on:true,weekly_dow:6,weekly_amount:3000,weekly_start:'2026-09-01',created_at:'2026-07-01'},
  {id:'k2',name:'하준',color:'yellow',sort:1,opening_balance:0,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'}],entries:[]}));};
(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(__dirname,'../index.html')); await p.evaluate(SEED); await p.reload(); await p.waitForTimeout(600);
const cdp=await ctx.newCDPSession(p);
async function swipe(x0,y0,x1,y1,steps,ms){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});
  for(let i=1;i<=steps;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/steps,y:y0+(y1-y0)*i/steps}]}); await p.waitForTimeout(ms/steps); }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
const amt=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).children[0].weekly_amount);

// ── 1. 매주 용돈 — 요약 행 + 시트 ──
await p.click('.gear'); await p.waitForTimeout(250);
const rowTxt=async(i)=>p.$eval('.srow.tap >> nth='+i, e=>e.textContent);
T('요약 행: 켜진 아이', /토요일 · 3,000원/.test(await rowTxt(0)));
T('요약 행: 꺼진 아이 "안 함"', /안 함/.test(await rowTxt(1)));
T('인라인 입력칸 없음(설정이 길어지지 않음)', (await p.$$('.srow input[inputmode=numeric]')).length===0 && (await p.$$('.tog')).length===0 && (await p.$$('.srow.tap')).length>=3);
await p.click('.srow.tap >> nth=0'); await p.waitForTimeout(300);
T('시트 열림', !!(await p.$('.sheet')) && /서윤 · 매주 용돈/.test(await p.textContent('.sheet h3')));
T('요일·금액 칸 있음', (await p.$$('.sheet .dow button')).length===7 && !!(await p.$('.sheet .box input')));
await p.click('.sheet .tabs button:has-text("안 함")'); await p.waitForTimeout(150);
T('안 함이면 요일·금액 숨김', (await p.$$('.sheet .dow')).length===0);
await p.click('.sheet .tabs button:has-text("매주")'); await p.waitForTimeout(150);
await p.fill('.sheet .box input',''); await p.click('.sheet .btn.pri'); await p.waitForTimeout(200);
T('금액 없이 저장 → 막힘', !!(await p.$('.sheet')));
await p.fill('.sheet .box input','5000'); await p.click('.sheet .dow button:has-text("수")');
await p.click('.sheet .btn.pri'); await p.waitForTimeout(400);
T('저장 후 시트 닫힘', !(await p.$('.sheet')));
T('요약 행 갱신', /수요일 · 5,000원/.test(await rowTxt(0)));
T('저장됨', (await amt())===5000 && await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).children[0].weekly_dow===3));
await p.click('.srow.tap >> nth=0'); await p.waitForTimeout(250);
await p.fill('.sheet .box input','9000'); await p.click('.sheet .btn:has-text("취소")'); await p.waitForTimeout(250);
T('취소면 안 바뀜', (await amt())===5000 && /5,000원/.test(await rowTxt(0)));
await p.click('.srow.tap >> nth=0'); await p.waitForTimeout(250);
await p.click('.sheet .tabs button:has-text("안 함")'); await p.click('.sheet .btn.pri'); await p.waitForTimeout(400);
T('끄면 "안 함"', /안 함/.test(await rowTxt(0)) && await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).children[0].weekly_on===false));

// ── 2. 색 ──
const sw=await p.$$eval('.srow .swatch button',es=>es.slice(0,6).map(e=>e.style.backgroundColor));
T('6색 순서', sw.join('|')==='rgb(30, 136, 229)|rgb(29, 185, 84)|rgb(255, 196, 0)|rgb(255, 122, 26)|rgb(255, 61, 143)|rgb(139, 79, 232)');
T('핑크 #FF3D8F', sw[4]==='rgb(255, 61, 143)');
T('노랑 #FFC400', sw[2]==='rgb(255, 196, 0)');
T('색칩 6개', (await p.$$('.swatch button')).length===12);   // 아이 2명 × 6
await p.click('.nav .back'); await p.waitForTimeout(300);
await p.click('.bar .k:nth-child(2)'); await p.waitForTimeout(200);
T('노랑 아이 탭 밑줄', await p.$eval('.bar .k.on',e=>getComputedStyle(e,'::after').backgroundColor==='rgb(255, 196, 0)'));

// ── 3. 엣지 스와이프 ──
await p.click('.gear'); await p.waitForTimeout(250);
await swipe(10,400,220,410,12,180); await p.waitForTimeout(400);
T('가장자리에서 넓게 끌기 → 홈', !!(await p.$('.bal')));
await p.click('.gear'); await p.waitForTimeout(250);
await swipe(10,400,60,405,8,400); await p.waitForTimeout(400);
T('짧게 끌다 놓으면 원위치', !!(await p.$('.nav h2')) && await p.$eval('.page',e=>e.style.transform===''));
await swipe(150,400,380,405,12,180); await p.waitForTimeout(400);
T('가운데서 시작하면 무시', !!(await p.$('.nav h2')));
await swipe(10,300,20,600,12,180); await p.waitForTimeout(400);
T('세로로 끌면 무시(스크롤)', !!(await p.$('.nav h2')));
await swipe(8,400,110,402,5,90); await p.waitForTimeout(400);
T('짧아도 빠르면 홈', !!(await p.$('.bal')));

console.log(`\n${pass} passed, ${fail} failed`); console.log('errors:',errs.join('|')||'none'); await b.close(); process.exit(fail?1:0);})();
