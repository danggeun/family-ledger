// 1.2.4 — 아이폰에서 아이 바꾸는 전환이 "툭" 끊기던 것(들어오는 쪽을 처음부터 투명으로 · 복사본의 돼지를 안 가림 · fit 을 첫 프레임에),
// 가족 코드 칸이 치는 대로 ABCD-1234 모양을 잡는 것. 크로미움에서는 전환이 원래 멀쩡했으므로 여기선 "규칙이 걸려 있는지"를 본다.
const {chromium}=require('playwright');
const path=require('path');
const {FAKE}=require('./_fake');
let pass=0,fail=0; const T=(n,ok)=>{ok?pass++:fail++;console.log((ok?'OK   ':'FAIL ')+n);};
const APP='file://'+path.resolve(__dirname,'../index.html');
const KID=(id,name,color,sort,open)=>({id,name,color,sort,opening_balance:open,weekly_on:false,weekly_amount:0,created_at:'2026-07-01T09:00:00Z'});

(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const errs=[];
const VP={viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true};
const ctx=await b.newContext(VP); await ctx.addInitScript(require('./_env').LOCAL);
const p=await ctx.newPage(); require('./_env').guard(p); p.on('pageerror',e=>errs.push(e.message));
await p.goto(APP);
const load=async(kids,entries)=>{ await p.evaluate(({kids,entries})=>{ localStorage.clear(); localStorage.setItem('yd_tour','done');
    localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K7PM'},children:kids,entries})); localStorage.setItem('yd_sel','k1'); },{kids,entries});
  await p.waitForTimeout(150); await p.reload(); await p.waitForTimeout(600); };
const cdp=await ctx.newCDPSession(p);
// 끝난 직후 상태를 보려고 기다리지 않는 swipe — 지연 애니메이션(0.07s)이 시작되기 전의 첫 프레임을 본다
const swipe=async(x0,y0,x1,y1,ms=120)=>{
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x0,y:y0}]});
  for(let i=1;i<=6;i++){ await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x0+(x1-x0)*i/6, y:y0+(y1-y0)*i/6}]}); await p.waitForTimeout(ms/6); }
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
};
const op=(sel)=>p.$eval(sel,e=>getComputedStyle(e).opacity);

// ── 1. 아이 화면: 들어오는 쪽은 애니메이션이 시작되기 전부터 투명, 끝나면 보인다. 복사본의 돼지·✕ 는 보인다 ──
await load([KID('k1','서윤','pink',0,16300),KID('k2','하준','yellow',1,5000)],[]);
await p.click('.balbtn'); await p.waitForTimeout(350);
await swipe(300,500,90,500);
const first=await p.evaluate(()=>{ const k=document.querySelector('.kid.slide-l:not(.ghost)'); const g=document.querySelector('.kid.ghost');
  return {kid:!!k, kn:k&&getComputedStyle(k.querySelector('.kn')).opacity, money:k&&getComputedStyle(k.querySelector('.money')).opacity,
          ghost:!!g, gpig:g&&getComputedStyle(g.querySelector('.pig')).visibility, gx:g&&getComputedStyle(g.querySelector('.x')).visibility,
          wc:k&&getComputedStyle(k.querySelector('.kn')).willChange}; });
T('밀자마자: 새 화면의 이름·돈이 투명(0) — 지연 동안 최종 상태가 먼저 보이지 않는다', first.kid && first.kn==='0' && first.money==='0');
T('밀자마자: 복사본이 있고 돼지·✕ 가 보인다(가리지 않는다)', first.ghost && first.gpig==='visible' && first.gx==='visible');
T('합성 힌트(will-change) 가 걸려 있다', /transform/.test(first.wc||''));
await p.waitForTimeout(400);
T('끝나면 이름·돈이 보이고(1) 복사본은 사라진다', (await op('.kid .kn'))==='1' && (await op('.kid .money'))==='1' && !(await p.$('.kid.ghost')) && (await p.textContent('.kid .kn'))==='하준');
T('돼지는 동기 디코드', await p.$eval('.kid .pig',e=>e.decoding==='sync'));
await p.click('.kid .x'); await p.waitForTimeout(250);

// ── 2. 홈: 탭을 눌러 바꿔도 같은 규칙 ──
await p.click('.bar .k >> nth=1');
const h=await p.evaluate(()=>{ const s=document.querySelector('.screen.home.slide-l:not(.ghost)'); const g=document.querySelector('.screen.ghost');
  const kids=[...s.children].filter(e=>!e.classList.contains('bar')); return {ok:!!s, ops:kids.map(e=>getComputedStyle(e).opacity), bar:getComputedStyle(s.querySelector('.bar')).opacity, ghost:!!g}; });
