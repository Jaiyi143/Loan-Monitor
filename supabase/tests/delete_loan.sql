begin;

select set_config('loan_monitor.test_admin', gen_random_uuid()::text, true);
select set_config('loan_monitor.test_client', gen_random_uuid()::text, true);
insert into auth.users (id) values
  (current_setting('loan_monitor.test_admin')::uuid), (current_setting('loan_monitor.test_client')::uuid);
insert into public.profiles (id, email, full_name, role) values
  (current_setting('loan_monitor.test_admin')::uuid, current_setting('loan_monitor.test_admin') || '@example.invalid', 'Delete Test Admin', 'admin'),
  (current_setting('loan_monitor.test_client')::uuid, current_setting('loan_monitor.test_client') || '@example.invalid', 'Delete Test Borrower', 'client');

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('loan_monitor.test_admin'), true);
select set_config('loan_monitor.test_loan', public.create_loan_with_schedule(
  current_setting('loan_monitor.test_client')::uuid, 100, 0, 2, current_date
)::text, true);
select public.record_payment(current_setting('loan_monitor.test_loan')::uuid, null, 10, current_date, 'cash');

select set_config('request.jwt.claim.sub', current_setting('loan_monitor.test_client'), true);
do $$
begin
  begin
    perform public.delete_admin_loan(current_setting('loan_monitor.test_loan')::uuid);
    raise exception 'A borrower was allowed to call the deletion function';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', current_setting('loan_monitor.test_admin'), true);
do $$
declare
  v_loan uuid := current_setting('loan_monitor.test_loan')::uuid;
begin
  if not public.delete_admin_loan(v_loan) then raise exception 'An admin could not delete the loan'; end if;
  if public.delete_admin_loan(v_loan) then raise exception 'A repeated request reported a deletion'; end if;
  if exists (select 1 from public.payment_schedule where loan_id = v_loan)
    or exists (select 1 from public.payments where loan_id = v_loan) then
    raise exception 'Deleting the loan left its schedule or payments behind';
  end if;
  if not exists (select 1 from public.profiles where id = current_setting('loan_monitor.test_client')::uuid) then
    raise exception 'Deleting a loan removed the borrower profile';
  end if;
end;
$$;

rollback;

select 'Admin deletion, borrower protection, and payment cleanup passed' as result;
