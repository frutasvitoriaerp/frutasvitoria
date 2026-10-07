-- Allow product_id to be NULL in sale_items (for ON DELETE SET NULL to work)
alter table sale_items alter column product_id drop not null;