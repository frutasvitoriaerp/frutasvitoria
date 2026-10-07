-- User Roles and Permissions System
-- Works with Supabase Auth (auth.users)

-- Roles table
create table roles (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Permissions table (granular permissions)
create table permissions (
    id uuid primary key default gen_random_uuid(),
    name text not null unique,          -- e.g., 'products.create', 'sales.read', 'reports.view'
    resource text not null,             -- e.g., 'products', 'sales', 'customers', 'reports', 'settings'
    action text not null,               -- e.g., 'create', 'read', 'update', 'delete', 'manage'
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Role-Permissions junction (many-to-many)
create table role_permissions (
    role_id uuid not null references roles(id) on delete cascade,
    permission_id uuid not null references permissions(id) on delete cascade,
    primary key (role_id, permission_id)
);

-- User-Roles junction (many-to-many, users can have multiple roles)
create table user_roles (
    user_id uuid not null references auth.users(id) on delete cascade,
    role_id uuid not null references roles(id) on delete cascade,
    assigned_by uuid references auth.users(id),
    assigned_at timestamp with time zone default timezone('utc'::text, now()),
    primary key (user_id, role_id)
);

-- Indexes
create index idx_user_roles_user on user_roles(user_id);
create index idx_user_roles_role on user_roles(role_id);
create index idx_role_permissions_role on role_permissions(role_id);
create index idx_role_permissions_permission on role_permissions(permission_id);

-- RLS
alter table roles enable row level security;
alter table permissions enable row level security;
alter table role_permissions enable row level security;
alter table user_roles enable row level security;

-- Policies: authenticated users can read roles/permissions
create policy "Authenticated users can read roles" on roles
    for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read permissions" on permissions
    for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read role_permissions" on role_permissions
    for select using (auth.role() = 'authenticated');

-- Users can read their own roles
create policy "Users can read own roles" on user_roles
    for select using (auth.uid() = user_id);

-- Admins can manage roles/permissions (will be enforced by app-level checks + service role)
-- For now, only service role can modify
create policy "Service role manages roles" on roles
    for all using (auth.role() = 'service_role');

create policy "Service role manages permissions" on permissions
    for all using (auth.role() = 'service_role');

create policy "Service role manages role_permissions" on role_permissions
    for all using (auth.role() = 'service_role');

create policy "Service role manages user_roles" on user_roles
    for all using (auth.role() = 'service_role');

-- Default roles
insert into roles (name, description) values
    ('admin', 'Administrador completo - acesso total ao sistema'),
    ('manager', 'Gerente - gerencia vendas, produtos, clientes e relatórios'),
    ('seller', 'Vendedor - registra vendas e consulta produtos/clientes'),
    ('viewer', 'Visualizador - apenas leitura de relatórios e dashboards')
on conflict (name) do nothing;

-- Default permissions
insert into permissions (name, resource, action, description) values
    -- Products
    ('products.create', 'products', 'create', 'Criar produtos'),
    ('products.read', 'products', 'read', 'Visualizar produtos'),
    ('products.update', 'products', 'update', 'Editar produtos'),
    ('products.delete', 'products', 'delete', 'Excluir produtos'),
    ('products.manage_stock', 'products', 'manage_stock', 'Ajustar estoque manualmente'),

    -- Customers
    ('customers.create', 'customers', 'create', 'Cadastrar clientes'),
    ('customers.read', 'customers', 'read', 'Visualizar clientes'),
    ('customers.update', 'customers', 'update', 'Editar clientes'),
    ('customers.delete', 'customers', 'delete', 'Excluir clientes'),

    -- Sales
    ('sales.create', 'sales', 'create', 'Registrar vendas'),
    ('sales.read', 'sales', 'read', 'Visualizar vendas'),
    ('sales.update', 'sales', 'update', 'Editar vendas (cancelar/corrigir)'),
    ('sales.delete', 'sales', 'delete', 'Excluir vendas'),

    -- Stock
    ('stock.read', 'stock', 'read', 'Visualizar controle de estoque'),
    ('stock.manage', 'stock', 'manage', 'Gerenciar estoque (ajustes, alertas)'),

    -- Reports
    ('reports.read', 'reports', 'read', 'Visualizar relatórios'),
    ('reports.export', 'reports', 'export', 'Exportar relatórios'),

    -- Settings / Users
    ('settings.manage', 'settings', 'manage', 'Gerenciar configurações do sistema'),
    ('users.manage', 'users', 'manage', 'Gerenciar usuários e permissões')
on conflict (name) do nothing;

-- Role-Permission mappings
-- Admin: all permissions
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.name = 'admin'
on conflict do nothing;

-- Manager: products, customers, sales, stock, reports (no user management)
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.name = 'manager'
  and p.resource in ('products', 'customers', 'sales', 'stock', 'reports')
on conflict do nothing;

-- Seller: create/read sales, read products/customers, read stock
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.name = 'seller'
  and p.name in (
    'sales.create', 'sales.read',
    'products.read',
    'customers.read', 'customers.create',
    'stock.read'
  )
on conflict do nothing;

-- Viewer: read only
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r, permissions p
where r.name = 'viewer'
  and p.action = 'read'
on conflict do nothing;

-- Function to check if user has permission
create or replace function user_has_permission(user_uuid uuid, perm_name text)
returns boolean
language sql
security definer
as $$
    select exists (
        select 1
        from user_roles ur
        join role_permissions rp on rp.role_id = ur.role_id
        join permissions p on p.id = rp.permission_id
        where ur.user_id = user_uuid
          and p.name = perm_name
    );
$$;

-- Function to get user roles
create or replace function get_user_roles(user_uuid uuid)
returns table (role_name text, role_description text)
language sql
security definer
as $$
    select r.name, r.description
    from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = user_uuid;
$$;

-- Function to get user permissions
create or replace function get_user_permissions(user_uuid uuid)
returns table (permission_name text, resource text, action text)
language sql
security definer
as $$
    select p.name, p.resource, p.action
    from user_roles ur
    join role_permissions rp on rp.role_id = ur.role_id
    join permissions p on p.id = rp.permission_id
    where ur.user_id = user_uuid;
$$;

-- Trigger to assign default role to new users (optional - run manually or via hook)
-- create trigger on auth.users after insert to assign 'viewer' role