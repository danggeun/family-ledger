// 1.2.1 점검에서 나온 코드 결함 — 화면은 안 바뀌고 안 보이던 구멍만 메운다. 각각 옛 코드에서 실패하던 것
const {chromium}=require('playwright');
const path=require('path');
let pass=0,fail=0; const T=(n,ok)=>{ ok?pass++:fail++; console.log((ok?'OK   ':'FAIL ')+n); };
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const addDays=(s,n)=>{ const d=new Date(s+'T12:00:00'); d.setDate(d.getDate()+n); return ymd(d); };
const today=ymd(new Date());
const KID=(extra)=>Object.assign({id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:16300,weekly_on:false,weekly_amount:0,created_at:'2026-07-01T09:00:00Z'},extra||{});
(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,acceptDownloads:true});
await ctx.addInitScript(require('./_env').LOCAL);
const p=await ctx.newPage(); require('./_env').guard(p); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(__dirname,'../index.html'));
const load=async(kids,entries)=>{ await p.evaluate(({kids,entries})=>{ localStorage.clear(); localStorage.setItem('yd_tour','done');
    localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K7PM'},children:kids,entries})); localStorage.setItem('yd_sel','k1'); },{kids,entries});
  await p.waitForTimeout(150); await p.reload(); await p.waitForTimeout(600); };
const visible=async()=>{ await p.evaluate(()=>{ Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true}); document.dispatchEvent(new Event('visibilitychange')); }); await p.waitForTimeout(500); };

// ── A1: 자동 줄의 날짜를 앞으로 옮겨도 그 사이 토요일이 빠지지 않는다 ──
// 오늘 기준 지난 토요일 셋: s3 < s2 < s1. s3 의 자동 줄을 s1 뒤로 옮겨 놓고 시작하면, s2·s1 이 생겨야 한다
let d=today, dow=new Date(d+'T12:00:00').getDay(); const s1=addDays(d,-((dow+1)%7)), s2=addDays(s1,-7), s3=addDays(s2,-7);
const moved={id:'a3',child_id:'k1',entry_date:addDays(s1,1),memo:'용돈',amount:3000,auto_key:'w:'+s3,created_by:'me',created_at:s3+'T09:00:00Z'};
await load([KID({weekly_on:true,weekly_dow:6,weekly_amount:3000,weekly_start:s3})],[moved]);
let auto=await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).entries.filter(e=>e.auto_key).map(e=>e.auto_key).sort());
T('A1 옮긴 자동 줄 뒤의 토요일들이 생긴다 ('+s2+', '+s1+')', auto.includes('w:'+s2) && auto.includes('w:'+s1) && auto.length===3);

// ── 자동 줄의 고치기 시트엔 날짜 칸이 없다 (일반 줄엔 있다) ──
await load([KID()],[{id:'a1',child_id:'k1',entry_date:today,memo:'용돈',amount:3000,auto_key:'w:'+today,created_by:'me',created_at:today+'T09:00:00Z'},
                    {id:'e1',child_id:'k1',entry_date:today,memo:'젤리',amount:-800,auto_key:null,created_by:'me',created_at:today+'T10:00:00Z'}]);
await p.click('.row.auto'); await p.waitForTimeout(300);
T('자동 줄 시트: 날짜 칸 없음, 이번 주 건너뛰기 있음', !!(await p.$('.sheet')) && !(await p.$('.sheet label:has-text("날짜")')) && !!(await p.$('.sheet button:has-text("이번 주 건너뛰기")')));
await p.click('.sheet button:has-text("취소")'); await p.waitForTimeout(300);
await p.click('.row:has-text("젤리")'); await p.waitForTimeout(300);
T('일반 줄 시트: 날짜 칸 있음', !!(await p.$('.sheet label:has-text("날짜")')));
await p.click('.sheet button:has-text("취소")'); await p.waitForTimeout(300);

