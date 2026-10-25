// 회귀: 받는 폰은 한 대(우리 집 다른 폰이 가져가지 못한다) · 보낸 의견은 그 기기 것만
const {T, done, launch, fakePage, section, idle, until}=require('./_harness');

(async()=>{
const b=await launch();

await section('우리 집 다른 폰: 받는 폰이 있으면 가져가기 줄이 없다', async()=>{
  const a=await fakePage(b, {owner:true, reader:false, otherReader:true});
  await a.p.click('.gear'); await idle(a.p); await until(a.p, ()=>!!document.querySelector('.foot .fb'));
  T('맨 아래는 "의견 보내기"', (await a.p.textContent('.foot .fb'))==='의견 보내기');
  await a.p.click('.foot .fb'); await idle(a.p);
  T('"받은 의견을 이 폰에서 보기"가 없다', !(await a.p.$('.sheet .linkbtn')));
  await a.ctx.close();
});

await section('보낸 의견은 이 기기에서 보낸 것만', async()=>{
  const now=new Date().toISOString();
  const a=await fakePage(b, {owner:true, otherReader:true, feedback:[
    {id:2, user_id:'u1', kind:'note', body:'내가 보낸 것', created_at:now},
    {id:1, user_id:'u9', kind:'note', body:'같은 집 다른 폰이 보낸 것', created_at:now, read_at:now, done:true}]});
  await a.p.click('.gear'); await idle(a.p); await until(a.p, ()=>!!document.querySelector('.foot .fb'));
  await a.p.click('.foot .fb'); await idle(a.p); await until(a.p, ()=>!!document.querySelector('.fbsent .fbrow'));
  const rows=await a.p.$$eval('.fbsent .fbrow .b', es=>es.map(e=>e.textContent));
  T('다른 폰이 보낸 것은 안 보인다', rows.length===1 && rows[0]==='내가 보낸 것');
  await a.ctx.close();
});

await done(b);
})();
