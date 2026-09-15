# 용돈기입장 (v5)

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
- 백업: 설정 → 내보내기. 가끔 메모 앱에 붙여넣어 두면 됨.
- `config.js`가 비어 있으면 그 기기에만 저장되는 로컬 모드로 동작 (테스트용).

## 이미 쓰고 있는 경우 (업데이트)
**`config.js`는 이 압축에 없음** — 기존 것이 그대로 남아야 하니까. 나머지만 덮어쓰고 push.
단, `schema.sql`에 `skipped` 컬럼이 추가됐으니 SQL Editor에서 한 번 실행:
```sql
alter table entries add column if not exists skipped boolean not null default false;
```

테스트로 넣은 기록만 지우고 싶을 때 (아이 설정·가족 코드는 유지):
```sql
delete from entries;
```

## 파일
- `index.html` 앱 전체 · `config.example.js` → `config.js`로 복사해서 Supabase 정보 입력 · `schema.sql` DB 구조
- `manifest.webmanifest` `sw.js` 아이콘 3개: 홈 화면 앱용
