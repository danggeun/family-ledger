// 통장 목록 — 월 구분선(합계) · 처음엔 60줄 · 더 보기 · 색
const {T, done, launch, localPage, seed, settle, idle}=require('./_harness');
(async()=>{
const b=await launch();
const {p}=await localPage(b);
// 닫기·뒤로는 history.back() → popstate 라 한 박자 늦고, 아이를 바꾸면 옛 화면 복사본(.ghost)이 타이머로 빠진다 — 둘 다 끝날 때까지
const calm=()=>idle(p);

// 여러 달·많은 줄을 미리 심어서 월 구분선과 더 보기를 확인
const kids=[{id:'k1',name:'첫째',color:'blue',sort:0,opening_balance:10000,weekly_on:false,weekly_amount:0},
            {id:'k2',name:'둘째',color:'pink',sort:1,opening_balance:5000,weekly_on:false,weekly_amount:0}];
const ents=[]; let n=0;
for(const [mon,cnt] of [['07',30],['08',30],['09',12]])
  for(let i=1;i<=cnt;i++){
    ents.push({id:'e'+(n++), child_id:'k1', entry_date:'2026-'+mon+'-'+String(i).padStart(2,'0'),
      memo: i%3===0?'용돈':'간식', amount: i%3===0?2000:-500, auto_key:null, created_at:'2026-'+mon+'-'+String(i).padStart(2,'0')+'T09:00:00Z'});
  }
await seed(p, kids, ents);

const divs=await p.$$eval('.mdiv',es=>es.map(e=>e.textContent));
T('월 구분선 존재', divs.length>=2);
console.log('     →', divs.join('  |  '));
T('구분선에 월 합계', /받은 돈/.test(divs[0]) && /쓴 돈/.test(divs[0]));
const shown=await p.$$eval('.row:not(.open)',es=>es.length);
T('처음엔 60줄만 그림 (전체 72)', shown===60);
T('접힌 동안엔 처음 금액 줄 숨김', (await p.$('.row.open'))===null);
const more=await p.$('.more');
T('더 보기 버튼', more!==null);
console.log('     →', await p.$eval('.more',e=>e.textContent));
await more.click(); await calm();
T('더 보기 누르면 전체 표시', (await p.$$eval('.row:not(.open)',es=>es.length))===72);
T('다 펼치면 맨 아래 처음 금액 줄', (await p.$('.row.open'))!==null);
T('더 보기 버튼 사라짐', (await p.$('.more'))===null);

// 핑크
await p.click('.gear'); await calm();
const sw=await p.$$eval('.swatch',es=>es[0].querySelectorAll('button').length);
T('색 6개', sw===6);
const pinkOn=await p.$$eval('.dot',es=>getComputedStyle(es[1]).backgroundColor);
T('둘째 핑크 적용', pinkOn==='rgb(255, 61, 143)');
await p.click('.nav .back'); await calm();
await (await p.$$('.bar .k'))[1].click(); await calm();
await (await p.$$('.bar .k'))[0].click(); await calm();                 // 펼쳐 둔 첫째로 돌아오면
T('아이 전환 시 limit 리셋 — 다시 60줄 + 더 보기', (await p.$$eval('.row:not(.open)',es=>es.length))===60 && !!(await p.$('.more')));

await done(b);
})();
