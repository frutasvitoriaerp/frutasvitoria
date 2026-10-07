-- Add DELETE policy for products
create policy "Users can delete products" on products
    for delete using (auth.role() = 'authenticated');