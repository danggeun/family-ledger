# 용돈기입장 구조

고치기 전에 읽는 코드 지도. 사용법과 설치는 [README](../README.md).

## 1. 한 파일

앱은 `index.html` 하나다(HTML · CSS · JS, 빌드 없음). 의존성은 supabase-js 하나(`vendor/`).
스크립트 맨 위 목차와 같은 순서로 놓여 있다.

```
유틸 → 저장소(LocalStore · SupaStore) → 상태 S → 계산(잔액 · 용도) → 아이에게 보여주기(돈 그림)
→ 자동 입금 → 마지막으로 받은 내용(캐시) → 처음 안내(TOUR) → 데이터 로드(ensureFamily · reload)
→ 렌더(홈 · 입력줄 · 시트) → 화면 열고 닫기(navStack ↔ history) → 설정 → 시작 화면 → 부팅
```

테스트는 `window.__app` 으로 상태와 계산 함수를 직접 본다.

## 2. 상태와 그리기

- 상태는 `S` 하나다. 모든 칸이 선언에 주석과 함께 있다. 새 상태도 선언에 더한다.
  - 화면을 정하는 값: `S.screen`(loading · fail · onboard · home · settings) + 시트(`edit` · `editOpen` · `editKid` · `editWeek` · `editGate` · `pickDate`) + 떠 있는 화면(`kidView` · `entryView` · `tour`)
  - `S.draft`: 입력줄. 초기값은 `newDraft()` 한 곳
  - `S.ui`: 다시 그리기와 상관없는 런타임 값(전환 방향, reload 직렬화, 화면 스택, 타이머)
- `render()` 는 root 를 비우고 `S` 만 보고 전부 다시 그린다. 화면 위에 뜨는 것은 `OVERLAYS` 에 한 줄(`[S 의 키, 그리는 함수]`)로 더하면 그리기와 처음 안내가 같이 안다.
- 다시 그리면 안 되는 순간: 칸에 커서가 있을 때(`typing()`)와 전환 중. 이때 끝난 `reload` 는 `S.renderLater` 로 미루고 칸을 떠날 때(`focusout`) 그린다. 입력줄 안의 부호 버튼 · 칩은 `render()` 대신 그 자리만 고친다(`setSign`, `redrawChips`). render 하면 키보드가 내려간다.
- "적는 중"은 둘로 나뉜다.
  - `keyboardUp()`: 용도 칩이 열렸거나 입력줄 글자칸에 커서. 홈 좌우 밀기만 막는다.
  - `writingEntry()`: `keyboardUp()` 또는 날짜 칩. 이때 목록을 누르면 열지 않고 닫기만 한다.
  - 버튼(−/+ · 날짜 · ✓)에 남은 포커스는 어느 쪽도 아니다. 폰에서 누른 버튼에는 포커스가 남는다.
- 전환: 아이를 바꾸면 옛 화면의 복사본(`ghostOut`)이 밀려 나가고 새 화면이 들어온다. 방향은 `S.ui.homeSlide` / `kidSlide`.

## 3. 화면 열고 닫기

모든 시트와 화면은 `history` 로 닫는다. 열 때 `navOpen(key, open)` 이 pushState, 닫을 때 `navBack()` 이 `history.back()`, 실제 정리는 `popstate` 한 곳(`navCloseTop`). 안드로이드 뒤로 가기와 같은 길이라 둘이 어긋나지 않는다. 스택은 `S.ui.navStack`.

시트는 `sheet(title, build)` + `sheetButtons(f, [[글, 클래스, 동작]])` + `field` / `labeledBox` 로 만든다. 금액칸은 `moneyInput`(숫자 키패드 · 천 단위 쉼표 · 커서는 늘 끝), 글자칸은 `textInput`. 키보드 동작은 이 두 함수에서 고친다.

## 4. 손짓

