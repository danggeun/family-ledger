// 1.2.5 — 독립 평가에서 나온 "절대적" 결함: 시작 화면 버튼 납작, 저장 실패 시 치던 것 보존, 건너뛴 주 되돌리기,
// 중간 reload 뒤 saved 누락, 페이징 중복, 미래 auto_key, 참여 오류 문구, 아이별 용도 안내, 한국어 줄바꿈.
const {T, done, launch, localPage, fakePage, section, seed, settle, resume, KID, addDays, today:todayOf, popped, ready, reloaded, toasted}=require('./_harness');
const today=todayOf();

const open=async(b, opt)=>{ const a=await fakePage(b, opt, {wait:false}); await ready(a.p); return a; };
const noTmp=(p)=>p.waitForFunction(()=>!window.__app.S.entries.some(e=>String(e.id).indexOf('tmp-')===0));   // 저장 중인 줄(낙관 반영)이 결과로 바뀔 때까지
const bal=(p)=>p.textContent('.balbtn b');
const rows=(p)=>p.$$eval('.row:not(.open)',es=>es.length);

(async()=>{
const b=await launch();
let a;

// ── 1. 시작 화면 버튼은 56px ──
await section('시작 화면', async()=>{
  a=await open(b, {members:[]});
  const hs=await a.p.$$eval('.stack .btn',es=>es.map(e=>Math.round(e.getBoundingClientRect().height)));
  T('시작 화면 버튼 높이 56px ('+hs.join(',')+') — 전엔 22px 로 납작', hs.length>=2 && hs.every(h=>h===56));
  // 7. 참여 오류 문구: 코드가 틀린 것과 연결이 안 되는 것을 구분
  await a.p.click('button:has-text("가족 코드로 참여")'); await settle(a.p);
  await a.p.click('.start-body input'); await a.p.keyboard.type('K7PM3QRA');
  await a.p.evaluate(()=>{ window.__fake.joinError='Failed to fetch'; });
  await toasted(a.p, ()=>a.p.click('button:has-text("참여")'));
  T('서버에 못 닿으면 "연결이 안 돼요" (코드를 의심하게 하지 않는다)', /연결이 안 돼요/.test(await a.p.textContent('#toast')));
  await a.p.evaluate(()=>{ window.__fake.joinError='no such family'; });
  await toasted(a.p, ()=>a.p.click('button:has-text("참여")'));
  T('코드가 없으면 "코드를 찾을 수 없어요"', /코드를 찾을 수 없어요/.test(await a.p.textContent('#toast')));
  await a.ctx.close();
});

// ── 2. 저장 실패 → 치던 용도·금액이 돌아온다 ──
await section('저장 실패', async()=>{
  a=await open(b, {});
  await a.p.evaluate(()=>{ window.__fake.insertFail=true; });
  await a.p.click('.memo'); await a.p.keyboard.type('아이스크림'); await a.p.click('.amt'); await a.p.keyboard.type('1200');
  await toasted(a.p, ()=>a.p.click('.entry .ok'));
  T('실패 토스트, 줄은 안 남고', /저장 실패/.test(await a.p.textContent('#toast')) && (await rows(a.p))===2);
  T('치던 용도·금액이 입력줄에 그대로 (전엔 통째로 날아갔다)', (await a.p.$eval('.memo',e=>e.value))==='아이스크림' && (await a.p.$eval('.amt',e=>e.value))==='1,200');
  await a.p.evaluate(()=>{ window.__fake.insertFail=false; });
  await a.p.click('.entry .ok'); await noTmp(a.p); await settle(a.p);
  T('다시 ✓ 누르면 저장된다', (await rows(a.p))===3 && (await a.p.$eval('.memo',e=>e.value))==='');
});

// ── 4. 저장 응답이 오기 전에 reload 가 tmp 를 걷어가도 saved 는 들어간다 ──
// 저장을 붙잡아 둔 채(insertHold) 복귀 reload 를 끝까지 돌리고, 그다음에 저장을 끝낸다 — 순서를 시간이 아니라 테스트가 정한다
await section('reload 뒤 saved', async()=>{
  await a.p.evaluate(()=>{ window.__fake.insertHold=true; });
  await a.p.click('.memo'); await a.p.keyboard.type('젤리2'); await a.p.click('.amt'); await a.p.keyboard.type('300');
  await a.p.click('.entry .ok'); await settle(a.p);
  await reloaded(a.p, ()=>resume(a.p));                        // 복귀 reload — 서버 스냅샷엔 아직 없다
  await a.p.evaluate(()=>window.__fake.release());
  await a.p.waitForFunction(()=>window.__fake.ents.some(e=>e.memo==='젤리2')); await settle(a.p);   // 서버가 받았다 — 앱의 응답 처리는 같은 마이크로태스크 안에서 끝난다
  T('reload 가 tmp 를 걷어간 뒤 insert 가 끝나도 줄이 화면에 있다', (await rows(a.p))===4 && (await a.p.$$eval('.row .m',es=>es.some(e=>e.textContent.indexOf('젤리2')===0))));
  await a.ctx.close();
});

// ── 5. 페이지 경계 중복은 한 번만 센다 ──
await section('페이지 경계 중복', async()=>{
  const dup={id:'e9',family_id:'f1',child_id:'k1',entry_date:'2026-09-20',memo:'중복',amount:-1000,auto_key:null,skipped:false,created_by:'u1',updated_by:'u1',created_at:'2026-09-20T09:00:00Z'};
  a=await open(b, {ents:[dup, Object.assign({},dup)]});
  T('같은 id 가 두 번 와도 줄 하나·잔액 9,000', (await rows(a.p))===1 && (await bal(a.p))==='9,000');
  await a.ctx.close();
});

// ── 6. 시계가 앞선 기기가 넣은 미래 auto_key 가 있어도 이번 주 용돈은 생긴다 ──
await section('미래 auto_key', async()=>{
  const dow=new Date(today+'T12:00:00').getDay(), sat=addDays(today,-((dow+1)%7)), future=addDays(sat,14);
  a=await open(b, {kids:[KID('k1','서윤','pink',0,10000,{weekly_on:true,weekly_dow:6,weekly_amount:3000,weekly_start:addDays(sat,-21)})],
                   ents:[{id:'f1e',family_id:'f1',child_id:'k1',entry_date:future,memo:'용돈',amount:3000,auto_key:'w:'+future,skipped:false,created_at:future+'T09:00:00Z'}]});
  const up=await a.p.evaluate(()=>window.__fake.lastUpsert||[]);
  T('미래 열쇠를 무시하고 지난 토요일들('+sat+' 포함)이 생성된다', up.some(r=>r.auto_key==='w:'+sat) && up.every(r=>r.entry_date<=new Date().toISOString().slice(0,10)));
  await a.ctx.close();
});

// ── 로컬 모드: 건너뛴 주 되돌리기 · 아이별 용도 안내 · 줄바꿈 ──
const {ctx, p}=await localPage(b);
const gear=async()=>{ await p.click('.gear'); await settle(p); };
// 3. 건너뛰기 → 설정 매주 용돈 시트에 "건너뛴 주 1개 되돌리기" → 줄이 돌아온다
await section('건너뛴 주 되돌리기', async()=>{
  await seed(p, [KID('k1','서윤','pink',0,10000,{weekly_on:true,weekly_dow:6,weekly_amount:3000,weekly_start:'2026-10-03'})],
             [{id:'a1',child_id:'k1',entry_date:'2026-10-03',memo:'용돈',amount:3000,auto_key:'w:2026-10-03',created_by:'me',created_at:'2026-10-03T09:00:00Z'}]);
  const n0=await rows(p), b0=await bal(p); let dbg;
  await gear(); await p.click('.card.week .srow >> nth=0'); await settle(p);
  T('건너뛴 게 없으면 되돌리기 줄이 없다', !(await p.$('.skiprow')));
  await popped(p, ()=>p.click('.sheet button:has-text("취소")')); await popped(p, ()=>p.goBack());
  await p.click('.row.auto >> nth=0'); await settle(p);
  await p.click('.sheet button:has-text("이번 주 건너뛰기")'); await settle(p);
  await popped(p, ()=>p.click('.sheet button:has-text("정말 건너뛰기")'));
  T('건너뛰면 줄이 하나 줄고 잔액이 3,000 준다', (await rows(p))===n0-1 && (await bal(p))!==b0);
  await gear(); await p.click('.card.week .srow >> nth=0'); await settle(p);
  dbg=await p.$$eval('.skiprow',es=>es.map(e=>e.textContent)); T('매주 용돈 시트에 건너뛴 주가 날짜별로 ('+dbg[0]+')', dbg.length===1 && /^\d+\.\d+ \(토\)되돌리기$/.test(dbg[0]));
  await p.click('.skiprow'); await settle(p);
  T('누르면 그 줄이 사라지고 시트는 열린 채', !(await p.$('.skiprow')) && !!(await p.$('.sheet')));
  await popped(p, ()=>p.click('.sheet button:has-text("취소")')); await popped(p, ()=>p.goBack());
  T('되돌리면 줄과 잔액이 돌아온다', (await rows(p))===n0 && (await bal(p))===b0 && await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).entries.every(e=>!e.skipped)));
});
// 8. 용도 안내는 그 아이 기준
await section('용도 안내 · 부호', async()=>{
  await seed(p, [KID('k1','서윤','pink',0,10000),KID('k2','하준','yellow',1,5000)],
             [{id:'e1',child_id:'k1',entry_date:today,memo:'젤리',amount:-800,auto_key:null,created_by:'me',created_at:today+'T09:00:00Z'}]);
  T('기록 있는 첫째: 용도 안내 없음', (await p.$eval('.memo',e=>e.placeholder))==='');
  await p.click('.bar .k >> nth=1'); await settle(p);
  T('기록 없는 둘째: "용도" 안내가 보인다 (전엔 가족 전체 기준이라 빈 칸)', (await p.$eval('.memo',e=>e.placeholder))==='용도');
  // 1.2.6: 부호 30px(✓ 36 보다 한 단계 작게) · 받은 돈이면 입력줄 숫자도 초록
  await p.click('.amt'); await p.keyboard.type('500'); await settle(p);
  const sz=await p.$eval('.entry .sign',e=>Math.round(e.getBoundingClientRect().width));
  T('부호 버튼 30px', sz===30);
  T('쓴 돈(−)일 때 금액 숫자는 잉크색', (await p.$eval('.entry .amt',e=>getComputedStyle(e).color))==='rgb(17, 19, 23)');
  await p.click('.entry .sign'); await settle(p);
  T('받은 돈(+)으로 바꾸면 숫자가 초록(목록·시트와 같게)', await p.$eval('.entry .sign',e=>e.classList.contains('plus')) && (await p.$eval('.entry .amt',e=>getComputedStyle(e).color))!=='rgb(17, 19, 23)' && await p.$eval('.entry .amt',e=>e.classList.contains('in')));
  await p.click('.entry .sign'); await settle(p);
  T('다시 −로 돌리면 잉크색', !(await p.$eval('.entry .amt',e=>e.classList.contains('in'))));
  await p.click('.amt'); await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
  // 9. 한국어 줄바꿈
  T('word-break: keep-all', (await p.evaluate(()=>getComputedStyle(document.body).wordBreak))==='keep-all');
});
await ctx.close();

