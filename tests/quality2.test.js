// 1.2.3 — 1.2.2 점검에서 남은 것. 쓰는 중 세션이 날아갔을 때, CDN 없이 캐시만 뜬 화면, 이름 고치기 중 다시 그리기,
// 자정 넘김, 금액 자릿수, 톱니 그림, 인앱 브라우저 경고, 글자 크기를 키운 폰의 표, 기종별 실행 화면. 각각 옛 코드에서 실패하던 것.
const {chromium}=require('playwright');
const path=require('path');
const {FAKE,CACHE}=require('./_fake');
let pass=0,fail=0; const T=(n,ok)=>{ok?pass++:fail++;console.log((ok?'OK   ':'FAIL ')+n);};
const APP='file://'+path.resolve(__dirname,'../index.html');
const CDN='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
const ymd=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const today=ymd(new Date());
const KID=(extra)=>Object.assign({id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:16300,weekly_on:false,weekly_amount:0,created_at:'2026-07-01T09:00:00Z'},extra||{});

(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const errs=[];
const VP={viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true};
async function open(opt, seedCache, blockCdn){
  const ctx=await b.newContext(VP);
  if(blockCdn){ await ctx.route(CDN, r=>r.abort());
    await ctx.addInitScript(()=>{ Object.defineProperty(window,'APP_CONFIG',{value:{SUPABASE_URL:'https://x.supabase.co',SUPABASE_ANON_KEY:'k'},writable:false,configurable:false}); try{ localStorage.setItem('yd_tour','done'); }catch(e){} }); }
  else await ctx.addInitScript(FAKE, opt||{});
  const p=await ctx.newPage(); require('./_env').guard(p); p.on('pageerror',e=>errs.push(e.message));
  await p.goto(APP); if(seedCache) await p.evaluate(CACHE);
  await p.waitForTimeout(150); await p.reload(); await p.waitForTimeout(blockCdn?1500:2500);
  return {ctx,p};
}
const bal=(p)=>p.textContent('.balbtn b');
const calls=(p)=>p.evaluate(()=>window.__fake.calls);
const visible=async(p)=>{ await p.evaluate(()=>{ Object.defineProperty(document,'visibilityState',{value:'visible',configurable:true}); document.dispatchEvent(new Event('visibilitychange')); }); await p.waitForTimeout(1500); };
const toastText=(p)=>p.textContent('#toast');

// ── 1. 쓰는 중에 세션이 날아가면(SIGNED_OUT) 다음 reload 가 init 부터 — 캐시의 코드로 다시 참여해 복구 ──
let a=await open({}, true);
T('정상 시작: 배너 없음, 12,200', !(await a.p.$('.offbar')) && (await bal(a.p))==='12,200');
const c0=await calls(a.p);
await a.p.evaluate(()=>{ const F=window.__fake; F.session=null; F.signedOut=true; F.members=[]; F.authCb && F.authCb('SIGNED_OUT', null); });   // supabase-js 가 세션을 지웠다 — 새 익명 유저는 어느 가족에도 없다
await visible(a.p);
const c1=await calls(a.p);
T('SIGNED_OUT 뒤 복귀: 배너 없이 복구(익명 로그인 1회 · 캐시 코드로 join 1회)', !(await a.p.$('.offbar')) && (await bal(a.p))==='12,200' && c1.anon===c0.anon+1 && c1.join===c0.join+1);
T('SIGNED_OUT: 옛 구독을 내리고(removeChannel) 새 세션으로 다시 건다', (c1.removeChannel||0)===1 && c1.subscribe===c0.subscribe+1);
await a.ctx.close();

// ── 2. CDN 못 받음 + 캐시 → store 없는 홈. 전엔 ⚙ 가 흰 화면, ✓ 는 줄만 남고 유실 ──
a=await open(null, true, true);
T('캐시 화면+배너', !!(await a.p.$('.offbar')) && (await bal(a.p))==='9,200');
await a.p.click('.gear'); await a.p.waitForTimeout(300);
T('⚙: 설정이 안 열리고 토스트 "연결이 안 돼요" (흰 화면 아님)', !(await a.p.$('.nav h2')) && (await bal(a.p))==='9,200' && /연결이 안 돼요/.test(await toastText(a.p)));
await a.p.click('.amt'); await a.p.keyboard.type('500'); await a.p.waitForTimeout(100);
await a.p.click('.entry .ok'); await a.p.waitForTimeout(300);
const rows=await a.p.$$eval('.row:not(.open)',es=>es.length);
T('✓: 토스트, 줄이 안 생기고 치던 금액은 남는다', rows===1 && (await a.p.$eval('.amt',e=>e.value))==='500' && (await bal(a.p))==='9,200');
await a.p.click('.amt'); await a.p.keyboard.press('Control+A'); await a.p.keyboard.press('Backspace'); await a.p.click('.row:not(.open) >> nth=0'); await a.p.waitForTimeout(300);   // 적는 중이면 목록 탭은 나가기만 — 금액을 비우고
await a.p.click('.row:not(.open) >> nth=0'); await a.p.waitForTimeout(300);
T('기록 줄을 눌러도 시트가 열린다 (store.userId 가드)', !!(await a.p.$('.sheet')));
await a.p.click('.sheet button:has-text("삭제")'); await a.p.waitForTimeout(150);
await a.p.click('.sheet button:has-text("정말 삭제")'); await a.p.waitForTimeout(400);
T('삭제: tryStore 가 동기 throw 도 받아 되돌린다 — 줄 그대로, 잔액 그대로', (await a.p.$$eval('.row:not(.open)',es=>es.length))===1 && (await bal(a.p))==='9,200');
await a.ctx.close();

// ── 3. 이름 고치기 성공 뒤에도 다른 칸을 치는 중이면 다시 그리지 않는다 (서버 응답이 치는 도중에 온다) ──
a=await open({}, false);
await a.p.evaluate(()=>{ window.__fake.childDelay=400; });
await a.p.click('.gear'); await a.p.waitForTimeout(300);
await a.p.click('.card.color input.nm >> nth=0'); await a.p.keyboard.press('End'); await a.p.keyboard.type('이');
await a.p.click('.card.color input.nm >> nth=1'); await a.p.keyboard.press('End'); await a.p.keyboard.type('아'); await a.p.waitForTimeout(700);   // 첫 칸 onchange → 저장 → 0.4초 뒤 응답 → (전엔) render
T('첫째 이름 저장됨', await a.p.evaluate(()=>window.__fake.kids[0].name==='서윤이'));
T('둘째 칸에 치던 글과 포커스가 그대로', (await a.p.$eval('.card.color input.nm >> nth=1',e=>e.value))==='하준아' && await a.p.evaluate(()=>document.activeElement===document.querySelectorAll('.card.color input.nm')[1]));
await a.p.click('.nav h2'); await a.p.waitForTimeout(700);
T('둘째도 칸을 떠나면 저장', await a.p.evaluate(()=>window.__fake.kids[1].name==='하준아'));
await a.ctx.close();

// ── 로컬 모드 (나머지) ──
const ctx=await b.newContext(VP); await ctx.addInitScript(require('./_env').LOCAL);
const p=await ctx.newPage(); require('./_env').guard(p); p.on('pageerror',e=>errs.push(e.message));
await p.goto(APP);
const load=async(kids,entries)=>{ await p.evaluate(({kids,entries})=>{ localStorage.clear(); localStorage.setItem('yd_tour','done');
    localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K7PM'},children:kids,entries})); localStorage.setItem('yd_sel','k1'); },{kids,entries});
  await p.waitForTimeout(150); await p.reload(); await p.waitForTimeout(600); };


// ── 4. 화면을 켠 채 자정을 넘기고 적으면 그 순간의 오늘로 — 날짜를 손으로 골랐으면 그대로 ──
await load([KID()],[]);
await p.evaluate(()=>{ const R=Date; const D=86400000;   // 페이지의 시계를 하루 앞으로 — draft.date 는 이미 "어제"로 잡혀 있다
  window.Date=class extends R{ constructor(...a){ if(a.length) super(...a); else super(R.now()+D); } static now(){ return R.now()+D; } }; });
const tomorrow=await p.evaluate(()=>{ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); });
await p.click('.amt'); await p.keyboard.type('700'); await p.click('.entry .ok'); await p.waitForTimeout(350);
let saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).entries.map(e=>e.entry_date));
T('자정 넘김: 적는 순간의 오늘('+tomorrow+')로 저장', saved.length===1 && saved[0]===tomorrow && tomorrow!==today);
await p.click('.entry .dbtn'); await p.waitForTimeout(250);
await p.click('.chips.dates button:text-is("어제")'); await p.waitForTimeout(250);          // 손으로 "어제"(= 진짜 오늘)를 고른다
await p.click('.amt'); await p.keyboard.type('800'); await p.click('.entry .ok'); await p.waitForTimeout(350);
saved=await p.evaluate(()=>JSON.parse(localStorage.getItem('yd_local_v1')).entries.map(e=>e.entry_date));
T('손으로 고른 날짜는 그대로('+today+')', saved.length===2 && saved.includes(today));