| 손짓 | 어디 | 코드 | 문턱 |
|---|---|---|---|
| 좌우로 밀어 아이 바꾸기 | 홈 · 아이 화면 | `hSwipe` | `SWIPE`: 가장자리 40px 무시, 10px 넘으면 끌기, 60px · 0.45px/ms 넘게 튕기거나 폭의 22% |
| 아래로 끌어 시트 닫기 | 모든 시트 | `sheetDrag` | `DRAG_CLOSE.SHEET`: 40px · 0.4px/ms 또는 높이의 30% |
| 왼쪽 가장자리에서 끌어 닫기 | 설정 | `edgeSwipe` | `DRAG_CLOSE.SCREEN`: 가장자리 32px 안에서 시작, 폭의 35% |
| 길게 누르기 | 목록 줄 | — | `LONG_PRESS`: 0.5초, 10px 넘게 움직이면 취소 |
| 좌우로 밀어 달 넘기기 | 달력 시트 | — | 화살표와 같다. 이번 달 뒤로는 안 간다 |

- 모든 끌기(`hSwipe` · `edgeSwipe` · `sheetDrag`)는 처음 움직임으로 축을 한 번 정한다. 아래가 우세할 때만 시트를 닫고, 옆이 우세하면 놓아 준다.
- 좌우로 끈 터치의 click 하나는 버린다(`S.ui.homeDragClick` · `kidDragClick`).
- 새 손짓을 넣으면 같은 화면의 다른 손짓과 비스듬히 밀어 본다. 달력 밀기와 시트 닫기가 대각선에서 부딪혔다.
- 숨은 동작(보이는 단서 없이 해야 아는 것)은 여섯이다: 잔액 누르기 · 줄 길게 누르기 · 설정 가장자리 끌기 · 적는 중 목록 누르기 → 닫기만 · 아이 화면 좌우 · 홈 좌우. 하나를 더하려면 하나를 뺄 수 있는지 먼저 본다.

## 5. 저장소와 동기화

- `LocalStore`(이 기기만, localStorage)와 `SupaStore` 는 같은 Promise 인터페이스다. 받은 객체를 바꾸지 않고 복사본을 돌려준다. 그래서 로컬 모드가 서버 모드와 똑같이 돈다.
- 로그인은 기기마다 익명 로그인. 기기는 `family_members` 로 가족에 묶인다.
- `ensureFamily()` 가 부팅 · `reload` · 온보딩의 한 길이다. 세션이 사라지면(supabase-js 가 `SIGNED_OUT`) 캐시에 남은 가족 코드로 조용히 다시 참여한다.
- 기록은 "이 id 다음부터" 1000줄씩 나눠 받는다(Supabase 한 번 최대 1000줄). 정렬은 날짜 → 적은 시각 → id 라 폰마다 누적 금액 순서가 같다.
- 실시간: 가족 필터를 건 `postgres_changes` 구독(entries · children). 이벤트가 오면 0.3초 뒤 `reload`. 앱으로 돌아올 때(`visibilitychange`)와 띠의 "다시"도 `reload`.
- `reload` 는 직렬화된다. 받는 중에 또 부르면 한 번 더 받고, 돌려주는 약속은 그 "한 번 더"가 끝날 때 풀린다.
- 마지막으로 받은 내용은 `yd_cache_v1` 에 둔다. 서버가 안 되면 그걸 보여주고 `S.offline` 띠를 띄운다. 오프라인 쓰기는 없다(설계).

## 6. 실패 처리

| 경우 | 쓰는 것 |
|---|---|
| 되돌릴 값이 있다 | `tryStore(req, undo)`: 화면에 먼저 반영하고, 실패하면 바꾸기 직전 값만 되돌린다 |
| 되돌릴 게 없다 | `.catch(failToast("…"))` |
| 일부러 삼킨다(공유 창 닫기 등) | `.catch(ignore)`, 이유를 주석으로 |
| 새 기록(`submitNew`) | 실패하면 치던 것을 입력줄에 돌려준다. 같은 아이일 때만, 아니면 "서윤 저장 실패"처럼 누구 것인지 알린다 |

서버 응답은 `unwrap(r)` 이 `{data, error}` 를 풀고 에러면 던진다. 문구는 `errText`. 다른 폰이 지운 줄을 고치면 `GONE_MSG`("다른 폰에서 지운 기록이에요").

