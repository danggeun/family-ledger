// 의견 보내기, 받은 의견(운영자 한 폰), 오류 자동 보고
const {T, done, launch, localPage, fakePage, section, seed, idle, until, toasted, KID}=require('./_harness');

const open=async(p)=>{ await p.click('.gear'); await idle(p); await until(p, ()=>!!document.querySelector('.foot .fb')); };
const foot=(p)=>p.$eval('.foot', e=>({fb:(e.querySelector('.fb')||{}).textContent||null, fbr:(e.querySelector('.fb')||e).getBoundingClientRect(),
  ver:document.querySelector('.ver').getBoundingClientRect(), w:e.getBoundingClientRect()}));
const centered=(f)=>Math.abs((f.ver.left+f.ver.right)/2-(f.w.left+f.w.right)/2)<2 && f.ver.top>=f.w.bottom;

(async()=>{
const b=await launch();

await section('이 기기 전용 모드: 의견 줄 없음, 버전은 오른쪽', async()=>{
  const {p, ctx}=await localPage(b);
  await seed(p, [KID('k1','서윤','pink',0,10000)], [], 'k1');
  await p.click('.gear'); await idle(p);
  const f=await foot(p);
  T('의견 줄이 없다', f.fb===null);
  T('버전은 맨 아래 줄 밑 가운데', centered(f));
  await ctx.close();
});

await section('지인: 의견 보내기', async()=>{
  const a=await fakePage(b, {owner:false});
  await open(a.p);
  const f=await foot(a.p);
  T('맨 아래 줄 오른쪽 끝 "의견 보내기", 버전은 그 밑 가운데', f.fb==='의견 보내기' && Math.abs(f.fbr.right-f.w.right)<1 && centered(f));
  await a.p.click('.foot .fb'); await idle(a.p);
  T('주인 가족이 아니면 "이 폰에서 보기" 줄이 없다', !(await a.p.$('.sheet .linkbtn')));
  await a.p.click('.sheet .btn.pri'); await idle(a.p);
  T('빈 글은 안 보낸다', (await a.p.evaluate(()=>window.__fake.feedback.length))===0 && !!(await a.p.$('.sheet textarea')));
  await a.p.fill('.sheet textarea', '버튼이 작아요');
  await a.p.evaluate(()=>{ window.__fake.fbFail=true; });
  await a.p.click('.sheet .btn.pri');
  await until(a.p, ()=>/보내지 못했어요/.test(document.querySelector('.sheet').textContent));
  T('실패하면 시트에 남고 쓴 글도 그대로', (await a.p.inputValue('.sheet textarea'))==='버튼이 작아요');
  await a.p.evaluate(()=>{ window.__fake.fbFail=false; });
  await toasted(a.p, ()=>a.p.click('.sheet .btn.pri'));
  await idle(a.p);
  const t=await a.p.textContent('#toast');
  const fb=await a.p.evaluate(()=>window.__fake.feedback[0]);
  T('보내면 닫히고 "보냈어요"', t==='보냈어요' && !(await a.p.$('.sheet')));
  T('글 · 버전 · 기종이 간다', fb && fb.kind==='note' && fb.body==='버튼이 작아요' && fb.app_version===(await a.p.evaluate(()=>window.__app.APP_VERSION)) && /px$/.test(fb.device));
  const sentRow=async()=>{ await a.p.click('.foot .fb'); await idle(a.p); await until(a.p, ()=>!!document.querySelector('.fbsent .fbrow'));
    const r=await a.p.$eval('.fbsent .fbrow', e=>({b:e.querySelector('.b').textContent, s:e.querySelector('.s').textContent})); await a.p.goBack(); await idle(a.p); return r; };
  const r1=await sentRow();
  T('보낸 의견이 창 아래에 "전달됨"으로', r1.b==='버튼이 작아요' && /· 전달됨$/.test(r1.s));
  await a.p.evaluate(()=>{ window.__fake.feedback[0].read_at=new Date().toISOString(); });
  const r2=await sentRow();
  T('운영자가 읽으면 "읽음"', /· 읽음$/.test(r2.s));
  await a.ctx.close();
});

await section('운영자: 이 폰을 받는 폰으로 → 받은 의견', async()=>{
  const seeded=[{id:2,kind:'error',body:'저장 실패: x · home',app_version:'1.3.8',device:'Android 14 · 홈 화면 앱 · 412px',created_at:'2026-10-25T05:00:00Z',family_code:'ABCD-1234',kids:'지우'},
                {id:1,kind:'note',body:'좋아요',app_version:'1.3.8',device:'iPhone iOS 17.4 · 홈 화면 앱 · 390px',created_at:'2026-10-25T04:00:00Z',family_code:'ABCD-1234',kids:'지우'}];
  const a=await fakePage(b, {owner:true, reader:false, feedback:seeded});
  await open(a.p);
  await a.p.click('.foot .fb'); await idle(a.p);
  T('주인 가족이면 보내기 시트에 "받은 의견을 이 폰에서 보기"', !!(await a.p.$('.sheet .linkbtn')));
  await a.p.click('.sheet .linkbtn'); await idle(a.p);
  await until(a.p, ()=>/받은 의견/.test(document.querySelector('.foot .fb').textContent));
  T('이제 맨 아래가 "받은 의견 2"(새 것 수)', (await a.p.textContent('.foot .fb'))==='받은 의견 2');
  await a.p.click('.foot .fb'); await idle(a.p);
  await until(a.p, ()=>document.querySelectorAll('.fbitem').length===2);
  const items=await a.p.$$eval('.fbitem', es=>es.map(e=>({err:e.classList.contains('err'), m:e.querySelector('.m').textContent+' · '+e.querySelector('.d').textContent, b:e.querySelector('.b').textContent})));
  T('최신이 위, 오류는 "오류 ·" 로', items[0].err && items[0].b.indexOf('오류 · 저장 실패')===0 && items[1].b==='좋아요');
  T('어느 집 · 버전 · 기종', items[1].m.indexOf('지우 · v1.3.8 · iPhone iOS 17.4')>0);
  await until(a.p, ()=>window.__fake.feedback.every(f=>!!f.read_at));
  T('목록을 열면 서버에 읽음으로 남는다', await a.p.evaluate(()=>window.__fake.feedback.every(f=>!!f.read_at)));
  await a.p.click('.fbitem >> nth=1 >> .done'); await idle(a.p);
  T('완료는 한 번 누르면 "지울까요?"로만 바뀐다', (await a.p.$$('.fbitem')).length===2 && (await a.p.textContent('.fbitem >> nth=1 >> .done'))==='지울까요?');
  await a.p.click('.fbitem >> nth=0 >> .b'); await idle(a.p);
  T('다른 곳을 누르면 원래대로', (await a.p.textContent('.fbitem >> nth=1 >> .done'))==='완료');
  await a.p.click('.fbitem >> nth=1 >> .done'); await idle(a.p);
  await a.p.click('.fbitem >> nth=1 >> .done'); await idle(a.p);
  T('완료하면 목록에서 빠지고 서버에선 숨김', (await a.p.$$('.fbitem')).length===1 && (await a.p.evaluate(()=>window.__fake.feedback.find(f=>f.id===1).done)));
  await a.p.goBack(); await idle(a.p);
  T('본 뒤엔 숫자 없이 "받은 의견"', (await a.p.textContent('.foot .fb'))==='받은 의견');
  await a.ctx.close();
});

await section('오류 자동 보고: 같은 문장은 한 번', async()=>{
  const a=await fakePage(b, {owner:false});
  await a.p.evaluate(()=>{ window.__fake.childFail=true; });
  await a.p.click('.gear'); await idle(a.p);
  for(let i=0;i<2;i++) await toasted(a.p, ()=>a.p.click('.foot .addk'));          // 아이 추가 실패 두 번
  await until(a.p, ()=>window.__fake.feedback.some(f=>f.kind==='error'));
  const errs=await a.p.evaluate(()=>window.__fake.feedback.filter(f=>f.kind==='error'));
  T('저장 실패가 오류로 한 번만 간다(문장 · 화면)', errs.length===1 && /^저장 실패: .+ · settings$/.test(errs[0].body));
  await a.ctx.close();
});

await done(b);
})();
