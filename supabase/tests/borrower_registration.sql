-- Roll back the temporary users and profiles created by this test.
begin;

do $test$
declare
  v_signup_id uuid := gen_random_uuid();
  v_staff_created_id uuid := gen_random_uuid();
  v_duplicate_id uuid := gen_random_uuid();
  v_admin_id uuid := gen_random_uuid();
  v_signup_email text := v_signup_id || '@example.invalid';
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values
    (v_signup_id, v_signup_email, '{"borrower_registration":true,"full_name":"  Test Borrower  ","contact_phone":"+16505550100","role":"admin"}'),
    (v_staff_created_id, v_staff_created_id || '@example.invalid', '{"full_name":"Staff Created Borrower"}'),
    (v_duplicate_id, v_duplicate_id || '@example.invalid', '{"borrower_registration":true,"contact_phone":"+16505550100"}'),
    (v_admin_id, v_admin_id || '@example.invalid', '{}');

  insert into public.profiles (id, email, full_name, role)
  values (v_admin_id, v_admin_id || '@example.invalid', 'Phone Sync Test Admin', 'admin');

  if not exists (
    select 1 from public.profiles where id = v_signup_id and email = v_signup_email
      and full_name = 'Test Borrower' and role = 'client' and phone = '+16505550100'
  ) then
    raise exception 'Self-registration must create a borrower profile with the supplied contact phone and role client';
  end if;

  if exists (select 1 from public.resolve_borrower_sign_in_phone('+16505550100')) then
    raise exception 'Phone sign-in must wait for the email confirmation';
  end if;

  update auth.users set email_confirmed_at = now() where id = v_signup_id;
  update auth.users set email_confirmed_at = now() where id = v_duplicate_id;
  if not exists (select 1 from public.resolve_borrower_sign_in_phone('+16505550100') where user_id = v_signup_id) then
    raise exception 'Confirming the email must enable the registered sign-in phone number';
  end if;
  if not exists (select 1 from auth.users where id = v_duplicate_id and email_confirmed_at is not null)
    or exists (select 1 from public.profiles where id = v_duplicate_id and sign_in_phone is not null) then
    raise exception 'A duplicate sign-in phone must allow email confirmation without claiming the phone number';
  end if;

  if exists (select 1 from public.profiles where id = v_staff_created_id) then
    raise exception 'The existing staff-created borrower workflow still creates its own profile';
  end if;

  perform set_config('loan_monitor.test_borrower', v_signup_id::text, true);
  perform set_config('loan_monitor.test_admin', v_admin_id::text, true);
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

  if has_function_privilege(current_user, 'public.resolve_borrower_sign_in_phone(text)', 'EXECUTE') then
    raise exception 'Borrowers must be unable to resolve another account by phone';
  end if;
  perform public.set_my_sign_in_phone('+16505550101');
  if not exists (select 1 from public.profiles where id = auth.uid()
      and phone = '+16505550101' and sign_in_phone = '+16505550101') then
    raise exception 'A borrower phone edit must also change the number the admin sees';
  end if;
end;
$test$;

select set_config('request.jwt.claim.sub', current_setting('loan_monitor.test_admin'), true);

do $test$
begin
  update public.profiles set phone = '0917 123-4567' where id = current_setting('loan_monitor.test_borrower')::uuid;
  if not exists (select 1 from public.profiles where id = current_setting('loan_monitor.test_borrower')::uuid
      and phone = '+639171234567' and sign_in_phone = '+639171234567') then
    raise exception 'An admin phone edit must normalize and update the borrower sign-in number';
  end if;
end;
$test$;

reset role;

do $test$
begin
  if not exists (select 1 from public.resolve_borrower_sign_in_phone('+639171234567')
      where user_id = current_setting('loan_monitor.test_borrower')::uuid)
    or exists (select 1 from public.resolve_borrower_sign_in_phone('+16505550101')) then
    raise exception 'Only the latest phone number should resolve for sign-in';
  end if;
end;
$test$;

rollback;

select 'Email confirmation, borrower role protection, and both phone sync directions passed' as result;