// ── 5. 금액은 9자리까지 ──
await load([KID()],[]);
await p.click('.amt'); await p.keyboard.type('123456789012'); await p.waitForTimeout(100);
T('금액 12자리를 쳐도 9자리(123,456,789)', (await p.$eval('.amt',e=>e.value))==='123,456,789');

// ── 6. 톱니는 글자가 아니라 선 그림 · theme-color 는 종이색 ──
T('⚙ 버튼 안에 svg, 글자 없음', !!(await p.$('.gear svg')) && (await p.$eval('.gear',e=>e.textContent.trim()))==='');
T('theme-color = --paper (#FDFCFA)', (await p.$eval('meta[name=theme-color]',e=>e.content)).toUpperCase()==='#FDFCFA');

// ── 7. 표 칸은 em — 기본 글자에선 44·86·78px 그대로, 글자를 키우면 같이 늘어난다 ──
await load([KID()],[{id:'e1',child_id:'k1',entry_date:today,memo:'젤리',amount:-800,auto_key:null,created_by:'me',created_at:today+'T09:00:00Z'}]);
const cols=async()=>p.$eval('.row:not(.open)',e=>getComputedStyle(e).gridTemplateColumns.split(' ').map(parseFloat));
let c=await cols();
T('기본 글자: 44 · 86 · 78', Math.abs(c[0]-44)<.1 && Math.abs(c[2]-86)<.1 && Math.abs(c[3]-78)<.1);
c=await p.evaluate(()=>{ document.body.style.fontSize='19.5px'; return getComputedStyle(document.querySelector('.row:not(.open)')).gridTemplateColumns.split(' ').map(parseFloat); });   // 130%
T('글자 130%: 칸도 130% (57 · 112 · 101)', Math.abs(c[0]-57.2)<.2 && Math.abs(c[2]-111.8)<.2 && Math.abs(c[3]-101.4)<.2);
await p.evaluate(()=>{ document.body.style.fontSize=''; });
const ec=await p.$eval('.entry',e=>getComputedStyle(e).gridTemplateColumns.split(' ').map(parseFloat));
T('입력줄 칸: 44 · 103 · 36 (1.2.6 부호 30px 만큼)', Math.abs(ec[0]-44)<.1 && Math.abs(ec[2]-103)<.1 && Math.abs(ec[3]-36)<.1);

