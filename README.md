# 용돈기입장

아이 용돈 통장을 가족이 함께 적는 웹 앱. 홈 화면에 추가해서 앱처럼 쓴다.

- 아이별 통장 — 날짜 · 용도 · 금액 · 누적 총액, 월별 합계. 좌우로 밀면 다른 아이
- 용도를 치면 받은 돈/쓴 돈이 따라온다 (`용돈` → 받은 돈). 금액칸은 늘 끝에서 치고 끝에서 지운다
- 매주 정해진 요일에 용돈 자동 입금
- 잔액을 누르면 아이에게 보여주는 화면 — 지폐와 동전 그림. 빌려 쓴 만큼은 빈 자리로. 한 줄을 길게 누르면 그 금액만 같은 그림으로
- 가족 코드 하나로 기기 연결. 계정도 비밀번호도 없음
- 처음 시작한 폰에서는 열 단계 안내가 그 자리에서 한 번씩 해 보게 한다(부호·잔액·밀기·길게/짧게 누르기·설정). 설정 → 처음 안내 · 다시 보기
- 기록 전체를 엑셀로 열 수 있는 파일로 내보내기
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

## 지인에게 줄 때

⚙ 설정 → 초대에서 10분 열어두고, 아래 글을 보낸다.

```
용돈기입장 주소예요: https://danggeun.github.io/family-ledger/
1. 아이폰은 사파리로 열어 공유 → 홈 화면에 추가, 그 아이콘으로 열어요. 안드로이드는 열면 "홈 화면에 추가" 버튼이 있어요.
2. 제가 10분 동안 열어둔 사이에 "새로 시작하기"로 아이 이름과 지금 가진 돈을 넣으면 끝이에요.
3. 다른 폰도 같이 보려면 설정 → 동기화의 코드로 "가족 코드로 참여".
처음 열면 안내가 한 바퀴 돌아요. 다시 보려면 설정 → 처음 안내.
```

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

파일을 덮어쓰고 push. `config.js`는 건드리지 않는다(저장소에 올라가 있는 건 의도 — Pages 가 그대로 쓰는 공개 가능한 키다).
CHANGELOG 에 "쓰던 프로젝트라면 …" SQL 이 적힌 버전은 **그 SQL 을 Supabase SQL Editor 에서 먼저 실행하고** push 한다.
지금까지의 그런 SQL 은 `schema.sql` 맨 아래 "쓰던 프로젝트 올리기" 절에 모아 두었다 — 어느 버전에서 왔든 그 절을 통째로 실행하면 된다(전부 재실행해도 안전).
화면과 기능은 앱을 두 번 열면 반영된다. `index.html`의 `APP_VERSION`과 `sw.js`의 `CACHE`는 같은 값으로 맞춘다.

아이콘이나 실행 화면(`splash/`)이 바뀌면 홈 화면 앱을 지우고 다시 추가해야 한다 — 설치할 때 구워지기 때문이다.
(안드로이드는 놔둬도 하루쯤 뒤 알아서 갱신되지만, 앱을 다 닫고 충전 중 + 와이파이여야 한다.)
지우기 전에 가족 코드를 확인해 둘 것.

## 개발

```
npm install
npx playwright install chromium
npm test
```

테스트는 실제 화면(Chromium)을 띄워서 확인한다 — 크로미움을 내려받을 수 있는 네트워크가 필요하다. 크로미움이 따로 있으면 `PW_CHROMIUM=/경로/chrome npm test`.
파일 여러 개를 동시에 돌린다(CPU 수, 최대 4). 2코어에서 전체 약 2분. `npm test -- tour` 는 이름에 tour 가 든 파일만, `npm test -- -j1` 은 하나씩.
GitHub 의 main 에 올리면 Actions 가 전체 테스트를 돌린다(`.github/workflows/test.yml`, 약 5분) — 결과는 커밋 옆 ✓/✗ 와 Actions 탭. 화면 스냅샷은 기준을 찍은 기계와 글꼴이 조금 다를 수 있어 거기선 참고로만 센다(다르면 경고 + 비교 그림을 내려받을 수 있다).

`config.js`가 실제 서버를 가리키고 있어도 테스트는 로컬 모드로 돈다(`tests/_env.js`).
서버가 필요한 경로(끊김·복구·세션 유실·되돌리기·나눠 받기)는 가짜 서버(`tests/_fake.js` — PostgREST 처럼 id 순·나눠 주기, 모드 live/dead/noinit/down)로 확인하고, 서비스워커는 테스트 안에서 http 서버를 띄워 확인한다(`sw`).
`regress-x.y.z` 는 그 버전의 점검에서 나온 결함을 고정한 테스트다(케이스 이름의 `H1/M2/A3` 는 그때 점검 목록의 번호). 새로 넣는 테스트는 고치기 전 코드에서 실패하는 것을 확인하고 넣는다.
`snapshot` 은 화면 열한 장을 고정 날짜·고정 시드로 찍어 `tests/snapshots/` 의 기준과 **픽셀 단위로** 비교한다. 화면을 일부러 바꾼 버전에서만 `SNAP=update npm test -- snapshot` 으로 기준을 다시 찍는다(버전 글자가 06·11 에 찍혀 버전을 올릴 때마다 그 둘은 바뀐다).
`unit` 은 계산 함수(잔액·용도→부호·돈 그림 분해·날짜·CSV·첫 용돈 후보)를 화면 없이 `window.__app` 으로 부르고, 두 곳에 적어 손으로 맞추는 값(버전·CDN·종이색·아이 화면 색)과 맨 바깥 함수 이름 겹침을 확인한다.

