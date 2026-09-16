// 모든 테스트를 순서대로 실행. 하나라도 실패하면 종료 코드 1.
// 실행 전 한 번: npm install && npx playwright install chromium
const {spawnSync}=require('child_process'); const path=require('path'); const fs=require('fs');
const files=fs.readdirSync(__dirname).filter(f=>f.endsWith('.test.js')).sort();
let failed=0;
for(const f of files){
  console.log('\n== '+f);
  const r=spawnSync(process.execPath,[path.join(__dirname,f)],{stdio:'inherit'});
  if(r.status!==0) failed++;
}
console.log(failed?`\n${failed} file(s) failed`:'\nall passed'); process.exit(failed?1:0);
