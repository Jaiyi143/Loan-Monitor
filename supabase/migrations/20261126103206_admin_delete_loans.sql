create function private.delete_admin_loan(p_loan_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise insufficient_privilege using message = 'Admin access required to delete a loan';
  end if;

  delete from public.loans where id = p_loan_id;
  return found;
end;
$$;

revoke execute on function private.delete_admin_loan(uuid) from public, anon;
grant execute on function private.delete_admin_loan(uuid) to authenticated;

create function public.delete_admin_loan(p_loan_id uuid)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.delete_admin_loan(p_loan_id);
$$;

revoke execute on function public.delete_admin_loan(uuid) from public, anon;
grant execute on function public.delete_admin_loan(uuid) to authenticated;
