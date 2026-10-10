// 1.1.3 — 용도 칩(빈도순 + 부호) · 이름 크기·색 · 수정 이력 · 한 줄 길게 눌러 돈 그림
const {T, done, launch, localPage, seed, settle, KID, back: backOnce, idle, until: untilP}=require('./_harness');

const t='2026-09-20';
const E=(id,memo,amount,date,by,upd)=>({id,child_id:'k1',entry_date:date||t,memo,amount,auto_key:null,
  created_by:by||'me', updated_by:upd===undefined?(by||'me'):upd, created_at:date+'T09:00:00Z'});

(async()=>{
const b=await launch();
const {p}=await localPage(b);
const cdp=await p.context().newCDPSession(p);

// 서윤(색 바꿀 수 있음)·하준 두 아이 + 기록, 서윤을 고른 채로
const load=(entries,color)=>seed(p, [KID('k1','서윤',color||'pink',0,20000,{created_at:'2026-07-01T00:00:00Z'}),
                                     KID('k2','하준','yellow',1,5000,{created_at:'2026-07-01T00:00:00Z'})], entries);
// 닫기·뒤로는 history.back() → popstate 라 한 박자 늦고, 아이를 바꾸면 옛 화면 복사본(.ghost)이 타이머로 빠진다 — 둘 다 끝날 때까지
const calm=()=>idle(p);
const click=async(sel,o)=>{ await p.click(sel,o); await calm(); };
// 브라우저 뒤로 가기 — 열린 화면 하나가 닫힐(방문 기록 칸이 하나 줄) 때까지
const back=()=>backOnce(p);
// 기다리던 결과가 오면 true, 안 오면 false — 뒤의 T 가 원래 조건을 그대로 다시 본다
const until=(fn,arg)=>untilP(p,fn,arg,30000);
const chips=()=>p.$$eval('.chips button',es=>es.map(e=>e.textContent));
const signTxt=()=>p.$eval('.entry .sign',e=>e.textContent);
// 실제 터치로 누르기
const center=(sel)=>p.$eval(sel,e=>{const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
const touchStart=(at)=>cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[at]});
const touchEnd=()=>cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
// 길게 누르기 — 손가락을 댄 채 그림이 뜰 때까지(앱의 문턱 0.5초가 지나야 뜬다) 기다렸다가 뗀다
const press=async(sel)=>{ await touchStart(await center(sel));
  await p.waitForFunction(()=>!!document.querySelector('.kid.one')).catch(()=>{});   // 안 뜨면 뒤의 T 가 실패로 센다 (waitForSelector 는 0.5초 간격으로 늦게 본다)
  await touchEnd(); await calm(); };
// 짧게 누르기 — 문턱(0.5초)보다 짧게 누른 채
const shortPress=async(sel)=>{ await touchStart(await center(sel));
  await p.waitForTimeout(200);                            // 진짜 시간: 누르고 있는 시간이 시험 대상 — 0.2초는 길게 누르기(0.5초)가 아니다
  await touchEnd(); await calm(); };
// 누른 채 위로 끌기(스크롤) — 문턱을 넘겨 누르고 있어도 안 열려야 한다
const pressMove=async(sel,dy)=>{ const at=await center(sel); await touchStart(at);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:at.x,y:at.y-dy}]});
  await p.waitForTimeout(700);                            // 진짜 시간: 길게 누르기 문턱(0.5초)을 넘겨 누르고 있어야 "안 열린다"를 안다
  await touchEnd(); await calm(); };

// ── 1) 용도 칩 — 많이 쓴 순, 부호도 따라온다 ──────────────────
// 간식 3회(전부 −), 용돈 2회(전부 +), 할머니 1회(+). 최근순이면 할머니가 맨 앞이어야 한다
await load([E('e1','간식',-800,'2026-09-14'),E('e2','용돈',3000,'2026-09-15'),E('e3','간식',-1200,'2026-09-16'),
            E('e4','용돈',3000,'2026-09-17'),E('e5','간식',-500,'2026-09-18'),E('e6','할머니',5000,'2026-09-19')]);
