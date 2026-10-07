-- Fix FK to allow product deletion (ON DELETE SET NULL)
alter table sale_items drop constraint if exists sale_items_product_id_fkey;

alter table sale_items
add constraint sale_items_product_id_fkey
foreign key (product_id) references products(id) on delete set null;