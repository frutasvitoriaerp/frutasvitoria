# Sistema de Controle de Vendas

Sistema web completo para controle de movimentação de vendas com autenticação, produtos, clientes, vendas, estoque e relatórios.

## Stack
- **Frontend**: HTML, CSS, JavaScript (ES Modules)
- **Backend/Banco**: Supabase (PostgreSQL + Auth + Realtime)
- **Deploy**: Qualquer servidor estático (Netlify, Vercel, GitHub Pages, etc.)

## Funcionalidades
- 🔐 **Autenticação** - Login/cadastro com Supabase Auth
- 📦 **Produtos** - CRUD completo com controle de estoque mínimo
- 👥 **Clientes** - CRUD completo
- 💰 **Vendas** - Registro de vendas com múltiplos itens, baixa automática de estoque
- 📋 **Estoque** - Visualização com filtros (baixo, zerado, OK) e ajuste manual
- 📊 **Relatórios** - Vendas por período, top produtos, faturamento mensal
- 📈 **Dashboard** - Estatísticas rápidas, vendas recentes, alertas de estoque baixo

## Configuração

### 1. Criar projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **Settings > API** e copie:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`

### 2. Configurar credenciais
Edite `js/supabase-client.js`:
```javascript
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_ANON_KEY = 'SUA-CHAVE-ANON-PUBLICA';
```

### 3. Criar tabelas no banco
1. No painel do Supabase, vá em **SQL Editor**
2. Cole e execute o conteúdo de `supabase-schema.sql`
3. Isso criará as tabelas, índices, RLS e dados de exemplo

### 4. Configurar Auth
No Supabase: **Authentication > Settings**
- Habilite "Enable email confirmations" (opcional)
- Em "Site URL", adicione a URL onde vai hospedar (ex: `http://localhost:3000`)

### 5. Rodar localmente
Use qualquer servidor estático:

```bash
# Python 3
python -m http.server 3000

# Node.js (http-server)
npx http-server -p 3000

# PHP
php -S localhost:3000
```

Acesse `http://localhost:3000`

## Estrutura do Projeto
```
ERP/
├── index.html           # Página de login
├── dashboard.html       # Dashboard principal
├── styles.css           # Estilos globais
├── supabase-schema.sql  # Schema do banco
└── js/
    ├── supabase-client.js  # Config Supabase + helpers
    ├── auth.js             # Login/cadastro
    └── app.js              # Lógica principal do dashboard
```

## Deploy
Qualquer host de arquivos estáticos funciona:
- **Netlify**: Arraste a pasta `ERP` para o painel
- **Vercel**: `vercel deploy`
- **GitHub Pages**: Push para repo e ative Pages
- **Firebase Hosting**: `firebase deploy`

## Banco de Dados - Esquema

### products
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome do produto |
| price | numeric(10,2) | Preço de venda |
| stock | integer | Estoque atual |
| min_stock | integer | Estoque mínimo para alerta |
| description | text | Descrição opcional |

### customers
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| name | text | Nome |
| email | text | Email |
| phone | text | Telefone |
| city | text | Cidade |
| state | char(2) | Estado (UF) |
| address | text | Endereço |

### sales
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| customer_id | uuid | FK → customers |
| user_id | uuid | FK → auth.users |
| date | date | Data da venda |
| total | numeric(10,2) | Valor total |

### sale_items
| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | uuid | PK |
| sale_id | uuid | FK → sales |
| product_id | uuid | FK → products |
| quantity | integer | Quantidade |
| price | numeric(10,2) | Preço unitário no momento |
| subtotal | numeric(10,2) | quantity × price |

## Segurança
- **RLS (Row Level Security)** habilitado em todas as tabelas
- Usuários só veem/inserem seus próprios dados de vendas
- Produtos e clientes são compartilhados (leitura/escrita para autenticados)
- Chaves anon são seguras para uso no frontend

## Personalização
- Cores: edite variáveis CSS em `:root` no `styles.css`
- Estoque mínimo padrão: altere `min_stock` default no SQL e no `productMinStock` no HTML
- Moeda: já configurada para BRL (pt-BR)

## Licença
MIT