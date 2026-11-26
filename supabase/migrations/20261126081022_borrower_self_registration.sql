create function private.create_self_registered_borrower()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), new.email), 120),
    'client'
  );
  return new;
end;
$$;

revoke all on function private.create_self_registered_borrower() from public, anon, authenticated;

-- The admin's existing account-creation flow provisions its own profiles.
create trigger create_self_registered_borrower
after insert on auth.users
for each row
when (new.email is not null and new.raw_user_meta_data -> 'borrower_registration' = 'true'::jsonb)
execute function private.create_self_registered_borrower();
