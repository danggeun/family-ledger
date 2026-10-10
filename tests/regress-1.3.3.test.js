// 1.3.3 — 해가 바뀌면(2027년 1월부터) 작년 날짜가 "26.12." / "19" 두 줄로 꺾이던 것, 그리고 1.3.3 독립 평가의 작은 것들.
// 각 덩어리는 고치기 전 코드에서 실패한다.
const {T, done, launch, localPage, fakePage, section, seed, idle, resume, KID, E}=require('./_harness');

const JAN='2027-01-05T12:00:00+09:00';
const heights=(p)=>p.$$eval('.row .d',es=>es.map(e=>e.textContent+':'+Math.round(e.getBoundingClientRect().height)));

(async()=>{
const b=await launch();
let a, p;

// ── 1. 작년 날짜도 한 줄 — 해는 월 머리가 말한다 ──
await section('해가 바뀌어도 목록 날짜는 한 줄', async()=>{
  ({p}=await localPage(b, {clock:JAN}));
  await seed(p, [KID('k1','서윤','pink',0,10000,{created_at:'2026-07-01T09:00:00Z'})],
    [E('e1','k1','2026-12-19','젤리',-800), E('e2','k1','2027-01-03','용돈',3000)]);
  const h=await heights(p);
  T('작년 줄 날짜는 "12.19" 한 줄 ('+h.join(' ')+') — 전엔 "26.12.19"가 두 줄로 꺾였다', h.includes('12.19:17') && h.every(x=>/:17$/.test(x)));
  T('해는 월 머리에', (await p.$$eval('.mdiv .mname',es=>es.map(e=>e.textContent))).join('|')==='1월|2026년 12월');
  T('처음 금액(7.01)은 같은 해 머리 아래라 머리를 더 달지 않는다', (await p.$$eval('.mdiv',es=>es.length))===2 && h.includes('7.01:17'));
  // 처음 금액의 해가 바로 위 머리와 다르면 제 머리를 단다
  await seed(p, [KID('k1','서윤','pink',0,10000,{created_at:'2026-12-31T09:00:00Z'})], [E('e2','k1','2027-01-03','용돈',3000)]);
  T('처음 금액이 작년(12.31)이고 위 머리가 올해면 "2026년 12월" 머리를 단다', (await p.$$eval('.mdiv .mname',es=>es.map(e=>e.textContent))).join('|')==='1월|2026년 12월'
    && (await heights(p)).join(' ')==='1.03:17 12.31:17');
  await seed(p, [KID('k1','서윤','pink',0,10000,{created_at:'2026-12-31T09:00:00Z'})], []);
  T('기록이 없어도 — 머리 "2026년 12월" + 12.31', (await p.$$eval('.mdiv .mname',es=>es.map(e=>e.textContent))).join('|')==='2026년 12월');
  // 입력줄의 날짜 버튼도
  await p.evaluate(()=>{ const S=window.__app.S; S.draft.date='2026-12-30'; S.draft.dateByHand=true; });
  await resume(p); await idle(p);
  const db=await p.$eval('.dbtn',e=>({t:e.textContent, h:Math.round(e.getBoundingClientRect().height)}));
  T('입력줄 날짜 버튼도 "12.30" 한 줄 ('+db.t+', '+db.h+'px) — 전엔 꺾여 44px', db.t==='12.30' && db.h===30);
  // 고치기 시트는 칸이 넓어 해를 그대로 보인다
  await seed(p, [KID('k1','서윤','pink',0,10000,{created_at:'2026-07-01T09:00:00Z'})], [E('e1','k1','2026-12-19','젤리',-800)]);
  await p.click('.row:has-text("젤리")'); await idle(p);
  T('고치기 시트의 날짜는 "26.12.19" 그대로', (await p.textContent('.sheet .tapbox .grow'))==='26.12.19');
});

// ── 2. CSV 의 처음 금액 날짜 = 화면의 처음 금액 줄 날짜 ──
await section('CSV 처음 금액 날짜', async()=>{
  await seed(p, [KID('k1','서윤','pink',0,10000,{created_at:'2026-07-01T09:00:00Z'})], [E('e1','k1','2026-06-20','앞당겨 적은 줄',-500)]);
  const csv=await p.evaluate(()=>window.__app.csvText());
  T('아이 등록보다 앞선 기록이 있으면 그 날(2026-06-20) — 전엔 등록일이라 첫 기록보다 뒤에 왔다', /"서윤",2026-06-20,"처음 금액"/.test(csv));
});

// ── 3. 첫 용돈 후보 — 아직 오지 않은 첫 날을 골라 둔 채 요일을 또 바꾸면 그 날을 기준으로 ──
await section('골라 둔 첫 날이 기준', async()=>{
  ({p}=await localPage(b, {clock:'2026-10-11T12:00:00+09:00'}));    // 일요일
  await seed(p, [KID('k1','서윤','pink',0,10000,{weekly_on:true,weekly_dow:6,weekly_amount:3000,weekly_start:'2026-10-24'})], []);
  const r=await p.evaluate(()=>{ const x=window.__app.firstPayChoices(window.__app.S.children[0], 1); return x.dates.join(' ')+' / '+x.dates[x.pick]; });
  T('10.24(토)로 골라 둔 채 월로 바꾸면 10.19 쪽 ('+r+') — 전엔 10.12 가 골라져 계획보다 일찍 들어갔다', r==='2026-10-12 2026-10-19 / 2026-10-19');
});

// ── 4. 처음 금액 시트를 연 채 다른 폰이 그 아이를 지우면 닫힌다 ──
await section('처음 금액 시트의 아이가 사라지면 닫힌다', async()=>{
  a=await fakePage(b, {});
  await a.p.click('.row.open'); await idle(a.p);
  T('처음 금액 시트가 열렸다', !!(await a.p.$('.sheet')));
  await a.p.evaluate(()=>{ const F=window.__fake; F.kids=F.kids.filter(k=>k.id!=='k1'); F.ents=F.ents.filter(e=>e.child_id!=='k1'); });
  await resume(a.p); await idle(a.p);
  T('닫혔다 (빈 막이나 저장 에러가 남지 않는다)', !(await a.p.$('.sheet')) && !(await a.p.$('.dim')));
  await a.ctx.close();
});

// ── 5. 받는 중에 다시 받기를 부르면, 돌려받은 약속은 그 "한 번 더"가 끝난 뒤 풀린다 ──
await section('reload 는 새 데이터가 온 뒤 풀린다', async()=>{
  a=await fakePage(b, {});
  const n=await a.p.evaluate(async()=>{
    const app=window.__app, F=window.__fake;
    app.reload();                                                     // 받는 중
    F.kids.push({id:'k3',family_id:'f1',name:'막내',color:'blue',sort:2,opening_balance:0,weekly_on:false,weekly_amount:0,created_at:'2026-07-03T00:00:00Z'});
    await app.reload();                                               // 그 사이 생긴 변경 — 이 약속이 풀리면 화면 데이터에 있어야 한다
    return app.S.children.length;
  });
  T('막내까지 3명 — 전엔 바로 풀려 "추가했어요"가 새 줄보다 먼저 떴다', n===3);
  await a.ctx.close();
});

await done(b);
})();
