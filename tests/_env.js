// 테스트는 로컬 모드로 돈다 — config.js 가 실제 Supabase 를 가리키고 있어도.
// (전에는 이 샌드박스에서 CDN 이 안 떠서 우연히 로컬이었다. 인터넷 되는 PC 에서 돌리면 실제 서버에 붙을 수 있었다.)
// config.js 의 `window.APP_CONFIG = …` 는 비엄격 모드라 잠긴 속성에 조용히 실패한다.
exports.LOCAL = () => { Object.defineProperty(window,'APP_CONFIG',{value:{SUPABASE_URL:'',SUPABASE_ANON_KEY:''},writable:false,configurable:false}); };
