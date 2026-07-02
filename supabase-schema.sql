-- =====================================================================
-- Jeevani Connect — Supabase schema
-- Run this ENTIRE file in your Supabase SQL editor (project: xjlpmjqjivtiqsayydit)
-- =====================================================================

-- Clean slate (safe to re-run)
drop function if exists public.jc_login(text, text) cascade;
drop function if exists public.jc_admin_get_state(text, text) cascade;
drop function if exists public.jc_admin_reset_student(text, text) cascade;
drop function if exists public.jc_admin_set_course(text, text, text) cascade;
drop function if exists public.jc_admin_add_schedule(text, text, timestamptz) cascade;
drop function if exists public.jc_admin_edit_schedule(text, text, uuid, timestamptz) cascade;
drop function if exists public.jc_admin_join_now(text, text, uuid) cascade;
drop function if exists public.jc_admin_give_access(text, text, uuid) cascade;
drop function if exists public.jc_admin_complete_session(text, text, uuid) cascade;
drop function if exists public.jc_admin_set_youtube(text, text, uuid, text) cascade;
drop function if exists public.jc_admin_toggle_hide(text, text) cascade;
drop function if exists public.jc_student_get_state(text, text) cascade;
drop table if exists public.schedules cascade;
drop table if exists public.batches cascade;

-- Batches (12 rows)
create table public.batches (
  id int primary key,
  name text not null,
  course_name text not null default '',
  student_username text unique not null,
  student_password text not null,
  admin_username text unique not null,
  admin_password text not null,
  hide_schedule boolean not null default false,
  created_at timestamptz not null default now()
);

-- Schedules
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  batch_id int not null references public.batches(id) on delete cascade,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled', -- scheduled | active | completed
  students_allowed boolean not null default false,
  meet_link text,
  youtube_url text,
  created_at timestamptz not null default now()
);
create index on public.schedules (batch_id, status);
create index on public.schedules (batch_id, scheduled_at desc);

-- Lock down direct table access; everything goes through SECURITY DEFINER RPCs
grant usage on schema public to anon, authenticated;
revoke all on public.batches from anon, authenticated;
revoke all on public.schedules from anon, authenticated;
alter table public.batches enable row level security;
alter table public.schedules enable row level security;
-- (No policies = no direct access. RPCs bypass RLS.)

-- ---------------------------------------------------------------------
-- Helper: verify admin creds, return batch id
-- ---------------------------------------------------------------------
create or replace function public._jc_verify_admin(_u text, _p text)
returns int language plpgsql security definer set search_path = public as $$
declare _bid int;
begin
  select id into _bid from public.batches where admin_username = _u and admin_password = _p;
  if _bid is null then raise exception 'INVALID_ADMIN'; end if;
  return _bid;
end $$;

-- ---------------------------------------------------------------------
-- Login (student or admin)
-- ---------------------------------------------------------------------
create or replace function public.jc_login(_u text, _p text)
returns json language plpgsql security definer set search_path = public as $$
declare _b public.batches;
begin
  select * into _b from public.batches
    where (student_username = _u and student_password = _p)
       or (admin_username = _u and admin_password = _p)
    limit 1;
  if _b.id is null then raise exception 'INVALID_CREDENTIALS'; end if;
  return json_build_object(
    'ok', true,
    'role', case when _b.admin_username = _u then 'admin' else 'student' end,
    'batch_id', _b.id,
    'batch_name', _b.name,
    'course_name', _b.course_name
  );
end $$;

-- ---------------------------------------------------------------------
-- Admin state (own batch info, creds, schedules)
-- ---------------------------------------------------------------------
create or replace function public.jc_admin_get_state(_u text, _p text)
returns json language plpgsql security definer set search_path = public as $$
declare _bid int; _b public.batches; _scheds json;
begin
  _bid := public._jc_verify_admin(_u, _p);
  select * into _b from public.batches where id = _bid;
  select coalesce(json_agg(s order by s.scheduled_at desc), '[]'::json) into _scheds
    from (select id, scheduled_at, status, students_allowed, meet_link, youtube_url
          from public.schedules where batch_id = _bid
          order by scheduled_at desc limit 20) s;
  return json_build_object(
    'batch', json_build_object(
      'id', _b.id, 'name', _b.name, 'course_name', _b.course_name,
      'hide_schedule', _b.hide_schedule,
      'student_username', _b.student_username, 'student_password', _b.student_password,
      'admin_username', _b.admin_username, 'admin_password', _b.admin_password
    ),
    'schedules', _scheds
  );
end $$;

