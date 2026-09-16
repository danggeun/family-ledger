# 용돈기입장

아이 용돈 통장을 가족이 함께 적는 웹 앱입니다. 아이폰 홈 화면에 추가해 앱처럼 쓰고,
가족의 기기끼리 같은 기록을 실시간으로 봅니다. 앱스토어 없이 정적 호스팅 + Supabase만으로 동작합니다.

- 아이별 통장: 날짜 · 용도 · 금액 · 누적 총액. 월 구분선과 월별 받은 돈/쓴 돈 합계
- 매주 정해진 요일에 용돈 자동 입금 (한 주 건너뛰기 가능)
- 아이에게 보여주기: 잔액을 누르면 돼지저금통과 함께 지폐·동전 그림으로 보여줍니다
- 가족 코드 하나로 여러 기기 연결. 계정도 비밀번호도 없음 (익명 로그인)
- 전체 기록 텍스트 내보내기
- 서버 설정이 없으면 기기 안에만 저장하는 로컬 모드로 동작

## 구성

| | |
|---|---|
| 앱 | `index.html` 한 파일. 의존성은 supabase-js 하나 (CDN) |
| 호스팅 | 정적 파일이면 어디든. GitHub Pages 기준으로 설명 |
| 데이터 | Supabase (Postgres + 익명 인증 + Realtime). 스키마는 `schema.sql` |
| 홈 화면 앱 | `manifest.webmanifest` + `sw.js` (앱 껍데기만 캐시, 데이터는 항상 서버) |

저장소에는 데이터가 없습니다. 앱 코드와 Supabase 공개 키(`config.js`)뿐이며,
데이터 접근은 RLS(`schema.sql`)로 가족 단위로 제한됩니다.

## 설치

