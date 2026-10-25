# 용돈기입장 구조

고치기 전에 읽는 코드 지도. 사용법과 설치는 [README](../README.md).

## 1. 한 파일

앱은 `index.html` 하나다(빌드 없음). 의존성은 supabase-js(`vendor/`)뿐. 스크립트 맨 위 차례대로 놓여 있다.
테스트는 `window.__app` 으로 상태와 계산 함수를 직접 본다.

## 2. 상태와 그리기

- 상태는 `S` 하나. 모든 칸이 선언에 주석과 함께 있고, 새 상태도 거기에 더한다.
  화면 = `S.screen`(loading · fail · onboard · home · settings) + 시트 · 화면 플래그. `S.ui` 는 다시 그리기와 상관없는 런타임 값.
- `render()` 는 `S` 만 보고 전부 다시 그린다. 화면 위에 뜨는 것은 `OVERLAYS` 에 `[S 의 키, 그리는 함수]` 한 줄을 더한다.
- 칸에 커서가 있으면(`typing()`) 다시 그리지 않는다. 끝난 `reload` 는 `S.renderLater` 로 미뤘다가 칸을 떠날 때 그린다. 입력줄 안의 부호 · 칩은 그 자리만 고친다(`setSign`, `redrawChips`).
- "적는 중"은 둘이다. `keyboardUp()`(용도 칩 또는 글자칸에 커서)은 홈 밀기만 막는다. `writingEntry()`(키보드 또는 날짜 칩)이면 목록 탭은 닫기만 한다. 폰에서 누른 버튼에 남는 포커스는 어느 쪽도 아니다.

## 3. 화면 열고 닫기

열 때 `navOpen(key, open)` 이 pushState, 닫기는 전부 `navBack()` → `popstate` 한 곳(`navCloseTop`). 안드로이드 뒤로 가기와 같은 길이다.
시트는 `sheet(title, build)` + `sheetButtons` + `field` / `labeledBox`. 금액칸은 `moneyInput`, 글자칸은 `textInput`.

## 4. 손짓

| 손짓 | 어디 | 코드 | 문턱 |
|---|---|---|---|
| 좌우로 밀어 아이 바꾸기 | 홈 · 아이 화면 | `hSwipe` | `SWIPE`: 가장자리 40px 무시, 60px · 0.45px/ms 튕기기 또는 폭의 22% |
| 아래로 끌어 시트 닫기 | 모든 시트 | `sheetDrag` | `DRAG_CLOSE.SHEET`: 40px · 0.4px/ms 또는 높이의 30% |
| 왼쪽 가장자리에서 끌어 닫기 | 설정 | `edgeSwipe` | `DRAG_CLOSE.SCREEN`: 가장자리 32px 안, 폭의 35% |
| 길게 누르기 | 목록 줄 | — | `LONG_PRESS`: 0.5초, 10px 움직이면 취소 |
| 좌우로 밀어 달 넘기기 | 달력 시트 | — | 화살표와 같다 |

- 모든 끌기는 처음 움직임으로 축을 정한다. 새 손짓을 넣으면 같은 화면의 다른 손짓과 비스듬히 밀어 본다.
- 숨은 동작은 여섯이다(잔액 누르기 · 줄 길게 누르기 · 설정 가장자리 끌기 · 적는 중 목록 누르기 · 아이 화면 좌우 · 홈 좌우). 하나를 더하려면 하나를 뺄 수 있는지 먼저 본다.

## 5. 저장소와 동기화

- `LocalStore`(이 기기 전용)와 `SupaStore` 는 같은 Promise 인터페이스. 받은 객체를 바꾸지 않고 복사본을 돌려준다.
- 로그인은 기기마다 익명. `ensureFamily()` 가 부팅 · `reload` · 온보딩의 한 길이고, 세션이 사라지면 캐시의 가족 코드로 다시 참여한다.
- 기록은 "이 id 다음부터" 1000줄씩 받는다. 정렬은 날짜 → 적은 시각 → id.
- 실시간: 가족 필터를 건 `postgres_changes` 구독, 이벤트 0.3초 뒤 `reload`. 앱 복귀와 띠의 "다시"도 `reload`. `reload` 는 겹치면 한 번 더 받는다.
- 마지막으로 받은 내용은 `yd_cache_v1`. 서버가 안 되면 그걸 보여 주고 띠를 띄운다. 오프라인 쓰기는 없다.

## 6. 실패 처리