await click('input.memo');
let cs=await chips();
T('칩이 많이 쓴 순 (간식 3 > 용돈 2 > 할머니 1)', cs.join('|')==='간식|용돈|할머니');
T('기본 부호는 쓴 돈', (await signTxt())==='−');
await click('.chips button:has-text("용돈")');
T('+ 용도 칩 → 용도 채움', (await p.$eval('input.memo',e=>e.value))==='용돈');
T('+ 용도 칩 → 부호가 받은 돈으로', (await signTxt())==='+' && await p.$eval('.entry .sign',e=>e.className.includes('plus')));
await click('input.memo');
await click('.chips button:has-text("간식")');
T('− 용도 칩 → 부호가 쓴 돈으로', (await signTxt())==='−' && await p.$eval('.entry .sign',e=>!e.className.includes('plus')));
T('칩을 눌러도 금액칸에 포커스', await p.evaluate(()=>document.activeElement.className.includes('amt')));

// 동률이면 최근 것이 앞. 부호가 반반이면 최근 부호
await load([E('e1','문구점',-1000,'2026-09-14'),E('e2','선물',2000,'2026-09-15'),
            E('e3','문구점',-1000,'2026-09-16'),E('e4','선물',-2000,'2026-09-17')]);
await click('input.memo');
cs=await chips();
T('같은 횟수면 최근에 쓴 것이 앞', cs[0]==='선물' && cs[1]==='문구점');
await click('.chips button:has-text("선물")');
T('부호가 반반이면 최근 부호(쓴 돈)', (await signTxt())==='−');

// 자동 줄은 칩에 안 나온다 (기존 규칙 유지)
await load([Object.assign(E('e1','용돈',3000,'2026-09-19'),{auto_key:'w:2026-09-19'}),E('e2','간식',-500,'2026-09-18')]);
await click('input.memo');
T('자동 용돈 줄은 칩에 없다', (await chips()).join('|')==='간식');

// 용도를 치기만 해도 부호가 따라온다 — 괄호로 덧붙인 말은 괄호 앞 말로 묶어서
const typeMemo=async(s)=>{ await p.fill('input.memo',''); await p.type('input.memo',s); await settle(p); };
await load([E('e0','용돈',3000,'2026-09-13'),E('e1','용돈',3000,'2026-09-14'),E('e2','용돈(큰아빠)',10000,'2026-09-15'),E('e3','간식',-800,'2026-09-16'),
            E('e4','용돈(장난감)',-2000,'2026-09-17'),E('e5','용돈(장난감)',-1000,'2026-09-18')]);
await click('input.memo');
await typeMemo('용돈');
T('"용돈"을 치면 받은 돈', (await signTxt())==='+');
await typeMemo('용돈(할머니)');
T('처음 쓰는 괄호도 괄호 앞 말(용돈)을 따른다', (await signTxt())==='+');
await typeMemo('용돈(장난감)');
T('똑같은 용도가 있으면 그게 먼저 (용돈(장난감)은 쓴 돈)', (await signTxt())==='−');
await typeMemo('간식');
T('"간식"을 치면 쓴 돈', (await signTxt())==='−');
await typeMemo('용돈'); await typeMemo('처음보는말');
T('처음 보는 말이면 처음 상태(쓴 돈)로 돌아간다', (await signTxt())==='−');
await p.fill('input.memo',''); await click('.entry .sign');
await typeMemo('간식');
T('부호를 손으로 바꿨으면 치는 말이 덮어쓰지 않는다', (await signTxt())==='+');
await load([Object.assign(E('e1','용돈',3000,'2026-09-19'),{auto_key:'w:2026-09-19'})]);
await click('input.memo');
await typeMemo('용돈');
T('손으로 적은 적이 없어도 자동 용돈 줄이 근거가 된다', (await signTxt())==='+');
T('기록이 있으면 "용도" 안내 글씨 없음', (await p.$eval('input.memo',e=>e.placeholder))==='');
await load([]);
T('기록이 하나도 없으면 "용도" 안내', (await p.$eval('input.memo',e=>e.placeholder))==='용도');