T('홈: 바꾸자마자 탭 줄 빼고 전부 투명, 탭 줄은 보인다, 복사본 있음', h.ok && h.ops.length>0 && h.ops.every(o=>o==='0') && h.bar==='1' && h.ghost);
await p.waitForTimeout(400);
T('홈: 끝나면 전부 보인다', await p.$eval('.screen.home',s=>[...s.children].every(e=>getComputedStyle(e).opacity==='1')) && !(await p.$('.screen.ghost')));

// ── 3. 움직임 줄이기면 투명으로 시작하지 않고 복사본도 없다 ──
await p.emulateMedia({reducedMotion:'reduce'});
await p.click('.bar .k >> nth=0');
T('reduced-motion: 바로 보이고 복사본 없음', await p.$eval('.screen.home',s=>[...s.children].every(e=>getComputedStyle(e).opacity==='1')) && !(await p.$('.screen.ghost')));
await p.click('.balbtn'); await p.waitForTimeout(300); await swipe(300,500,90,500);
T('reduced-motion 아이 화면: 바로 보이고 복사본 없음', (await op('.kid .kn'))==='1' && !(await p.$('.kid.ghost')));
await p.waitForTimeout(300); await p.click('.kid .x'); await p.waitForTimeout(250);
await p.emulateMedia({reducedMotion:'no-preference'});

// ── 4. fit 은 붙인 직후 동기로 — 큰 금액은 첫 프레임부터 줄어든 크기 ──
await load([KID('k1','서윤','pink',0,0)],[{id:'e1',child_id:'k1',entry_date:'2026-10-01',memo:'용돈',amount:98760,auto_key:null,created_at:'2026-10-01T09:00:00Z'}]);
await p.click('.balbtn');                                               // 기다리지 않는다
T('큰 금액: 클릭 직후(rAF 전)에 이미 tight', await p.$eval('.kid',e=>e.classList.contains('tight')));
await p.waitForTimeout(300); await p.click('.kid .x'); await p.waitForTimeout(250);
await ctx.close();

// ── 5. 가족 코드 칸: 치는 대로 ABCD-1234 ──
const c2=await b.newContext(VP); await c2.addInitScript(FAKE,{members:[]});    // 가족 없는 새 폰 → 시작 화면
const q=await c2.newPage(); q.on('pageerror',e=>errs.push(e.message)); await q.goto(APP); await q.waitForTimeout(1500);
await q.click('button:has-text("가족 코드로 참여")'); await q.waitForTimeout(300);
const ci='.start-body input';
const val=()=>q.$eval(ci,e=>e.value);
await q.click(ci); await q.keyboard.type('k7pm3qra');
T('소문자·하이픈 없이 쳐도 K7PM-3QRA', (await val())==='K7PM-3QRA');
await q.fill(ci,''); await q.keyboard.type('k7pm-3qra');
T('하이픈을 직접 쳐도 같다', (await val())==='K7PM-3QRA');
await q.fill(ci,''); await q.keyboard.type('K7PM3QRAZZZZ');
T('8자리 넘게 쳐도 잘린다', (await val())==='K7PM-3QRA');
await q.fill(ci,''); await q.keyboard.type('k7pm3');
T('5자리째에 하이픈이 생긴다 (K7PM-3)', (await val())==='K7PM-3');
await q.keyboard.press('Backspace');
T('지우면 하이픈도 같이 (K7PM)', (await val())==='K7PM');
await q.keyboard.press('Backspace');
T('계속 지워진다 (K7P)', (await val())==='K7P');
await q.fill(ci,''); await q.evaluate(()=>{ const e=document.querySelector('.start-body input'); e.value=' ab cd-12 34 '; e.dispatchEvent(new Event('input')); });
T('붙여넣기(공백·하이픈 섞임)도 ABCD-1234', (await val())==='ABCD-1234');
await q.click('button:has-text("참여")'); await q.waitForTimeout(600);
T('참여가 그대로 되고 홈', !!(await q.$('.balbtn')) && (await q.evaluate(()=>window.__fake.calls.join))===1);
await c2.close();