| 경우 | 쓰는 것 |
|---|---|
| 되돌릴 값이 있다 | `tryStore(req, undo)`: 먼저 반영, 실패하면 직전 값만 되돌린다 |
| 되돌릴 게 없다 | `.catch(failToast("…"))` |
| 일부러 삼킨다 | `.catch(ignore)` |
| 새 기록(`submitNew`) | 실패하면 치던 것을 입력줄에 돌려준다(같은 아이일 때만) |

`tryStore` · `failToast` · `submitNew` 의 실패와 앱 오류는 `report()` 로 보고된다(9절).

## 7. 자동 용돈

`ensureAllowances()` 가 매주 용돈 줄을 채운다.

- 마지막 자동 줄의 열쇠(`auto_key` = `w:YYYY-MM-DD`) 다음 날과 `weekly_start` 중 늦은 날부터 오늘까지. 바닥은 400일 전. 오늘보다 뒤인 열쇠는 무시.
- `unique(child_id, auto_key)` 라 두 폰이 같이 열어도 안 겹친다. 건너뛰기는 `skipped = true`(숨김).
- 켜거나 요일을 바꿀 때 첫 날은 부모가 고른다(`firstPayChoices`).

## 8. 처음 안내

- 단계 표 `TOUR`, 순서 `TOUR_ORDER`(sign · bal · swipe · press · edit · gear · color · week · export · sync · back, 끝에 done). swipe 는 아이가 둘 이상, sync 는 동기화 모드일 때만.
- `tourTick` 이 넘기고 `tourLayout` 이 막 · 구멍 · 카드를 놓는다. 스크롤 뒤엔 `tourSettle` 이 다시 잰다.
- 설정의 앵커: `.card.color` · `.card.week` · `.card.export` · `.card.sync` · `.gear` · `.nav .back`. 바꾸면 안내가 틀어진다(`tour` 테스트).

## 9. 의견 · 오류 보고

- 설정 맨 아래 오른쪽 `fbButton()`: 읽는 폰(`gate_state().is_reader`)이면 "받은 의견 n", 아니면 "의견 보내기". 이 기기 전용 모드엔 없다.
- 보내기는 `send_feedback`(가족 기기 누구나), 읽기 · 읽음 · 완료는 `read_feedback` · `mark_feedback_read` · `close_feedback`(읽는 폰만). 읽는 폰은 주인 가족의 기기가 `claim_feedback_reader` 로 스스로 정한다(`app_gate.reader_user_id`, 한 대).
- 보낸 집은 `my_feedback`(자기 가족의 최근 의견 5개와 `read_at`)으로 "전달됨" / "읽음"을 본다. 목록을 열면 보이는 것까지 읽음, "완료"도 읽음.
- `report(where, err)`: 오류 문장 · 화면 · 버전 · 기종만 보낸다. 같은 문장은 하루 한 번, 기기당 하루 20개(`yd_report`), 오프라인이면 안 보낸다. 서버도 기기당 하루 50개에서 자른다.
- 새 것 수는 마지막으로 본 id(`yd_fb_seen`) 기준.

## 10. 데이터

`schema.sql` 은 몇 번 실행해도 안전하다(`if not exists` · `create or replace` · 정책은 지우고 다시).

| 테이블 | 내용 |
|---|---|
| `families` | 가족과 가족 코드(`ABCD-1234`, I · O · 0 · 1 없음) |
| `family_members` | 가족 ↔ 익명 로그인 기기 |
| `children` | 이름 · 색 · 순서 · 처음 금액 · 매주 용돈 |
| `entries` | 날짜 · 용도 · 금액(+ 받은 돈) · 적은/고친 기기 · `auto_key` · `skipped` |
| `app_gate` | 새 가족 만들기 잠금(주인 가족 · 열림 시각) · 의견 읽는 기기 |
| `feedback` | 의견 · 오류. 정책 없음, 함수로만 다룬다 |

- RLS 는 `is_member(family_id)`. 기록의 아이는 같은 가족이어야 한다(FK).
- 함수(RPC)는 로그인한 사용자(authenticated)만 부른다.
- 실시간: `entries` · `children` 에 `replica identity full`(그래야 삭제에도 가족 필터가 걸린다). 필터 없는 구독은 쓰지 않는다.

## 11. 서비스워커

`sw.js` 는 앱 껍데기(`ASSETS`)만 캐시한다. 네트워크 우선, 4초 넘거나 503 · 404 면 캐시. 설치 때는 `cache: "reload"`. 캐시 이름 `yd-` + 버전이 바뀌어야 옛 캐시가 지워진다.

## 12. 화면 값