// 금액칸은 어디를 눌러도 커서가 끝 — 1의 자리를 노리다 ✓ 를 누르는 일이 없게
// (커서를 끝으로 보내는 건 앱이 한 틱 늦춰서 한다 — 끝에 올 때까지 기다리고, 안 오면 T 가 실패로 센다)
const caretAtEnd=()=>until(()=>{ const a=document.querySelector('input.amt'); return a.selectionStart===a.value.length; });
await click('input.amt'); await p.keyboard.type('12345'); await settle(p);
await click('input.amt',{position:{x:6,y:12}}); await caretAtEnd();          // 왼쪽 끝(=맨 앞 자리)을 누른다
T('금액칸 왼쪽을 눌러도 커서는 끝', await p.$eval('input.amt',a=>a.selectionStart===a.value.length));
await p.keyboard.type('6'); await settle(p);
T('그 상태에서 치면 끝에 붙는다', (await p.$eval('input.amt',a=>a.value))==='123,456');
// 길게 눌러 끌어 가운데로 옮겨도 끝으로 돌아온다
await p.evaluate(()=>{const a=document.querySelector('input.amt'); a.setSelectionRange(1,1);}); await caretAtEnd();
T('커서를 가운데로 옮겨도 끝으로 돌아온다', await p.$eval('input.amt',a=>a.selectionStart===a.value.length));
await p.keyboard.press('Backspace'); await settle(p);
T('⌫ 는 끝에서 지운다 (12,345)', (await p.$eval('input.amt',a=>a.value))==='12,345');

// ── 2) 이름 크기·색 ───────────────────────────────────────
await load([E('e1','간식',-800,'2026-09-18')]);
T('홈 탭 이름 22px', await p.$eval('.bar .k.on',e=>getComputedStyle(e).fontSize==='22px'));
T('홈 탭 이름 = 핑크 원색', await p.$eval('.bar .k.on',e=>getComputedStyle(e).color==='rgb(255, 61, 143)'));
T('아이 탭 간격은 4px 격자 위', await p.$eval('.bar',e=>getComputedStyle(e).gap==='16px'));
T('탭 밑줄은 그대로 원색', await p.$eval('.bar .k.on',e=>getComputedStyle(e,'::after').backgroundColor==='rgb(255, 61, 143)'));
await click('.balbtn');
T('아이 화면 이름도 같은 색', await p.$eval('.kid .kn',e=>getComputedStyle(e).color==='rgb(255, 61, 143)'));
await click('.kid .x');
await load([E('e1','간식',-800,'2026-09-18')],'yellow');
T('노랑은 글자만 금색', await p.$eval('.bar .k.on',e=>getComputedStyle(e).color==='rgb(183, 141, 0)'));
T('노랑 밑줄은 샛노랑 그대로', await p.$eval('.bar .k.on',e=>getComputedStyle(e,'::after').backgroundColor==='rgb(255, 196, 0)'));
T('이름 6색 모두 종이색 대비 3.0 이상', await p.evaluate(()=>{
  const L=h=>{const v=[1,3,5].map(i=>parseInt(h.substr(i,2),16)/255).map(c=>c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4));
    return .2126*v[0]+.7152*v[1]+.0722*v[2];};
  const bg=L('#FDFCFA');
  return ['#1E88E5','#1AA94D','#B78D00','#F56700','#FF3D8F','#8B4FE8']
    .every(c=>(Math.max(bg,L(c))+.05)/(Math.min(bg,L(c))+.05)>=3);
}));

// ── 3) 수정 이력 — 마지막에 손댄 사람 ──────────────────────
await load([E('e1','젤리',-800,'2026-09-18','me'),          // 내가 적고 그대로
            E('e2','할머니',5000,'2026-09-17','other'),      // 다른 기기가 적고 그대로
            E('e3','장난감',-12000,'2026-09-16','other','me'),// 다른 기기가 적은 걸 내가 고침
            E('e4','책',-9000,'2026-09-15','me','other'),    // 내가 적은 걸 다른 기기가 고침
            E('e5','옛날 줄',-300,'2026-09-14','other',null)]);// updated_by 가 없는 옛 줄
