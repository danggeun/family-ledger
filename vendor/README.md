# vendor

`supabase-js-2.45.4.js` — npm 의 `@supabase/supabase-js@2.45.4` 패키지에 든 `dist/umd/supabase.js` 를 **바이트 그대로** 옮긴 것(MIT, `supabase-js-LICENSE`).
1.3.6 전엔 jsdelivr CDN 에서 받았다. 바깥 서버(CDN)를 믿지 않아도 되게, 그리고 그 서버가 느리거나 막혀도 앱이 서도록 저장소에 둔다.

- sha384: `0w2KAL2YHP6wKOkUDzkCDGgVvfmHnj02DHeQ6XcHOgTfFsGyonKOpShMH1x6nk9o` (unit 테스트가 확인 — 손으로 고치면 실패한다)
- 버전을 올릴 때: `npm pack @supabase/supabase-js@<버전>` → 압축 안의 `package/dist/umd/supabase.js` 를 새 이름으로 복사 → `index.html` 의 `SUPABASE_JS`, `sw.js` 의 ASSETS, 위 sha384, unit 테스트의 값을 같이 바꾼다.
- 같은 폴더의 `591.supabase.js` 조각은 브라우저에 WebSocket 이 없을 때만 쓰는 것이라(모든 폰에 있다) 옮기지 않았다.
