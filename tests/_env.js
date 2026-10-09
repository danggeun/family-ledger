// 테스트는 로컬 모드로 돈다 — config.js 가 실제 Supabase 를 가리키고 있어도.
// (전에는 이 샌드박스에서 CDN 이 안 떠서 우연히 로컬이었다. 인터넷 되는 PC 에서 돌리면 실제 서버에 붙을 수 있었다.)
// config.js 의 `window.APP_CONFIG = …` 는 비엄격 모드라 잠긴 속성에 조용히 실패한다.
// 처음 안내(yd_tour)는 테스트에선 끈다 — 안내의 어두운 막이 다른 화면을 가린다. 안내 자체는 tour.test.js 가 LOCAL_RAW 로 본다.
exports.LOCAL = () => { Object.defineProperty(window,'APP_CONFIG',{value:{SUPABASE_URL:'',SUPABASE_ANON_KEY:''},writable:false,configurable:false}); try{ localStorage.setItem('yd_tour','done'); }catch(e){} };
exports.LOCAL_RAW = () => { Object.defineProperty(window,'APP_CONFIG',{value:{SUPABASE_URL:'',SUPABASE_ANON_KEY:''},writable:false,configurable:false}); };

// file:// 의 localStorage 는 새로고침 직전에 적은 값이 가끔 사라진다(샌드박스에서 확인. 앱과 무관).
// 새로고침 전에 저장소를 찍어 두고, 새로고침 뒤에 줄어 있으면 되돌려 넣고 한 번 더 새로고침한다.
exports.guard = (p) => {
  const orig = p.reload.bind(p);
  p.reload = async (opts) => {
    const snap = await p.evaluate(() => { const o={}; for(let i=0;i<localStorage.length;i++){ const k=localStorage.key(i); o[k]=localStorage.getItem(k); } return o; }).catch(() => null);
    const r = await orig(opts);
    if(snap){
      const keys = Object.keys(snap);
      const lost = await p.evaluate((ks) => ks.filter(k => localStorage.getItem(k) === null), keys).catch(() => []);
      if(lost.length){ await p.evaluate((s) => { for(const k in s) localStorage.setItem(k, s[k]); }, snap); await p.waitForTimeout(200); return orig(opts); }
    }
    return r;
  };
};
