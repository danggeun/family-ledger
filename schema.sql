-- 용돈기입장 앱 Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run.
-- 사전 조건: Authentication → Providers → Anonymous sign-ins 를 켜둘 것.

create extension if not exists pgcrypto;

-- ── 가족 (기기들을 묶는 단위)
create table if not exists families (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,          -- 가족 코드 (설정 화면에 표시)
  created_at  timestamptz not null default now()
);

-- ── 가족 구성원 (익명 로그인된 기기 = 사용자)
create table if not exists family_members (
  family_id   uuid not null references families(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- ── 아이
create table if not exists children (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid not null references families(id) on delete cascade,
  name             text not null,
  color            text not null default 'blue',
  sort             int  not null default 0,
  opening_balance  int  not null default 0,     -- 시작 잔액
  weekly_on        boolean not null default false,
  weekly_dow       int,                         -- 0=일 … 6=토
  weekly_amount    int  not null default 0,
  weekly_start     date,                        -- 이 날부터 자동 입금 계산
  created_at       timestamptz not null default now()
);

-- ── 기록 (통장 한 줄)
create table if not exists entries (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  child_id    uuid not null references children(id) on delete cascade,
  entry_date  date not null,
  memo        text not null default '',
  amount      int  not null,                    -- 양수 = 들어옴, 음수 = 나감
  created_by  uuid default auth.uid(),          -- 적은 기기
  updated_by  uuid default auth.uid(),          -- 마지막으로 고친 기기(고치기 시트 문구가 쓴다)
  auto_key    text,                             -- 자동 입금이면 'w:YYYY-MM-DD' (중복 방지)
  skipped     boolean not null default false,   -- 자동 입금을 건너뛴 주 (삭제 대신 숨김)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (child_id, auto_key)
);
create index if not exists entries_lookup on entries (family_id, child_id, entry_date);
-- 기록의 아이는 그 기록과 같은 가족이어야 한다. RLS 는 기록의 가족만 보므로 남의 아이 id 로 줄을 붙이는 걸 이것이 막는다.
-- 재실행 안전. 둘째 블록이 "violates foreign key" 로 막히면 어긋난 기록을 찾아 지우고 다시 실행:
--   select e.* from entries e join children c on c.id=e.child_id where c.family_id<>e.family_id;
do $$ begin
  alter table children add constraint children_id_family unique (id, family_id);
exception when duplicate_table or duplicate_object then null; end $$;
do $$ begin
  alter table entries add constraint entries_child_same_family
    foreign key (child_id, family_id) references children (id, family_id) on delete cascade;
exception when duplicate_object then null; end $$;

-- ── RLS
alter table families        enable row level security;
alter table family_members  enable row level security;
alter table children        enable row level security;
alter table entries         enable row level security;

create or replace function is_member(fid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from family_members where family_id = fid and user_id = auth.uid()
  );
$$;

drop policy if exists fam_select on families;
create policy fam_select on families for select using (is_member(id));

drop policy if exists mem_select on family_members;
create policy mem_select on family_members for select using (user_id = auth.uid());

drop policy if exists children_all on children;
create policy children_all on children for all
  using (is_member(family_id)) with check (is_member(family_id));

drop policy if exists entries_all on entries;
create policy entries_all on entries for all
  using (is_member(family_id)) with check (is_member(family_id));

-- ── RPC: 가족 만들기(잠금) / 코드로 참여
-- 사이트가 공개라 새 가족 만들기는 기본 잠금. 첫 가족(주인 가족)의 구성원만 잠깐 열 수 있다.
create table if not exists app_gate (
  id               int primary key default 1 check (id = 1),
  owner_family_id  uuid references families(id) on delete set null,   -- 주인 가족(처음 만든 가족)
  open_until       timestamptz                                        -- 이 시각까지만 열림. null 이면 잠김
);
insert into app_gate (id) values (1) on conflict do nothing;
alter table app_gate add column if not exists reader_user_id uuid;   -- 받은 의견을 읽는 한 기기
alter table app_gate enable row level security;   -- 정책 없음: security definer 함수로만 다룬다

create or replace function create_family(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare fid uuid; g app_gate;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into g from app_gate where id = 1;
  -- 주인 가족이 없으면(첫 가족) 통과하고 그 가족이 주인이 된다
  if g.owner_family_id is not null and coalesce(g.open_until, '-infinity'::timestamptz) < now() then
    raise exception '지금은 새로 시작할 수 없어요';
  end if;
  insert into families (code) values (p_code) returning id into fid;
  insert into family_members (family_id, user_id) values (fid, auth.uid());
  if g.owner_family_id is null then
    update app_gate set owner_family_id = fid where id = 1;
  end if;
  return fid;
end $$;

-- 주인 가족의 기기만 호출할 수 있다. p_minutes 가 0 이하면 즉시 잠근다.
create or replace function open_families(p_minutes int default 10) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare g app_gate; t timestamptz;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into g from app_gate where id = 1;
  if g.owner_family_id is null then raise exception '아직 주인 가족이 없어요'; end if;
  if not exists (select 1 from family_members
                 where family_id = g.owner_family_id and user_id = auth.uid()) then
    raise exception '권한이 없어요';
  end if;
  if p_minutes <= 0 then t := null;
  else t := now() + make_interval(mins => least(p_minutes, 60)); end if;
  update app_gate set open_until = t where id = 1;
  return t;
end $$;

-- 이 기기가 주인 가족인지, 지금 열려 있는지
create or replace function gate_state() returns json
language sql security definer set search_path = public as $$
  select json_build_object(
    'is_owner', exists (select 1 from family_members m, app_gate g
                        where g.id = 1 and m.family_id = g.owner_family_id and m.user_id = auth.uid()),
    'is_reader', exists (select 1 from app_gate g where g.id = 1 and g.reader_user_id = auth.uid()),
    'has_reader', exists (select 1 from app_gate g where g.id = 1 and g.reader_user_id is not null),
    'open_until', (select g.open_until from app_gate g
                   where g.id = 1 and exists (select 1 from family_members m
                                              where m.family_id = g.owner_family_id and m.user_id = auth.uid())));
  -- open_until 은 주인 가족에게만 보인다
$$;

create or replace function join_family(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into fid from families where code = p_code;
  if fid is null then raise exception 'no such family'; end if;
  insert into family_members (family_id, user_id) values (fid, auth.uid())
    on conflict do nothing;
  return fid;
end $$;

-- ── 의견 · 오류 보고
-- 가족 기기는 보내기만 한다. 읽기는 app_gate.reader_user_id 기기만(주인 가족 기기가 스스로 지정).
create table if not exists feedback (
  id           bigint generated always as identity primary key,
  family_id    uuid references families(id) on delete cascade,
  user_id      uuid not null,
  kind         text not null check (kind in ('note', 'error')),
  body         text not null check (length(body) between 1 and 2000),
  app_version  text,
  device       text,
  done         boolean not null default false,   -- 운영자가 "완료"한 것. 지우지 않고 숨긴다
  created_at   timestamptz not null default now()
);
alter table feedback add column if not exists read_at timestamptz;   -- 운영자가 읽은 때. 보낸 집에 "읽음"
alter table feedback enable row level security;   -- 정책 없음: 아래 함수로만

create or replace function send_feedback(p_kind text, p_body text, p_version text, p_device text) returns void
language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select family_id into fid from family_members where user_id = auth.uid() limit 1;
  if fid is null then raise exception 'no family'; end if;
  if (select count(*) from feedback
      where user_id = auth.uid() and created_at > now() - interval '1 day') >= 50 then
    return;   -- 한 기기에서 하루 50개 넘게는 버린다
  end if;
  insert into feedback (family_id, user_id, kind, body, app_version, device)
  values (fid, auth.uid(), p_kind, left(p_body, 2000), left(p_version, 20), left(p_device, 120));
end $$;

create or replace function claim_feedback_reader() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from family_members m, app_gate g
                 where g.id = 1 and m.family_id = g.owner_family_id and m.user_id = auth.uid()) then
    raise exception '권한이 없어요';
  end if;
  -- 한 대로 고정. 바꾸려면 SQL Editor 에서 update app_gate set reader_user_id = null; 뒤 새 폰에서 다시 지정
  if exists (select 1 from app_gate g where g.id = 1 and g.reader_user_id is not null and g.reader_user_id <> auth.uid()) then
    raise exception '이미 다른 폰이 받고 있어요';
  end if;
  update app_gate set reader_user_id = auth.uid() where id = 1;
end $$;

create or replace function read_feedback() returns table (
  id bigint, kind text, body text, app_version text, device text, created_at timestamptz, family_code text, kids text)
language sql security definer set search_path = public as $$
  select f.id, f.kind, f.body, f.app_version, f.device, f.created_at, fa.code,
         (select string_agg(c.name, '·' order by c.sort) from children c where c.family_id = f.family_id)
  from feedback f left join families fa on fa.id = f.family_id
  where not f.done and exists (select 1 from app_gate g where g.id = 1 and g.reader_user_id = auth.uid())
  order by f.id desc
  limit 100;
$$;

create or replace function close_feedback(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from app_gate g where g.id = 1 and g.reader_user_id = auth.uid()) then
    raise exception '권한이 없어요';
  end if;
  update feedback set done = true, read_at = coalesce(read_at, now()) where id = p_id;
end $$;

create or replace function mark_feedback_read(p_upto bigint) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from app_gate g where g.id = 1 and g.reader_user_id = auth.uid()) then
    raise exception '권한이 없어요';
  end if;
  update feedback set read_at = now() where read_at is null and id <= p_upto;
end $$;

-- 이 기기가 보낸 의견(최근 5개)과 읽음 여부
create or replace function my_feedback() returns table (id bigint, body text, created_at timestamptz, read_at timestamptz)
language sql security definer set search_path = public as $$
  select f.id, f.body, f.created_at, f.read_at from feedback f
  where f.kind = 'note' and f.user_id = auth.uid()
  order by f.id desc
  limit 5;
$$;

-- 함수는 로그인한 사용자만 부른다(익명 로그인도 authenticated). anon·public 은 뺀다.
-- Security Advisor 0028 은 이것으로 해결. 0029(authenticated) 경고는 의도한 것(이 함수들이 곧 API).
revoke execute on function create_family(text)  from public, anon;
revoke execute on function open_families(int)   from public, anon;
revoke execute on function gate_state()         from public, anon;
revoke execute on function join_family(text)    from public, anon;
revoke execute on function send_feedback(text, text, text, text) from public, anon;
revoke execute on function claim_feedback_reader() from public, anon;
revoke execute on function read_feedback()      from public, anon;
revoke execute on function close_feedback(bigint) from public, anon;
revoke execute on function mark_feedback_read(bigint) from public, anon;
revoke execute on function my_feedback()         from public, anon;
revoke execute on function is_member(uuid)      from public, anon;   -- RLS 정책이 요청 역할로 부르므로 authenticated 권한은 남긴다
grant execute on function create_family(text)  to authenticated;
grant execute on function open_families(int)   to authenticated;
grant execute on function gate_state()         to authenticated;
grant execute on function join_family(text)    to authenticated;
grant execute on function send_feedback(text, text, text, text) to authenticated;
grant execute on function claim_feedback_reader() to authenticated;
grant execute on function read_feedback()      to authenticated;
grant execute on function close_feedback(bigint) to authenticated;
grant execute on function mark_feedback_read(bigint) to authenticated;
grant execute on function my_feedback()         to authenticated;
grant execute on function is_member(uuid)      to authenticated;
-- Supabase 옵션(auto RLS)이 만든 함수. API 로 부를 일이 없다. 없으면 지나간다
do $$ begin
  revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
exception when undefined_function then null; end $$;

-- ── 실시간 (두 폰이 바로 같이 보이게)
do $$ begin
  alter publication supabase_realtime add table entries;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table children;
exception when duplicate_object then null; end $$;
-- 기본 replica identity 는 DELETE 에 PK 만 실어 family_id 필터에 걸리지 않으므로 full 로 둔다.
alter table entries  replica identity full;
alter table children replica identity full;

-- ══ 쓰던 프로젝트 올리기 (새 프로젝트는 필요 없음)
-- 이 절은 재실행해도 안전하다. 아래 주석의 버전은 위 본문도 다시 실행한다(본문 전체 재실행도 안전).
alter table entries add column if not exists created_by uuid default auth.uid();        -- 1.1.x
alter table entries add column if not exists updated_by uuid default auth.uid();        -- 1.1.3
alter table entries add column if not exists skipped boolean not null default false;    -- 1.1.x
alter table entries  replica identity full;                                              -- 1.1.9
alter table children replica identity full;
-- 1.2.0 함수 권한, 1.2.3 gate_state: 본문의 create or replace / revoke / grant
-- 1.3.2 기록↔아이 같은 가족 제약: 본문의 "기록의 아이는 그 기록과 같은 가족" 두 블록
-- 1.3.8 의견 · 오류 보고: 본문의 app_gate.reader_user_id, "의견 · 오류 보고" 절, gate_state, 권한 줄
-- 1.3.10 받는 폰 한 대 고정 · 보낸 의견은 그 기기 것만: 본문의 gate_state · claim_feedback_reader · my_feedback
