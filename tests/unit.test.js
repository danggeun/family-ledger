// 계산 함수 단위 테스트 — 화면을 거치지 않고 window.__app 으로 바로 부른다. 잔액·용도→부호·돈 그림 분해·날짜·CSV·코드 생성.
const H=require('./_harness');
const {T, done, launch, localPage, seed, KID, E}=H;

(async()=>{
const b=await launch();
const {p}=await localPage(b);
const call=(fn, ...args)=>p.evaluate(({fn,args})=>window.__app[fn].apply(null,args), {fn,args});

// 금액 표기
T('fmt: 음수는 유니코드 마이너스', (await call('fmt',-2000))==='−2,000' && (await call('fmt',0))==='0' && (await call('fmt',1234567))==='1,234,567');
T('fmtSigned: 부호를 늘 붙인다', (await call('fmtSigned',3000))==='+3,000' && (await call('fmtSigned',-800))==='−800');
T('digits: 숫자만', (await call('digits','1,2a3 원'))==='123' && (await call('digits',''))==='');

// 날짜 — 전부 로컬. UTC 로 밀리지 않는다
T('addDays: 월·연 경계', (await call('addDays','2026-12-31',1))==='2027-01-01' && (await call('addDays','2026-03-01',-1))==='2026-02-28');
T('dowOf: 2026-10-10 은 토요일', (await call('dowOf','2026-10-10'))===6);
T('localDay: UTC 시각을 그 기기의 날짜로', /^\d{4}-\d{2}-\d{2}$/.test(await call('localDay','2026-10-09T20:00:00Z')) && (await call('localDay',''))==='');
T('plainDate: 올해는 연도 없이, 작년은 두 자리 연도', (await call('plainDate','2026-10-03'))==='10.03' && (await call('plainDate','2025-01-09'))==='25.1.09');

// 돈 그림 분해 — 탐욕, 10원 아래는 버린다, 음수는 0
T('splitWon 16,300', JSON.stringify(await call('splitWon',16300))==='[[10000,1],[5000,1],[1000,1],[100,3]]');
T('splitWon 0·음수·5원', JSON.stringify(await call('splitWon',0))==='[]' && JSON.stringify(await call('splitWon',-100))==='[]' && JSON.stringify(await call('splitWon',15))==='[[10,1]]');
T('splitWon 250,000 → 5만원권 5장', JSON.stringify(await call('splitWon',250000))==='[[50000,5]]');

// 용도 → 부호 (가족 전체 기록 기준, 똑같은 용도 → 괄호 앞 말 → 다수 → 동률이면 최근)
await seed(p, [KID('k1','서윤','pink',0,10000), KID('k2','하준','yellow',1,5000)], [
  E('e1','k1','2026-10-01','용돈',3000), E('e2','k1','2026-10-02','용돈',3000), E('e3','k2','2026-10-03','용돈(큰아빠)',10000),
  E('e4','k1','2026-10-04','젤리',-800), E('e5','k1','2026-10-05','젤리',500), E('e6','k1','2026-10-06','젤리',-700),
  E('e7','k1','2026-10-07','환불',2000), E('e8','k1','2026-10-08','환불',-2000), E('e9','k1','2026-10-01','용돈',3000,{auto_key:'w:2026-10-01'})]);
T('memoBase: 괄호 앞 말', (await call('memoBase','용돈(큰아빠)'))==='용돈' && (await call('memoBase','용돈（장난감）'))==='용돈');
T('signForMemo: 받은 돈으로 적어 온 말은 +', (await call('signForMemo','용돈'))===1);
T('signForMemo: 똑같은 용도가 없으면 괄호 앞 말로 — "용돈(이모)" 도 +', (await call('signForMemo','용돈(이모)'))===1);
T('signForMemo: 다수결 — 젤리는 −(2:1)', (await call('signForMemo','젤리'))===-1);
T('signForMemo: 동률이면 최근 — 환불은 마지막이 −', (await call('signForMemo','환불'))===-1);
T('signForMemo: 처음 보는 말은 0', (await call('signForMemo','처음보는말'))===0 && (await call('signForMemo',''))===0);
const chips=await call('recentMemos','k1');
T('recentMemos: 많이 쓴 순(동률이면 최근), 자동 줄은 제외', chips.map(c=>c.memo).join(',')==='젤리,환불,용돈' && chips[0].sign===-1 && chips[2].sign===1);

// 잔액·누적 — skipped 는 빠진다
await seed(p, [KID('k1','서윤','pink',0,10000)], [
  E('a1','k1','2026-10-03','용돈',3000,{auto_key:'w:2026-10-03'}), E('a2','k1','2026-10-10','용돈',3000,{auto_key:'w:2026-10-10',skipped:true}),
  E('e1','k1','2026-10-05','젤리',-800)]);
T('balanceOf: 10,000 + 3,000 − 800 (건너뛴 주 제외)', (await call('balanceOf','k1'))===12200);
const rows=await call('withTotals','k1');
T('withTotals: 최신순, 누적 잔액', rows.length===2 && rows[0].memo==='젤리' && rows[0].total===12200 && rows[1].total===13000);

// CSV — BOM, 처음 금액 줄, 따옴표
const csv=await call('csvText');
T('csvText: 머리줄, 처음 금액 줄, 따옴표, 건너뛴 주 없음 (BOM 은 파일로 만들 때 붙는다)', csv.startsWith('아이,날짜,용도,금액,총액\n"서윤",2026-07-01,"처음 금액",,10000') && !/2026-10-10/.test(csv) && /"젤리",-800,12200/.test(csv));

// 기타
T('normalizeUrl: 끝 슬래시·/rest/v1 제거', (await call('normalizeUrl','https://x.supabase.co/rest/v1/'))==='https://x.supabase.co' && (await call('normalizeUrl',' https://x.supabase.co// '))==='https://x.supabase.co');
const code=await call('genCode');
T('genCode: ABCD-1234 꼴, I·O·0·1 없음', /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code));

// 두 곳에 적혀 있어 손으로 맞추는 값 — 어긋나면 여기서 잡는다
const fs=require('fs'), path=require('path');
const sw=fs.readFileSync(path.resolve(__dirname,'../sw.js'),'utf8');
const ver=await p.evaluate(()=>window.__app.APP_VERSION), cdn=await p.evaluate(()=>window.__app.SUPABASE_CDN);
T('sw.js CACHE = "yd-"+APP_VERSION', sw.includes('var CACHE = "yd-'+ver+'";'));
T('sw.js 가 앱과 같은 supabase-js 를 캐시한다', sw.includes('"'+cdn+'"'));
T('package.json version = APP_VERSION', require('../package.json').version===ver);
const kidBg=await p.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--kid-bg').trim().toUpperCase());
T('CSS --kid-bg = JS KID_BG (돈 그림 테두리·바랜 색 기준)', kidBg===(await p.evaluate(()=>window.__app.KID_BG)).toUpperCase());
const paper=await p.evaluate(()=>({css:getComputedStyle(document.documentElement).getPropertyValue('--paper').trim().toUpperCase(), js:window.__app.THEME_PAPER.toUpperCase(),
  meta:(document.querySelector('meta[name="theme-color"]').content||'').toUpperCase()}));
const mani=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../manifest.webmanifest'),'utf8'));
T('종이색 한 값: CSS --paper = THEME_PAPER = theme-color = manifest', paper.css===paper.js && paper.meta===paper.js && String(mani.theme_color).toUpperCase()===paper.js && String(mani.background_color).toUpperCase()===paper.js);

// 한 파일 안의 함수 이름이 겹치면 뒤의 것이 앞의 것을 조용히 덮는다(실제로 pad 가 겹쳐 날짜가 깨질 뻔했다)
const html=fs.readFileSync(path.resolve(__dirname,'../index.html'),'utf8');
const names=[...html.matchAll(/^function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m=>m[1]);   // 맨 바깥(들여쓰기 없는) 함수만 — 안쪽 save·end 는 제 함수 안에서만 산다
const dup=names.filter((n,i)=>names.indexOf(n)!==i);
T('index.html 맨 바깥 함수 이름이 겹치지 않는다'+(dup.length?' ('+dup.join(',')+')':''), dup.length===0);

await done(b);
})();
