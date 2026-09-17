// 날짜 고르기 — 기기 기본 달력 대신 앱 안에서
const {chromium}=require('playwright');
const path=require('path');
let pass=0,fail=0; const T=(n,ok)=>{ok?pass++:fail++;console.log((ok?'OK   ':'FAIL ')+n);};
const SEED=()=>localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K'},children:[
 {id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:10000,weekly_on:false,weekly_amount:0,created_at:'2026-01-01'}],
 entries:[{id:'e1',child_id:'k1',entry_date:new Date().toISOString().slice(0,10),memo:'젤리',amount:-800,auto_key:null,created_at:'2026-01-02T09:00:00Z'}]}));
const pad=n=>String(n).padStart(2,'0');
(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(__dirname,'../index.html'));
await p.evaluate(SEED); await p.reload(); await p.waitForTimeout(600);
const now=new Date(), Y=now.getFullYear(), M=now.getMonth()+1, D=now.getDate();

T('기기 기본 달력을 쓰지 않는다', (await p.$$('input[type=date]')).length===0);
await p.click('.dbtn'); await p.waitForTimeout(300);
T('날짜 칩에 달력 버튼', !!(await p.$('.chips button.cal')));
await p.click('.chips button.cal'); await p.waitForTimeout(350);
T('달력 시트가 열린다', !!(await p.$('.calg')));
T('이번 달을 연다', (await p.textContent('.calh .t'))===`${Y}년 ${M}월`);
T('오늘이 선택돼 있다', (await p.textContent('.calg button.on'))===String(D));
T('다음 달 버튼은 막혀 있다', await p.$eval('.calh .navb >> nth=1', e=>e.disabled));
const future=await p.$$eval('.calg button', es=>es.filter(e=>e.disabled).map(e=>+e.textContent));
T('아직 안 온 날은 못 고른다', future.every(n=>n>D) && (D===new Date(Y,M,0).getDate() ? true : future.length>0));

// 지난달로 가서 5일 고르기
await p.click('.calh .navb >> nth=0'); await p.waitForTimeout(250);
const pm = M===1 ? {y:Y-1,m:12} : {y:Y,m:M-1};
T('이전 달로 간다', (await p.textContent('.calh .t'))===`${pm.y}년 ${pm.m}월`);
await p.click(`.calg button:text-is("5")`); await p.waitForTimeout(250);
T('고르면 그 날이 표시된다 (안 닫힌다)', !!(await p.$('.calg')) && (await p.textContent('.calg button.on'))==='5');
await p.click('.sheet .btn.pri'); await p.waitForTimeout(350);
T('확인을 눌러야 닫힌다', !(await p.$('.calg')));
T('고른 날짜가 입력줄에 붙는다', (await p.textContent('.dbtn')).includes(`${pm.m}.05`));
await p.click('.dbtn'); await p.waitForTimeout(250);
T('먼 날짜면 달력 칩이 그 날짜를 보여준다', (await p.textContent('.chips button.cal')).includes(`${pm.m}.05`));
await p.click('.dbtn'); await p.waitForTimeout(200);

// 고치기 시트에서도
await p.click('.row >> nth=0'); await p.waitForTimeout(300);
T('고치기 시트의 날짜가 눌리는 칸', !!(await p.$('.sheet .box.tapbox')));
await p.click('.sheet .box.tapbox'); await p.waitForTimeout(350);
T('시트 위에 달력이 열린다', !!(await p.$('.calg')));
await p.goBack(); await p.waitForTimeout(350);
T('뒤로 가면 달력만 닫히고 고치기 시트는 남는다', !(await p.$('.calg')) && !!(await p.$('.sheet')));
await p.click('.sheet .box.tapbox'); await p.waitForTimeout(300);
await p.click(`.calg button:text-is("3")`); await p.waitForTimeout(200);
await p.click('.sheet .btn.pri >> nth=-1'); await p.waitForTimeout(300);
T('고친 날짜가 시트에 반영된다', (await p.textContent('.sheet .box.tapbox')).includes(`${M}.03`));
await p.click('.sheet .btn.pri'); await p.waitForTimeout(400);
T('저장하면 기록의 날짜가 바뀐다',
  await p.evaluate((d)=>JSON.parse(localStorage.getItem('yd_local_v1')).entries[0].entry_date===d,
    `${Y}-${pad(M)}-03`));

console.log(`\n${pass} passed, ${fail} failed`); console.log('errors:',errs.join('|')||'none');
await b.close(); process.exit(fail?1:0);})();