const note=async i=>{ await click(`.row >> nth=${i}`);
  const s=await p.$eval('.sheet .f',e=>e.textContent); await click('.sheet button:has-text("취소")'); return s; };
T('내가 적은 줄', /내가 적었어요/.test(await note(0)));
T('다른 기기가 적은 줄', /다른 기기에서 적었어요/.test(await note(1)));
T('내가 고친 줄', /내가 고쳤어요/.test(await note(2)));
T('다른 기기가 고친 줄', /다른 기기에서 고쳤어요/.test(await note(3)));
T('updated_by 없는 옛 줄은 적은 사람으로', /다른 기기에서 적었어요/.test(await note(4)));
// 실제로 고치면 문구가 바뀐다
await click('.row >> nth=1');
await click('.sheet button:has-text("저장")');
T('다른 기기 줄을 내가 고치면 "내가 고쳤어요"', /내가 고쳤어요/.test(await note(1)));

// ── 4) 한 줄을 길게 누르면 그 금액이 그림으로 ─────────────────
await load([E('e1','젤리',-800,'2026-09-18'),E('e2','할머니',5000,'2026-09-17')]);
await press('.row >> nth=0');
T('길게 누르면 그림이 열린다', !!(await p.$('.kid.one')));
T('돼지는 없다 (잔액 화면과 구분)', !(await p.$('.kid.one img.pig')));
T('용도가 아이 색·이름 크기로', (await p.textContent('.kid.one .kn'))==='젤리'
  && await p.$eval('.kid.one .kn',e=>getComputedStyle(e).fontSize==='22px' && getComputedStyle(e).color==='rgb(255, 61, 143)'));
T('금액에 부호', (await p.textContent('.kid.one .ka b'))==='−800');
T('−800 = 500 + 100×3', await p.$$eval('.kid.one .money .row',es=>es.map(e=>e.querySelector('svg text').textContent+':'+e.querySelectorAll('svg').length).join('|')==='500:1|100:3'));
T('고치기 시트는 안 열렸다', !(await p.$('.sheet')));
await back();
T('뒤로 가기로 닫힌다', !(await p.$('.kid.one')));
T('닫아도 홈이 멀쩡', !!(await p.$('.bar .k.on')));

await press('.row >> nth=1');
T('받은 돈은 초록 +', (await p.textContent('.kid.one .ka b'))==='+5,000'
  && await p.$eval('.kid.one .ka b',e=>getComputedStyle(e).color==='rgb(27, 122, 90)'));
await click('.kid.one');
T('아무 데나 눌러도 닫힘', !(await p.$('.kid.one')));

await shortPress('.row >> nth=0');                    // 짧게
T('짧게 누르면 고치기 시트(기존 동작)', !!(await p.$('.sheet')) && !(await p.$('.kid.one')));
await click('.sheet button:has-text("취소")');
await pressMove('.row >> nth=0', 40);                 // 누른 채 위로 40px (스크롤)
T('누른 채 움직이면(스크롤) 안 열린다', !(await p.$('.kid.one')));

// 용도가 빈 줄은 금액만
await load([Object.assign(E('e1','',-1000,'2026-09-18'),{memo:''})]);
await press('.row >> nth=0');
T('용도가 없으면 — 대신 금액만', !!(await p.$('.kid.one')) && !(await p.$('.kid.one .kn')));


// ── 5) 나간 돈은 "빠진 자리"로, 받은 돈은 꽉 찬 색 ────────────
const edge=()=>p.$eval('.kid.one .money svg',e=>{const n=e.querySelector('rect,circle');
  return {dash:n.getAttribute('stroke-dasharray')||'', stroke:n.getAttribute('stroke'), fill:n.getAttribute('fill'),
          parts:e.querySelectorAll('circle,path').length};});