모든 테스트는 `tests/_harness.js` 를 쓴다. **고정 시간으로 기다리지 않는다** — 느린 기계·동시 실행에서 깨지고 빠른 기계에선 시간을 버린다.
`ready`(부팅 끝) · `settle`(애니메이션 끝) · `idle`(닫기·복사본·안내 교정까지 끝) · `back` · `popped/reloaded/toasted(p, act)` · `until`(던지지 않는 조건 대기) 로 결과를 기다린다.
손가락 끌기(`touch`/`swiper`)는 이벤트 시각을 직접 찍어서, 기계가 바빠도 "빠르게 튕기기" 속도가 정확하다.
진짜 시간이 조건인 곳(길게 누르기 0.5초, 서비스워커의 4초 경주)만 예외로, 그 자리에 `// 진짜 시간:` 이라고 적는다.

### 코드 지도 (`index.html`)
- **상태는 `S` 하나.** 선언에 모든 칸이 주석과 함께 적혀 있다. 화면을 정하는 값은 `S` 바로 아래, 다시 그리기와 상관없는 런타임 값(전환 방향·타이머·뒤로 가기 스택 등)은 `S.ui`. 입력줄은 `S.draft`(`newDraft()`). `S.screen`(loading·fail·onboard·home·settings) + 시트 플래그(`edit·editOpen·editKid·editWeek·editGate·pickDate`) + 떠 있는 화면(`kidView·entryView·tour`) 의 조합이 곧 화면이다. `render()` 는 매번 root 를 비우고 전부 다시 그린다.
- **다시 그리면 안 되는 순간**이 있다 — 적는 중(키보드)과 전환 애니메이션 중. `typing()` 이 참이면 `reload` 는 `S.renderLater` 로 미루고 입력칸을 떠날 때(`focusout`) 그린다. 부호 버튼·칩처럼 입력줄 안에서 바뀌는 건 `render()` 대신 그 자리만 고친다(`setSign`, `redrawChips`). 새 입력칸을 더하면 이 규칙을 같이 봐야 키보드가 안 내려간다.
- **저장은 전부 낙관 반영 + 실패하면 직전 값만 되돌리기**(`tryStore(req, undo)`). 새 기록(`submitNew`)만 따로 — 실패하면 치던 것을 입력줄에 돌려준다.
- **닫기는 전부 `history`** — 열 때 `navOpen(key)` 가 pushState, 닫을 때 `navBack()` 이 `history.back()`, 실제 정리는 `popstate` 한 곳(`navCloseTop`). 안드로이드 뒤로 가기와 같은 길이라 둘이 어긋나지 않는다.
- **손짓**: 아이 바꾸는 가로 밀기는 `hSwipe`(홈·아이 화면 공용) + 문턱 `SWIPE`/`swipeFar`. 끌어서 닫기(시트·설정)는 `DRAG_CLOSE`, 길게 누르기는 `LONG_PRESS` — 문턱 값은 각 상수 한 곳에.
- **전환**: 아이를 바꾸면 옛 화면의 복사본(`ghostOut`)이 밀려 나가고 새 화면이 들어온다. `S.ui.homeSlide/kidSlide` 가 방향을 `render` 에 넘긴다.
- **처음 안내**: 단계 표 `TOUR` 하나에 단계마다 성격(해 보기/보여주기)·곁화면·넘어가는 조건·밝힐 곳이 있다. `tourTick` 이 화면 상태를 보고 넘기고, `tourLayout` 이 막·구멍·카드를 놓는다. 설정 화면에서는 `.card.color / .card.week / .card.export` 와 `.gear / .nav .back` 이 **앵커**다 — 클래스나 순서를 바꾸면 안내가 조용히 틀어진다(tour.test 가 잡는다).
- **저장소**: `LocalStore`(이 기기 전용) 와 `SupaStore` 가 같은 Promise 인터페이스 — 받은 객체는 건드리지 않고 돌려주는 줄은 복사본이다. 서버에서 기록은 "이 id 다음부터" 1000줄씩 나눠 받는다. `ensureFamily()` 가 부팅·`reload`·온보딩의 한 길이고, 세션이 날아가면 캐시의 가족 코드로 조용히 다시 참여한다.
- **시트·입력칸은 헬퍼로**: `sheet(title, build)` + `sheetButtons(f, [[글, 클래스, 동작]])` + `field/labeledBox`, 금액칸은 `moneyInput`(숫자 키패드·천 단위 쉼표·엔터 키), 글자칸은 `textInput`. 키보드 동작을 고칠 땐 이 두 곳만 보면 된다.
- **실패 처리 세 갈래**: 되돌릴 게 있으면 `tryStore`, 없으면 `.catch(failToast("…"))`, 일부러 삼키는 건 `.catch(ignore)`(공유 창 닫기 등). 서버 응답은 `unwrap(r)` 이 `{data, error}` 를 풀어 에러면 던진다. 문구는 `errText`.
- **색은 CSS 토큰**(`:root` 의 `--ink … --kid-bg`). JS 에서 그리는 그림(돈·돼지)은 `KID_BG`·`COLORS` 를 쓴다.
- 파일 맨 위 `<script>` 시작에 **목차**가 있다. 여러 곳에 쓰는 값은 상수 하나로: `MAX_KIDS`·`ORDINALS`·`LIST_PAGE`·`GONE_MSG`·`THEME_PAPER`.
- **자동 용돈**(`ensureAllowances`): 마지막 `auto_key` 날짜(`lastAutoDay`) 다음 날과 `weekly_start` 중 늦은 날부터 오늘까지, 400일 바닥. 켜거나 요일을 바꿀 때 첫 날은 부모가 고른다(`firstPayChoices` — 가까운 그 요일·한 주 뒤). `unique(child_id, auto_key)` 라 두 폰이 같이 열어도 안 겹친다. 건너뛰기는 삭제가 아니라 `skipped` 숨김.

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
