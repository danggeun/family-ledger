// 모든 테스트를 돌린다. 파일마다 따로 브라우저를 띄우므로 몇 개씩 동시에 — 결과는 파일 이름 순으로 모아 찍는다.
// 하나라도 실패하면 종료 코드 1.   npm test            (동시 실행 = CPU 수, 최대 4)
//                                  npm test -- -j1     (하나씩 — 무엇이 느린지 볼 때)
//                                  npm test -- tour    (이름에 tour 가 든 파일만)
// 실행 전 한 번: npm install && npx playwright install chromium
const {spawn}=require('child_process'); const path=require('path'); const fs=require('fs'); const os=require('os');

const args=process.argv.slice(2);
const jArg=args.find(a=>/^-j\d+$/.test(a));
const jobs=jArg ? Number(jArg.slice(2)) : Math.max(1, Math.min(4, os.cpus().length));
const only=args.filter(a=>!/^-j\d+$/.test(a));
const files=fs.readdirSync(__dirname).filter(f=>f.endsWith('.test.js') && (!only.length || only.some(o=>f.includes(o)))).sort();

function runOne(f){
  return new Promise(res=>{
    const t0=Date.now(); let out='';
    const ch=spawn(process.execPath,[path.join(__dirname,f)],{env:process.env});
    ch.stdout.on('data',d=>out+=d); ch.stderr.on('data',d=>out+=d);
    ch.on('close',code=>res({f, code, out, ms:Date.now()-t0}));
  });
}
(async()=>{
  const t0=Date.now(), results=new Array(files.length); let next=0;
  async function worker(){ while(next<files.length){ const i=next++; results[i]=await runOne(files[i]); process.stdout.write(results[i].code?'F':'.'); } }
  await Promise.all(Array.from({length:Math.min(jobs,files.length)}, worker));
  process.stdout.write('\n');
  let failed=0, total=0;
  for(const r of results){
    const m=r.out.match(/(\d+) passed, (\d+) failed/); const n=m?Number(m[1])+Number(m[2]):0; total+=n;
    console.log(`\n== ${r.f}  (${(r.ms/1000).toFixed(1)}s${n?', '+n+'개':''})`);
    if(r.code){ failed++; console.log(r.out.trimEnd()); }                       // 실패한 파일은 전부 보여준다
    else console.log(r.out.split('\n').filter(l=>/^FAIL|passed, /.test(l)).join('\n'));
  }
  console.log(`\n${total}개 · ${files.length}개 파일 · ${((Date.now()-t0)/1000).toFixed(0)}초 (동시 ${jobs})`);
  console.log(failed?`${failed} file(s) failed`:'all passed'); process.exit(failed?1:0);
})();
