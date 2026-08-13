-- =====================================================================
-- Jeevani Connect — Smart Switch (keep-alive maintenance job)
-- Run this ENTIRE file in the Supabase SQL editor AFTER supabase-schema.sql
-- =====================================================================

drop function if exists public.jc_switch_login(text, text) cascade;
drop function if exists public.jc_smart_switch_run(text, text) cascade;

-- Maintenance columns (real data touched by every run)
alter table public.batches   add column if not exists last_verified_at timestamptz;
alter table public.schedules add column if not exists last_verified_at timestamptz;

-- Operator credentials (no admin / student access whatsoever)
create table if not exists public.switch_operators (
  username text primary key,
  password text not null
);

-- Exactly ONE timestamp row, ever
create table if not exists public.smart_switch_state (
  id int primary key default 1 check (id = 1),
  last_run timestamptz
);
insert into public.smart_switch_state (id, last_run) values (1, null)
  on conflict (id) do nothing;

revoke all on public.switch_operators   from anon, authenticated;
revoke all on public.smart_switch_state from anon, authenticated;
alter table public.switch_operators   enable row level security;
alter table public.smart_switch_state enable row level security;
-- (No policies = no direct access. SECURITY DEFINER RPCs below are the only path.)

-- Seed operator credentials
insert into public.switch_operators (username, password) values
  ('jeevaniops418', 'switch@2610')
on conflict (username) do update set password = excluded.password;

-- ---------------------------------------------------------------------
-- Operator login (returns only the single stored timestamp)
-- ---------------------------------------------------------------------
create or replace function public.jc_switch_login(_u text, _p text)
returns json language plpgsql security definer set search_path = public as $$
declare _ok boolean; _last timestamptz;
begin
  select true into _ok from public.switch_operators
    where username = _u and password = _p;
  if _ok is not true then raise exception 'INVALID_OPERATOR'; end if;
  select last_run into _last from public.smart_switch_state where id = 1;
  return json_build_object('ok', true, 'last_run', _last);
end $$;

-- ---------------------------------------------------------------------
-- The actual run: real writes against real application data.
-- Returns ONLY aggregate info — never any client/batch/schedule content.
-- ---------------------------------------------------------------------
create or replace function public.jc_smart_switch_run(_u text, _p text)
returns json language plpgsql security definer set search_path = public as $$
declare _ok boolean; _n int := 0; _c int; _now timestamptz := now();
begin
  select true into _ok from public.switch_operators
    where username = _u and password = _p;
  if _ok is not true then raise exception 'INVALID_OPERATOR'; end if;

  -- 1. Verification sweep over every batch row
  update public.batches set last_verified_at = _now;
  get diagnostics _c = row_count; _n := _n + _c;

  -- 2. Verification sweep over every schedule row
  update public.schedules set last_verified_at = _now;
  get diagnostics _c = row_count; _n := _n + _c;

  -- 3. Housekeeping: purge stale completed sessions with no recording
  delete from public.schedules
    where status = 'completed'
      and youtube_url is null
      and scheduled_at < _now - interval '180 days';
  get diagnostics _c = row_count; _n := _n + _c;

  -- 4. Consistency fix: no completed session may keep a live meet link
  update public.schedules set meet_link = null, students_allowed = false
    where status = 'completed' and (meet_link is not null or students_allowed);
  get diagnostics _c = row_count; _n := _n + _c;

  -- Overwrite the single timestamp (no history kept) — only after success
  update public.smart_switch_state set last_run = _now where id = 1;

  return json_build_object('status', 'success', 'rows_processed', _n, 'last_run', _now);
end $$;

grant execute on function public.jc_switch_login(text, text)    to anon, authenticated;
grant execute on function public.jc_smart_switch_run(text, text) to anon, authenticated;
