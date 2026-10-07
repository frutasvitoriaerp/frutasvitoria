-- Soft delete for products
alter table products add column if not exists deleted_at timestamp with time zone;

-- Index for filtering
create index if not exists idx_products_deleted on products(deleted_at) where deleted_at is null;

-- Update RLS policies to exclude deleted by default
drop policy if exists "Authenticated users can read products" on products;
create policy "Authenticated users can read products" on products
    for select using (auth.role() = 'authenticated' and deleted_at is null);

drop policy if exists "Users can update products" on products;
create policy "Users can update products" on products
    for update using (auth.role() = 'authenticated' and deleted_at is null);

drop policy if exists "Users can insert products" on products;
create policy "Users can insert products" on products
    for insert with check (auth.role() = 'authenticated');

-- Soft delete function (sets deleted_at instead of deleting)
create or replace function soft_delete_product(prod_id uuid)
returns void
language plpgsql
security definer
as $$
begin
    update products 
    set deleted_at = timezone('utc'::text, now())
    where id = prod_id and deleted_at is null;
end;
$$;

-- Restore function
create or replace function restore_product(prod_id uuid)
returns void
language plpgsql
security definer
as $$
begin
    update products 
    set deleted_at = null
    where id = prod_id;
end;
$$;