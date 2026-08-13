-- =====================================================================
-- Jeevani Connect — RESET ALL 12 BATCH CREDENTIALS (short 4-character)
-- Run this ENTIRE file in the Supabase SQL editor. Safe to re-run.
-- =====================================================================

update public.batches set
  student_username = v.su, student_password = v.sp,
  admin_username   = v.au, admin_password   = v.ap
from (values
  (1,  'st01','4821','ad01','7391'),
  (2,  'st02','5137','ad02','8264'),
  (3,  'st03','6942','ad03','3518'),
  (4,  'st04','2765','ad04','9147'),
  (5,  'st05','8319','ad05','4672'),
  (6,  'st06','1594','ad06','7028'),
  (7,  'st07','7268','ad07','5943'),
  (8,  'st08','3486','ad08','2170'),
  (9,  'st09','9057','ad09','6815'),
  (10, 'st10','4713','ad10','3502'),
  (11, 'st11','6820','ad11','9436'),
  (12, 'st12','2394','ad12','7581')
) as v(id, su, sp, au, ap)
where public.batches.id = v.id;

-- Keep future credential resets short too
create or replace function public.jc_admin_reset_student(_u text, _p text)
returns json language plpgsql security definer set search_path = public as $$
declare _bid int; _new_user text; _new_pass text;
begin
  _bid := public._jc_verify_admin(_u, _p);
  _new_user := 'st' || lpad(_bid::text, 2, '0');
  _new_pass := lpad((1000 + floor(random() * 9000))::int::text, 4, '0');
  update public.batches
    set student_username = _new_user, student_password = _new_pass
    where id = _bid;
  return json_build_object('student_username', _new_user, 'student_password', _new_pass);
end $$;

grant execute on function public.jc_admin_reset_student(text, text) to anon, authenticated;
