// 서버가 안 될 때 / 아주 오래 썼을 때 — 정상 경로 밖의 완전함
// 서버는 tests/_fake.js 로 흉내 낸다: live(정상) / dead(가족 확인은 되고 데이터만 실패) / down(처음부터 전부 실패)
const {T, done, errs, launch, localPage, fakePage, section, settle, ready, allowConsole}=require('./_harness');

const KIDS=[{id:'k1',family_id:'f1',name:'서윤',color:'pink',sort:0,opening_balance:10000,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'}];
const ENTS=[{id:'e1',family_id:'f1',child_id:'k1',entry_date:'2026-09-14',memo:'젤리',amount:-800,auto_key:null,skipped:false,created_at:'2026-09-14T09:00:00Z'}];

async function open(mode, cache){
  const a=await fakePage(b, {mode, kids:KIDS, ents:ENTS}, {cache, wait:false});
  await ready(a.p); return a;
}
let b;

(async()=>{
b=await launch();
let a;
// 1) 정상이면 배너 없음 + 캐시가 쌓인다
await section('정상', async()=>{
  a=await open('live',false);
  T('정상: 배너 없음', !(await a.p.$('.offbar')));
  T('정상: 잔액 보임', (await a.p.textContent('.balbtn b'))==='9,200');
  T('정상: 다음을 위해 저장해둔다', await a.p.evaluate(()=>!!localStorage.getItem('yd_cache_v1')));
  T('정상: 콘솔 에러 없음', errs.length===0);
  await a.ctx.close();
});

// 2) 쓰던 기기인데 서버가 안 될 때 → 마지막 화면 + 배너 (시작 화면이 뜨면 안 된다)
await section('서버 안 됨', async()=>{
  a=await open('dead',true);
  T('서버 안 됨: 시작 화면이 뜨지 않는다', !(await a.p.$('button:has-text("새로 시작하기")')));
  T('서버 안 됨: 마지막 잔액이 보인다', (await a.p.textContent('.balbtn b'))==='9,200');
  T('서버 안 됨: 배너가 화면에 남는다', !!(await a.p.$('.offbar')));
  T('서버 안 됨: 배너에 다시 시도', /다시/.test(await a.p.textContent('.offbar')));
  await a.p.click('.gear'); await a.p.waitForFunction(()=>window.__app.S.gate!==null); await settle(a.p);
  T('서버 안 됨: 설정에도 배너', !!(await a.p.$('.offbar')));
  await a.ctx.close();
  allowConsole(/^console: Error: Failed to fetch/);
});

// 3) 처음 보는 기기 + 서버 안 됨 → 시작 화면이 아니라 연결 실패 화면
await section('캐시 없음', async()=>{
  a=await open('down',false);
  T('캐시 없음: 시작 화면이 아니다', !(await a.p.$('button:has-text("새로 시작하기")')));
  T('캐시 없음: 연결 실패라고 말한다', /연결이 안 돼요/.test(await a.p.innerText('#app')));
  T('캐시 없음: 기록이 남아 있다고 안심시킨다', /기록은 그대로/.test(await a.p.innerText('#app')));
  T('캐시 없음: 다시 시도 버튼', !!(await a.p.$('button:has-text("다시 시도")')));
  await a.ctx.close();
  allowConsole(/^console: Error: Failed to fetch/);
});

// 4) 매주 용돈 — 아주 오래된 시작일이어도 최근 주까지 채운다
await section('매주 용돈', async()=>{
  const {ctx, p}=await localPage(b);
  const lastSat=()=>{const d=new Date(); d.setDate(d.getDate()-((d.getDay()+1)%7));
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  for(const days of [30, 900]){
    await p.evaluate((n)=>{const d=new Date(Date.now()-n*86400000);
      const y=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
      localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K'},children:[
        {id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:0,weekly_on:true,weekly_dow:6,
         weekly_amount:1000,weekly_start:y,created_at:y}],entries:[]}));}, days);
    await p.reload(); await ready(p);                    // 자동 용돈은 부팅의 reload 안에서 저장된 뒤 그려진다
    const r=await p.evaluate(()=>{const a=JSON.parse(localStorage.getItem('yd_local_v1')).entries.map(e=>e.entry_date).sort();
      return {n:a.length, last:a[a.length-1]};});
    T(`매주 용돈: 시작일 ${days}일 전이어도 최근 토요일까지 채운다`, r.last===lastSat() && r.n>0);
    await p.reload(); await ready(p);
    const again=await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).entries.length);
    T(`매주 용돈: 다시 열어도 안 늘어난다 (${days}일)`, again===r.n);
  }
  await ctx.close();
});

await done(b);
})();
