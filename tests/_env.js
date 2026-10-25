// config.js 가 실제 서버를 가리켜도 로컬 모드로 돌게 APP_CONFIG 를 잠근다(config.js 의 대입은 비엄격 모드라 조용히 실패).
// 안내(yd_tour)는 막이 화면을 가리니 끈다. 안내 테스트는 LOCAL_RAW.
exports.LOCAL = () => { Object.defineProperty(window,'APP_CONFIG',{value:{SUPABASE_URL:'',SUPABASE_ANON_KEY:''},writable:false,configurable:false}); try{ localStorage.setItem('yd_tour','done'); }catch(e){} };
exports.LOCAL_RAW = () => { Object.defineProperty(window,'APP_CONFIG',{value:{SUPABASE_URL:'',SUPABASE_ANON_KEY:''},writable:false,configurable:false}); };

// file:// 의 localStorage 는 새로고침 직전에 쓴 값이 가끔 사라진다(앱과 무관).
// 새로고침 뒤 키가 사라졌으면 되돌려 넣고 한 번 더 새로고침한다.
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
