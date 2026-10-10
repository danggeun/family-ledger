// 1.2.4 — 아이폰에서 아이 바꾸는 전환이 "툭" 끊기던 것(들어오는 쪽을 처음부터 투명으로 · 복사본의 돼지를 안 가림 · fit 을 첫 프레임에),
// 가족 코드 칸이 치는 대로 ABCD-1234 모양을 잡는 것. 크로미움에서는 전환이 원래 멀쩡했으므로 여기선 "규칙이 걸려 있는지"를 본다.
const {T, done, launch, localPage, fakePage, seed, settle, touch, KID, until}=require('./_harness');
// 닫기는 history.back() → popstate(비동기)로 온다. 방문 기록과 앱의 화면 스택이 맞춰지고 안내의 자리 잡기(tourSettle)도 끝난 뒤 화면이 멈출 때까지
// 하네스의 idle 은 복사본(.ghost)이 치워지길 기다린다 — 이 파일은 그 치워지는 때를 시험하므로 복사본은 기다리지 않는 판을 쓴다
const idle=async(p)=>{ await p.waitForFunction(()=>{ const u=window.__app.S.ui, d=((history.state&&history.state.d)||0)-u.navBase;
  return !u.backing && u.navStack.length<=Math.max(0,d) && !u.tourSettling; }); await settle(p); };
// 앱 타이머(0.1~0.5초)·popstate 로 오는 결과를 기다린다. 2초 안에 안 오면 안 온 것 — 던지지 않고 판정은 뒤의 T 가 한다
// 전환의 첫 프레임을 잰다 — 앱이 그 이벤트(click·touchend)를 다 처리한 바로 뒤, 같은 이벤트 안에서(문서까지 올라온 때) measure 를 부른다.
// 한 프레임도 그려지기 전이라, 기계가 느리거나 동시에 돌아도 지연(0.07초)·복사본 수명(0.11초)·rAF 가 먼저 지나가 버리지 않는다
async function firstFrame(p, type, act, measure){
  await p.evaluate(({type, src})=>{ window.__first=null;
    document.addEventListener(type, ()=>{ window.__first=(0,eval)('('+src+')')(); }, {once:true, passive:true}); }, {type, src:measure.toString()});
  await act();
  return (await p.evaluate(()=>window.__first)) || {};
}

