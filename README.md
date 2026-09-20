# 용돈기입장

아이 용돈 통장을 가족이 함께 적는 웹 앱. 홈 화면에 추가해서 앱처럼 쓴다.

- 아이별 통장 — 날짜 · 용도 · 금액 · 누적 총액, 월별 합계
- 매주 정해진 요일에 용돈 자동 입금
- 잔액을 누르면 아이에게 보여주는 화면 — 지폐와 동전 그림. 한 줄을 길게 누르면 그 금액만 같은 그림으로
- 가족 코드 하나로 기기 연결. 계정도 비밀번호도 없음
- 기록 텍스트로 내보내기
- 여러 기기가 같이 쓰므로, 줄을 눌러 고칠 때 마지막으로 손댄 것이 내 기기인지 알려준다

`index.html` 한 파일이고 의존성은 supabase-js 하나. 정적 호스팅 + Supabase로 돈다.

## 설치

### Supabase
1. New project (리전은 가까운 곳)
2. SQL Editor에 `schema.sql` 붙여넣고 Run
3. Authentication → Providers → Anonymous 켜고 **Save**
4. Project Settings → API의 Project URL과 공개 키를 `config.js`에 (`config.example.js` 복사)

URL은 `https://<ref>.supabase.co` 까지만. `/rest/v1` 이 붙으면 안 된다.

### 호스팅
저장소에 파일을 올리고 Settings → Pages → Deploy from a branch → main / (root).

### 기기에 추가
주소를 열고 **홈 화면에 추가** → 홈 화면 아이콘으로 앱을 열어서 시작한다.
브라우저와 홈 화면 앱은 저장 공간이 달라서, 브라우저에서 먼저 시작하면 홈 화면 앱에서 또 시작해야 한다.

두 번째 기기부터는 *가족 코드로 참여* → 첫 기기의 ⚙ 설정에 있는 코드를 넣는다.

## 알아둘 것

- Supabase 무료 플랜은 **일주일 동안 요청이 없으면 프로젝트가 멈춘다.** 데이터는 남아 있고 대시보드에서 Restore.
- 로그인이 기기별이라, 브라우저 데이터를 지우거나 앱을 지우면 그 기기의 로그인만 사라진다.
  기록은 가족에 묶여 서버에 있으니 *가족 코드로 참여*를 다시 하면 된다.
  코드는 가족의 다른 기기 설정에 있고, 없으면 `select code from families;`.
- 주소는 공개다. 정적 호스팅이라 공개 키가 브라우저로 내려가고 GitHub Pages에는 접근 제한이 없다.
  데이터는 RLS로 가족 단위로 막혀 있어 남의 기록은 안 보이고, **다른 사람이 새로 시작하는 것은 잠겨 있다.**
  ⚙ 설정 → 초대에서 10분씩 열어줄 수 있다 (처음 만든 가족의 기기에만 보인다).
- 연결이 안 되면 마지막으로 받은 내용을 보여주고 위에 안내가 뜬다. 눌러서 다시 시도.

## 업데이트

파일을 덮어쓰고 push. `config.js`는 건드리지 않는다.
화면과 기능은 앱을 두 번 열면 반영된다. `index.html`의 `APP_VERSION`과 `sw.js`의 `CACHE`는 같은 값으로 맞춘다.

아이콘이나 `splash.png`가 바뀌면 홈 화면 앱을 지우고 다시 추가해야 한다 — 설치할 때 구워지기 때문이다.
(안드로이드는 놔둬도 하루쯤 뒤 알아서 갱신되지만, 앱을 다 닫고 충전 중 + 와이파이여야 한다.)
지우기 전에 가족 코드를 확인해 둘 것.

## 개발

```
npm install
npx playwright install chromium
npm test
```

테스트는 실제 화면을 띄워서 확인한다. 서버 없이 로컬 모드로 돈다.

### 파일
- `index.html` — 앱 전체
- `config.example.js` → `config.js` — Supabase 연결 정보
- `schema.sql` — 테이블 · RLS · RPC · Realtime
- `manifest.webmanifest`, `sw.js` — PWA
- `logo/logo-master.png` — 로고 원본. 아이콘 PNG는 전부 여기서 나온다
- `tests/`

### 아이콘
`logo/logo-master.png`(1024 정사각) 하나에서 전부 만든다. PNG를 직접 고치면 다음 빌드에 덮어써진다.

```
pip install pillow numpy
npm run icons
```

## 라이선스
MIT
