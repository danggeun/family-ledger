// 서버가 안 될 때 / 아주 오래 썼을 때 — 정상 경로 밖의 완전함
const {chromium}=require('playwright');
const path=require('path');
let pass=0,fail=0; const T=(n,ok)=>{ok?pass++:fail++;console.log((ok?'OK   ':'FAIL ')+n);};
const APP='file://'+path.resolve(__dirname,'../index.html');

// 서버를 흉내 낸다. mode: live(정상) / nodata(데이터만 실패) / noinit(처음부터 실패)
const FAKE=(mode)=>{
  window.APP_CONFIG={SUPABASE_URL:'https://x.supabase.co',SUPABASE_ANON_KEY:'k'};
  const dead=()=>Promise.reject(new Error('Failed to fetch'));
  const ok=(data)=>Promise.resolve({data,error:null});
  const live = mode==='live';
  const kids=[{id:'k1',family_id:'f1',name:'서윤',color:'pink',sort:0,opening_balance:10000,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'}];
  const ents=[{id:'e1',family_id:'f1',child_id:'k1',entry_date:'2026-09-14',memo:'젤리',amount:-800,auto_key:null,skipped:false,created_at:'2026-09-14T09:00:00Z'}];
  window.supabase={createClient:()=>({
    auth:{getSession:()=>Promise.resolve({data:{session:{user:{id:'u'}}}}),
          signInAnonymously:()=>Promise.resolve({data:{session:{user:{id:'u'}}},error:null})},
    from:()=>({select:()=>({
      limit:()=> mode==='noinit' ? dead() : ok([{family_id:'f1',families:{code:'K7PM-3QRA'}}]),
      eq:()=>({ order:()=>{ const q={order:()=>q, range:()=> live?ok(ents):dead(),
                            then:(f,r)=>(live?ok(kids):dead()).then(f,r)}; return q; },
                single:()=> live?ok({id:'f1',code:'K7PM-3QRA'}):dead() })})}),
    rpc:()=>ok({is_owner:true,open_until:null}),
    channel:()=>({on(){return this;},subscribe(){}})
  })};
};
const CACHE=()=>localStorage.setItem('yd_cache_v1',JSON.stringify({
  family:{id:'f1',code:'K7PM-3QRA'},
  children:[{id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:10000,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'}],
  entries:[{id:'e1',child_id:'k1',entry_date:'2026-09-14',memo:'젤리',amount:-800,auto_key:null,created_at:'2026-09-14T09:00:00Z'}],at:Date.now()}));

(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
async function open(mode, seedCache){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await ctx.addInitScript(FAKE, mode);
  const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto(APP); if(seedCache) await p.evaluate(CACHE);
  await p.reload(); await p.waitForTimeout(3000);
  return {ctx,p,errs};
}
// 1) 정상이면 배너 없음 + 캐시가 쌓인다
let a=await open('live',false);
T('정상: 배너 없음', !(await a.p.$('.offbar')));
T('정상: 잔액 보임', (await a.p.textContent('.balbtn b'))==='9,200');
T('정상: 다음을 위해 저장해둔다', await a.p.evaluate(()=>!!localStorage.getItem('yd_cache_v1')));
T('정상: 콘솔 에러 없음', a.errs.length===0);
await a.ctx.close();

// 2) 쓰던 기기인데 서버가 안 될 때 → 마지막 화면 + 배너 (시작 화면이 뜨면 안 된다)
a=await open('nodata',true);
T('서버 안 됨: 시작 화면이 뜨지 않는다', !(await a.p.$('button:has-text("새로 시작하기")')));
T('서버 안 됨: 마지막 잔액이 보인다', (await a.p.textContent('.balbtn b'))==='9,200');
T('서버 안 됨: 배너가 화면에 남는다', !!(await a.p.$('.offbar')));
T('서버 안 됨: 배너에 다시 시도', /다시/.test(await a.p.textContent('.offbar')));
await a.p.click('.gear'); await a.p.waitForTimeout(400);
T('서버 안 됨: 설정에도 배너', !!(await a.p.$('.offbar')));
await a.ctx.close();

// 3) 처음 보는 기기 + 서버 안 됨 → 시작 화면이 아니라 연결 실패 화면
a=await open('noinit',false);
T('캐시 없음: 시작 화면이 아니다', !(await a.p.$('button:has-text("새로 시작하기")')));
T('캐시 없음: 연결 실패라고 말한다', /연결이 안 돼요/.test(await a.p.innerText('#app')));
T('캐시 없음: 기록이 남아 있다고 안심시킨다', /기록은 그대로/.test(await a.p.innerText('#app')));
T('캐시 없음: 다시 시도 버튼', !!(await a.p.$('button:has-text("다시 시도")')));
await a.ctx.close();

// 4) 매주 용돈 — 아주 오래된 시작일이어도 최근 주까지 채운다
const ctx=await b.newContext({viewport:{width:390,height:844}});
const p=await ctx.newPage(); await p.goto(APP);
const lastSat=()=>{const d=new Date(); d.setDate(d.getDate()-((d.getDay()+1)%7)); 
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
for(const days of [30, 900]){
  await p.evaluate((n)=>{const d=new Date(Date.now()-n*86400000);
    const y=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K'},children:[
      {id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:0,weekly_on:true,weekly_dow:6,
       weekly_amount:1000,weekly_start:y,created_at:y}],entries:[]}));}, days);
  await p.reload(); await p.waitForTimeout(800);
  const r=await p.evaluate(()=>{const a=JSON.parse(localStorage.getItem('yd_local_v1')).entries.map(e=>e.entry_date).sort();
    return {n:a.length, last:a[a.length-1]};});
  T(`매주 용돈: 시작일 ${days}일 전이어도 최근 토요일까지 채운다`, r.last===lastSat() && r.n>0);
  await p.reload(); await p.waitForTimeout(700);
  const again=await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).entries.length);
  T(`매주 용돈: 다시 열어도 안 늘어난다 (${days}일)`, again===r.n);
}
await ctx.close();
console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exit(fail?1:0);})();
