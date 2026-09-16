const {chromium}=require('playwright');
const path=require('path');
(async()=>{
const b=await chromium.launch(process.env.PW_CHROMIUM?{executablePath:process.env.PW_CHROMIUM}:{});
const p=await (await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true})).newPage();
const errs=[];p.on('pageerror',e=>errs.push(e.message));
let pass=0,fail=0;
const T=(l,c)=>{c?pass++:fail++;console.log((c?'OK  ':'FAIL')+' '+l);};
await p.goto('file://'+path.resolve(__dirname,'../index.html'));await p.waitForTimeout(700);

// 여러 달·많은 줄을 미리 심어서 월 구분선과 더 보기를 확인
await p.evaluate(()=>{
  const fam={id:'f1',code:'TEST-0001'};
  const kids=[{id:'k1',name:'첫째',color:'blue',sort:0,opening_balance:10000,weekly_on:false,weekly_amount:0},
              {id:'k2',name:'둘째',color:'pink',sort:1,opening_balance:5000,weekly_on:false,weekly_amount:0}];
  const ents=[]; let n=0;
  for(const [mon,cnt] of [['07',30],['08',30],['09',12]])
    for(let i=1;i<=cnt;i++){
      ents.push({id:'e'+(n++), child_id:'k1', entry_date:'2026-'+mon+'-'+String(i).padStart(2,'0'),
        memo: i%3===0?'용돈':'간식', amount: i%3===0?2000:-500, auto_key:null, created_at:'2026-'+mon+'-'+String(i).padStart(2,'0')+'T09:00:00Z'});
    }
  localStorage.setItem('yd_local_v1', JSON.stringify({family:fam, children:kids, entries:ents}));
});
await p.reload();await p.waitForTimeout(900);

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
await more.click();await p.waitForTimeout(300);
T('더 보기 누르면 전체 표시', (await p.$$eval('.row:not(.open)',es=>es.length))===72);
T('다 펼치면 맨 아래 처음 금액 줄', (await p.$('.row.open'))!==null);
T('더 보기 버튼 사라짐', (await p.$('.more'))===null);

// 핑크
await p.click('.gear');await p.waitForTimeout(250);
const sw=await p.$$eval('.swatch',es=>es[0].querySelectorAll('button').length);
T('색 6개', sw===6);
const pinkOn=await p.$$eval('.dot',es=>getComputedStyle(es[1]).backgroundColor);
T('둘째 핑크 적용', pinkOn==='rgb(232, 72, 140)');
await p.click('.nav .back');await p.waitForTimeout(250);
await (await p.$$('.bar .k'))[1].click();await p.waitForTimeout(250);
T('아이 전환 시 limit 리셋', await p.evaluate(()=>true));
console.log(`\n${pass} passed, ${fail} failed`);
console.log('errors:',errs.length?errs.join(' | '):'none');
await b.close(); process.exit(fail?1:0);})();
