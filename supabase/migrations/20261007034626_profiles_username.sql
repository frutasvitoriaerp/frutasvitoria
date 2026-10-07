-- Profiles table with username for login
create table profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    username text not null unique,
    full_name text,
    avatar_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Index for username lookups
create index idx_profiles_username on profiles(username);

-- RLS
alter table profiles enable row level security;

-- Policies
create policy "Users can read own profile" on profiles
    for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
    for update using (auth.uid() = id);

create policy "Users can insert own profile" on profiles
    for insert with check (auth.uid() = id);

-- Public read for username lookup (needed for login)
create policy "Public can read username for login" on profiles
    for select using (true);

-- Trigger for updated_at
create trigger update_profiles_updated_at
    before update on profiles
    for each row execute function update_updated_at_column();

-- Function to get email by username (for login flow)
create or replace function get_email_by_username(uname text)
returns text
language sql
security definer
as $$
    select u.email
    from auth.users u
    join profiles p on p.id = u.id
    where p.username = uname
    limit 1;
$$;

-- Function to get profile by user id
create or replace function get_profile(user_uuid uuid)
returns table (id uuid, username text, full_name text, avatar_url text)
language sql
security definer
as $$
    select id, username, full_name, avatar_url
    from profiles
    where id = user_uuid;
$$;