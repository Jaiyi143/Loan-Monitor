drop trigger sync_confirmed_borrower_phone on auth.users;
drop function private.sync_confirmed_borrower_phone();

alter table public.profiles
  add column sign_in_phone text unique check (sign_in_phone ~ '^[+][1-9][0-9]{7,14}$');

create function private.enable_phone_on_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set sign_in_phone = phone
  where id = new.id and role = 'client' and sign_in_phone is null
    and phone ~ '^[+][1-9][0-9]{7,14}$';
  return new;
exception when unique_violation then
  -- A duplicate number must not prevent confirming the email account.
  return new;
end;
$$;

revoke execute on function private.enable_phone_on_email_confirmation() from public, anon, authenticated;

create trigger enable_phone_on_email_confirmation
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
execute function private.enable_phone_on_email_confirmation();

create function private.set_my_sign_in_phone(p_phone text)
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
  set sign_in_phone = p_phone
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

revoke execute on function private.set_my_sign_in_phone(text) from public, anon;
grant execute on function private.set_my_sign_in_phone(text) to authenticated;

create function public.set_my_sign_in_phone(p_phone text)
returns text
language sql
security invoker
set search_path = ''
as $$
  select private.set_my_sign_in_phone(p_phone);
$$;

revoke execute on function public.set_my_sign_in_phone(text) from public, anon;
grant execute on function public.set_my_sign_in_phone(text) to authenticated;

create function private.resolve_borrower_sign_in_phone(p_phone text)
returns table (user_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, u.email::text
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.sign_in_phone = p_phone and p.role = 'client' and u.email_confirmed_at is not null;
$$;

grant usage on schema private to service_role;
revoke execute on function private.resolve_borrower_sign_in_phone(text) from public, anon, authenticated;
grant execute on function private.resolve_borrower_sign_in_phone(text) to service_role;

create function public.resolve_borrower_sign_in_phone(p_phone text)
returns table (user_id uuid, email text)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from private.resolve_borrower_sign_in_phone(p_phone);
$$;

revoke execute on function public.resolve_borrower_sign_in_phone(text) from public, anon, authenticated;
grant execute on function public.resolve_borrower_sign_in_phone(text) to service_role;
