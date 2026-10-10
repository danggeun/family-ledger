// 1.3.2 — 1.3.0 독립 평가에서 나온 결함. 각각 옛 코드에서 실패한다.
// 저장 실패가 다른 아이 입력줄로 돌아오던 것 · 다른 폰이 지운 줄을 고치면 성공처럼 보이던 것 · 나눠 받는 중 삭제로 한 줄 빠지던 것 ·
// 열어 둔 매주 용돈 시트의 아이가 지워지면 에러 · 요일을 바꾸면 한 주에 두 번 · 긴 금액 앞자리가 말없이 잘리던 것 · 같은 시각 줄의 순서.
const {T, done, launch, localPage, fakePage, section, seed, KID, E}=require('./_harness');
const fs=require('fs'), path=require('path');

const SAT='2026-10-10T12:00:00+09:00';               // 토요일
const bal=(p)=>p.textContent('.balbtn b');
const toast=(p)=>p.textContent('#toast');
const resume=(p)=>p.evaluate(()=>{ Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true}); document.dispatchEvent(new Event('visibilitychange')); });

(async()=>{
const b=await launch();
let a, p;


// ── 1. 저장이 늦게 실패하는 사이 다른 아이로 넘어가면, 치던 건 그 아이 입력줄로 돌아오지 않는다 ──
await section('저장이 늦게 실패하는 사이 다른 아이로 넘어가면, 치던 건 그 아이 입력줄로 돌아오지 않는다', async()=>{
  a=await fakePage(b, {});
  await a.p.evaluate(()=>{ window.__fake.insertFail=true; window.__fake.insertDelay=700; });
  await a.p.click('.memo'); await a.p.keyboard.type('아이스크림'); await a.p.click('.amt'); await a.p.keyboard.type('1200');
  await a.p.click('.entry .ok');
  await a.p.click('.bar .k:has-text("하준")');
  await a.p.waitForFunction(()=>/저장 실패/.test(document.getElementById('toast').textContent));
  T('하준 입력줄은 비어 있다 (전엔 서윤 것이 돌아와 ✓ 한 번에 하준 기록이 됐다)', (await a.p.$eval('.memo',e=>e.value))==='' && (await a.p.$eval('.amt',e=>e.value))==='');
  T('누구 것이 실패했는지 알린다', /서윤 저장 실패/.test(await toast(a.p)));
  // 같은 아이에 머물면 그대로 돌려준다(1.2.5)
  await a.p.evaluate(()=>{ window.__fake.insertDelay=0; });
  await a.p.click('.memo'); await a.p.keyboard.type('젤리'); await a.p.click('.amt'); await a.p.keyboard.type('500');
  await a.p.click('.entry .ok');
  await a.p.waitForFunction(()=>document.querySelector('.memo').value==='젤리');
  T('같은 아이면 치던 게 돌아온다 (그대로)', (await a.p.$eval('.amt',e=>e.value))==='500');
  await a.ctx.close();
});

// ── 2. 다른 폰이 지운 줄을 고치면 실패로 알리고 되돌린다 ──
await section('다른 폰이 지운 줄을 고치면 실패로 알리고 되돌린다', async()=>{
  a=await fakePage(b, {});
  await a.p.click('.row:has-text("젤리")'); await a.p.waitForSelector('.sheet');
  await a.p.evaluate(()=>{ const F=window.__fake; F.ents=F.ents.filter(e=>e.id!=='e1'); });   // 그 사이 다른 폰이 지웠다
  await a.p.fill('.sheet input:not(.r)', '젤리 두 개'); await a.p.click('.sheet button:has-text("저장")');
  await a.p.waitForFunction(()=>/다른 폰에서 지운 기록/.test(document.getElementById('toast').textContent));
  T('"다른 폰에서 지운 기록이에요" — 전엔 성공처럼 보이고 고친 게 사라졌다', true);
  await a.p.waitForFunction(()=>![...document.querySelectorAll('.row .m')].some(e=>/젤리/.test(e.textContent)));
  T('새로 받아 그 줄은 목록에서 빠진다', true);
  await a.ctx.close();
});

// ── 3. 1000줄 넘게 나눠 받는 사이 다른 폰이 지워도 한 줄도 빠지지 않는다 ──
await section('1000줄 넘게 나눠 받는 사이 다른 폰이 지워도 한 줄도 빠지지 않는다', async()=>{
  const many=[]; for(let i=0;i<2500;i++){ const id='e'+String(i).padStart(5,'0'); many.push({id,family_id:'f1',child_id:'k1',entry_date:'2026-09-01',memo:'m'+i,amount:-1,auto_key:null,skipped:false,created_at:'2026-09-01T09:00:00Z'}); }
  a=await fakePage(b, {ents:many});
  await a.p.evaluate(()=>{ const F=window.__fake; F.calls.pages=0;
    F.afterPage=(n)=>{ if(n===1) F.ents=F.ents.filter(e=>e.id!=='e00010'); };    // 첫 쪽을 준 직후 앞쪽 한 줄이 지워진다
  });
  await resume(a.p);
  await a.p.waitForFunction(()=>window.__fake.calls.pages>=3);
  await a.p.waitForFunction(()=>window.__app.S.entries.length>=2499 && !window.__app.S.ui.loading);
  // 지워진 줄(e00010)은 이미 받은 첫 쪽에 있었으니 이번엔 남아 있다 — 실시간 삭제 알림이 다음 reload 로 걷어낸다. 중요한 건 남아 있는 줄이 하나도 안 빠지는 것
  const got=await a.p.evaluate(()=>{ const ids=window.__app.S.entries.map(e=>e.id), set=new Set(ids); return {n:ids.length, dup:ids.length-set.size, missing:window.__fake.ents.filter(e=>!set.has(e.id)).map(e=>e.id)}; });
  T('서버에 남은 2,499줄이 하나도 안 빠졌다 (빠짐 '+got.missing.length+') — 전엔 "몇 번째부터"라 경계 줄(e01000)이 밀려 빠졌다', got.missing.length===0);
  T('두 번 온 줄도 없다', got.dup===0);
  await a.ctx.close();
});

// ── 4. 매주 용돈 시트를 연 채 다른 폰이 그 아이를 지우면 — 에러 없이 시트가 닫힌다 ──
await section('매주 용돈 시트를 연 채 다른 폰이 그 아이를 지우면 — 에러 없이 시트가 닫힌다', async()=>{
  a=await fakePage(b, {});
  await a.p.click('.gear'); await a.p.waitForSelector('.card.week');
  await a.p.click('.card.week .srow >> nth=0'); await a.p.waitForSelector('.sheet');
  await a.p.evaluate(()=>{ const F=window.__fake; F.kids=F.kids.filter(k=>k.id!=='k1'); F.ents=F.ents.filter(e=>e.child_id!=='k1'); });
  await resume(a.p);
  await a.p.waitForFunction(()=>!document.querySelector('.sheet'), null, {timeout:4000}).catch(()=>{});
  T('시트가 닫히고(빈 막으로 남지 않고)', !(await a.p.$('.sheet')) && !(await a.p.$('.dim')));
  T('설정 화면은 그대로', !!(await a.p.$('.card.week')));
  await a.ctx.close();
});

// ── 5. 요일을 바꾸면 원래 받을 날에 가장 가까운 새 요일부터 (한 주에 두 번 없음) ──
await section('요일을 바꾸면 원래 받을 날에 가장 가까운 새 요일부터 (한 주에 두 번 없음)', async()=>{
  ({p}=await localPage(b, {clock:SAT}));
  await seed(p, [KID('k1','서윤','pink',0,10000,{weekly_on:true,weekly_dow:6,weekly_amount:3000,weekly_start:'2026-09-19'})], []);
  const auto=()=>p.evaluate(()=>window.__app.S.entries.filter(e=>e.auto_key).map(e=>e.entry_date).sort());
  T('토요일 용돈이 오늘까지 들어와 있다', (await auto()).slice(-1)[0]==='2026-10-10');
  const start=(dow)=>p.evaluate((d)=>window.__app.startForNewDow('k1',d), dow);
  T('토 → 일: 다음 주 일요일(10.18) — 전엔 내일(10.11) 또 들어갔다', await start(0)==='2026-10-18');
  T('토 → 수: 10.14 (4일 뒤)', await start(3)==='2026-10-14');
  T('토 → 금: 10.16 (6일 뒤)', await start(5)==='2026-10-16');
  T('토 → 화: 10.20 (원래 날 10.17 의 3일 뒤 — 간격 10일, 4~10일 안)', await start(2)==='2026-10-20');
  await p.click('.gear'); await p.waitForSelector('.card.week');
  await p.click('.card.week .srow >> nth=0'); await p.waitForSelector('.sheet .dow');
  await p.click('.sheet .dow button >> nth=0');                            // 일
  await p.click('.sheet button:has-text("저장")');
  await p.waitForFunction(()=>window.__app.S.children[0].weekly_dow===0);
  await p.waitForTimeout(300);
  T('저장하면 weekly_start = 10.18', await p.evaluate(()=>window.__app.S.children[0].weekly_start)==='2026-10-18');
  T('오늘 새로 생긴 자동 줄 없음', (await auto()).filter(d=>d>'2026-10-10').length===0);
  // 켜기만 할 때는 그대로 오늘부터
  await seed(p, [KID('k1','서윤','pink',0,10000)], []);
  T('받은 적이 없으면 오늘부터', await start(0)==='2026-10-10');
});

// ── 6. 긴 금액은 글자를 줄여 다 보인다 · 보통 금액은 그대로 ──
await section('긴 금액은 글자를 줄여 다 보인다 · 보통 금액은 그대로', async()=>{
  await seed(p, [KID('k1','서윤','pink',0,10000)], []);
  await p.click('.amt'); await p.keyboard.type('3000');
  T('보통 금액은 글자 크기 그대로', await p.$eval('.amt',e=>e.style.fontSize)==='');
  await p.keyboard.type('0000');                                         // 30,000,000
  const fit=await p.$eval('.amt',e=>({sw:e.scrollWidth, cw:e.clientWidth, fs:e.style.fontSize, v:e.value}));
  T('30,000,000 이 칸 안에 다 보인다 ('+JSON.stringify(fit)+')', fit.sw<=fit.cw && fit.fs!=='' && fit.v==='30,000,000');
  await p.keyboard.press('Control+A'); await p.keyboard.type('500');
  T('다시 짧아지면 원래 크기로', await p.$eval('.amt',e=>e.style.fontSize)==='');
});

// ── 7. 같은 날·같은 시각 줄은 id 순 — 폰마다 누적 금액 순서가 같다 ──
await section('같은 날·같은 시각 줄은 id 순 — 폰마다 누적 금액 순서가 같다', async()=>{
  const ord=await p.evaluate(()=>{ const f=window.__app.byDateThenCreated, x={entry_date:'2026-10-10',created_at:'t',id:'b'}, y={entry_date:'2026-10-10',created_at:'t',id:'a'};
    return [f(x,y), f(y,x), f(x,x)]; });
  T('정렬이 대칭이고 같은 줄은 0 (전엔 늘 1이라 순서가 폰마다 달랐다)', ord[0]===1 && ord[1]===-1 && ord[2]===0);
});

// ── 8. 서비스워커 설치는 HTTP 캐시를 건너뛴다(배포 직후 옛 파일을 담지 않게) ──
await section('서비스워커 설치는 HTTP 캐시를 건너뛴다(배포 직후 옛 파일을 담지 않게)', async()=>{
  T('sw.js 설치가 cache:"reload"', /new Request\(a, \{cache:"reload"\}\)/.test(fs.readFileSync(path.resolve(__dirname,'../sw.js'),'utf8')));
});

await done(b);
})();