// ── A2: 시트에서 적는 중에 다시 그리기가 와도 치던 게 남는다 ──
await load([KID()],[{id:'e1',child_id:'k1',entry_date:today,memo:'젤리',amount:-800,auto_key:null,created_by:'me',created_at:today+'T09:00:00Z'}]);
await p.click('.row >> nth=0'); await p.waitForTimeout(300);
await p.click('.sheet input.r'); await p.keyboard.press('End'); await p.keyboard.type('5'); await p.waitForTimeout(100);
await visible();                                                   // 앱 복귀 = reload → render 가 오려 한다
T('A2 시트 금액칸에 치던 값이 남고 키보드(포커스)도 그대로', !!(await p.$('.sheet')) && (await p.$eval('.sheet input.r',e=>e.value))==='8,005' && await p.evaluate(()=>document.activeElement===document.querySelector('.sheet input.r')));
await p.click('.sheet button:has-text("취소")'); await p.waitForTimeout(300);
await p.click('.gear'); await p.waitForTimeout(300);
await p.click('.card.color input.nm'); await p.keyboard.press('End'); await p.keyboard.type('이'); await p.waitForTimeout(100);
await visible();
T('A2 설정 이름칸도 그대로 (포커스 포함)', (await p.$eval('.card.color input.nm',e=>e.value))==='서윤이' && await p.evaluate(()=>document.activeElement===document.querySelector('.card.color input.nm')));
await p.click('.nav h2'); await p.waitForTimeout(300);           // 칸을 떠나면(onchange) 저장되고, 미뤄둔 다시 그리기도 온다
T('A2 칸을 떠나면 저장된다', await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).children[0].name==='서윤이'));
await p.goBack(); await p.waitForTimeout(400);

// ── A3: 안내의 고치기 단계에서 × 로 그만두면 예시 시트도 닫힌다 (안내가 켜진 별도 환경) ──
{
  const ctx2=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}); await ctx2.addInitScript(require('./_env').LOCAL_RAW);
  const q=await ctx2.newPage(); require('./_env').guard(q); q.on('pageerror',e=>errs.push(e.message));
  await q.goto('file://'+path.resolve(__dirname,'../index.html'));
  await q.evaluate(k=>{ localStorage.clear(); localStorage.setItem('yd_tour','new'); localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K7PM'},children:[k],entries:[]})); },KID());
  await q.waitForTimeout(150); await q.reload(); await q.waitForTimeout(600);
  for(let i=0;i<3;i++){ await q.click('.tour-card .ok'); await q.waitForTimeout(250); }   // sign→bal→press→edit (아이 하나라 밀기 단계 없음)
  await q.click('.row.sample'); await q.waitForTimeout(400);
  T('A3 (준비) 예시 시트가 떴다', !!(await q.$('.sheet')) && !!(await q.$('.tour-card.up')));
  await q.click('.tour-card .skip'); await q.waitForTimeout(500);
  T('A3 × 로 그만두면 예시 시트도 사라진다', !(await q.$('.sheet')) && !(await q.$('.tour')));
  await ctx2.close();
}

// ── A5: CSV — 이름에 쉼표가 있어도 열이 안 밀리고, 처음 금액 줄이 있다 ──
await load([KID({name:'서윤, 둘째'})],[{id:'e1',child_id:'k1',entry_date:today,memo:'젤리 "큰거"',amount:-800,auto_key:null,created_by:'me',created_at:today+'T09:00:00Z'}]);
await p.click('.gear'); await p.waitForTimeout(300);
const [dl]=await Promise.all([p.waitForEvent('download'), p.click('.card.export .srow.tap')]);
const csv=require('fs').readFileSync(await dl.path(),'utf8').replace(/^﻿/,'').split('\n');
T('A5 머리줄 + 처음 금액 줄 + 기록 줄', csv.length===3 && /^"서윤, 둘째",2026-07-01,"처음 금액",,16300$/.test(csv[1]) && csv[2]==='"서윤, 둘째",'+today+',"젤리 ""큰거""",-800,15500');
await p.goBack(); await p.waitForTimeout(300);

// ── A8: 로컬 저장이 깨져 있어도 시작 화면이 뜬다 ──
await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('yd_tour','done'); localStorage.setItem('yd_local_v1','{broken'); });
await p.waitForTimeout(150); await p.reload(); await p.waitForTimeout(700);
T('A8 깨진 저장 → 시작 화면 (멈추지 않는다)', !!(await p.$('button:has-text("새로 시작하기")')));

console.log(`\n${pass} passed, ${fail} failed`); console.log('errors:',errs.join('|')||'none'); await b.close(); process.exit(fail||errs.length?1:0);})();
