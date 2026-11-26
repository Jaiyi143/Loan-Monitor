create or replace function private.create_self_registered_borrower()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contact_phone text := new.raw_user_meta_data ->> 'contact_phone';
begin
  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    new.email,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), new.email), 120),
    case when v_contact_phone ~ '^[+][1-9][0-9]{7,14}$' then v_contact_phone end,
    'client'
  );
  return new;
end;
$$;

create function private.sync_confirmed_borrower_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set phone = '+' || ltrim(new.phone, '+')
  where id = new.id and role = 'client';
  return new;
end;
$$;

revoke execute on function private.sync_confirmed_borrower_phone() from public, anon, authenticated;

create trigger sync_confirmed_borrower_phone
after update of phone, phone_confirmed_at on auth.users
for each row
when (new.phone_confirmed_at is not null and new.phone ~ '^[+]?[1-9][0-9]{7,14}$'
  and (old.phone is distinct from new.phone or old.phone_confirmed_at is distinct from new.phone_confirmed_at))
execute function private.sync_confirmed_borrower_phone();