(async()=>{
const b=await launch();
const {ctx, p}=await localPage(b);
const swipe=await touch(p);
const op=(sel)=>p.$eval(sel,e=>getComputedStyle(e).opacity);

// ── 1. 아이 화면: 들어오는 쪽은 애니메이션이 시작되기 전부터 투명, 끝나면 보인다. 복사본의 돼지·✕ 는 보인다 ──
await seed(p, [KID('k1','서윤','pink',0,16300),KID('k2','하준','yellow',1,5000)], []);
await p.click('.balbtn'); await idle(p);
// 기다리지 않는다(settleAfter=false) — 지연 애니메이션(0.07s)이 시작되기 전의 첫 프레임을 본다(손을 뗀 그 touchend 안에서)
const first=await firstFrame(p, 'touchend', ()=>swipe(300,500,90,500,120,false), ()=>{ const k=document.querySelector('.kid.slide-l:not(.ghost)'); const g=document.querySelector('.kid.ghost');
  return {kid:!!k, kn:k&&getComputedStyle(k.querySelector('.kn')).opacity, money:k&&getComputedStyle(k.querySelector('.money')).opacity,
          ghost:!!g, gpig:g&&getComputedStyle(g.querySelector('.pig')).visibility, gx:g&&getComputedStyle(g.querySelector('.x')).visibility,
          wc:k&&getComputedStyle(k.querySelector('.kn')).willChange}; });
T('밀자마자: 새 화면의 이름·돈이 투명(0) — 지연 동안 최종 상태가 먼저 보이지 않는다', first.kid && first.kn==='0' && first.money==='0');
T('밀자마자: 복사본이 있고 돼지·✕ 가 보인다(가리지 않는다)', first.ghost && first.gpig==='visible' && first.gx==='visible');
T('합성 힌트(will-change) 가 걸려 있다', /transform/.test(first.wc||''));
await settle(p); await until(p, ()=>!document.querySelector('.kid.ghost'));    // 복사본은 0.11초 타이머로 치워진다
T('끝나면 이름·돈이 보이고(1) 복사본은 사라진다', (await op('.kid .kn'))==='1' && (await op('.kid .money'))==='1' && !(await p.$('.kid.ghost')) && (await p.textContent('.kid .kn'))==='하준');
T('돼지는 동기 디코드', await p.$eval('.kid .pig',e=>e.decoding==='sync'));
await p.click('.kid .x'); await idle(p);

// ── 2. 홈: 탭을 눌러 바꿔도 같은 규칙 ──
// 기다리지 않는다 — 첫 프레임(누른 그 click 안에서)
const h=await firstFrame(p, 'click', ()=>p.click('.bar .k >> nth=1'), ()=>{ const s=document.querySelector('.screen.home.slide-l:not(.ghost)'); const g=document.querySelector('.screen.ghost');
  const kids=[...s.children].filter(e=>!e.classList.contains('bar')); return {ok:!!s, ops:kids.map(e=>getComputedStyle(e).opacity), bar:getComputedStyle(s.querySelector('.bar')).opacity, ghost:!!g}; });
T('홈: 바꾸자마자 탭 줄 빼고 전부 투명, 탭 줄은 보인다, 복사본 있음', h.ok && h.ops.length>0 && h.ops.every(o=>o==='0') && h.bar==='1' && h.ghost);
await settle(p); await until(p, ()=>!document.querySelector('.screen.ghost'));
T('홈: 끝나면 전부 보인다', await p.$eval('.screen.home',s=>[...s.children].every(e=>getComputedStyle(e).opacity==='1')) && !(await p.$('.screen.ghost')));

// ── 3. 움직임 줄이기면 투명으로 시작하지 않고 복사본도 없다 ──
await p.emulateMedia({reducedMotion:'reduce'});
const rh=await firstFrame(p, 'click', ()=>p.click('.bar .k >> nth=0'), ()=>({all1:[...document.querySelector('.screen.home').children].every(e=>getComputedStyle(e).opacity==='1'), ghost:!!document.querySelector('.screen.ghost')}));
T('reduced-motion: 바로 보이고 복사본 없음', rh.all1===true && rh.ghost===false);
await p.click('.balbtn'); await idle(p);
const rk=await firstFrame(p, 'touchend', ()=>swipe(300,500,90,500,120,false), ()=>({kn:getComputedStyle(document.querySelector('.kid .kn')).opacity, ghost:!!document.querySelector('.kid.ghost')}));
T('reduced-motion 아이 화면: 바로 보이고 복사본 없음', rk.kn==='1' && rk.ghost===false);
await settle(p); await p.click('.kid .x'); await idle(p);
await p.emulateMedia({reducedMotion:'no-preference'});

// ── 4. fit 은 붙인 직후 동기로 — 큰 금액은 첫 프레임부터 줄어든 크기 ──
await seed(p, [KID('k1','서윤','pink',0,0)],[{id:'e1',child_id:'k1',entry_date:'2026-10-01',memo:'용돈',amount:98760,auto_key:null,created_at:'2026-10-01T09:00:00Z'}]);
const big=await firstFrame(p, 'click', ()=>p.click('.balbtn'), ()=>({tight:document.querySelector('.kid').classList.contains('tight')}));   // 기다리지 않는다 — 누른 그 click 안에서
T('큰 금액: 클릭 직후(rAF 전)에 이미 tight', big.tight===true);
await settle(p); await p.click('.kid .x'); await idle(p);
await ctx.close();

// ── 5. 가족 코드 칸: 치는 대로 ABCD-1234 ──
{
  const {ctx:c2, p:q}=await fakePage(b, {members:[]});                // 가족 없는 새 폰 → 시작 화면
  await q.click('button:has-text("가족 코드로 참여")'); await settle(q);
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
  await q.click('button:has-text("참여")');
  await until(q, ()=>!!document.querySelector('.balbtn') && !window.__app.S.ui.loading); await settle(q);
  T('참여가 그대로 되고 홈', !!(await q.$('.balbtn')) && (await q.evaluate(()=>window.__fake.calls.join))===1);
  await c2.close();
}

// ── 6. 처음 안내: 막이 떠 있는 동안 상태바(theme-color)도 어둡게, 프로그램 스크롤 뒤 자리는 스스로 맞춘다 ──
{
  // 낮은 화면 — 설정이 스크롤되게.
  // iOS 흉내: 프로그램 스크롤 뒤 scroll/scrollend 이벤트가 안 온다고 치고(리스너를 버린다) 자기 교정 루프만으로 맞는지 본다
  const {ctx:c3, p:q}=await localPage(b, {tour:true, context:{viewport:{width:390,height:430}},
    init:()=>{ const add=window.addEventListener.bind(window); window.addEventListener=function(t,f,o){ if(t==='scroll'||t==='scrollend') return; return add(t,f,o); }; }});
  await seed(q, [KID('k1','서윤','pink',0,16300)], [], 'k1', true);
  const theme=()=>q.$eval('meta[name=theme-color]',e=>e.content.toUpperCase());
  const card=()=>q.$eval('.tour-card',e=>e.querySelector('.tc-title').textContent);
  T('안내 1단계: 상태바 색이 어두워진 종이색(#797A7B)', (await theme())==='#797A7B');
  await q.click('.tour-card .ok'); await idle(q);                       // 2단계 잔액
  await q.click('.balbtn'); await idle(q);                               // 그림 위 — 막 없음
  T('그림 위(막 없음)에선 종이색', !!(await q.$('.kid')) && (await theme())==='#FDFCFA');
  await q.click('.kid .x'); await idle(q);
  T('닫으면 다시 어둡게', (await theme())==='#797A7B');
  for(let i=0;i<2;i++){ await q.click('.tour-card .ok'); await idle(q); }   // press → edit → gear
  await q.click('.gear'); await idle(q);
  await q.click('.tour-card .ok'); await idle(q);                        // week
  await q.click('.tour-card .ok'); await idle(q);                        // export (가운데로 스크롤 — 자기 교정 루프가 끝날 때까지)
  T('9단계 내보내기: 화면이 내려가 있다', /내보내기/.test(await card()) && (await q.evaluate(()=>window.scrollY))>0);
  // iOS 처럼 프로그램 스크롤이 한 박자 뒤에 적용되게 흉내 낸다 — 5프레임(60fps 로 약 80ms) 뒤.
  // 벽시계(setTimeout 80ms)로 늦추면 안 된다: 앱의 자기 교정 루프는 프레임으로 센다(스크롤이 6프레임 멈추면 끝).
  // 기계가 바쁘면 밀렸던 프레임이 몰려 돌아 80ms 타이머보다 루프가 먼저 끝나고, 그럼 "늦은 스크롤"이 아니라 "루프 뒤의 스크롤"을 재게 된다
  await q.evaluate(()=>{ const real=window.scrollTo.bind(window); window.scrollTo=function(a){ const to=typeof a==='object'?{top:a.top,left:0}:{top:0,left:0};
    let n=0; const f=()=>{ if(++n<5) requestAnimationFrame(f); else real(to); }; requestAnimationFrame(f); }; });
  await q.click('.tour-card .ok');                                       // back — scrollTo(0) 가 5프레임 뒤에야 먹는다
  await until(q, ()=>window.scrollY===0);                                // 늦은 스크롤이 먹을 때까지 — 그 뒤 자리 잡기 루프가 끝나고 구멍이 멈출 때까지
  await idle(q);
  const fit=await q.evaluate(()=>{ const a=document.querySelector('.nav .back').getBoundingClientRect(), s=document.querySelector('.tour-spot').getBoundingClientRect();
    return {y:window.scrollY, ok: s.top<=a.top+1 && s.bottom>=a.bottom-1 && s.left<=a.left+1 && s.right>=a.right-1}; });
  T('10단계 ‹: 늦게 적용된 스크롤 뒤에도 구멍이 ‹ 에 맞는다 (자기 교정)', fit.y===0 && fit.ok);
  await q.click('.nav .back'); await idle(q);
  await q.click('.tour-card .ok'); await idle(q);                        // 시작 → 끝
  await until(q, ()=>!document.querySelector('.tour'));                  // 안내 레이어는 흐려진 뒤(0.26초) 치워진다
  T('안내가 끝나면 상태바는 종이색', !(await q.$('.tour')) && (await theme())==='#FDFCFA');
  await c3.close();
}

// ── 7. 홈 전환의 복사본은 화면 밖 줄을 빼고 만든다 ──
{
  const {ctx:c4, p:q}=await localPage(b);
  const many=[]; for(let i=0;i<60;i++) many.push({id:'e'+i,child_id:'k1',entry_date:'2026-09-'+String(1+i%28).padStart(2,'0'),memo:'젤리'+i,amount:-100,auto_key:null,created_at:'2026-09-01T09:00:00Z'});
  await seed(q, [KID('k1','서윤','pink',0,16300),KID('k2','하준','yellow',1,5000)], many);
  const n0=await q.$$eval('.screen.home .row',es=>es.length);
  // 기다리지 않는다 — 복사본은 0.11초 뒤 치워진다(누른 그 click 안에서 센다)
  const {g}=await firstFrame(q, 'click', ()=>q.click('.bar .k >> nth=1'), ()=>{ const g=document.querySelector('.screen.ghost'); return {g: g ? g.querySelectorAll('.row').length : -1}; });
  T('복사본의 줄 수가 원본('+n0+')보다 적고 0 은 아니다 ('+g+')', g>0 && g<n0);
  await c4.close();
}

await done(b);
})();
