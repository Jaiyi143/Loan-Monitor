create function private.normalize_borrower_phone(p_phone text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when compact ~ '^09[0-9]{9}$' then '+63' || substr(compact, 2)
    when compact ~ '^639[0-9]{9}$' then '+' || compact
    when compact ~ '^[+][1-9][0-9]{7,14}$' then compact
  end
  from (select regexp_replace(p_phone, '[[:space:]().-]', '', 'g') as compact) as normalized;
$$;

revoke execute on function private.normalize_borrower_phone(text) from public, anon, authenticated;

create function private.sync_borrower_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
begin
  if new.role = 'client' then
    v_phone := private.normalize_borrower_phone(new.phone);
    new.phone := coalesce(v_phone, new.phone);
    new.sign_in_phone := case when v_phone is not null and exists (
      select 1 from auth.users where id = new.id and email_confirmed_at is not null
    ) then v_phone end;
  end if;
  return new;
end;
$$;

revoke execute on function private.sync_borrower_phone() from public, anon, authenticated;

create trigger sync_borrower_phone
before insert or update of phone on public.profiles
for each row execute function private.sync_borrower_phone();

create or replace function private.set_my_sign_in_phone(p_phone text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_phone is null or p_phone !~ '^[+][1-9][0-9]{7,14}$' then
    raise exception 'Enter a valid phone number';
  end if;

  update public.profiles p
  set phone = p_phone
  where p.id = (select auth.uid()) and p.role = 'client'
    and exists (select 1 from auth.users u where u.id = p.id and u.email_confirmed_at is not null);

  if not found then
    raise exception 'Confirm your email before adding a sign-in phone number';
  end if;
  return p_phone;
exception when unique_violation then
  raise exception 'This number is already used for sign-in. You can still sign in by email';
end;
$$;

-- Preserve working sign-in numbers when filling missing contact numbers.
update public.profiles
set phone = sign_in_phone
where role = 'client' and phone is null and sign_in_phone is not null;

-- Fill unclaimed aliases for confirmed borrowers. Shared contact numbers stay
-- available as contact details and require a unique number for sign-in.
with candidates as (
  select p.id, private.normalize_borrower_phone(p.phone) as phone
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.role = 'client' and p.sign_in_phone is null and u.email_confirmed_at is not null
), unique_phones as (
  select phone from candidates where phone is not null group by phone having count(*) = 1
)
update public.profiles p
set phone = c.phone
from candidates c join unique_phones n on n.phone = c.phone
where p.id = c.id and not exists (select 1 from public.profiles assigned where assigned.sign_in_phone = c.phone);
