// 잠깐 열어두기 잠금 — 주인 가족만 보이고, 열면 시간이 지나 저절로 잠긴다
const {T, done, launch, localPage, section, seed, settle, ready, toastLike, KID}=require('./_harness');

(async()=>{
const b=await launch();
const {p}=await localPage(b);
await seed(p, [KID('k1','서윤','pink',0,10000)], []);
const row=()=>p.$('.srow.tap:has-text("잠깐 열어두기")');
const rowVal=()=>p.$eval('.srow.tap:has-text("잠깐 열어두기") .val',e=>e.textContent);
const until=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).openUntil||null);
// 설정을 연다 — 주인인지(gateState)는 열고 나서 따로 물어보고 다시 그린다. 새 페이지라 S.gate 는 비어 있다 — 답이 올 때까지
const gear=async()=>{ await p.click('.gear'); await p.waitForFunction(()=>window.__app.S.gate!==null); await settle(p); };
// 시트의 단추 → 저장되면 알림(토스트) + navBack(history.back → popstate, 비동기)으로 닫힌다. 그 popstate 까지 처리된 뒤
const press=async(sel, re)=>{ await p.click(sel); await toastLike(p, re); await p.waitForFunction(()=>!window.__app.S.ui.backing); await settle(p); };

await section('열고 잠그기', async()=>{
  await gear();
  T('주인이면 줄이 보인다', !!(await row()));
  T('처음엔 잠김', (await rowVal())==='잠김');
  await (await row()).click(); await settle(p);
  T('시트 열림', /열어두면 10분 동안/.test(await p.textContent('.sheet .note')));
  T('잠겨 있을 땐 "지금 잠그기"가 없다', !(await p.$('.sheet button:has-text("지금 잠그기")')));
  await press('.sheet .btn.pri', /10분 동안 열었어요/);
  T('열면 시트가 닫힌다', !(await p.$('.sheet')));
  T('열림이 저장된다', !!(await until()));
  T('줄에 남은 시간', /^\d+분 남음$/.test(await rowVal()));
  await (await row()).click(); await settle(p);
  T('열려 있으면 안내가 바뀐다', /분 뒤에 잠겨요/.test(await p.textContent('.sheet .note')));
  await press('.sheet button:has-text("지금 잠그기")', /잠갔어요/);
  T('잠그면 되돌아간다', (await rowVal())==='잠김' && (await until())===null);
});

// 시간이 지나면 저절로 잠긴 것으로 보인다
await section('지난 시각', async()=>{
  await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('yd_local_v1'));
    d.openUntil=new Date(Date.now()-60000).toISOString(); localStorage.setItem('yd_local_v1',JSON.stringify(d));});
  await p.reload(); await ready(p); await gear();
  T('지난 시각이면 잠김으로 보인다', (await rowVal())==='잠김');
});

// 주인이 아니면 줄 자체가 없다
await section('주인이 아니면', async()=>{
  await p.evaluate(()=>{const d=JSON.parse(localStorage.getItem('yd_local_v1')); delete d.family;
    localStorage.setItem('yd_local_v1',JSON.stringify(d));});
  await p.reload(); await ready(p);
  if(await p.$('.gear')) await gear();
  T('주인이 아니면 줄이 없다', !(await row()));
});

await done(b);
})();