### 1. Supabase
1. [supabase.com](https://supabase.com) → New project (리전은 가까운 곳)
2. **SQL Editor** → `schema.sql` 내용을 붙여넣고 Run
3. **Authentication → Providers → Anonymous** → *Enable anonymous sign-ins* 켜고 **Save**
4. **Project Settings → API** 의 Project URL과 공개(anon/publishable) 키를 `config.js`에 입력
   (`config.example.js`를 복사해서 만듭니다)

URL은 `https://<ref>.supabase.co` 까지만 넣습니다. `/rest/v1` 같은 경로가 붙으면 안 됩니다.

### 2. 호스팅 (GitHub Pages)
1. 저장소를 만들고 이 폴더를 올립니다
2. **Settings → Pages → Deploy from a branch → main / (root)**
3. 1~2분 뒤 `https://<계정>.github.io/<저장소>/` 에서 열립니다

### 3. 기기에 추가
첫 기기:
1. 사파리로 주소를 열고 공유 → **홈 화면에 추가**
2. **홈 화면 아이콘으로** 앱을 열어 *새로 시작하기* → 아이 이름과 현재 잔액 입력

다른 기기:
1. 같은 주소를 홈 화면에 추가하고 홈 화면 아이콘으로 엽니다
2. *가족 코드로 참여* → 첫 기기의 ⚙ 설정 화면에 있는 코드 입력

홈 화면 앱과 사파리는 저장 공간이 다릅니다. 사파리에서 먼저 시작해 버리면 홈 화면 앱에서는 다시 시작해야 하므로,
반드시 홈 화면 아이콘으로 열어서 시작합니다.

## 사용

- **적기** — 맨 위 줄에 용도와 금액을 넣고 ✓. 부호 버튼으로 받은 돈/쓴 돈 전환. 날짜는 오늘·어제·그저께 또는 달력
- **고치기** — 줄을 누르면 시트가 열립니다. 삭제는 두 번 눌러 확인
- **처음 금액** — 통장 맨 아래 줄. 누르면 고칠 수 있습니다
- **매주 용돈** — ⚙ 설정 → 아이 이름 줄 → 요일과 금액. 앱을 열 때 지난 날짜가 채워지며, 같은 날짜에 두 번 들어가지 않습니다(DB 제약). 자동 줄을 눌러 *이번 주 건너뛰기* 가능
- **아이에게 보여주기** — 잔액 숫자를 누릅니다. 아무 데나 누르면 닫힙니다
- **내보내기** — ⚙ 설정 → 기록 → 내보내기

## 알아둘 것

- **Supabase 무료 플랜**은 일주일 동안 요청이 없으면 프로젝트가 일시정지됩니다. 데이터는 남아 있으며 대시보드에서 Restore 하면 됩니다.
- **익명 로그인**은 기기별입니다. 사파리 데이터를 지우거나 앱을 지우면 그 기기의 로그인만 사라지고, 기록은 가족에 묶여 서버에 그대로 있습니다.
  *가족 코드로 참여*를 다시 하면 됩니다. 코드는 가족의 다른 기기 설정 화면에 있고, 없으면 SQL Editor에서 `select code from families;`.
- 앱을 몇 시간 만에 열 때 오류 토스트가 잠깐 보였다 사라질 수 있습니다. 만료된 토큰 갱신과 첫 요청이 겹친 것으로, 바로 정상 동작합니다.

## 업데이트

파일을 덮어쓰고 push 하면 됩니다. `config.js`는 건드리지 않습니다.
화면과 기능은 재설치 없이 반영됩니다 (앱을 두 번 열면 새 버전. 설정 맨 아래에 버전 표시).
**아이콘이 바뀐 경우**에만 홈 화면 앱을 지우고 다시 추가해야 합니다 — 지우기 전에 가족 코드를 확인해 두세요.

배포 전 확인:
- `index.html`의 `APP_VERSION`과 `sw.js`의 `CACHE`를 같은 버전으로 올립니다 (캐시 이름이 바뀌어야 옛 캐시가 버려집니다)
- 변경 내용을 `CHANGELOG.md`에 적습니다

DB 스키마가 바뀌는 릴리스는 CHANGELOG에 실행할 SQL을 함께 적습니다.

## 개발

```
npm install
npx playwright install chromium
npm test
```

테스트는 Playwright로 실제 화면을 띄워 확인합니다 (`tests/`). 서버 없이 로컬 모드로 돕니다.

### 파일
- `index.html` — 앱 전체 (마크업 · 스타일 · 로직)
- `config.example.js` → `config.js` — Supabase 연결 정보
- `schema.sql` — 테이블 · RLS · RPC · Realtime
- `manifest.webmanifest`, `sw.js` — PWA
- `icon-*.png`, `apple-touch-icon.png`, `logo-*.png` — 아이콘. 직접 고치지 말고 아래 스크립트로 생성
- `logo/logo-master.png` — 로고 원본 (1024×1024, 배경 `#FDF6E7`)
- `tests/` — 화면 테스트

### 아이콘 만들기
모든 아이콘 PNG는 `logo/logo-master.png` 한 장에서 만듭니다.

```
pip install pillow numpy
npm run icons
```

홈 화면 아이콘(`icon-192/512`, `apple-touch-icon`), 안드로이드용 maskable(안전 영역에 맞춰 0.84배),
시작 화면용 `logo-mark`, 아이 화면용 `logo-pig`, 잔액 옆 `logo-pig-sm`(배경 투명)이 생성됩니다.

### 설계 메모
- 글자 크기는 7단계(`--t1`~`--t7`), 간격은 4px 격자(`--s1`~`--s6`)만 씁니다. 입력칸은 16px 이상 (iOS 확대 방지)
- 색은 역할 하나에 하나: 검정 = 숫자·본문, 초록 = 받은 돈, 아이 색 = 선택된 탭. 잔액은 검정
- 아이 색 키(`COLORS`)는 지우지 않습니다. 기존 데이터가 그 키를 참조합니다
- 자동 입금은 `unique (child_id, auto_key)`로 중복을 막습니다. 스케줄러 없이 앱을 열 때 채웁니다

## 버전
[Semantic Versioning](https://semver.org/lang/ko/)을 따릅니다. 변경 내역은 `CHANGELOG.md`.

## 라이선스
MIT. `LICENSE` 참고.
