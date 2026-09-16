// 안드로이드 뒤로 가기 — 화면이 닫히고, 다 닫히면 앱을 벗어난다
const {chromium}=require('playwright');
const path=require('path');
let pass=0,fail=0; const T=(n,ok)=>{ok?pass++:fail++;console.log((ok?'OK   ':'FAIL ')+n);};
const SEED=()=>{localStorage.setItem('yd_local_v1',JSON.stringify({family:{id:'f1',code:'K'},children:[
 {id:'k1',name:'서윤',color:'pink',sort:0,opening_balance:10000,weekly_on:true,weekly_dow:6,weekly_amount:3000,weekly_start:'2026-09-01',created_at:'2026-07-01'},
 {id:'k2',name:'하준',color:'yellow',sort:1,opening_balance:5000,weekly_on:false,weekly_amount:0,created_at:'2026-07-01'}],
 entries:[{id:'e1',child_id:'k1',entry_date:'2026-09-14',memo:'젤리',amount:-800,auto_key:null,created_at:'2026-09-14T09:00:00Z'}]}));};
(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+path.resolve(__dirname,'../index.html')); await p.evaluate(SEED); await p.reload(); await p.waitForTimeout(600);
const on=async s=>!!(await p.$(s));
// 설정 → 뒤로
await p.click('.gear'); await p.waitForTimeout(250);
T('설정 열림', await on('.nav h2'));
await p.goBack(); await p.waitForTimeout(300);
T('뒤로 → 홈', await on('.bal') && !(await on('.nav h2')));
// 설정 → 매주 용돈 시트 → 뒤로 두 번
await p.click('.gear'); await p.waitForTimeout(200); await p.click('.srow.tap >> nth=0'); await p.waitForTimeout(250);
T('시트 열림', await on('.sheet'));
await p.goBack(); await p.waitForTimeout(300);
T('뒤로 → 시트만 닫히고 설정 유지', !(await on('.sheet')) && await on('.nav h2'));
await p.goBack(); await p.waitForTimeout(300);
T('한 번 더 → 홈', await on('.bal'));
// 아이 화면
await p.click('.balbtn'); await p.waitForTimeout(250);
T('아이 화면 열림', await on('.kid'));
await p.goBack(); await p.waitForTimeout(300);
T('뒤로 → 아이 화면 닫힘', !(await on('.kid')) && await on('.bal'));
// 기록 고치기 시트 + 저장 후 기록이 하나 쌓이지 않는지
await p.click('.row >> nth=0'); await p.waitForTimeout(250);
T('고치기 시트', await on('.sheet'));
await p.click('.sheet .btn.pri'); await p.waitForTimeout(350);
T('저장하면 닫힘', !(await on('.sheet')) && await on('.bal'));
T('저장 뒤 쌓인 기록 없음(뒤로 한 번이면 앱 밖)', (await p.evaluate(()=>history.state&&history.state.d||0))===0);
// 취소도 같은지
await p.click('.gear'); await p.waitForTimeout(200); await p.click('.srow.tap >> nth=0'); await p.waitForTimeout(200);
await p.click('.sheet .btn:has-text("취소")'); await p.waitForTimeout(300);
T('취소 → 설정으로', !(await on('.sheet')) && await on('.nav h2'));
T('취소 뒤 남은 깊이 1(설정)', (await p.evaluate(()=>history.state&&history.state.d||0))===1);
await p.goBack(); await p.waitForTimeout(300);
T('뒤로 한 번 → 홈', await on('.bal'));
// 처음 금액
await p.click('.row.open'); await p.waitForTimeout(250);
T('처음 금액 시트', await on('.sheet'));
await p.goBack(); await p.waitForTimeout(300);
T('뒤로 → 닫힘', !(await on('.sheet')));
console.log(`\n${pass} passed, ${fail} failed`); console.log('errors:',errs.join('|')||'none'); await b.close(); process.exit(fail?1:0);})();
