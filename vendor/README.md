# vendor

`supabase-js-2.45.4.js` 는 npm `@supabase/supabase-js@2.45.4` 의 `dist/umd/supabase.js` 를 바이트 그대로 옮긴 것이다(MIT, `supabase-js-LICENSE`).
바깥 CDN 을 믿지 않아도 되고, CDN 이 느리거나 막혀도 앱이 뜨도록 저장소에 둔다.

- sha384: `0w2KAL2YHP6wKOkUDzkCDGgVvfmHnj02DHeQ6XcHOgTfFsGyonKOpShMH1x6nk9o`. unit 테스트가 확인하므로 파일을 손으로 고치면 실패한다.
- 같은 패키지의 `591.supabase.js` 조각은 브라우저에 WebSocket 이 없을 때만 쓰여서 옮기지 않았다(지금 폰에는 모두 있다).

## 버전 올리기

1. `npm pack @supabase/supabase-js@<버전>`
2. 압축 안의 `package/dist/umd/supabase.js` 를 `vendor/supabase-js-<버전>.js` 로 복사하고 옛 파일은 지운다.
3. 같이 바꾼다: `index.html` 의 `SUPABASE_JS` · `sw.js` 의 `ASSETS` · 위 sha384 · `tests/unit.test.js` 의 sha384.
4. 파일 이름이 바뀌므로 배포할 때 모든 파일을 한 번에 올린다.