-- ---------------------------------------------------------------------
-- Admin: reset student credentials (returns new)
-- ---------------------------------------------------------------------
create or replace function public.jc_admin_reset_student(_u text, _p text)
returns json language plpgsql security definer set search_path = public as $$
declare _bid int; _new_user text; _new_pass text;
begin
  _bid := public._jc_verify_admin(_u, _p);
  _new_user := 'student' || lpad(_bid::text, 2, '0');
  _new_pass := 'learn' || lpad(_bid::text, 2, '0') || substr(md5(random()::text), 1, 3);
  update public.batches
    set student_username = _new_user, student_password = _new_pass
    where id = _bid;
  return json_build_object('student_username', _new_user, 'student_password', _new_pass);
end $$;

-- ---------------------------------------------------------------------
-- Admin: set course name
-- ---------------------------------------------------------------------
create or replace function public.jc_admin_set_course(_u text, _p text, _course text)
returns json language plpgsql security definer set search_path = public as $$
declare _bid int;
begin
  _bid := public._jc_verify_admin(_u, _p);
  update public.batches set course_name = coalesce(_course, '') where id = _bid;
  return json_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------
-- Admin: add schedule
-- ---------------------------------------------------------------------
create or replace function public.jc_admin_add_schedule(_u text, _p text, _when timestamptz)
returns json language plpgsql security definer set search_path = public as $$
declare _bid int; _id uuid;
begin
  _bid := public._jc_verify_admin(_u, _p);
  insert into public.schedules (batch_id, scheduled_at) values (_bid, _when) returning id into _id;
  return json_build_object('id', _id);
end $$;

-- ---------------------------------------------------------------------
-- Admin: edit schedule time
-- ---------------------------------------------------------------------
create or replace function public.jc_admin_edit_schedule(_u text, _p text, _sid uuid, _when timestamptz)
returns json language plpgsql security definer set search_path = public as $$
declare _bid int;
begin
  _bid := public._jc_verify_admin(_u, _p);
  update public.schedules set scheduled_at = _when where id = _sid and batch_id = _bid;
  return json_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------
-- Admin: join now — generate meet link (if missing), mark active
-- Deletes previous completed schedules for this batch (previous class + link purged)
-- ---------------------------------------------------------------------
create or replace function public.jc_admin_join_now(_u text, _p text, _sid uuid)
returns json language plpgsql security definer set search_path = public as $$
declare _bid int; _course text; _link text; _slug text;
begin
  _bid := public._jc_verify_admin(_u, _p);
  select course_name into _course from public.batches where id = _bid;
  select meet_link into _link from public.schedules where id = _sid and batch_id = _bid;
  if _link is null or _link = '' then
    _slug := regexp_replace(coalesce(nullif(_course,''),'CLASS'), '[^A-Za-z0-9]+', '', 'g');
    if _slug = '' then _slug := 'CLASS'; end if;
    _link := 'https://meet.jit.si/JC-' || _slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 5);
    update public.schedules set meet_link = _link, status = 'active' where id = _sid and batch_id = _bid;
  else
    update public.schedules set status = 'active' where id = _sid and batch_id = _bid;
  end if;
  -- Purge previous completed schedules for this batch (link + record removed)
  delete from public.schedules where batch_id = _bid and status = 'completed' and id <> _sid;
  return json_build_object('meet_link', _link);
end $$;

-- ---------------------------------------------------------------------
-- Admin: give students access
-- ---------------------------------------------------------------------
create or replace function public.jc_admin_give_access(_u text, _p text, _sid uuid)
returns json language plpgsql security definer set search_path = public as $$
declare _bid int;
begin
  _bid := public._jc_verify_admin(_u, _p);
  update public.schedules set students_allowed = true, status = 'active'
    where id = _sid and batch_id = _bid;
  return json_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------
-- Admin: complete session
-- ---------------------------------------------------------------------
create or replace function public.jc_admin_complete_session(_u text, _p text, _sid uuid)
returns json language plpgsql security definer set search_path = public as $$
declare _bid int;
begin
  _bid := public._jc_verify_admin(_u, _p);
  update public.schedules
    set status = 'completed', students_allowed = false, meet_link = null
    where id = _sid and batch_id = _bid;
  return json_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------
-- Admin: set youtube recording url
-- ---------------------------------------------------------------------
create or replace function public.jc_admin_set_youtube(_u text, _p text, _sid uuid, _url text)
returns json language plpgsql security definer set search_path = public as $$
declare _bid int;
begin
  _bid := public._jc_verify_admin(_u, _p);
  update public.schedules set youtube_url = nullif(_url, '') where id = _sid and batch_id = _bid;
  return json_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------------
-- Admin: toggle hide/unhide schedule card
-- ---------------------------------------------------------------------
create or replace function public.jc_admin_toggle_hide(_u text, _p text)
returns json language plpgsql security definer set search_path = public as $$
declare _bid int; _new bool;
begin
  _bid := public._jc_verify_admin(_u, _p);
  update public.batches set hide_schedule = not hide_schedule where id = _bid
    returning hide_schedule into _new;
  return json_build_object('hide_schedule', _new);
