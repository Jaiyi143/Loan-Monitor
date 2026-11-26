-- Roll back the temporary users, loans, schedules, and payments.
begin;

select set_config('loan_monitor.test_admin', gen_random_uuid()::text, true);
insert into auth.users (id) values (current_setting('loan_monitor.test_admin')::uuid);
insert into public.profiles (id, email, full_name, role)
values (current_setting('loan_monitor.test_admin')::uuid,
  current_setting('loan_monitor.test_admin') || '@example.invalid', 'Interest Test Admin', 'admin');

set local role authenticated;
select set_config('request.jwt.claim.sub', current_setting('loan_monitor.test_admin'), true);
select set_config('loan_monitor.test_legacy_loan', public.create_loan_with_schedule(
  current_setting('loan_monitor.test_admin')::uuid, 10000, 2, 9, '2099-01-31'
)::text, true);
reset role;

-- The migration can be tested here against a loan created under the old schema.

set local role authenticated;
do $test$
declare
  v_legacy_id uuid := current_setting('loan_monitor.test_legacy_loan')::uuid;
  v_monthly_id uuid;
  v_client_id uuid := current_setting('loan_monitor.test_admin')::uuid;
begin
  if not exists (select 1 from public.loan_summary where id = v_legacy_id
      and interest_rate_period = 'total' and total_interest = 200 and total_payable = 10200) then
    raise exception 'The total-rate loan changed';
  end if;
  if (select sum(amount_due) from public.payment_schedule where loan_id = v_legacy_id) is distinct from 10200 then
    raise exception 'The existing schedule changed';
  end if;

  v_monthly_id := public.create_loan_with_schedule(
    p_client_id => v_client_id, p_principal => 10000, p_interest_rate => 2,
    p_term_months => 9, p_start_date => '2099-01-31', p_notes => null, p_interest_rate_period => 'monthly'
  );
  if not exists (select 1 from public.loan_summary where id = v_monthly_id
      and interest_rate_period = 'monthly' and total_interest = 1800 and total_payable = 11800) then
    raise exception 'Monthly loan summary did not calculate 2 percent across 9 months';
  end if;
  if (select array_agg(amount_due order by installment_number) from public.payment_schedule where loan_id = v_monthly_id)
      is distinct from (array_fill(1311.11::numeric, array[8]) || 1311.12::numeric) then
    raise exception 'Monthly schedule did not reconcile to the payable total';
  end if;

  perform public.record_payment(v_legacy_id, null, 10200, current_date, 'cash');
  if not exists (select 1 from public.loan_summary where id = v_legacy_id and status = 'paid' and remaining_balance = 0) then
    raise exception 'The total-rate loan should still be paid off at its original balance';
  end if;

  perform public.record_payment(v_monthly_id, null, 10200, current_date, 'cash');
  if not exists (select 1 from public.loan_summary where id = v_monthly_id and status = 'active' and remaining_balance = 1600) then
    raise exception 'The monthly loan was closed before all interest was paid';
  end if;
  perform public.record_payment(v_monthly_id, null, 1600, current_date, 'cash');
  if not exists (select 1 from public.loan_summary where id = v_monthly_id and status = 'paid'
      and remaining_balance = 0 and next_due_date is null) then
    raise exception 'The monthly loan did not close once fully paid';
  end if;
end;
$test$;

rollback;

select 'Monthly interest, existing loans, and payoff checks passed' as result;