- 색은 `:root` 토큰. JS 그림은 `KID_BG` · `COLORS`(`hex` = 밑줄 · 점, `name` = 이름 글자). 색 키를 지우면 그 색을 쓰던 아이가 파랑이 된다.
- 글자 `--t1`~`--t7`(11 · 12 · 13 · 15 · 17 · 28 · 44px), 예외는 아이 이름 22px · 가족 코드 칸 21px. 간격은 4px 격자.
- 여러 곳에 쓰는 값은 상수로: `MAX_KIDS` · `ORDINALS` · `LIST_PAGE` · `GONE_MSG` · `THEME_PAPER` · `SUPABASE_JS` · `REPORT_MAX`.
- 주석에는 이유만 쓴다. 이력은 CHANGELOG.

## 13. 테스트

`npm test` 는 파일마다 브라우저를 띄워 CPU 수만큼(최대 4) 동시에 돌린다.

| 파일 | 보는 것 |
|---|---|
| `core` | 한 바퀴: 첫 시작 · 적기 · 고치기 · 지우기 · 매주 용돈 |
| `ledger` · `entry-view` · `kid-view` · `date-pick` | 목록 · 용도 칩 · 그림 · 달력 |
| `home-swipe` · `sheet-drag` · `weekly-colors-swipe` · `back` | 손짓 · 매주 용돈 · 색 · 뒤로 가기 |
| `settings` · `gate` · `tour` | 설정 · 초대 잠금 · 처음 안내 |
| `resilience` · `sync-robust` · `sw` | 서버 장애 · 세션 유실 · 서비스워커 |
| `unit` | 계산 함수와 두 곳에 적는 값의 일치(버전 · supabase-js 경로와 sha384 · 종이색 · `KID_BG` · 함수 이름 겹침) |
| `snapshot` | 화면 11장 픽셀 비교 |
| `regress-x.y.z` | 그 버전에서 고친 결함 |

- 하네스(`tests/_harness.js`): 고정 시간으로 기다리지 않고 `ready` · `settle` · `idle` · `back` · `popped/reloaded/toasted` · `until` 로 결과를 기다린다. 진짜 시간이 조건인 곳만 예외.
- 터치는 `touch(p)`(CDP, 이벤트 시각을 직접 찍는다). 폰처럼 버튼에 포커스가 남는 탭도 이걸로 재현한다.
- `localPage(b, {clock})` 는 로컬 모드 + 시계 고정, `fakePage` 는 가짜 Supabase(`tests/_fake.js`, 모드 live · dead · noinit · down).
- 스냅샷은 화면을 일부러 바꾼 버전에서만 `SNAP=update`. 06 · 11 에는 버전 글자가 찍힌다. CI 에서는 달라도 경고만.
- 결함을 고치면 `regress-x.y.z` 에 테스트를 넣고 고치기 전 코드에서 실패하는 걸 확인한다.

## 14. 버전 올리기

1. `index.html` `APP_VERSION` · `sw.js` `CACHE` · `package.json` version 을 같이 바꾼다(`unit` 이 확인).
2. `CHANGELOG.md` 맨 위. SQL · 재설치가 필요하면 첫 줄에.
3. SQL 이 바뀌면 `schema.sql` 본문에, 그리고 맨 아래 "쓰던 프로젝트 올리기"에 한 줄.
4. 스냅샷 06 · 11 은 버전 글자만 바뀐 걸 확인하고 기준을 바꾼다.
5. 새 파일이나 지운 파일이 있으면 모든 파일을 한 번에 올린다.

커밋 메시지는 영어 한 줄, 저장소 안의 글은 한국어.

## 15. 파일

| 파일 | 내용 |
|---|---|
| `index.html` | 앱 전체 |
| `config.js` | Supabase URL 과 publishable 키(공개). 비우면 이 기기 전용 모드 |
| `schema.sql` | 테이블 · RLS · 함수 · 실시간 |
| `sw.js`, `manifest.webmanifest` | 서비스워커, PWA 정보 |
| `vendor/` | supabase-js([vendor/README.md](../vendor/README.md)) |
| `logo/` | 아이콘 원본 `logo-master.png` 와 스크립트 |
| `splash/` | iOS 실행 화면(기종별) |
| `tests/` | 테스트 · 하네스 · 가짜 Supabase · 스냅샷 기준 |

아이콘은 `logo/logo-master.png` 한 장에서 만든다(PNG 를 직접 고치지 않는다).

```bash
pip install pillow numpy scipy
npm run icons                 # icon-* · apple-touch-icon · logo-pig*
python logo/make_splash.py    # splash/* 와 index.html 에 넣을 <link> 줄
```