## 7. 자동 용돈

`ensureAllowances()` 가 매주 용돈 줄을 채운다.

- 시작: 마지막 자동 줄의 날짜(`lastAutoDay`, `auto_key` = `w:YYYY-MM-DD` 의 날짜) 다음 날과 `weekly_start` 중 늦은 날. 오늘보다 뒤인 열쇠(시계가 앞선 기기가 넣은 것)는 무시한다.
- 바닥은 400일 전. 오래 안 열었어도 몇 년치를 한꺼번에 넣지 않고, 루프는 늘 오늘까지 간다.
- 두 폰이 같이 열어도 `unique(child_id, auto_key)` 라 안 겹친다.
- 건너뛰기는 삭제가 아니라 `skipped = true`(숨김). 그래서 되돌릴 수 있다.
- 켜거나 요일을 바꿀 때 첫 날은 부모가 고른다. `firstPayChoices` 가 두 후보(가까운 그 요일 · 한 주 뒤)와 미리 골라 둘 쪽을 준다. 처음 켜면 가까운 날, 요일만 바꾸면 원래 받을 날(마지막 + 7일, 아직 안 온 첫 날이 있으면 그 날)에 가까운 날.

## 8. 처음 안내

- 단계 표 `TOUR` 하나에 단계마다 성격(`do` 해 보기 / 보여주기) · 곁화면(`view`) · 넘어가는 조건(`arrive`) · 밝힐 곳(`spot`) · 있을 조건(`only`)이 있다. 표 위 주석이 각 칸의 뜻.
- 순서는 `TOUR_ORDER`: sign · bal · swipe · press · edit · gear · color · week · export · sync · back, 끝에 done 한 장. swipe 는 아이가 둘 이상일 때만, sync 는 동기화 모드에서만 있다(9~11단계).
- `tourTick` 이 render 마다 화면 상태를 보고 넘기고, `tourLayout` 이 막 · 구멍 · 카드를 놓는다. 스크롤 뒤에는 `tourSettle` 이 자리를 다시 잰다(여섯 프레임 그리고 0.12초 동안 그대로면 끝).
- 설정 화면의 앵커: `.card.color` · `.card.week` · `.card.export` · `.card.sync` · `.gear` · `.nav .back`. 클래스나 순서를 바꾸면 안내가 조용히 틀어진다(`tour` 테스트가 잡는다).
- 이미 쓰던 흔적(캐시)이 있는 기기에는 뜨지 않는다.

## 9. 데이터

`schema.sql`. 새 프로젝트는 통째로 한 번, 쓰던 프로젝트는 맨 아래 "쓰던 프로젝트 올리기" 절.

| 테이블 | 내용 |
|---|---|
| `families` | 가족과 가족 코드(`ABCD-1234`, I · O · 0 · 1 없음) |
| `family_members` | 가족 ↔ 익명 로그인 기기 |
| `children` | 이름 · 색 · 순서 · 처음 금액 · 매주 용돈(`weekly_on/dow/amount/start`) |
| `entries` | 날짜 · 용도 · 금액(+ 받은 돈, − 쓴 돈) · 적은/고친 기기 · `auto_key` · `skipped` |
| `app_gate` | 새 가족 만들기 잠금. 주인 가족과 열림 시각 |

- RLS: `is_member(family_id)`. 기록의 아이는 그 기록과 같은 가족이어야 한다(1.3.2 의 FK).
- RPC: `create_family` · `join_family` · `open_families`(주인만, 분 단위) · `gate_state`(열림 시각은 주인에게만). 로그인한 사용자(authenticated)만 부를 수 있다.
- 실시간: `entries` · `children` 를 `supabase_realtime` 에, `replica identity full`. 기본값은 지운 줄의 PK 만 보내 가족 필터에 걸리지 않는다. 필터 없는 DELETE 구독은 다른 가족의 줄까지 받으므로 쓰지 않는다.

## 10. 서비스워커

