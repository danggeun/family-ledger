// 아이에게 보여주기 — 잔액을 누르면 돼지저금통과 지폐·동전 그림
const {T, done, launch, localPage, seed, settle, touch, KID, idle}=require('./_harness');
(async()=>{
const b=await launch();
const {p}=await localPage(b);
// 두 아이(서윤 a원 · 하준 b원), 기록 없음, 서윤을 고른 채로
const load=(a,c)=>seed(p, [KID('k1','서윤','pink',0,a,{created_at:'2026-07-01'}), KID('k2','하준','yellow',1,c,{created_at:'2026-07-01'})], []);
// 닫기는 history.back() → popstate 라 한 박자 늦고, 옆 아이로 밀면 옛 화면 복사본(.ghost)이 타이머로 빠진다 — 둘 다 끝날 때까지
const calm=()=>idle(p);
const click=async(sel)=>{ await p.click(sel); await calm(); };
await load(16300,0);
const rows=()=>p.$$eval('.kid .money .row',es=>es.map(e=>({n:e.querySelectorAll('svg').length, t:e.querySelector('svg text')?.textContent, x:e.querySelector('.xn')?.textContent||''})));

T('잔액이 버튼', !!(await p.$('button.balbtn')));
T('잔액 옆 작은 돼지', await p.$eval('.balbtn img.pig',e=>/logo-pig-sm\.png$/.test(e.src)));
await click('.balbtn');
T('아이 화면 열림', !!(await p.$('.kid')));
T('배경 크림(로고 타일 색)', await p.$eval('.kid',e=>getComputedStyle(e).backgroundColor==='rgb(253, 246, 231)'));
T('큰 돼지', await p.$eval('.kid img.pig',e=>/logo-pig\.png$/.test(e.src) && e.getBoundingClientRect().width===222));
T('이름·금액', (await p.textContent('.kid .kn'))==='서윤' && (await p.textContent('.kid .ka b'))==='16,300');
T('이름은 아이 색 (핑크 원색)', await p.$eval('.kid .kn',e=>getComputedStyle(e).color==='rgb(255, 61, 143)'));
T('이름 22px', await p.$eval('.kid .kn',e=>getComputedStyle(e).fontSize==='22px'));
let r=await rows();
T('16,300 = 10000·5000·1000·100×3', r.length===4 && r[0].t==='10000'&&r[0].n===1 && r[1].t==='5000' && r[2].t==='1000' && r[3].t==='100'&&r[3].n===3);
T('×n 없음', r.every(x=>x.x===''));
// 숫자의 세로 위치는 글꼴에 맡기지 않는다 — dominant-baseline 은 기기 글꼴마다 위아래로 밀린다
T('숫자는 밑줄을 직접 놓는다', await p.$$eval('.kid .money svg text',es=>
  es.length>0 && es.every(e=>e.getAttribute('dy')==='.35em' && !e.getAttribute('dominant-baseline'))));
T('문구·버튼 없음(닫기만)', (await p.$$('.kid button')).length===1);
await click('.kid .ka');
T('아무 데나 누르면 닫힘', !(await p.$('.kid')));
await click('.balbtn'); await click('.kid .x');
T('✕로도 닫힘', !(await p.$('.kid')));

await load(84950,0);
await click('.balbtn'); r=await rows();
T('84,950 = 6줄', r.length===6 && r.map(x=>x.t).join()==='50000,10000,1000,500,100,50');
T('1만 3장·1천 4장 부채꼴', r[1].n===3 && r[2].n===4);
T('한 화면에 들어감', await p.$eval('.kid',e=>e.scrollHeight<=e.clientHeight+1));
await click('.kid');

await load(300000,0);
await click('.balbtn'); r=await rows();
T('30만 = 50000 한 장 + ×6 (다섯 장 넘으면 세지 않는다)', r.length===1 && r[0].n===1 && r[0].x==='×6');
await click('.kid');

// 줄이 많으면 돼지를 줄여서라도 한 화면에
await load(99990,0);
await click('.balbtn');
T('99,990 = 8줄, 돼지를 줄여 한 화면에', (await rows()).length===8
  && await p.$eval('.kid',e=>e.classList.contains('tight') && e.scrollHeight<=e.clientHeight+1));
await click('.kid');
await load(16300,0);
await click('.balbtn');
T('금액이 작으면 돼지는 원래 크기', await p.$eval('.kid img.pig',e=>e.getBoundingClientRect().width===222));
await click('.kid');

await click('.bar .k:nth-child(2)'); await click('.balbtn');
T('0원이면 줄 없음, 화면은 뜸', !!(await p.$('.kid')) && (await rows()).length===0 && (await p.textContent('.kid .kn'))==='하준');
T('노랑 아이 이름색 (금색)', await p.$eval('.kid .kn',e=>getComputedStyle(e).color==='rgb(183, 141, 0)'));
await click('.kid .x');


// ── 빌린 돈(마이너스 잔액)은 "빈 자리" — 텅 빈 0원과 달라야 하고, 가진 돈처럼 보이면 안 된다 ──
const marks=()=>p.$$eval('.kid .money svg',es=>es.map(e=>{const n=e.querySelector('rect,circle'), t=e.querySelector('text');
  return {fill:n.getAttribute('fill'), stroke:n.getAttribute('stroke'), dash:n.getAttribute('stroke-dasharray')||'',
          parts:e.querySelectorAll('rect,circle,path').length, tf:t.getAttribute('fill')};}));
await load(-2000,-12500);                     // 앞 구간이 하준을 골라둔 상태는 seed 가 서윤으로 되돌린다
await click('.balbtn');
T('마이너스 숫자는 −2,000', (await p.textContent('.kid .ka b'))==='−2,000');
T('숫자는 그대로 검정 (빨강·옅은 색 아님)', await p.$eval('.kid .ka b',e=>getComputedStyle(e).color==='rgb(43, 29, 20)'));
r=await rows(); let m=await marks();
T('빌린 만큼 빈 자리가 그려진다 (0원과 다르다)', r.length===1 && r[0].t==='1000' && r[0].n===2);
T('빈 자리는 속을 채우지 않는다 (크림)', m.every(x=>x.fill==='#FDF6E7'));
T('빈 자리는 제 색 점선 틀', m.every(x=>x.dash==='7 5' && x.stroke==='#86B7E8'));
T('안쪽 무늬 없이 틀 하나 (가진 돈의 동그라미·하이라이트 없음)', m.every(x=>x.parts===1));
T('틀 속 숫자는 옅게', m.every(x=>x.tf!=='#1E4A76'));
T('겹친 빈 자리는 장마다 제 틀 (앞장 왼쪽 선으로 장수가 보인다)', await p.$$eval('.kid .money .row svg',es=>es.length===2));
await click('.kid .x');
await click('.bar .k:nth-child(2)'); await click('.balbtn');
r=await rows(); m=await marks();
T('−12,500 = 빈 10000 · 1000×2 · 500', r.map(x=>x.t+'×'+x.n).join()==='10000×1,1000×2,500×1');
T('동전도 빈 자리', m[m.length-1].fill==='#FDF6E7' && m[m.length-1].dash==='7 5');
await click('.kid .x');
await load(-300000,0);
await click('.balbtn');
T('빚이 커도 한 장 + ×6, 가로로 안 잘린다', (await rows())[0].x==='×6' && await p.$eval('.kid',e=>e.scrollWidth<=e.clientWidth+1));
T('빈 자리의 ×n 은 옅은 톤', await p.$eval('.kid .money .xn',e=>getComputedStyle(e).color!=='rgb(107, 74, 0)'));
await click('.kid .x');


// ── 좌우로 밀어 다른 아이 보여주기 (보여주기일 뿐, 고른 아이는 안 바뀐다) ──
// 하네스 손가락(이벤트 시각을 찍는다) — 놓은 뒤 전환이 끝나고 옛 화면 복사본(.ghost)이 빠질 때까지
const drag=await touch(p);
const swipe=async(x0,y0,x1,y1)=>{ await drag(x0,y0,x1,y1); await calm(); };
const who=()=>p.textContent('.kid .kn');
await load(16300,5000);
await click('.balbtn');
T('서윤 화면에서 시작', (await who())==='서윤');
await swipe(300,500,90,500);
T('왼쪽으로 밀면 다음 아이', (await who())==='하준');
T('화면이 닫히지 않는다', !!(await p.$('.kid')));
T('금액도 그 아이 것', (await p.textContent('.kid .ka b'))==='5,000');
await swipe(90,500,300,500);
T('오른쪽으로 밀면 되돌아온다', (await who())==='서윤');
await swipe(90,500,300,500);
T('끝에서 더 밀면 처음으로 돈다', (await who())==='하준');
await swipe(300,400,260,720);                // 세로가 우세
T('세로로 밀면 안 바뀐다', (await who())==='하준' && !!(await p.$('.kid')));
await swipe(300,500,270,500);                // 너무 짧게
T('살짝 밀면 제자리, 화면도 그대로', (await who())==='하준' && !!(await p.$('.kid')));
await click('.kid .x');
T('닫으면 고르고 있던 아이 그대로', (await p.textContent('.bar .k.on'))==='서윤');
await click('.balbtn');
T('다시 열면 원래 아이', (await who())==='서윤');
// 가장자리에서 시작한 것은 무시한다. (실기기에서는 그 전에 안드로이드 제스처가 먼저 가져가 화면이 닫힐 수 있는데, 그건 우리가 못 막고 닫히는 건 무해하다)
await swipe(20,500,300,500);
T('가장자리에서 시작하면 안 바뀐다', (await who())==='서윤' && !!(await p.$('.kid')));
await click('.kid .x');
// 아이가 한 명이면 아무 일도 없다
await seed(p, [KID('k1','서윤','pink',0,16300,{created_at:'2026-07-01'})], []);
await click('.balbtn');
await swipe(300,500,90,500);
T('아이가 한 명이면 그대로', (await who())==='서윤' && !!(await p.$('.kid')));
// 끌고 나면 폰은 그 터치로 click 을 하나 만든다(크로미움 CDP 는 안 만들어서 직접 보낸다) — 그 click 은 닫기가 아니다. 다음 탭은 닫는다
await swipe(300,500,90,500);
await p.evaluate(()=>document.querySelector('.kid').click()); await calm();
T('끌기가 만든 click 하나는 화면을 닫지 않는다', !!(await p.$('.kid')));
await p.evaluate(()=>{ const k=document.querySelector('.kid'); if(k) k.click(); }); await calm();
T('그다음 탭은 닫는다 (하나만 버린다)', !(await p.$('.kid')));

await done(b);
})();
