# 용돈기입장 (v14)

가족용 아이 용돈 통장 앱. 아이폰 홈 화면에 추가해서 씀.

## 설치 순서 (한 번만)

### 1. Supabase (데이터 저장·두 폰 동기화)
1. https://supabase.com → New project (이름 아무거나, 리전 Northeast Asia/Seoul)
2. 왼쪽 **SQL Editor** → `schema.sql` 내용 통째로 붙여넣고 **Run**
3. 왼쪽 **Authentication → Providers → Anonymous** 를 켬 (Enable anonymous sign-ins)
4. **Project Settings → API** 에서 `Project URL`과 공개 키를 복사해 `config.js`에 넣음 (없으면 `config.example.js`를 복사해서 만들 것)

`anon` 키는 원래 브라우저에 노출되는 공개 키. 데이터 보호는 RLS(schema.sql)가 함.

### 2. GitHub Pages (앱 껍데기 호스팅)
1. 새 public 저장소 (이름은 중립적으로, 예: `ledger`)
2. 이 폴더의 파일을 전부 올림 (`README.md`는 안 올려도 됨)
3. **Settings → Pages → Build and deployment → Deploy from a branch → main / (root)** → Save
4. 1~2분 뒤 `https://<아이디>.github.io/<저장소>/` 에서 열림

저장소엔 데이터가 한 줄도 없음. 앱 코드와 공개 키뿐.

### 3. 아내 폰 (순서 중요)
1. 사파리로 위 주소 열기 → 공유 버튼 → **홈 화면에 추가** (아직 아무것도 누르지 말 것)
2. **홈 화면의 아이콘으로** 앱 열기 → **새로 시작하기** → 아이 이름, 지금 갖고 있는 돈 입력
3. ⚙ 설정 → 매주 용돈 자동 넣기 켜고 요일·금액 입력

홈 화면 앱과 사파리는 저장 공간이 따로라서, 사파리에서 먼저 시작하면 홈 화면 앱에서 다시 시작하게 됨.

### 4. 남편 폰
1. 같은 주소 열기 → 홈 화면에 추가 → 홈 화면 아이콘으로 열기
2. **가족 코드로 참여** → 아내 폰 ⚙ 설정 화면의 코드 입력

## 알아둘 것
- Supabase 무료 플랜은 **일주일 이상 요청이 없으면 프로젝트가 일시정지**됨. 매주 앱을 열면 문제없고, 멈추면 대시보드에서 Restore 한 번.
- 사파리 데이터를 지우면 그 폰의 익명 로그인이 사라짐. 데이터는 서버에 그대로 있으니 **가족 코드로 참여**만 다시 하면 됨. 코드는 다른 폰 설정 화면에 있음.
- 설정 맨 아래 **기록 내보내기**: 전체 기록을 텍스트로 뽑음. 다른 데로 옮기거나 보관할 때.
- `config.js`가 비어 있으면 그 기기에만 저장되는 로컬 모드로 동작 (테스트용).

## 이미 쓰고 있는 경우 (업데이트)
**`config.js`는 이 압축에 없음** — 기존 것이 그대로 남아야 하니까. 나머지만 덮어쓰고 push.
v6 → v14는 **DB 변경 없음.** 파일만 덮어쓰면 됨.
(v5 이하에서 올라오는 거라면 SQL Editor에서 한 번:
`alter table entries add column if not exists skipped boolean not null default false;`)

v12 → v14는 아이콘 그대로라 재설치 필요 없음. 앱을 두 번 열면 새 버전(설정 맨 아래 v14).
올릴 파일: `index.html` `sw.js` `logo-pig.png` `logo-pig-sm.png` (+ `README.md`, `logo/make_icons.py`).

아이콘이 바뀐 버전(v12)으로 올릴 때는 폰에서 **홈 화면 앱을 삭제하고 다시 추가**해야 새 아이콘이 나옴.
지우기 전에 설정에서 **가족 코드를 메모**할 것 — 앱을 지우면 그 폰의 익명 로그인이 사라져서
재설치 후 "가족 코드로 참여"를 다시 해야 한다. (데이터는 서버에 그대로 있음)

테스트로 넣은 기록만 지우고 싶을 때 (아이 설정·가족 코드는 유지):
```sql
delete from entries;
```

## 파일
- `index.html` 앱 전체 · `config.example.js` → `config.js`로 복사해서 Supabase 정보 입력 · `schema.sql` DB 구조
- `manifest.webmanifest` `sw.js` — 홈 화면 앱(PWA) 설정
- `icon-*.png` `apple-touch-icon.png` — 아이콘. **직접 고치지 말 것.** 아래 참고
- `logo/` — 로고 원본

## 로고 고칠 때
아이콘 PNG는 전부 `logo/logo-master.png`(1024 정사각) 한 장에서 뽑는다.
PNG를 직접 편집하면 다음 빌드에 덮어써짐.

```
cd logo
pip install pillow numpy
python make_icons.py
```

로고를 바꾸려면 새 그림을 1024 정사각(크림 배경 #FDF6E7)으로 만들어 `logo-master.png`를 교체하고
스크립트를 다시 돌리면 끝. 만들어지는 것:

- `icon-192/512.png`, `apple-touch-icon.png` — 홈 화면 아이콘 (iOS는 manifest를 안 보므로 apple-touch-icon이 따로 필요)
- `icon-maskable-192/512.png` — 안드로이드가 80% 원으로 잘라내므로 전체를 0.84배로 줄인 것
- `logo-mark.png` — 시작 화면용, 모서리 둥근 타일
- `logo-pig.png` — 아이 화면(잔액 누르면 뜨는 돼지저금통 화면)용. 배경이 크림 단색이라 화면 배경과 그대로 이어진다
- `logo-pig-sm.png` — 잔액 옆 작은 돼지. 종이색 위에 놓이므로 배경을 투명하게 뺀 것
