// 1.3.4 — 날짜 칩이 열린 채 밀면 옆 아이로 안 넘어가던 것(날짜 칩도 "적는 중"으로 읽었다), 달력 칩이 오늘 날짜를 한 번 더 보여주던 것,
// 달력을 좌우로 밀어도 달이 안 바뀌던 것.
const {T, done, launch, localPage, section, seed, idle, touch, KID, E}=require('./_harness');

(async()=>{
const b=await launch();
const {p}=await localPage(b, {clock:'2026-10-10T12:00:00+09:00'});
const swipe=await touch(p);
const who=()=>p.textContent('.bar .k.on');
await seed(p, [KID('k1','서윤','pink',0,10000), KID('k2','하준','yellow',1,5000)], [E('e1','k1','2026-10-05','젤리',-800)]);

await section('날짜 칩', async()=>{
  await p.click('.dbtn'); await idle(p);
  T('달력 칩은 "달력" — 오늘이 골라져 있을 때 날짜를 한 번 더 보이지 않는다', (await p.textContent('.chips button.cal'))==='달력');
  const r=await p.$eval('.row',e=>{ const b=e.getBoundingClientRect(); return b.y+b.height/2; });
  await swipe(300,r,90,r);
  T('날짜 칩이 열린 채 목록에서 밀면 옆 아이로, 칩은 닫힌다 — 전엔 "오늘"을 다시 눌러 닫아야 밀렸다', (await who())==='하준' && !(await p.$('.chips button.cal')));
  // 키보드가 떠 있을 때는 여전히 막는다
  await p.click('input.memo'); await p.keyboard.type('장난감'); await idle(p);
  const r2=await p.$eval('.balbtn',e=>{ const b=e.getBoundingClientRect(); return b.y+b.height/2; });
  await swipe(300,r2,90,r2);
  T('용도를 치는 중(키보드)엔 그대로', (await who())==='하준' && (await p.$eval('input.memo',e=>e.value))==='장난감');
});

await section('달력 밀기', async()=>{
  await seed(p, [KID('k1','서윤','pink',0,10000)], []);
  await p.click('.dbtn'); await idle(p); await p.click('.chips button.cal'); await idle(p);
  const title=()=>p.textContent('.calh .t');
  const g=await p.$eval('.calg',e=>{ const b=e.getBoundingClientRect(); return {y:b.y+b.height/2, l:b.x+40, r:b.x+b.width-40}; });
  T('이번 달에서 시작', (await title())==='2026년 10월');
  await swipe(g.l,g.y,g.r,g.y);
  T('오른쪽으로 밀면 지난달', (await title())==='2026년 9월');
  await swipe(g.r,g.y,g.l,g.y);
  T('왼쪽으로 밀면 다음 달', (await title())==='2026년 10월');
  await swipe(g.r,g.y,g.l,g.y);
  T('이번 달 뒤로는 안 간다(화살표와 같다)', (await title())==='2026년 10월' && !!(await p.$('.sheet')));
  await swipe(g.l+60,g.y,g.l+80,g.y);
  T('살짝 민 것은 그대로', (await title())==='2026년 10월');
});

await done(b);
})();
