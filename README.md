# 용돈기입장

아이 용돈 통장을 가족이 같이 적는 웹 앱(PWA). 홈 화면에 추가해 앱처럼 쓴다.
기록은 Supabase 에 가족 단위로 저장되고, 가족 코드로 연결한 폰들이 같은 통장을 본다.

[![test](https://github.com/danggeun/family-ledger/actions/workflows/test.yml/badge.svg)](https://github.com/danggeun/family-ledger/actions/workflows/test.yml)

**<https://danggeun.github.io/family-ledger/>** · 아이폰은 사파리, 안드로이드는 크롬.

## 기능

- **통장**: 아이마다 날짜 · 용도 · 금액 · 누적 잔액, 월마다 합계. 아이는 넷까지, 이름을 누르거나 좌우로 밀어 바꾼다.
- **부호 자동**: 용도를 치면 받은 돈(+)/쓴 돈(−)이 정해진다. 가족 기록에서 그 용도로 더 많이 적은 쪽을 따르고, `용돈(큰아빠)` 는 `용돈` 과 같이 본다. 처음 보는 용도는 쓴 돈.
- **매주 용돈**: 요일과 금액을 정하면 그날 자동으로 들어간다. 처음 들어갈 날은 켤 때 고른다(가까운 그 요일 또는 한 주 뒤). 한 주씩 건너뛰고 되돌릴 수 있다.
- **아이에게 보여주기**: 잔액을 누르면 잔액만큼 지폐 · 동전 그림. 마이너스면 모자란 만큼 빈 틀. 줄을 길게 누르면 그 금액만.
- **고치기**: 줄을 누르면 날짜 · 용도 · 금액을 고치거나 지운다. 마지막으로 손댄 게 이 기기인지 다른 기기인지 보인다.
- **여러 기기**: 계정 · 비밀번호 없이 가족 코드로 연결. 다른 폰의 기록은 실시간으로, 앱으로 돌아올 때 한 번 더 받는다.
- **내보내기**: 기록 전체를 CSV 로. 엑셀에서 한글이 깨지지 않는다.
- **처음 안내**: 새 기기에서 처음 열면 9~11단계(아이가 둘 이상이면 밀기, 동기화 모드면 가족 코드가 더해진다)를 직접 해 보며 넘긴다. 설정 → 처음 안내에서 다시 볼 수 있다.

연결이 끊기면 마지막으로 받은 내용을 보여주고 위에 띠가 뜬다(누르면 다시 받기). 끊긴 동안 적은 줄은 저장되지 않고 입력줄에 남는다.

## 설치

### Supabase

1. New project
2. SQL Editor 에 `schema.sql` 을 통째로 붙여넣고 Run
3. Authentication → Providers → Anonymous sign-ins 켜고 Save
4. Project Settings → API 의 Project URL 과 publishable(anon) 키를 `config.js` 에 넣는다(`config.example.js` 참고)

`config.js` 의 두 값을 비워 두면 이 기기에만 저장하는 로컬 모드로 돈다(동기화 없음).

### 호스팅

GitHub 저장소 → Settings → Pages → Deploy from a branch → `main` / (root).

### 기기에 추가

주소를 열고 홈 화면에 추가한 뒤, **홈 화면 아이콘으로 열어서** 시작한다.
아이폰은 사파리와 홈 화면 앱의 저장 공간이 따로라, 사파리에서 시작하면 홈 화면 앱에서 다시 시작해야 한다. 카카오톡 · 네이버 같은 앱 안 브라우저도 마찬가지라 시작 화면이 경고를 띄운다.

두 번째 기기부터는 시작 화면의 *가족 코드로 참여* 에 첫 기기의 설정 → 동기화 → 가족 코드를 넣는다.

## 지인에게 줄 때

설정 → 초대 → 잠깐 열어두기(10분)를 켜고 아래 글을 보낸다. 새 가족 만들기는 평소에 잠겨 있다.

```
용돈기입장 주소예요: https://danggeun.github.io/family-ledger/
1. 아이폰은 사파리로 열어 공유 → 홈 화면에 추가, 그 아이콘으로 열어요. 안드로이드는 열면 "홈 화면에 추가" 버튼이 있어요.
2. 제가 10분 동안 열어둔 사이에 "새로 시작하기"로 아이 이름과 지금 가진 돈을 넣으면 끝이에요.
3. 다른 폰도 같이 보려면 설정 → 동기화의 코드로 "가족 코드로 참여".
처음 열면 안내가 한 바퀴 돌아요. 다시 보려면 설정 → 처음 안내.
```

## 운영

- **Supabase 무료 플랜**: 7일 동안 요청이 거의 없으면 프로젝트가 멈춘다. 앱에 "연결이 안 돼요" 띠가 계속 뜨면 대시보드에서 Resume project. 멈춘 뒤 1년 안에는 데이터와 설정이 그대로 돌아온다. 매일 쓰면 멈추지 않는다.
- **로그인은 기기마다**(익명 로그인): 앱을 지우거나 브라우저 데이터를 지우면 그 기기의 로그인만 사라진다. 기록은 가족에 묶여 있으므로 가족 코드로 다시 참여하면 된다. 코드를 아무도 모르면 SQL Editor 에서 `select f.code, c.name from families f join children c on c.family_id = f.id;`
- **공개 범위**: 정적 호스팅이라 주소와 publishable 키는 누구나 볼 수 있다(`config.js` 가 저장소에 있는 이유). 데이터는 RLS 로 가족마다 막혀 있어 다른 가족의 기록은 안 보인다. 새 가족 만들기는 잠겨 있고, 처음 만든 가족의 기기만 설정 → 초대에서 10분씩 연다.

## 업데이트

파일을 덮어쓰고 `main` 에 push 하면 Actions 가 테스트를 돌리고 Pages 가 1~2분 안에 배포한다. 폰에서는 앱을 두 번 열면 새 판이 뜬다(설정 맨 아래 버전 글자로 확인).

- CHANGELOG 에 SQL 이 적힌 버전은 **그 SQL 을 먼저** Supabase SQL Editor 에서 실행한다. 지금까지의 SQL 은 `schema.sql` 맨 아래 "쓰던 프로젝트 올리기" 절에 모여 있고, 어느 버전에서 왔든 통째로 다시 실행해도 된다.
- 새 파일이 생긴 버전은 모든 파일을 한 번에 올린다. `index.html` 만 먼저 올리면 아직 없는 파일을 찾는다.
- 아이콘이나 실행 화면(`splash/`)이 바뀐 버전은 홈 화면 앱을 지우고 다시 추가해야 반영된다(설치할 때 고정된다). 지우기 전에 가족 코드를 확인해 둔다. 안드로이드는 그대로 두어도 하루쯤 뒤 바뀐다(앱을 닫고, 충전 중이고, 와이파이일 때).
- 되돌리기: `git revert HEAD --no-edit && git push`

## 개발

```bash
npm install
npx playwright install chromium
npm test                            # 전체. 파일을 CPU 수만큼(최대 4) 동시에, 2코어에서 약 2분
npm test -- tour                    # 이름에 tour 가 든 파일만
npm test -- -j1                     # 하나씩
SNAP=update npm test -- snapshot    # 화면을 일부러 바꾼 버전에서만: 스냅샷 기준 다시 찍기
```

테스트는 Playwright 로 Chromium 을 띄워 실제 화면에서 확인한다. Playwright 는 1.56.0 고정(스냅샷 기준을 찍은 Chromium 과 같은 판). Chromium 이 따로 있으면 `PW_CHROMIUM=/경로/chrome npm test`.
`config.js` 가 실제 서버를 가리켜도 테스트는 로컬 모드로 돌고(`tests/_env.js`), 서버가 필요한 경로는 가짜 Supabase(`tests/_fake.js`)로 확인한다.

GitHub Actions(`.github/workflows/test.yml`)가 `main` push 와 PR 마다 전체를 돌린다(약 5분). 결과는 커밋 옆 ✓/✗. CI 에서는 스냅샷이 기준과 달라도 경고만 내고 비교 그림을 artifact 로 남긴다.

앱은 `index.html` 한 파일(빌드 없음)이고 의존성은 supabase-js 하나(`vendor/`). **코드 지도**(상태 · 그리기 · 손짓 · 저장소 · 처음 안내 · 데이터), 테스트 규칙, 파일 목록과 아이콘 만들기는 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). 바뀐 내용은 [CHANGELOG.md](CHANGELOG.md).

## 라이선스

[MIT](LICENSE). supabase-js 는 MIT(`vendor/supabase-js-LICENSE`).