await load([E('e1','젤리',-800,'2026-09-18'),E('e2','할머니',5000,'2026-09-17')]);
await press('.row >> nth=0');
let g=await edge();
T('나간 돈은 점선 테두리', g.dash==='6 4');
T('점선은 제 색 (크림·흰색이 아님)', g.stroke==='#7CC48E' || (g.stroke!=='#FDF6E7' && g.stroke!=='#fff'));
T('색이 남아 있다 (비어 있지 않음)', g.fill!=='none' && g.fill!=='#FDF6E7');
T('안쪽 동그라미·하이라이트는 그대로', g.parts>=2);
await back();
await press('.row >> nth=1');
g=await edge();
T('받은 돈은 점선이 아니다', g.dash==='' );
T('받은 돈 테두리는 크림 (스티커 컷)', g.stroke==='#FDF6E7');
await back();
T('잔액 화면(가진 돈)도 꽉 찬 색', await (async()=>{ await click('.balbtn');
  const r=await p.$eval('.kid .money svg',e=>e.querySelector('rect,circle').getAttribute('stroke'));
  await click('.kid .x'); return r==='#FDF6E7'; })());

// ── 6) 한 줄 그림은 들어가는 한 크게 ─────────────────────────
// 그림 크기는 그린 다음 프레임(rAF)에 맞춘다 — press 의 settle 이 두 프레임을 기다린다
await load([E('e1','젤리',-800,'2026-09-18')]);
await press('.row >> nth=0');
// 배율은 CSS zoom 이 아니라 그림 자체 크기로 준다 — 지폐의 실제 그려진 너비로 잰다
const zoom=()=>p.$eval('.kid.one .money svg',e=>+(e.getAttribute('width')/e.viewBox.baseVal.width).toFixed(2));
T('적은 금액은 크게 (1.3배 이상)', (await zoom())>=1.3);
T('한 화면에 들어감', await p.$eval('.kid.one',e=>e.scrollHeight<=e.clientHeight+1));
await back();
await load([E('e1','자전거',-99990,'2026-09-18')]);
await press('.row >> nth=0');
T('큰 금액(99,990·8줄)은 배율을 줄인다', (await zoom())<1.6);
T('CSS zoom 은 쓰지 않는다 (사파리에서 어긋난다)', await p.$eval('.kid.one .money',e=>!e.style.zoom));
T('큰 금액도 한 화면에', await p.$eval('.kid.one',e=>e.scrollHeight<=e.clientHeight+1));
T('가로로도 안 잘린다', await p.$eval('.kid.one',e=>e.scrollWidth<=e.clientWidth+1));
await back();
await load([E('e1','자전거',-368880,'2026-09-18')]);   // 5만원권 여러 장 — 가로가 먼저 넘치는 경우
await press('.row >> nth=0');
T('5만원권 줄도 가로로 안 잘린다', await p.$eval('.kid.one',e=>e.scrollWidth<=e.clientWidth+1));
await back();

// 다섯 장을 넘으면 한 장 + ×n — 어떤 금액에서도 줄이 화면을 안 넘는다
await load([E('e1','자전거',-350000,'2026-09-18')]);
await press('.row >> nth=0');
T('35만(5만원권 7장)은 한 장 + ×7', await p.$$eval('.kid.one .money .row',es=>{
  const r=es[0]; return r.querySelectorAll('svg').length===1 && r.querySelector('.xn').textContent==='×7';}));
T('장수는 그 지폐의 진한 톤으로 크게', await p.$eval('.kid.one .money .xn',e=>{
  const b=getComputedStyle(e.querySelector('b'));
  return b.fontSize==='28px' && getComputedStyle(e).color==='rgb(107, 74, 0)';}));
T('곱하기는 작고 연하게, 세로 가운데', await p.$eval('.kid.one .money .xn',e=>{
  const i=getComputedStyle(e.querySelector('i'));
  return i.fontSize==='17px' && i.color!=='rgb(107, 74, 0)' && getComputedStyle(e).alignItems==='center';}));
T('한글 없이 숫자만 (라벨 규칙)', !/[가-힣]/.test(await p.textContent('.kid.one .money')));
T('그래도 가로로 안 잘린다', await p.$eval('.kid.one',e=>e.scrollWidth<=e.clientWidth+1));
await back();
await load([E('e1','자전거',-200000,'2026-09-18')]);
await press('.row >> nth=0');
T('20만(4장)은 그대로 넉 장 부채꼴', await p.$$eval('.kid.one .money .row',es=>{
  const r=es[0]; return r.querySelectorAll('svg').length===5 && !r.querySelector('.xn');}));  // 지폐 4 + 실루엣 1
