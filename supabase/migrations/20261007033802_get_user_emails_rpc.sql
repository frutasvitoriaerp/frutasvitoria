-- Function to get user emails (callable by anon key via service role)
create or replace function get_user_emails(user_ids uuid[])
returns table (id uuid, email text)
language plpgsql
security definer
as $$
begin
    return query
    select u.id, u.email
    from auth.users u
    where u.id = any(user_ids);
end;
$$;