// 건너뛴 주가 많아도 시트는 화면 안에 — 목록만 세 줄 반 높이에서 스크롤, 저장 버튼은 보인다
await section('건너뛴 주가 많을 때', async()=>{
  const {ctx:c5, p:q}=await localPage(b);
  const ents=[]; let d=new Date('2026-10-03T12:00:00');
  for(let i=0;i<24;i++){ const s=d.toISOString().slice(0,10); ents.push({id:'a'+i,child_id:'k1',entry_date:s,memo:'용돈',amount:3000,auto_key:'w:'+s,skipped:i%2===0,created_at:s+'T09:00:00Z'}); d.setDate(d.getDate()-7); }
  await seed(q, [KID('k1','서윤','pink',0,16300,{weekly_on:true,weekly_dow:6,weekly_amount:3000,weekly_start:'2026-01-03'})], ents);
  await q.click('.gear'); await settle(q); await q.click('.card.week .srow >> nth=0'); await settle(q);
  const m=await q.evaluate(()=>{ const l=document.querySelector('.skiplist'), s=document.querySelector('.sheet button.btn.pri').getBoundingClientRect();
    return {rows:l.querySelectorAll('.skiprow').length, box:l.clientHeight, scroll:l.scrollHeight, saveVisible:s.bottom<=window.innerHeight && s.top>=0}; });
  T('건너뛴 주 12개: 목록은 144px 안에서 스크롤('+m.rows+'줄, '+m.scroll+'px), 저장 버튼은 화면 안', m.rows===12 && m.box<=144 && m.scroll>m.box && m.saveVisible);
  await c5.close();
});

await done(b);
})();
