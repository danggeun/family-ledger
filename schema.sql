-- 용돈기입장 앱 — Supabase 스키마
-- Supabase 대시보드 → SQL Editor 에 통째로 붙여넣고 Run.
-- 사전 조건: Authentication → Providers → Anonymous sign-ins 를 켜둘 것.

create extension if not exists pgcrypto;

-- ── 가족 (기기들을 묶는 단위) ─────────────────────────────
create table if not exists families (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,          -- 가족 코드 (설정 화면에 표시)
  created_at  timestamptz not null default now()
);

-- ── 가족 구성원 (익명 로그인된 기기 = 사용자) ─────────────
create table if not exists family_members (
  family_id   uuid not null references families(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- ── 아이 ───────────────────────────────────────────────
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

-- ── 기록 (통장 한 줄) ───────────────────────────────────
create table if not exists entries (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid not null references families(id) on delete cascade,
  child_id    uuid not null references children(id) on delete cascade,
  entry_date  date not null,
  memo        text not null default '',
  amount      int  not null,                    -- 양수 = 들어옴, 음수 = 나감
  created_by  uuid default auth.uid(),          -- 적은 기기. 나중에 소급이 안 되므로 지금부터 남긴다
  updated_by  uuid default auth.uid(),          -- 마지막으로 손댄 기기. 고치기 시트 문구가 이걸 본다
  auto_key    text,                             -- 자동 입금이면 'w:YYYY-MM-DD' (중복 방지)
  skipped     boolean not null default false,   -- 자동 입금을 건너뛴 주 (삭제 대신 숨김)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (child_id, auto_key)
);
create index if not exists entries_lookup on entries (family_id, child_id, entry_date);

-- ── RLS ────────────────────────────────────────────────
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

-- ── RPC: 가족 만들기 / 코드로 참여 ───────────────────────
-- ── 새 가족 만들기 잠금 ──────────────────────────────────
-- 사이트 주소는 공개라 누구나 열 수 있다. 그래서 새 가족 만들기는 기본으로 잠가두고,
-- **맨 처음 만들어진 가족(주인 가족)의 구성원만** 잠깐 열 수 있게 한다.
-- 나중에 초대받아 들어온 가족은 또 다른 사람에게 열어줄 수 없다.
create table if not exists app_gate (
  id               int primary key default 1 check (id = 1),
  owner_family_id  uuid references families(id) on delete set null,   -- 처음 만든 가족. 이 가족만 열 수 있다
  open_until       timestamptz                                        -- 이 시각까지만 열림. null 이면 잠김
);
insert into app_gate (id) values (1) on conflict do nothing;
alter table app_gate enable row level security;   -- 정책이 없으니 직접 접근은 불가. 아래 함수들(security definer)로만 다룬다

create or replace function create_family(p_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare fid uuid; g app_gate;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into g from app_gate where id = 1;
  -- 주인 가족이 아직 없으면(=설치 후 첫 가족) 그냥 통과하고, 그 가족이 주인이 된다
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
    'open_until', (select open_until from app_gate where id = 1));
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

grant execute on function create_family(text)  to anon, authenticated;
grant execute on function open_families(int)  to anon, authenticated;
grant execute on function gate_state()        to anon, authenticated;
grant execute on function join_family(text)   to anon, authenticated;

-- ── 실시간 (두 폰이 바로 같이 보이게) ─────────────────────
do $$ begin
  alter publication supabase_realtime add table entries;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table children;
exception when duplicate_object then null; end $$;
