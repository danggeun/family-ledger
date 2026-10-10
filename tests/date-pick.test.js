// 날짜 고르기 — 기기 기본 달력 대신 앱 안에서
const {T, done, launch, localPage, seed, settle, KID, E, back: backOnce, idle}=require('./_harness');
const pad=n=>String(n).padStart(2,'0');
(async()=>{
const b=await launch();
const {p}=await localPage(b);
// 닫기·뒤로는 history.back() → popstate 라 한 박자 늦다 — 그 처리까지 끝날 때까지
const calm=()=>idle(p);
const click=async(sel)=>{ await p.click(sel); await calm(); };
// 브라우저 뒤로 가기 — 열린 화면 하나가 닫힐(방문 기록 칸이 하나 줄) 때까지
const back=()=>backOnce(p);

await seed(p, [KID('k1','서윤','pink',0,10000,{created_at:'2026-01-01'})],
  [E('e1','k1',new Date().toISOString().slice(0,10),'젤리',-800,{created_at:'2026-01-02T09:00:00Z'})]);
const now=new Date(), Y=now.getFullYear(), M=now.getMonth()+1, D=now.getDate();

T('기기 기본 달력을 쓰지 않는다', (await p.$$('input[type=date]')).length===0);
await click('.dbtn');
T('날짜 칩에 달력 버튼', !!(await p.$('.chips button.cal')));
await click('.chips button.cal');
T('달력 시트가 열린다', !!(await p.$('.calg')));
T('이번 달을 연다', (await p.textContent('.calh .t'))===`${Y}년 ${M}월`);
T('오늘이 선택돼 있다', (await p.textContent('.calg button.on'))===String(D));
T('다음 달 버튼은 막혀 있다', await p.$eval('.calh .navb >> nth=1', e=>e.disabled));
const future=await p.$$eval('.calg button', es=>es.filter(e=>e.disabled).map(e=>+e.textContent));
T('아직 안 온 날은 못 고른다', future.every(n=>n>D) && (D===new Date(Y,M,0).getDate() ? true : future.length>0));

// 지난달로 가서 5일 고르기
await click('.calh .navb >> nth=0');
const pm = M===1 ? {y:Y-1,m:12} : {y:Y,m:M-1};
T('이전 달로 간다', (await p.textContent('.calh .t'))===`${pm.y}년 ${pm.m}월`);
await click(`.calg button:text-is("5")`);
T('고르면 그 날이 표시된다 (안 닫힌다)', !!(await p.$('.calg')) && (await p.textContent('.calg button.on'))==='5');
await click('.sheet .btn.pri');
T('확인을 눌러야 닫힌다', !(await p.$('.calg')));
T('고른 날짜가 입력줄에 붙는다', (await p.textContent('.dbtn')).includes(`${pm.m}.05`));
await click('.dbtn');
T('먼 날짜면 달력 칩이 그 날짜를 보여준다', (await p.textContent('.chips button.cal')).includes(`${pm.m}.05`));
await click('.dbtn');

// 고치기 시트에서도
await click('.row >> nth=0');
T('고치기 시트의 날짜가 눌리는 칸', !!(await p.$('.sheet .box.tapbox')));
await click('.sheet .box.tapbox');
T('시트 위에 달력이 열린다', !!(await p.$('.calg')));
await back();
T('뒤로 가면 달력만 닫히고 고치기 시트는 남는다', !(await p.$('.calg')) && !!(await p.$('.sheet')));
await click('.sheet .box.tapbox');
await click(`.calg button:text-is("3")`);
await click('.sheet .btn.pri >> nth=-1');
T('고친 날짜가 시트에 반영된다', (await p.textContent('.sheet .box.tapbox')).includes(`${M}.03`));
await click('.sheet .btn.pri');
T('저장하면 기록의 날짜가 바뀐다',
  await p.evaluate((d)=>JSON.parse(localStorage.getItem('yd_local_v1')).entries[0].entry_date===d,
    `${Y}-${pad(M)}-03`));

await done(b);
})();
