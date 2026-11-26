-- Rates on existing loans and legacy callers apply to the entire term.
alter table public.loans
  add column interest_rate_period text not null default 'total'
  check (interest_rate_period in ('total', 'monthly'));

create function private.calculate_loan_interest(
  p_principal numeric,
  p_rate numeric,
  p_term_months integer,
  p_rate_period text
)
returns numeric
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select round(p_principal * p_rate * case when p_rate_period = 'monthly' then p_term_months else 1 end / 100, 2);
$$;

revoke execute on function private.calculate_loan_interest(numeric, numeric, integer, text) from public, anon;
grant execute on function private.calculate_loan_interest(numeric, numeric, integer, text) to authenticated;

create or replace view public.loan_summary
with (security_invoker = true) as
with payment_totals as (
  select
    loan_id,
    coalesce(sum(amount), 0)::numeric(12,2) as total_paid
  from public.payments
  group by loan_id
),
schedule_stats as (
  select
    loan_id,
    min(due_date) filter (where status in ('pending', 'partial', 'overdue')) as next_due_date,
    count(*) filter (
      where status in ('pending', 'partial', 'overdue')
        and due_date < current_date
    )::integer as overdue_count
  from public.payment_schedule
  group by loan_id
), loan_amounts as (
  select loans.*,
    private.calculate_loan_interest(principal, interest_rate, term_months, interest_rate_period) as total_interest
  from public.loans
)
select
  l.id,
  l.client_id,
  pr.full_name as client_name,
  pr.email as client_email,
  pr.phone as client_phone,
  l.principal,
  l.interest_rate,
  l.term_months,
  l.start_date,
  l.status,
  l.notes,
  l.created_at,
  l.total_interest::numeric(12,2) as total_interest,
  (l.principal + l.total_interest)::numeric(12,2) as total_payable,
  coalesce(pt.total_paid, 0)::numeric(12,2) as total_paid,
  greatest(
    0,
    (l.principal + l.total_interest) - coalesce(pt.total_paid, 0)
  )::numeric(12,2) as remaining_balance,
  ss.next_due_date,
  coalesce(ss.overdue_count, 0) as overdue_count,
  case
    when l.status = 'defaulted' then 'defaulted'
    when l.status = 'paid'
      or coalesce(pt.total_paid, 0) >= (l.principal + l.total_interest)
      then 'paid'
    when coalesce(ss.overdue_count, 0) > 0 then 'overdue'
    else 'active'
  end as effective_status,
  l.interest_rate_period
from loan_amounts l
join public.profiles pr on pr.id = l.client_id
left join payment_totals pt on pt.loan_id = l.id
left join schedule_stats ss on ss.loan_id = l.id;

create or replace function public.create_loan_with_schedule(
  p_client_id uuid,
  p_principal numeric,
  p_interest_rate numeric,
  p_term_months integer,
  p_start_date date,
  p_notes text,
  p_interest_rate_period text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_loan_id uuid;
  v_total_payable numeric(12,2);
  v_base_installment numeric(12,2);
  v_last_installment numeric(12,2);
  v_i integer;
  v_due_date date;
  v_amount_due numeric(12,2);
begin
  insert into public.loans (client_id, principal, interest_rate, term_months, start_date, notes, interest_rate_period)
  values (p_client_id, p_principal, p_interest_rate, p_term_months, p_start_date, nullif(trim(p_notes), ''), p_interest_rate_period)
  returning id, principal + private.calculate_loan_interest(principal, interest_rate, term_months, interest_rate_period)
  into v_loan_id, v_total_payable;

  v_base_installment := trunc(v_total_payable / p_term_months, 2);
  if v_base_installment = 0 then
    raise exception 'The loan amount is too small for this term';
  end if;
  v_last_installment := v_total_payable - (v_base_installment * (p_term_months - 1));

  for v_i in 1..p_term_months loop
    v_due_date := (p_start_date + make_interval(months => v_i))::date;
    v_amount_due := case when v_i = p_term_months then v_last_installment else v_base_installment end;

    insert into public.payment_schedule (loan_id, installment_number, due_date, amount_due, status)
    values (v_loan_id, v_i, v_due_date, v_amount_due, 'pending');
  end loop;

  return v_loan_id;
end;
$$;

revoke execute on function public.create_loan_with_schedule(uuid, numeric, numeric, integer, date, text, text)
  from public, anon;
grant execute on function public.create_loan_with_schedule(uuid, numeric, numeric, integer, date, text, text)
  to authenticated;

-- An explicit rate period lets current clients use monthly rates while older
-- clients can continue calling the original total-rate signature.
create or replace function public.create_loan_with_schedule(
  p_client_id uuid,
  p_principal numeric,
  p_interest_rate numeric,
  p_term_months integer,
  p_start_date date,
  p_notes text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select public.create_loan_with_schedule(
    p_client_id, p_principal, p_interest_rate, p_term_months, p_start_date, p_notes, 'total'
  );
$$;

create or replace function public.record_payment(
  p_loan_id uuid,
  p_schedule_id uuid,
  p_amount numeric,
  p_paid_on date,
  p_method text,
  p_reference text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_payment_id uuid;
  v_total_payable numeric(12,2);
  v_total_paid numeric;
begin
  -- Serialize payment posting and installment updates for each loan.
  select principal + private.calculate_loan_interest(principal, interest_rate, term_months, interest_rate_period)
  into v_total_payable
  from public.loans
  where id = p_loan_id
  for no key update;

  if not found then
    raise exception 'Loan not found';
  end if;

  if p_schedule_id is not null and not exists (
    select 1 from public.payment_schedule where id = p_schedule_id and loan_id = p_loan_id
  ) then
    raise exception 'Installment does not belong to this loan';
  end if;

  insert into public.payments (loan_id, schedule_id, amount, paid_on, method, reference, recorded_by)
  values (
    p_loan_id,
    p_schedule_id,
    p_amount,
    coalesce(p_paid_on, current_date),
    coalesce(p_method, 'cash'),
    nullif(trim(p_reference), ''),
    (select auth.uid())
  )
  returning id into v_payment_id;

  select coalesce(sum(amount), 0)
  into v_total_paid
  from public.payments
  where loan_id = p_loan_id;

  -- Credit payments tied to an installment first, then apply the remaining
  -- receipts to the oldest unpaid installments. Each receipt stays one row.
  with designated as (
    select schedule_id, sum(amount) as paid
    from public.payments
    where loan_id = p_loan_id and schedule_id is not null
    group by schedule_id
  ), balances as (
    select s.id, s.installment_number, s.amount_due,
      greatest(s.amount_due - coalesce(d.paid, 0), 0) as remaining
    from public.payment_schedule s
    left join designated d on d.schedule_id = s.id
    where s.loan_id = p_loan_id
  ), allocation as (
    select id, amount_due, remaining,
      v_total_paid - sum(amount_due - remaining) over () as unallocated,
      sum(remaining) over (order by installment_number rows unbounded preceding) as cumulative_remaining
    from balances
  ), next_statuses as (
    select id, case
      when remaining = 0 or unallocated >= cumulative_remaining then 'paid'
      when remaining < amount_due or unallocated > cumulative_remaining - remaining then 'partial'
      else 'pending'
    end as status
    from allocation
  )
  update public.payment_schedule s
  set status = n.status
  from next_statuses n
  where s.id = n.id and s.status <> n.status;

  if v_total_paid >= v_total_payable then
    update public.loans
    set status = 'paid'
    where id = p_loan_id and status <> 'paid';
  end if;

  return v_payment_id;
end;
$$;
