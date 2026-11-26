-- Roll back all test fixtures, even when run against a hosted project.
begin;

select set_config('loan_monitor.test_admin', gen_random_uuid()::text, true);
select set_config('loan_monitor.test_client', gen_random_uuid()::text, true);

insert into auth.users (id)
values (current_setting('loan_monitor.test_admin')::uuid),
       (current_setting('loan_monitor.test_client')::uuid);

insert into public.profiles (id, email, full_name, role)
values
  (current_setting('loan_monitor.test_admin')::uuid, current_setting('loan_monitor.test_admin') || '@example.invalid', 'Payment Test Admin', 'admin'),
  (current_setting('loan_monitor.test_client')::uuid, current_setting('loan_monitor.test_client') || '@example.invalid', 'Payment Test Client', 'client');

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('loan_monitor.test_admin'), true);

do $test$
declare
  v_loan uuid;
  v_other_loan uuid;
  v_second_installment uuid;
  v_other_installment uuid;
  v_statuses text[];
begin
  v_loan := public.create_loan_with_schedule(current_setting('loan_monitor.test_client')::uuid, 300, 0, 3, '2025-01-01');
  v_other_loan := public.create_loan_with_schedule(current_setting('loan_monitor.test_admin')::uuid, 100, 0, 1, '2025-01-01');
  perform set_config('loan_monitor.test_loan', v_loan::text, true);
  perform set_config('loan_monitor.test_other_loan', v_other_loan::text, true);

  select id into strict v_second_installment from public.payment_schedule
  where loan_id = v_loan and installment_number = 2;
  select id into strict v_other_installment from public.payment_schedule where loan_id = v_other_loan;

  begin
    perform public.record_payment(v_loan, v_other_installment, 10, current_date, 'cash');
    raise exception 'A payment was accepted for an installment on another loan';
  exception when raise_exception then
    if sqlerrm <> 'Installment does not belong to this loan' then
      raise;
    end if;
  end;

  perform public.record_payment(v_loan, v_second_installment, 40, current_date, 'cash');
  perform public.record_payment(v_loan, null, 150, current_date, 'cash');

  select array_agg(status order by installment_number) into v_statuses
  from public.payment_schedule where loan_id = v_loan;
  if v_statuses is distinct from array['paid', 'partial', 'pending'] then
    raise exception 'Expected paid, partial, pending, got %', v_statuses;
  end if;

  perform public.record_payment(v_loan, null, 110, current_date, 'cash');
  if (select count(*) from public.payments where loan_id = v_loan) <> 3 then
    raise exception 'Expected one payment row per receipt';
  end if;
  if exists (select 1 from public.payment_schedule where loan_id = v_loan and status <> 'paid') then
    raise exception 'Full payment did not clear every installment';
  end if;
  if not exists (select 1 from public.loan_summary where id = v_loan and effective_status = 'paid'
      and remaining_balance = 0 and next_due_date is null and overdue_count = 0) then
    raise exception 'The summary still shows a balance or installments due on a fully paid loan';
  end if;
end;
$test$;

select set_config('request.jwt.claim.sub', current_setting('loan_monitor.test_client'), true);

do $test$
begin
  if not exists (select 1 from public.loan_summary where id = current_setting('loan_monitor.test_loan')::uuid)
    or exists (select 1 from public.loan_summary where id = current_setting('loan_monitor.test_other_loan')::uuid) then
    raise exception 'Borrowers must only see their own loans';
  end if;
end;
$test$;

rollback;

select 'Payment allocation and borrower visibility passed' as result;
