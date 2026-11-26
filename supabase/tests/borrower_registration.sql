-- Roll back the temporary users and profiles created by this test.
begin;

do $test$
declare
  v_signup_id uuid := gen_random_uuid();
  v_staff_created_id uuid := gen_random_uuid();
  v_signup_email text := v_signup_id || '@example.invalid';
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values
    (v_signup_id, v_signup_email, '{"borrower_registration":true,"full_name":"  Test Borrower  ","contact_phone":"+16505550100","role":"admin"}'),
    (v_staff_created_id, v_staff_created_id || '@example.invalid', '{"full_name":"Staff Created Borrower"}');

  if not exists (
    select 1 from public.profiles where id = v_signup_id and email = v_signup_email
      and full_name = 'Test Borrower' and role = 'client' and phone = '+16505550100'
  ) then
    raise exception 'Self-registration must create a borrower profile with the supplied contact phone and role client';
  end if;

  update auth.users set phone = '16505550101' where id = v_signup_id;
  if (select phone from public.profiles where id = v_signup_id) is distinct from '+16505550100' then
    raise exception 'An unconfirmed Auth number must not replace the contact phone';
  end if;

  update auth.users set phone_confirmed_at = now() where id = v_signup_id;
  if (select phone from public.profiles where id = v_signup_id) is distinct from '+16505550101' then
    raise exception 'The confirmed Auth number must be reflected in the profile';
  end if;

  if exists (select 1 from public.profiles where id = v_staff_created_id) then
    raise exception 'The existing staff-created borrower workflow still creates its own profile';
  end if;

  perform set_config('loan_monitor.test_borrower', v_signup_id::text, true);
end;
$test$;

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('loan_monitor.test_borrower'), true);

do $test$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'client'
  ) then
    raise exception 'The borrower must be able to read their own profile';
  end if;

  update public.profiles set role = 'admin' where id = auth.uid();
  if found then
    raise exception 'Borrowers must be unable to modify their profile role';
  end if;
end;
$test$;

rollback;

select 'Borrower registration and role protection passed' as result;