T('겹친 지폐는 점선이 하나뿐 (바깥 실루엣)', await p.$$eval('.kid.one .money .row svg',es=>{
  const dashed=es.filter(e=>{const n=e.querySelector('rect,circle'); return (n.getAttribute('stroke-dasharray')||'')!=='';});
  return dashed.length===1 && dashed[0].querySelector('rect').getAttribute('fill')==='none';}));
T('장끼리는 크림 컷으로 나뉜다', await p.$$eval('.kid.one .money .row svg',es=>
  es.filter(e=>e.querySelector('rect')&&e.querySelector('rect').getAttribute('stroke')==='#FDF6E7').length===4));
await back();

// ── 7) 적다 만 입력은 떠나면 비워진다 ────────────────────────
await load([E('e1','젤리',-800,'2026-09-18')]);
const draft=()=>p.$eval('input.memo',e=>e.value);
const amt=()=>p.$eval('input.amt',e=>e.value);
await click('input.memo'); await p.type('input.memo','장난감'); await settle(p);
await click('.bar .k >> nth=1');          // 다른 아이로
T('아이를 바꾸면 적던 게 비워진다', (await draft())==='' && (await amt())==='');
await click('.bar .k >> nth=0');
await click('input.memo'); await p.type('input.memo','장난감');
await click('input.amt'); await p.type('input.amt','5000'); await settle(p);
await click('.bar .k >> nth=1');
T('금액까지 쳤어도 아이를 바꾸면 비워진다', (await draft())==='' && (await amt())==='');
await click('.bar .k >> nth=0');
await click('input.memo'); await p.type('input.memo','간식'); await settle(p);
await click('.thead');                    // 입력줄 밖
T('금액 없이 밖을 누르면 비워진다', (await draft())==='');
await click('input.memo'); await p.type('input.memo','간식');
await click('input.amt'); await p.type('input.amt','1200'); await settle(p);
await click('.thead');
T('금액까지 쳤으면 밖을 눌러도 남는다', (await draft())==='간식' && (await amt())==='1,200');
// 키보드를 내리려고 누른 탭으로 다른 화면이 열리면 안 된다
await load([E('e1','젤리',-800,'2026-09-18')]);          // 깨끗한 상태에서
await click('input.memo'); await p.type('input.memo','과자'); await settle(p);
await click('.row >> nth=0');
T('적는 중에 기록 줄을 눌러도 고치기가 안 열린다', !(await p.$('.sheet')));
T('대신 칩이 닫히고 적던 게 비워진다', (await p.$$('.chips button')).length===0 && (await draft())==='');
await click('.row >> nth=0');
T('한 번 더 누르면 그때 고치기가 열린다', !!(await p.$('.sheet')));
await click('.sheet button:has-text("취소")');
await click('.row >> nth=0');
T('적는 중이 아니면 한 번에 열린다', !!(await p.$('.sheet')));
await click('.sheet button:has-text("취소")');
// 칩을 눌러 금액칸으로 넘어간 상태에서도 마찬가지 (포커스가 용도칸이 아니어도)
await load([E('e1','용돈',3000,'2026-09-18')]);
await click('input.memo');
await click('.chips button:has-text("용돈")');
T('칩을 누르면 금액칸에 포커스', await p.evaluate(()=>document.activeElement.className.includes('amt')));
await click('.row >> nth=0');
T('칩 누른 뒤 밖을 눌러도 고치기가 안 열린다', !(await p.$('.sheet')));
await click('.row >> nth=0');
T('그다음 탭에는 열린다', !!(await p.$('.sheet')));
await click('.sheet button:has-text("취소")');
T('부호도 같이 되돌아온다', await (async()=>{ await click('.entry .sign');
  const plus=await p.$eval('.entry .sign',e=>e.className.includes('plus'));
  await click('input.memo');
  await click('.bar .k >> nth=1');
  await click('.bar .k >> nth=0');
  return plus && await p.$eval('.entry .sign',e=>!e.className.includes('plus')); })());

await done(b);
})();