end $$;

-- ---------------------------------------------------------------------
-- Student state (no meet link exposed unless students_allowed)
-- ---------------------------------------------------------------------
create or replace function public.jc_student_get_state(_u text, _p text)
returns json language plpgsql security definer set search_path = public as $$
declare _bid int; _b public.batches; _active json; _next json; _prev json;
begin
  select id into _bid from public.batches where student_username = _u and student_password = _p;
  if _bid is null then raise exception 'INVALID_STUDENT'; end if;
  select * into _b from public.batches where id = _bid;

  select row_to_json(x) into _active from (
    select id, scheduled_at, students_allowed,
      case when students_allowed then meet_link else null end as meet_link
    from public.schedules where batch_id = _bid and status = 'active'
    order by scheduled_at desc limit 1
  ) x;

  select row_to_json(x) into _next from (
    select id, scheduled_at from public.schedules
    where batch_id = _bid and status = 'scheduled'
    order by scheduled_at asc limit 1
  ) x;

  select row_to_json(x) into _prev from (
    select id, scheduled_at, youtube_url from public.schedules
    where batch_id = _bid and status = 'completed' and youtube_url is not null
    order by scheduled_at desc limit 1
  ) x;

  return json_build_object(
    'batch', json_build_object('id', _b.id, 'name', _b.name, 'course_name', _b.course_name),
    'active', _active, 'next', _next, 'previous', _prev
  );
end $$;

-- Allow anon + authenticated to call the RPCs (they enforce their own auth via creds)
grant execute on function public.jc_login(text, text) to anon, authenticated;
grant execute on function public.jc_admin_get_state(text, text) to anon, authenticated;
grant execute on function public.jc_admin_reset_student(text, text) to anon, authenticated;
grant execute on function public.jc_admin_set_course(text, text, text) to anon, authenticated;
grant execute on function public.jc_admin_add_schedule(text, text, timestamptz) to anon, authenticated;
grant execute on function public.jc_admin_edit_schedule(text, text, uuid, timestamptz) to anon, authenticated;
grant execute on function public.jc_admin_join_now(text, text, uuid) to anon, authenticated;
grant execute on function public.jc_admin_give_access(text, text, uuid) to anon, authenticated;
grant execute on function public.jc_admin_complete_session(text, text, uuid) to anon, authenticated;
grant execute on function public.jc_admin_set_youtube(text, text, uuid, text) to anon, authenticated;
grant execute on function public.jc_admin_toggle_hide(text, text) to anon, authenticated;
grant execute on function public.jc_student_get_state(text, text) to anon, authenticated;

-- =====================================================================
-- SEED: 12 batches with credentials
-- KEEP THIS LIST — this is the initial set of usernames/passwords
-- =====================================================================
-- Shuffled, non-sequential credentials (no batch-number pattern leakage)
insert into public.batches (id, name, student_username, student_password, admin_username, admin_password) values
  (1,  'Batch 01', 'jeevanistd657',  'jeevani765',     'jeevaniadmin098', 'password@789'),
  (2,  'Batch 02', 'jeevanistd214',  'mindcare432',    'jeevaniadmin371', 'secure@241'),
  (3,  'Batch 03', 'jeevanistd903',  'learnwell128',   'jeevaniadmin582', 'admin@613'),
  (4,  'Batch 04', 'jeevanistd486',  'brightmind907',  'jeevaniadmin147', 'teachr@804'),
  (5,  'Batch 05', 'jeevanistd071',  'jeevani539',     'jeevaniadmin629', 'password@352'),
  (6,  'Batch 06', 'jeevanistd328',  'mindwell714',    'jeevaniadmin860', 'secure@927'),
  (7,  'Batch 07', 'jeevanistd592',  'growmind283',    'jeevaniadmin403', 'admin@165'),
  (8,  'Batch 08', 'jeevanistd845',  'jeevani612',     'jeevaniadmin718', 'teachr@490'),
  (9,  'Batch 09', 'jeevanistd139',  'calmmind456',    'jeevaniadmin254', 'password@037'),
  (10, 'Batch 10', 'jeevanistd760',  'jeevani841',     'jeevaniadmin596', 'secure@683'),
  (11, 'Batch 11', 'jeevanistd427',  'peacemind195',   'jeevaniadmin931', 'admin@572'),
  (12, 'Batch 12', 'jeevanistd683',  'jeevani372',     'jeevaniadmin045', 'teachr@218')
on conflict (id) do update set
  student_username = excluded.student_username,
  student_password = excluded.student_password,
  admin_username   = excluded.admin_username,
  admin_password   = excluded.admin_password;