`sw.js` 는 앱 껍데기(`ASSETS`)만 캐시한다. 데이터 요청은 건드리지 않는다.

- 네트워크 우선. 4초 안에 안 오면 캐시. 503 · 404 는 캐시에 넣지도 보여 주지도 않는다(캐시가 있으면 캐시).
- 설치 때는 `cache: "reload"` 로 서버에서 새로 받는다(Pages 의 HTTP 캐시 10분을 건너뛰려고). 파일 하나가 실패해도 설치는 된다.
- 캐시 이름 `CACHE = "yd-" + APP_VERSION`. 이름이 바뀌어야 옛 캐시가 지워진다.

## 11. 화면 값

- 색은 `:root` 토큰(`--paper` · `--ink` · `--in` · `--danger` · `--kid-bg` …). JS 에서 그리는 그림(돈 · 돼지)은 `KID_BG` · `COLORS`.
- 아이 색 6가지(`COLORS`): 밑줄 · 점은 `hex`, 이름 글자는 대비를 맞춘 `name`. 키를 지우면 그 색을 쓰던 아이가 파랑이 된다.
- 글자 크기는 `--t1`~`--t7`(11 · 12 · 13 · 15 · 17 · 28 · 44px) 7단계. 예외는 아이 이름 `--t5b` 22px, 가족 코드 칸 21px.
- 간격은 4px 격자(`--s1`~`--s6`).
- 여러 곳에 쓰는 값은 상수 하나로: `MAX_KIDS`(4) · `ORDINALS` · `LIST_PAGE`(60) · `GONE_MSG` · `THEME_PAPER` · `SUPABASE_JS`.
- 주석에는 이유만 쓴다. 이력은 CHANGELOG.

## 12. 테스트

`npm test` = `tests/run.js`. 파일마다 브라우저를 따로 띄워 CPU 수만큼(최대 4) 동시에 돌린다.

| 파일 | 보는 것 |
|---|---|
| `core` | 한 바퀴: 첫 시작 · 적기 · 칩 · 고치기 · 지우기 · 매주 용돈 · 건너뛰기 |
| `ledger` · `entry-view` · `kid-view` · `date-pick` | 목록 · 용도 칩과 한 줄 그림 · 아이 화면 · 달력 |
| `home-swipe` · `sheet-drag` · `weekly-colors-swipe` · `back` | 손짓 · 매주 용돈 시트 · 색 · 뒤로 가기 |
| `settings` · `gate` · `tour` | 설정 · 초대 잠금 · 처음 안내 |
| `resilience` · `sync-robust` · `sw` | 서버 장애 · 세션 유실 · 되돌리기 · 서비스워커 |
| `unit` | 계산 함수(잔액 · 용도→부호 · 돈 그림 분해 · 날짜 · CSV · 가족 코드)와 두 곳에 적는 값의 일치 |
| `snapshot` | 화면 11장을 고정 날짜 · 고정 시드로 찍어 `tests/snapshots/` 와 픽셀 비교 |
| `regress-x.y.z` | 그 버전에서 고친 결함. 케이스 이름의 `H1` · `M2` 는 그때 점검 목록의 번호 |

- **하네스(`tests/_harness.js`)**: 모든 파일이 쓴다. 고정 시간으로 기다리지 않고 결과를 기다린다. `ready`(부팅 끝) · `settle`(애니메이션 끝) · `idle`(닫기 · 복사본 · 안내 교정까지 끝) · `back` · `popped/reloaded/toasted(p, act)` · `until`(던지지 않는 조건 대기).
  진짜 시간이 조건인 곳(길게 누르기 0.5초, 서비스워커 4초)만 예외로, 그 자리에 `// 진짜 시간:` 을 적는다.
