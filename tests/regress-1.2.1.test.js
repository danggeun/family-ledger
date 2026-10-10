// 1.2.1 점검에서 나온 코드 결함 — 화면은 안 바뀌고 안 보이던 구멍만 메운다. 각각 옛 코드에서 실패하던 것
const {T, done, launch, localPage, seed, ready, settle, resume, addDays, today:todayOf, until, idle}=require('./_harness');
const today=todayOf();
const KID=(extra)=>Object.assign({id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:16300,weekly_on:false,weekly_amount:0,created_at:'2026-07-01T09:00:00Z'},extra||{});
// 앱 타이머(0.1~0.5초)·popstate 로 오는 결과를 기다린다. 2초 안에 안 오면 안 온 것 — 던지지 않고 판정은 뒤의 T 가 한다
(async()=>{
const b=await launch();
const {p}=await localPage(b, {context:{acceptDownloads:true}});
const load=(kids,entries)=>seed(p, kids, entries);
const click=async(sel)=>{ await p.click(sel); await idle(p); };
// 앱 복귀 = reload. 로컬 저장소라 금방 끝난다 — 끝날 때까지(적는 중이면 다시 그리기는 미뤄진다)
const visible=async()=>{ await resume(p); await p.waitForFunction(()=>!window.__app.S.ui.loading); await settle(p); };

// ── A1: 자동 줄의 날짜를 앞으로 옮겨도 그 사이 토요일이 빠지지 않는다 ──
// 오늘 기준 지난 토요일 셋: s3 < s2 < s1. s3 의 자동 줄을 s1 뒤로 옮겨 놓고 시작하면, s2·s1 이 생겨야 한다
let d=today, dow=new Date(d+'T12:00:00').getDay(); const s1=addDays(d,-((dow+1)%7)), s2=addDays(s1,-7), s3=addDays(s2,-7);
const moved={id:'a3',child_id:'k1',entry_date:addDays(s1,1),memo:'용돈',amount:3000,auto_key:'w:'+s3,created_by:'me',created_at:s3+'T09:00:00Z'};
await load([KID({weekly_on:true,weekly_dow:6,weekly_amount:3000,weekly_start:s3})],[moved]);
await p.waitForFunction(()=>!window.__app.S.ui.loading);                // 자동 줄 넣기까지 끝난 뒤
let auto=await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).entries.filter(e=>e.auto_key).map(e=>e.auto_key).sort());
T('A1 옮긴 자동 줄 뒤의 토요일들이 생긴다 ('+s2+', '+s1+')', auto.includes('w:'+s2) && auto.includes('w:'+s1) && auto.length===3);

// ── 자동 줄의 고치기 시트엔 날짜 칸이 없다 (일반 줄엔 있다) ──
await load([KID()],[{id:'a1',child_id:'k1',entry_date:today,memo:'용돈',amount:3000,auto_key:'w:'+today,created_by:'me',created_at:today+'T09:00:00Z'},
                    {id:'e1',child_id:'k1',entry_date:today,memo:'젤리',amount:-800,auto_key:null,created_by:'me',created_at:today+'T10:00:00Z'}]);
await click('.row.auto');
T('자동 줄 시트: 날짜 칸 없음, 이번 주 건너뛰기 있음', !!(await p.$('.sheet')) && !(await p.$('.sheet label:has-text("날짜")')) && !!(await p.$('.sheet button:has-text("이번 주 건너뛰기")')));
await click('.sheet button:has-text("취소")');
await click('.row:has-text("젤리")');
T('일반 줄 시트: 날짜 칸 있음', !!(await p.$('.sheet label:has-text("날짜")')));
await click('.sheet button:has-text("취소")');

