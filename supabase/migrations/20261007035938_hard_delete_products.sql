-- Enable hard delete by changing FK to SET NULL
-- This keeps sales history but allows product deletion

-- Drop existing FK
alter table sale_items drop constraint if exists sale_items_product_id_fkey;

-- Recreate with ON DELETE SET NULL
alter table sale_items
add constraint sale_items_product_id_fkey
foreign key (product_id) references products(id) on delete set null;

-- Revert soft delete: drop ALL policies on products first
drop policy if exists "Authenticated users can read products" on products;
drop policy if exists "Users can update products" on products;
drop policy if exists "Users can insert products" on products;
drop policy if exists "Public can read username for login" on products;

-- Remove deleted_at column
alter table products drop column if exists deleted_at;

-- Restore original RLS policies
create policy "Authenticated users can read products" on products
    for select using (auth.role() = 'authenticated');

create policy "Users can update products" on products
    for update using (auth.role() = 'authenticated');

create policy "Users can insert products" on products
    for insert with check (auth.role() = 'authenticated');

-- Drop soft delete functions
drop function if exists soft_delete_product(uuid);
drop function if exists restore_product(uuid);