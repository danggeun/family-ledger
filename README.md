# 용돈기입장

아이 용돈 통장을 가족이 같이 적는 웹 앱(PWA). 가족 코드로 연결한 폰들이 같은 통장을 본다.

[![test](https://github.com/danggeun/family-ledger/actions/workflows/test.yml/badge.svg)](https://github.com/danggeun/family-ledger/actions/workflows/test.yml)

**<https://danggeun.github.io/family-ledger/>** · 아이폰은 사파리, 안드로이드는 크롬. 홈 화면에 추가해 쓴다.

## 기능

- **통장**: 아이마다(넷까지) 날짜 · 용도 · 금액 · 잔액, 월 합계. 이름을 누르거나 좌우로 밀어 아이를 바꾼다.
- **부호 자동**: 용도를 치면 그 용도로 더 많이 적은 쪽(+/−)을 따른다. `용돈(큰아빠)` 는 `용돈` 과 같이 본다.
- **매주 용돈**: 정한 요일에 자동으로 들어간다. 주마다 건너뛰고 되돌릴 수 있다.
- **아이에게 보여주기**: 잔액을 누르면 지폐 · 동전 그림, 줄을 길게 누르면 그 금액만.
- **여러 기기**: 계정 없이 가족 코드로 연결, 실시간 반영.
- **내보내기**: 기록 전체를 CSV 로.
- **의견 · 오류 보고**: 설정 맨 아래 "의견 보내기"(보낸 것은 "전달됨" / "읽음"으로 보인다). 앱 오류는 자동으로 보고된다. 운영자 폰 한 대만 "받은 의견"으로 읽는다.
- **처음 안내**: 새 기기에서 처음 열면 직접 해 보는 안내가 돈다. 설정 → 처음 안내에서 다시.

연결이 끊기면 마지막으로 받은 내용을 보여 준다. 끊긴 동안은 저장되지 않는다.

## 설치

1. Supabase 새 프로젝트 → SQL Editor 에 `schema.sql` 전체를 붙여넣고 Run
2. Authentication → Providers → Anonymous sign-ins 켜기
3. Project Settings → API 의 URL 과 publishable 키를 `config.js` 에 넣는다(형식은 `config.example.js`, 비우면 이 기기 전용 모드)
4. GitHub 저장소 Settings → Pages → Deploy from a branch → `main` / (root)

폰에서는 주소를 열고 홈 화면에 추가한 뒤 **그 아이콘으로** 시작한다(아이폰은 사파리와 홈 화면 앱의 저장 공간이 따로다). 두 번째 폰부터는 *가족 코드로 참여*.

운영자 폰 지정: 처음 만든 가족의 폰에서 설정 → 의견 보내기 → "받은 의견을 이 폰에서 보기". 한 대만 되고, 지정된 뒤엔 다른 폰에 이 줄이 안 뜬다. 바꾸려면(앱을 다시 깔았을 때 등) SQL Editor 에서 `update app_gate set reader_user_id = null;` 뒤 새 폰에서 다시 지정.

## 지인에게 줄 때

설정 → 초대 → 잠깐 열어두기(10분)를 켜고 아래 글을 보낸다.

```
용돈기입장 주소예요: https://danggeun.github.io/family-ledger/
1. 아이폰은 사파리로 열어 공유 → 홈 화면에 추가, 그 아이콘으로 열어요. 안드로이드는 열면 "홈 화면에 추가" 버튼이 있어요.
2. 제가 10분 동안 열어둔 사이에 "새로 시작하기"로 아이 이름과 지금 가진 돈을 넣으면 끝이에요.
3. 다른 폰도 같이 보려면 설정 → 동기화의 코드로 "가족 코드로 참여".
처음 열면 안내가 한 바퀴 돌아요. 다시 보려면 설정 → 처음 안내.
```

## 운영

- Supabase 무료 플랜은 7일 동안 요청이 적으면 멈춘다. "연결이 안 돼요"가 계속되면 대시보드에서 Resume project(멈춘 뒤 1년 안이면 그대로 돌아온다).
- 앱을 지워도 기록은 가족에 남는다. 가족 코드로 다시 참여한다. 코드를 아무도 모르면 SQL Editor 에서 `select f.code, c.name from families f join children c on c.family_id = f.id;`
- 주소와 publishable 키는 공개다(`config.js`). 데이터는 RLS 로 가족마다 막혀 있고, 새 가족 만들기는 처음 만든 가족이 10분씩 열 때만 된다.

## 업데이트

`main` 에 push 하면 Actions 가 테스트하고 Pages 가 배포한다. 폰은 앱을 두 번 열면 새 판이 뜬다.

- CHANGELOG 에 `SQL:` 이 있는 버전은 **push 전에** `schema.sql` 전체를 SQL Editor 에서 다시 실행한다(여러 번 실행해도 안전).
- `재설치:` 가 있는 버전은 홈 화면 앱을 지우고 다시 추가한다(가족 코드를 먼저 확인).

## 개발

```bash
npm install && npx playwright install chromium
npm test             # 전체. 파일을 동시에 돌려 2코어에서 약 2분
npm test -- tour     # 이름에 tour 가 든 파일만
```

코드 지도 · 테스트 규칙 · 버전 올리기는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), 변경 내역은 [CHANGELOG.md](CHANGELOG.md).

## 라이선스

[MIT](LICENSE). supabase-js 도 MIT(`vendor/`).