// ── A2: 시트에서 적는 중에 다시 그리기가 와도 치던 게 남는다 ──
await load([KID()],[{id:'e1',child_id:'k1',entry_date:today,memo:'젤리',amount:-800,auto_key:null,created_by:'me',created_at:today+'T09:00:00Z'}]);
await click('.row >> nth=0');
await p.click('.sheet input.r'); await p.keyboard.press('End'); await p.keyboard.type('5'); await settle(p);
await visible();                                                   // 앱 복귀 = reload → render 가 오려 한다
T('A2 시트 금액칸에 치던 값이 남고 키보드(포커스)도 그대로', !!(await p.$('.sheet')) && (await p.$eval('.sheet input.r',e=>e.value))==='8,005' && await p.evaluate(()=>document.activeElement===document.querySelector('.sheet input.r')));
// 손가락 탭으로 — 마우스 click 은 누름과 뗌이 따로 와서, 그 사이 칸을 떠나며 미뤄둔 다시 그리기가 끼면 버튼이 바뀌어 click 이 사라진다(부하 때).
// 폰의 탭은 mousedown·mouseup·click 이 한 번에 온다
await p.tap('.sheet button:has-text("취소")'); await idle(p);
await click('.gear');
await p.click('.card.color input.nm'); await p.keyboard.press('End'); await p.keyboard.type('이'); await settle(p);
await visible();
T('A2 설정 이름칸도 그대로 (포커스 포함)', (await p.$eval('.card.color input.nm',e=>e.value))==='서윤이' && await p.evaluate(()=>document.activeElement===document.querySelector('.card.color input.nm')));
await click('.nav h2');           // 칸을 떠나면(onchange) 저장되고, 미뤄둔 다시 그리기도 온다
await until(p, ()=>JSON.parse(localStorage.getItem('yd_local_v1')).children[0].name==='서윤이');
T('A2 칸을 떠나면 저장된다', await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).children[0].name==='서윤이'));
await p.goBack(); await idle(p);

// ── A3: 안내의 고치기 단계에서 × 로 그만두면 예시 시트도 닫힌다 (안내가 켜진 별도 환경) ──
{
  const {ctx:ctx2, p:q}=await localPage(b, {tour:true, context:{deviceScaleFactor:1}});
  await seed(q, [KID()], [], 'k1', true);
  for(let i=0;i<3;i++){ await q.click('.tour-card .ok'); await idle(q); }   // sign→bal→press→edit (아이 하나라 밀기 단계 없음)
  await q.click('.row.sample'); await idle(q);
  T('A3 (준비) 예시 시트가 떴다', !!(await q.$('.sheet')) && !!(await q.$('.tour-card.up')));
  await q.click('.tour-card .skip'); await idle(q);
  await until(q, ()=>!document.querySelector('.tour'));                      // 안내 레이어는 흐려진 뒤(0.26초) 치워진다
  T('A3 × 로 그만두면 예시 시트도 사라진다', !(await q.$('.sheet')) && !(await q.$('.tour')));
  await ctx2.close();
}

// ── A5: CSV — 이름에 쉼표가 있어도 열이 안 밀리고, 처음 금액 줄이 있다 ──
await load([KID({name:'서윤, 둘째'})],[{id:'e1',child_id:'k1',entry_date:today,memo:'젤리 "큰거"',amount:-800,auto_key:null,created_by:'me',created_at:today+'T09:00:00Z'}]);
await click('.gear');
const [dl]=await Promise.all([p.waitForEvent('download'), p.click('.card.export .srow.tap')]);
const csv=require('fs').readFileSync(await dl.path(),'utf8').replace(/^﻿/,'').split('\n');
T('A5 머리줄 + 처음 금액 줄 + 기록 줄', csv.length===3 && /^"서윤, 둘째",2026-07-01,"처음 금액",,16300$/.test(csv[1]) && csv[2]==='"서윤, 둘째",'+today+',"젤리 ""큰거""",-800,15500');
await p.goBack(); await idle(p);

// ── A8: 로컬 저장이 깨져 있어도 시작 화면이 뜬다 ──
await p.evaluate(()=>{ localStorage.clear(); localStorage.setItem('yd_tour','done'); localStorage.setItem('yd_local_v1','{broken'); });
await p.reload(); await ready(p);
T('A8 깨진 저장 → 시작 화면 (멈추지 않는다)', !!(await p.$('button:has-text("새로 시작하기")')));

await done(b);
})();
