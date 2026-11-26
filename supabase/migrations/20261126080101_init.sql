-- Loan Monitor initial schema, RLS policies, summary view, and atomic RPCs

create schema if not exists private;

-- 1. Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text,
  role text not null default 'client' check (role in ('admin', 'client')),
  created_at timestamptz not null default now()
);

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete restrict,
  principal numeric(12,2) not null check (principal > 0),
  interest_rate numeric(6,2) not null check (interest_rate >= 0),
  term_months integer not null check (term_months > 0 and term_months <= 360),
  start_date date not null,
  status text not null default 'active' check (status in ('active', 'paid', 'defaulted')),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_schedule (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  installment_number integer not null check (installment_number > 0),
  due_date date not null,
  amount_due numeric(12,2) not null check (amount_due > 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'partial', 'overdue')),
  unique (loan_id, installment_number)
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans(id) on delete cascade,
  schedule_id uuid references public.payment_schedule(id) on delete set null,
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null default current_date,
  method text not null default 'cash' check (method in ('cash', 'gcash', 'bank_transfer', 'other')),
  reference text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

-- 2. Indexes on foreign keys and RLS/query columns
create index if not exists loans_client_id_idx on public.loans (client_id);
create index if not exists loans_status_idx on public.loans (status);
create index if not exists payment_schedule_loan_id_due_date_idx on public.payment_schedule (loan_id, due_date);
create index if not exists payments_loan_id_idx on public.payments (loan_id);
create index if not exists payments_schedule_id_idx on public.payments (schedule_id);

-- 3. Private admin check helper (non-exposed schema, checks auth.uid())
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.profiles
      where id = (select auth.uid())
        and role = 'admin'
    );
$$;

revoke all on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

-- 4. Row Level Security
alter table public.profiles enable row level security;
alter table public.loans enable row level security;
alter table public.payment_schedule enable row level security;
alter table public.payments enable row level security;

-- Profiles: clients read own row; admins manage all rows
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));

create policy "profiles_insert_admin"
  on public.profiles for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "profiles_update_admin"
  on public.profiles for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using ((select private.is_admin()));

-- Loans: clients read own loans; admins manage all loans
create policy "loans_select_own_or_admin"
  on public.loans for select
  to authenticated
  using (client_id = (select auth.uid()) or (select private.is_admin()));

create policy "loans_insert_admin"
  on public.loans for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "loans_update_admin"
  on public.loans for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "loans_delete_admin"
  on public.loans for delete
  to authenticated
  using ((select private.is_admin()));

-- Payment schedule: clients read schedules for own loans; admins manage all
create policy "schedule_select_own_or_admin"
  on public.payment_schedule for select
  to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.loans l
      where l.id = loan_id and l.client_id = (select auth.uid())
    )
  );

create policy "schedule_insert_admin"
  on public.payment_schedule for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "schedule_update_admin"
  on public.payment_schedule for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "schedule_delete_admin"
  on public.payment_schedule for delete
  to authenticated
  using ((select private.is_admin()));

-- Payments: clients read payments for own loans; admins manage all
create policy "payments_select_own_or_admin"
  on public.payments for select
  to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.loans l
      where l.id = loan_id and l.client_id = (select auth.uid())
    )
  );

create policy "payments_insert_admin"
  on public.payments for insert
  to authenticated
  with check ((select private.is_admin()));

create policy "payments_update_admin"
  on public.payments for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "payments_delete_admin"
  on public.payments for delete
  to authenticated
  using ((select private.is_admin()));

-- 5. Summary View (security_invoker = true so caller RLS is always enforced)
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
  round(l.principal * (l.interest_rate / 100.0), 2)::numeric(12,2) as total_interest,
  (l.principal + round(l.principal * (l.interest_rate / 100.0), 2))::numeric(12,2) as total_payable,
  coalesce(pt.total_paid, 0)::numeric(12,2) as total_paid,
  greatest(
    0,
    (l.principal + round(l.principal * (l.interest_rate / 100.0), 2)) - coalesce(pt.total_paid, 0)
  )::numeric(12,2) as remaining_balance,
  ss.next_due_date,
  coalesce(ss.overdue_count, 0) as overdue_count,
  case
    when l.status = 'defaulted' then 'defaulted'
    when l.status = 'paid'
      or coalesce(pt.total_paid, 0) >= (l.principal + round(l.principal * (l.interest_rate / 100.0), 2))
      then 'paid'
    when coalesce(ss.overdue_count, 0) > 0 then 'overdue'
    else 'active'
  end as effective_status
from public.loans l
join public.profiles pr on pr.id = l.client_id
left join payment_totals pt on pt.loan_id = l.id
left join schedule_stats ss on ss.loan_id = l.id;

-- 6. Atomic RPCs (security invoker, RLS enforced)
create or replace function public.create_loan_with_schedule(
  p_client_id uuid,
  p_principal numeric,
  p_interest_rate numeric,
  p_term_months integer,
  p_start_date date,
  p_notes text default null
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
  v_total_payable := round(p_principal + round(p_principal * (p_interest_rate / 100.0), 2), 2);
  v_base_installment := trunc((v_total_payable / p_term_months) * 100) / 100.0;
  v_last_installment := v_total_payable - (v_base_installment * (p_term_months - 1));

  insert into public.loans (client_id, principal, interest_rate, term_months, start_date, notes)
  values (p_client_id, p_principal, p_interest_rate, p_term_months, p_start_date, nullif(trim(p_notes), ''))
  returning id into v_loan_id;

  for v_i in 1..p_term_months loop
    v_due_date := (p_start_date + make_interval(months => v_i))::date;
    v_amount_due := case when v_i = p_term_months then v_last_installment else v_base_installment end;

    insert into public.payment_schedule (loan_id, installment_number, due_date, amount_due, status)
    values (v_loan_id, v_i, v_due_date, v_amount_due, 'pending');
  end loop;

  return v_loan_id;
end;
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
  select principal + round(principal * interest_rate / 100, 2)
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

-- 7. Data API grants. Row access is enforced separately by the policies above.
grant select on public.profiles, public.loans, public.payment_schedule, public.payments, public.loan_summary to authenticated;
grant insert on public.loans, public.payment_schedule, public.payments to authenticated;
grant update on public.profiles, public.loans, public.payment_schedule to authenticated;
grant insert on public.profiles to service_role;

revoke execute on function public.create_loan_with_schedule(uuid, numeric, numeric, integer, date, text) from public, anon;
revoke execute on function public.record_payment(uuid, uuid, numeric, date, text, text) from public, anon;
grant execute on function public.create_loan_with_schedule(uuid, numeric, numeric, integer, date, text) to authenticated;
grant execute on function public.record_payment(uuid, uuid, numeric, date, text, text) to authenticated;