// ── 8. iOS 실행 화면은 기종별 — media 가 붙은 link 열두 줄, 파일 실재 ──
const links=await p.$$eval('link[rel="apple-touch-startup-image"]',ls=>ls.map(l=>({m:l.media,h:l.getAttribute('href')})));
const fs=require('fs');
T('실행 화면 link 12개, 전부 device-width/height/pixel-ratio 조건', links.length===12 && links.every(l=>/device-width.*device-height.*pixel-ratio/.test(l.m)));
T('실행 화면 파일이 전부 있다', links.every(l=>fs.existsSync(path.resolve(__dirname,'..',l.h))) && !fs.existsSync(path.resolve(__dirname,'../splash.png')));
await ctx.close();

// ── 9. 다른 앱 안의 브라우저(카톡 등)에서 열면 시작 화면에 경고 — 크롬·사파리는 전처럼 ──
async function onboardWarn(ua){
  const cx=await b.newContext(Object.assign({userAgent:ua},VP)); await cx.addInitScript(require('./_env').LOCAL);
  const q=await cx.newPage(); q.on('pageerror',e=>errs.push(e.message)); await q.goto(APP); await q.waitForTimeout(600);
  const w=await q.$('.warn b'); const t=w?await w.textContent():null; await cx.close(); return t;
}
const IOS='Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const AND='Mozilla/5.0 (Linux; Android 14; SM-S918N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36';
T('카톡(안드로이드): "다른 앱 안에서 열렸어요."', (await onboardWarn(AND+' KAKAOTALK/10.8.0'))==='다른 앱 안에서 열렸어요.');
T('카톡(아이폰): 같은 경고 (공유 버튼 안내가 아니다)', (await onboardWarn(IOS+' KAKAOTALK 10.8.0'))==='다른 앱 안에서 열렸어요.');
T('사파리(아이폰): 전처럼 "먼저 홈 화면에 추가해 주세요."', (await onboardWarn(IOS))==='먼저 홈 화면에 추가해 주세요.');
T('크롬(안드로이드): 경고 없음', (await onboardWarn(AND))===null);

T('콘솔 에러 없음', errs.length===0); if(errs.length) console.log(errs);
await b.close();
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})();
