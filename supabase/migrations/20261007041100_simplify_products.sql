-- Simplify products table: only name
alter table products drop column if exists price;
alter table products drop column if exists stock;
alter table products drop column if exists min_stock;
alter table products drop column if exists description;

-- Drop indexes no longer needed
drop index if exists idx_products_stock;

-- Update RLS policies (already fine)