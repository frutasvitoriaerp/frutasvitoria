-- Schema para Sistema de Controle de Vendas

-- Habilitar extensões
create extension if not exists "pgcrypto";

-- Tabela de Produtos
create table products (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    price numeric(10,2) not null default 0,
    stock integer not null default 0,
    min_stock integer not null default 5,
    description text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela de Clientes
create table customers (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    email text,
    phone text,
    city text,
    state char(2),
    address text,
    created_at timestamp with time zone default timezone('utc'::text, now()),
    updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela de Vendas
create table sales (
    id uuid primary key default gen_random_uuid(),
    customer_id uuid not null references customers(id),
    user_id uuid not null references auth.users(id),
    date date not null,
    total numeric(10,2) not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Tabela de Itens da Venda
create table sale_items (
    id uuid primary key default gen_random_uuid(),
    sale_id uuid not null references sales(id) on delete cascade,
    product_id uuid not null references products(id),
    quantity integer not null default 1,
    price numeric(10,2) not null default 0,
    subtotal numeric(10,2) not null default 0,
    created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Índices para performance
create index idx_sales_date on sales(date);
create index idx_sales_customer on sales(customer_id);
create index idx_sales_user on sales(user_id);
create index idx_sale_items_sale on sale_items(sale_id);
create index idx_sale_items_product on sale_items(product_id);
create index idx_products_stock on products(stock);

-- Row Level Security (RLS)
alter table products enable row level security;
alter table customers enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;

-- Políticas: usuários autenticados podem ler tudo
create policy "Authenticated users can read products" on products
    for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read customers" on customers
    for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read sales" on sales
    for select using (auth.role() = 'authenticated');

create policy "Authenticated users can read sale_items" on sale_items
    for select using (auth.role() = 'authenticated');

-- Políticas: usuários podem inserir/atualizar seus próprios dados
create policy "Users can insert products" on products
    for insert with check (auth.role() = 'authenticated');

create policy "Users can update products" on products
    for update using (auth.role() = 'authenticated');

create policy "Users can insert customers" on customers
    for insert with check (auth.role() = 'authenticated');

create policy "Users can update customers" on customers
    for update using (auth.role() = 'authenticated');

create policy "Users can insert sales" on sales
    for insert with check (auth.uid() = user_id);

create policy "Users can insert sale_items" on sale_items
    for insert with check (
        exists (
            select 1 from sales 
            where sales.id = sale_items.sale_id 
            and sales.user_id = auth.uid()
        )
    );

-- Trigger para updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

create trigger update_products_updated_at
    before update on products
    for each row execute function update_updated_at_column();

create trigger update_customers_updated_at
    before update on customers
    for each row execute function update_updated_at_column();

-- Dados de exemplo (opcional)
insert into products (name, price, stock, min_stock, description) values
    ('Notebook Dell Inspiron 15', 3500.00, 10, 3, 'Notebook 15.6" Intel i5 8GB RAM 256GB SSD'),
    ('Mouse Sem Fio Logitech', 89.90, 50, 10, 'Mouse óptico sem fio USB'),
    ('Teclado Mecânico Redragon', 249.90, 20, 5, 'Teclado mecânico RGB switch blue'),
    ('Monitor LG 24" Full HD', 899.00, 15, 3, 'Monitor IPS 24" 75Hz HDMI'),
    ('Headset Gamer HyperX', 349.90, 25, 5, 'Headset 7.1 surround com microfone');

insert into customers (name, email, phone, city, state, address) values
    ('João Silva', 'joao@email.com', '(11) 99999-1111', 'São Paulo', 'SP', 'Rua A, 123'),
    ('Maria Santos', 'maria@email.com', '(21) 98888-2222', 'Rio de Janeiro', 'RJ', 'Av. B, 456'),
    ('Pedro Oliveira', 'pedro@email.com', '(31) 97777-3333', 'Belo Horizonte', 'MG', 'Rua C, 789'),
    ('Ana Costa', 'ana@email.com', '(41) 96666-4444', 'Curitiba', 'PR', 'Av. D, 321'),
    ('Lucas Ferreira', 'lucas@email.com', '(51) 95555-5555', 'Porto Alegre', 'RS', 'Rua E, 654');