// ── 6. 처음 안내: 막이 떠 있는 동안 상태바(theme-color)도 어둡게, 프로그램 스크롤 뒤 자리는 스스로 맞춘다 ──
{
  const c3=await b.newContext(Object.assign({},VP,{viewport:{width:390,height:430}})); await c3.addInitScript(require('./_env').LOCAL_RAW);   // 낮은 화면 — 설정이 스크롤되게
  // iOS 흉내: 프로그램 스크롤 뒤 scroll/scrollend 이벤트가 안 온다고 치고(리스너를 버린다) 자기 교정 루프만으로 맞는지 본다
  await c3.addInitScript(()=>{ const add=window.addEventListener.bind(window); window.addEventListener=function(t,f,o){ if(t==='scroll'||t==='scrollend') return; return add(t,f,o); }; });
  const q=await c3.newPage(); require('./_env').guard(q); q.on('pageerror',e=>errs.push(e.message)); await q.goto(APP);
  await q.evaluate((k)=>{ localStorage.clear(); localStorage.setItem('yd_tour','new'); localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K7PM'},children:[k],entries:[]})); localStorage.setItem('yd_sel','k1'); }, KID('k1','서윤','pink',0,16300));
  await q.waitForTimeout(150); await q.reload(); await q.waitForTimeout(700);
  const theme=()=>q.$eval('meta[name=theme-color]',e=>e.content.toUpperCase());
  const card=()=>q.$eval('.tour-card',e=>e.querySelector('.tc-title').textContent);
  T('안내 1단계: 상태바 색이 어두워진 종이색(#797A7B)', (await theme())==='#797A7B');
  await q.click('.tour-card .ok'); await q.waitForTimeout(300);          // 2단계 잔액
  await q.click('.balbtn'); await q.waitForTimeout(400);                  // 그림 위 — 막 없음
  T('그림 위(막 없음)에선 종이색', !!(await q.$('.kid')) && (await theme())==='#FDFCFA');
  await q.click('.kid .x'); await q.waitForTimeout(400);
  T('닫으면 다시 어둡게', (await theme())==='#797A7B');
  for(let i=0;i<2;i++){ await q.click('.tour-card .ok'); await q.waitForTimeout(300); }   // press → edit → gear
  await q.click('.gear'); await q.waitForTimeout(500);
  await q.click('.tour-card .ok'); await q.waitForTimeout(400);           // week
  await q.click('.tour-card .ok'); await q.waitForTimeout(500);           // export (가운데로 스크롤)
  T('9단계 내보내기: 화면이 내려가 있다', /내보내기/.test(await card()) && (await q.evaluate(()=>window.scrollY))>0);
  // iOS 처럼 프로그램 스크롤이 한 박자 뒤에 적용되게 흉내 낸다
  await q.evaluate(()=>{ const real=window.scrollTo.bind(window); window.scrollTo=function(a){ setTimeout(()=>real(typeof a==='object'?{top:a.top,left:0}:{top:0,left:0}), 80); }; });
  await q.click('.tour-card .ok'); await q.waitForTimeout(600);           // back — scrollTo(0) 가 80ms 뒤에야 먹는다
  const fit=await q.evaluate(()=>{ const a=document.querySelector('.nav .back').getBoundingClientRect(), s=document.querySelector('.tour-spot').getBoundingClientRect();
    return {y:window.scrollY, ok: s.top<=a.top+1 && s.bottom>=a.bottom-1 && s.left<=a.left+1 && s.right>=a.right-1}; });
  T('10단계 ‹: 늦게 적용된 스크롤 뒤에도 구멍이 ‹ 에 맞는다 (자기 교정)', fit.y===0 && fit.ok);
  await q.click('.nav .back'); await q.waitForTimeout(500);
  await q.click('.tour-card .ok'); await q.waitForTimeout(500);           // 시작 → 끝
  T('안내가 끝나면 상태바는 종이색', !(await q.$('.tour')) && (await theme())==='#FDFCFA');
  await c3.close();
}

// ── 7. 홈 전환의 복사본은 화면 밖 줄을 빼고 만든다 ──
{
  const c4=await b.newContext(VP); await c4.addInitScript(require('./_env').LOCAL);
  const q=await c4.newPage(); require('./_env').guard(q); q.on('pageerror',e=>errs.push(e.message)); await q.goto(APP);
  const many=[]; for(let i=0;i<60;i++) many.push({id:'e'+i,child_id:'k1',entry_date:'2026-09-'+String(1+i%28).padStart(2,'0'),memo:'젤리'+i,amount:-100,auto_key:null,created_at:'2026-09-01T09:00:00Z'});
  await q.evaluate(({kids,entries})=>{ localStorage.clear(); localStorage.setItem('yd_tour','done'); localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K'},children:kids,entries})); localStorage.setItem('yd_sel','k1'); },{kids:[KID('k1','서윤','pink',0,16300),KID('k2','하준','yellow',1,5000)],entries:many});
  await q.waitForTimeout(150); await q.reload(); await q.waitForTimeout(700);
  const n0=await q.$$eval('.screen.home .row',es=>es.length);
  await q.click('.bar .k >> nth=1');
  const g=await q.evaluate(()=>{ const g=document.querySelector('.screen.ghost'); return g ? g.querySelectorAll('.row').length : -1; });
  T('복사본의 줄 수가 원본('+n0+')보다 적고 0 은 아니다 ('+g+')', g>0 && g<n0);
  await c4.close();
}

T('콘솔 에러 없음', errs.length===0); if(errs.length) console.log(errs);
await b.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})();