- **터치**: `touch(p)` 는 CDP 터치에 시각을 직접 찍는다. "빠르게 튕기기" 판정이 기계 부하와 상관없다. 누른 버튼에 포커스가 남는 폰 동작도 CDP 터치로만 재현된다.
- **페이지**: `localPage(b, {clock})` 는 로컬 모드 + 시계 고정, `fakePage` 는 가짜 Supabase(`tests/_fake.js`). 가짜는 PostgREST 처럼 id 순으로 나눠 주고, 모드는 live · dead · noinit · down, `insertHold` / `release` 로 저장을 붙잡아 둘 수 있다.
- **unit 의 일치 검사**: `APP_VERSION` = `sw.js` `CACHE` = `package.json` version · `SUPABASE_JS` 경로 = `sw.js` ASSETS · vendor 파일 sha384 · 종이색(CSS · JS · theme-color · manifest) · `--kid-bg` = `KID_BG` · 맨 바깥 함수 이름 겹침(한 파일이라 뒤의 것이 앞의 것을 덮는다).
- **스냅샷**: 화면을 일부러 바꾼 버전에서만 `SNAP=update`. 06 · 11 에는 버전 글자가 찍혀 버전을 올릴 때마다 바뀐다. CI 에서는 달라도 경고만(`SNAP_STRICT=1` 이면 실패). 비교용 `*.actual.png` 는 올리지 않는다.
- 새 결함을 고치면 `regress-x.y.z` 에 테스트를 넣고, 고치기 전 코드에서 실패하는 걸 확인한다.
- "닫히지 않는다"는 단언은 닫기 타이머(`DRAG_CLOSE.OUT_MS`, 0.17초) 뒤까지 본다. 안내 막 밖을 누르는 테스트는 `elementFromPoint` 로 맨 위를 확인하고 누른다(`tour` 의 `tapOutside`, 막혀 못 누르면 `DIAG` 줄).

## 13. 버전 올리기

1. `index.html` `APP_VERSION` · `sw.js` `CACHE`(`yd-x.y.z`) · `package.json` version 을 같이 바꾼다.
2. `CHANGELOG.md` 맨 위에 사용자 말로. 재설치 · SQL 이 필요하면 첫 줄에.
3. SQL 이 있으면 `schema.sql` 본문과 "쓰던 프로젝트 올리기" 절 둘 다.
4. 스냅샷 06 · 11 은 버전 글자만 바뀐 걸 확인하고 기준을 바꾼다.
5. 새 파일이 생기면 배포할 때 모든 파일을 한 번에 올린다.

커밋 메시지는 영어 한 줄(`1.3.4: swipe with date chips open, calendar chip label, swipe months`). 저장소 안의 글(주석 · README · CHANGELOG · 테스트 이름)은 한국어.

## 14. 파일

| 파일 | 내용 |
|---|---|
| `index.html` | 앱 전체 |
| `config.js` | Supabase URL 과 publishable 키(공개). 형식은 `config.example.js`, 비우면 로컬 모드. `SUPABASE_JS` 로 라이브러리 주소를 바꿀 수 있다(테스트용) |
| `schema.sql` | 테이블 · RLS · RPC · 실시간 · 쓰던 프로젝트 올리기 |
| `sw.js`, `manifest.webmanifest` | 서비스워커, PWA 정보 |
| `vendor/` | supabase-js 2.45.4([vendor/README.md](../vendor/README.md)) |
| `logo/` | 아이콘 원본 `logo-master.png` 와 스크립트 |
| `splash/` | iOS 실행 화면, 기종별 한 장씩 |
| `icon-*.png`, `apple-touch-icon.png`, `logo-pig*.png` | 만들어진 아이콘과 앱 안 돼지 그림 |
| `tests/` | 테스트 · 하네스 · 가짜 Supabase · 스냅샷 기준 |
| `.github/workflows/test.yml` | push · PR 마다 전체 테스트 |

### 아이콘

모든 PNG 는 `logo/logo-master.png`(1024 정사각) 한 장에서 만든다. PNG 를 직접 고치면 다음에 만들 때 덮어써진다. 아이콘이 바뀌면 홈 화면 앱을 다시 설치해야 반영된다.

```bash
pip install pillow numpy scipy
npm run icons                 # icon-* · apple-touch-icon · logo-pig*
python logo/make_splash.py    # splash/* 와 index.html 에 넣을 <link> 줄
```
