import { supabase, formatCurrency, formatDate, formatDateTime, showToast, hasPermission } from './supabase-client.js';

// Elementos DOM
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');
const logoutBtn = document.getElementById('logoutBtn');
const userEmail = document.getElementById('userEmail');
const pageTitle = document.getElementById('pageTitle');
const navItems = document.querySelectorAll('.nav-item');
const tabContents = document.querySelectorAll('.tab-content');

// Modals
const productModal = document.getElementById('productModal');
const customerModal = document.getElementById('customerModal');
const saleDetailModal = document.getElementById('saleDetailModal');

// State
let currentUser = null;
let products = [];
let customers = [];
let sales = [];
let saleItems = [];

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    setupEventListeners();
    await loadInitialData();
    setDefaultDates();
});

async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = session.user;
    
    // Buscar username do profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', currentUser.id)
        .single();
    
    const displayName = profile?.username || currentUser.email;
    userEmail.textContent = displayName;
    
    // Escutar logout
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            window.location.href = 'index.html';
        }
    });
}

function setupEventListeners() {
    // Sidebar toggle
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    
    // Logout
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut();
    });
    
    // Navegação tabs
    navItems.forEach(item => {
        item.addEventListener('click', () => switchTab(item.dataset.tab));
    });
    
    // Modal close buttons
    document.querySelectorAll('.modal-close, [data-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.modal || btn.closest('.modal').id;
            closeModal(modalId);
        });
    });
    
    // Fechar modal clicando fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal(modal.id);
        });
    });
    
    // Product modal
    document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    
    // Customer modal
    document.getElementById('addCustomerBtn').addEventListener('click', () => openCustomerModal());
    document.getElementById('customerForm').addEventListener('submit', handleCustomerSubmit);
    
    // Sale form
    document.getElementById('addSaleItemBtn').addEventListener('click', addSaleItemRow);
    document.getElementById('saleForm').addEventListener('submit', handleSaleSubmit);
    document.getElementById('cancelSaleBtn').addEventListener('click', resetSaleForm);
    
    // Stock filter
    document.getElementById('stockFilter').addEventListener('change', renderStockTable);
    
    // Reports
    document.getElementById('generatePeriodReport').addEventListener('click', generatePeriodReport);
    document.getElementById('generateTopProducts').addEventListener('click', generateTopProductsReport);
    document.getElementById('generateMonthlyRevenue').addEventListener('click', generateMonthlyRevenueReport);
}

function switchTab(tabName) {
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.tab === tabName);
    });
    tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
    
    pageTitle.textContent = getTabTitle(tabName);
    
    // Fechar sidebar no mobile
    sidebar.classList.remove('open');
    
    // Carregar dados específicos da tab
    switch (tabName) {
        case 'dashboard': loadDashboardData(); break;
        case 'products': renderProductsTable(); break;
        case 'customers': renderCustomersTable(); break;
        case 'sales': loadSalesData(); break;
        case 'stock': renderStockTable(); break;
        case 'reports': setDefaultReportDates(); break;
        case 'users': loadUsersTab(); break;
    }
}

function getTabTitle(tab) {
    const titles = {
        dashboard: 'Dashboard',
        products: 'Produtos',
        customers: 'Clientes',
        sales: 'Vendas',
        stock: 'Estoque',
        reports: 'Relatórios',
        users: 'Usuários'
    };
    return titles[tab] || 'Dashboard';
}

async function loadInitialData() {
    await Promise.all([
        loadProducts(),
        loadCustomers()
    ]);
    renderProductsTable();
    renderCustomersTable();
    populateCustomerSelect();
    addSaleItemRow(); // Adicionar primeira linha de item
}

function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('saleDate').value = today;
}

function setDefaultReportDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
    document.getElementById('reportStartDate').value = firstDay;
    document.getElementById('reportEndDate').value = lastDay;
}

// ===== PRODUCTS =====
async function loadProducts() {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
    
    if (error) {
        showToast('Erro ao carregar produtos: ' + error.message, 'error');
        return;
    }
    products = data || [];
}

function renderProductsTable() {
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = products.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${formatCurrency(p.price)}</td>
            <td>${p.stock}</td>
            <td>${p.min_stock}</td>
            <td>
                <button class="btn btn-secondary action-btn" onclick="editProduct('${p.id}')">Editar</button>
                <button class="btn btn-danger action-btn" onclick="deleteProduct('${p.id}')">Excluir</button>
            </td>
        </tr>
    `).join('');
}

window.editProduct = function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    openProductModal(product);
};

window.deleteProduct = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
        return;
    }
    showToast('Produto excluído com sucesso', 'success');
    await loadProducts();
    renderProductsTable();
    renderStockTable();
    await loadDashboardData();
};

function openProductModal(product = null) {
    const form = document.getElementById('productForm');
    const title = document.getElementById('productModalTitle');
    
    form.reset();
    document.getElementById('productId').value = '';
    
    if (product) {
        title.textContent = 'Editar Produto';
        document.getElementById('productId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productStock').value = product.stock;
        document.getElementById('productMinStock').value = product.min_stock;
        document.getElementById('productDescription').value = product.description || '';
    } else {
        title.textContent = 'Novo Produto';
        document.getElementById('productMinStock').value = 5;
    }
    
    productModal.classList.remove('hidden');
}

async function handleProductSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('productId').value;
    const productData = {
        name: document.getElementById('productName').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        min_stock: parseInt(document.getElementById('productMinStock').value),
        description: document.getElementById('productDescription').value
    };
    
    let error;
    if (id) {
        ({ error } = await supabase.from('products').update(productData).eq('id', id));
    } else {
        ({ error } = await supabase.from('products').insert(productData));
    }
    
    if (error) {
        showToast('Erro ao salvar: ' + error.message, 'error');
        return;
    }
    
    showToast(id ? 'Produto atualizado' : 'Produto criado', 'success');
    closeModal('productModal');
    await loadProducts();
    renderProductsTable();
    renderStockTable();
    populateProductSelects();
    await loadDashboardData();
}

// ===== CUSTOMERS =====
async function loadCustomers() {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name');
    
    if (error) {
        showToast('Erro ao carregar clientes: ' + error.message, 'error');
        return;
    }
    customers = data || [];
}

function renderCustomersTable() {
    const tbody = document.querySelector('#customersTable tbody');
    tbody.innerHTML = customers.map(c => `
        <tr>
            <td>${c.name}</td>
            <td>${c.email || '-'}</td>
            <td>${c.phone || '-'}</td>
            <td>${c.city || '-'}</td>
            <td>
                <button class="btn btn-secondary action-btn" onclick="editCustomer('${c.id}')">Editar</button>
                <button class="btn btn-danger action-btn" onclick="deleteCustomer('${c.id}')">Excluir</button>
            </td>
        </tr>
    `).join('');
}

window.editCustomer = function(id) {
    const customer = customers.find(c => c.id === id);
    if (!customer) return;
    openCustomerModal(customer);
};

window.deleteCustomer = async function(id) {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
        return;
    }
    showToast('Cliente excluído com sucesso', 'success');
    await loadCustomers();
    renderCustomersTable();
    populateCustomerSelect();
};

function openCustomerModal(customer = null) {
    const form = document.getElementById('customerForm');
    const title = document.getElementById('customerModalTitle');
    
    form.reset();
    document.getElementById('customerId').value = '';
    
    if (customer) {
        title.textContent = 'Editar Cliente';
        document.getElementById('customerId').value = customer.id;
        document.getElementById('customerName').value = customer.name;
        document.getElementById('customerEmail').value = customer.email || '';
        document.getElementById('customerPhone').value = customer.phone || '';
        document.getElementById('customerCity').value = customer.city || '';
        document.getElementById('customerState').value = customer.state || '';
        document.getElementById('customerAddress').value = customer.address || '';
    } else {
        title.textContent = 'Novo Cliente';
    }
    
    customerModal.classList.remove('hidden');
}

async function handleCustomerSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('customerId').value;
    const customerData = {
        name: document.getElementById('customerName').value,
        email: document.getElementById('customerEmail').value,
        phone: document.getElementById('customerPhone').value,
        city: document.getElementById('customerCity').value,
        state: document.getElementById('customerState').value,
        address: document.getElementById('customerAddress').value
    };
    
    let error;
    if (id) {
        ({ error } = await supabase.from('customers').update(customerData).eq('id', id));
    } else {
        ({ error } = await supabase.from('customers').insert(customerData));
    }
    
    if (error) {
        showToast('Erro ao salvar: ' + error.message, 'error');
        return;
    }
    
    showToast(id ? 'Cliente atualizado' : 'Cliente criado', 'success');
    closeModal('customerModal');
    await loadCustomers();
    renderCustomersTable();
    populateCustomerSelect();
}

// ===== SALES =====
function populateCustomerSelect() {
    const select = document.getElementById('saleCustomer');
    const currentValue = select.value;
    select.innerHTML = '<option value="">Selecione um cliente</option>' +
        customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    select.value = currentValue;
}

function populateProductSelects() {
    document.querySelectorAll('.sale-product-select').forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Selecione um produto</option>' +
            products.filter(p => p.stock > 0).map(p => 
                `<option value="${p.id}" data-price="${p.price}" data-stock="${p.stock}">${p.name} (Est: ${p.stock})</option>`
            ).join('');
        select.value = currentValue;
    });
}

function addSaleItemRow(productId = null, quantity = 1) {
    const container = document.getElementById('saleItemsContainer');
    const index = saleItems.length;
    
    const row = document.createElement('div');
    row.className = 'sale-item-row';
    row.dataset.index = index;
    row.innerHTML = `
        <select class="sale-product-select" required>
            <option value="">Selecione um produto</option>
            ${products.filter(p => p.stock > 0).map(p => 
                `<option value="${p.id}" data-price="${p.price}" data-stock="${p.stock}" ${p.id === productId ? 'selected' : ''}>
                    ${p.name} (Est: ${p.stock})
                </option>`
            ).join('')}
        </select>
        <input type="number" class="sale-quantity" min="1" value="${quantity}" required>
        <input type="number" class="sale-price" step="0.01" min="0" readonly>
        <span class="sale-subtotal">R$ 0,00</span>
        <button type="button" class="btn btn-danger action-btn" onclick="removeSaleItem(${index})">×</button>
    `;
    
    container.appendChild(row);
    saleItems.push({ productId, quantity, price: 0 });
    
    // Event listeners
    const productSelect = row.querySelector('.sale-product-select');
    const quantityInput = row.querySelector('.sale-quantity');
    const priceInput = row.querySelector('.sale-price');
    
    productSelect.addEventListener('change', () => updateSaleItem(index));
    quantityInput.addEventListener('input', () => updateSaleItem(index));
    
    if (productId) {
        updateSaleItem(index);
    }
    updateSaleTotal();
}

window.removeSaleItem = function(index) {
    const row = document.querySelector(`.sale-item-row[data-index="${index}"]`);
    if (row) row.remove();
    saleItems.splice(index, 1);
    // Reindexar
    document.querySelectorAll('.sale-item-row').forEach((r, i) => {
        r.dataset.index = i;
        r.querySelector('button').onclick = () => removeSaleItem(i);
    });
    saleItems = saleItems.filter((_, i) => i !== index);
    updateSaleTotal();
};

function updateSaleItem(index) {
    const row = document.querySelector(`.sale-item-row[data-index="${index}"]`);
    if (!row) return;
    
    const productSelect = row.querySelector('.sale-product-select');
    const quantityInput = row.querySelector('.sale-quantity');
    const priceInput = row.querySelector('.sale-price');
    const subtotalEl = row.querySelector('.sale-subtotal');
    
    const productId = productSelect.value;
    const quantity = parseInt(quantityInput.value) || 0;
    
    if (productId) {
        const option = productSelect.options[productSelect.selectedIndex];
        const price = parseFloat(option.dataset.price) || 0;
        const stock = parseInt(option.dataset.stock) || 0;
        
        priceInput.value = price.toFixed(2);
        subtotalEl.textContent = formatCurrency(price * quantity);
        
        // Validar estoque
        if (quantity > stock) {
            quantityInput.setCustomValidity(`Estoque disponível: ${stock}`);
            quantityInput.reportValidity();
        } else {
            quantityInput.setCustomValidity('');
        }
        
        saleItems[index] = { productId, quantity, price };
    } else {
        priceInput.value = '';
        subtotalEl.textContent = 'R$ 0,00';
        saleItems[index] = { productId: null, quantity: 0, price: 0 };
    }
    
    updateSaleTotal();
}

function updateSaleTotal() {
    const total = saleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById('saleTotal').textContent = formatCurrency(total);
}

function resetSaleForm() {
    document.getElementById('saleForm').reset();
    setDefaultDates();
    document.getElementById('saleItemsContainer').innerHTML = '';
    saleItems = [];
    addSaleItemRow();
    updateSaleTotal();
}

async function handleSaleSubmit(e) {
    e.preventDefault();
    
    const customerId = document.getElementById('saleCustomer').value;
    const date = document.getElementById('saleDate').value;
    
    if (!customerId) {
        showToast('Selecione um cliente', 'error');
        return;
    }
    
    if (saleItems.length === 0 || saleItems.some(i => !i.productId)) {
        showToast('Adicione pelo menos um item à venda', 'error');
        return;
    }
    
    // Validar estoque
    for (const item of saleItems) {
        const product = products.find(p => p.id === item.productId);
        if (product && item.quantity > product.stock) {
            showToast(`Estoque insuficiente para ${product.name}. Disponível: ${product.stock}`, 'error');
            return;
        }
    }
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processando...';
    
    try {
        // Calcular total
        const total = saleItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        // Criar venda
        const { data: sale, error: saleError } = await supabase
            .from('sales')
            .insert({
                customer_id: customerId,
                date: date,
                total: total,
                user_id: currentUser.id
            })
            .select()
            .single();
        
        if (saleError) throw saleError;
        
        // Criar itens da venda e atualizar estoque
        for (const item of saleItems) {
            const { error: itemError } = await supabase
                .from('sale_items')
                .insert({
                    sale_id: sale.id,
                    product_id: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                    subtotal: item.price * item.quantity
                });
            
            if (itemError) throw itemError;
            
            // Atualizar estoque do produto
            const product = products.find(p => p.id === item.productId);
            if (product) {
                const newStock = product.stock - item.quantity;
                const { error: stockError } = await supabase
                    .from('products')
                    .update({ stock: newStock })
                    .eq('id', item.productId);
                if (stockError) throw stockError;
            }
        }
        
        showToast('Venda realizada com sucesso!', 'success');
        resetSaleForm();
        await loadSalesData();
        await loadProducts();
        renderProductsTable();
        renderStockTable();
        await loadDashboardData();
    } catch (error) {
        showToast('Erro ao finalizar venda: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Finalizar Venda';
    }
}

async function loadSalesData() {
    const { data, error } = await supabase
        .from('sales')
        .select(`
            *,
            customer:customers(name),
            items:sale_items(*, product:products(name))
        `)
        .order('created_at', { ascending: false });
    
    if (error) {
        showToast('Erro ao carregar vendas: ' + error.message, 'error');
        return;
    }
    sales = data || [];
    renderSalesTable();
    renderRecentSales();
}

function renderSalesTable() {
    const tbody = document.querySelector('#salesTable tbody');
    tbody.innerHTML = sales.map(s => `
        <tr>
            <td>${formatDateTime(s.date)}</td>
            <td>${s.customer?.name || 'Cliente removido'}</td>
            <td>${s.items?.length || 0} item(s)</td>
            <td>${formatCurrency(s.total)}</td>
            <td>
                <button class="btn btn-secondary action-btn" onclick="viewSaleDetail('${s.id}')">Ver</button>
            </td>
        </tr>
    `).join('');
}

window.viewSaleDetail = function(id) {
    const sale = sales.find(s => s.id === id);
    if (!sale) return;
    
    const content = document.getElementById('saleDetailContent');
    content.innerHTML = `
        <div class="sale-detail">
            <div class="detail-row"><strong>Data:</strong> ${formatDateTime(sale.date)}</div>
            <div class="detail-row"><strong>Cliente:</strong> ${sale.customer?.name || 'Cliente removido'}</div>
            <div class="detail-row"><strong>Total:</strong> ${formatCurrency(sale.total)}</div>
            <h4 style="margin-top: 16px;">Itens</h4>
            <div class="table-container">
                <table>
                    <thead><tr><th>Produto</th><th>Qtd</th><th>Preço Unit.</th><th>Subtotal</th></tr></thead>
                    <tbody>
                        ${sale.items?.map(i => `
                            <tr>
                                <td>${i.product?.name || 'Produto removido'}</td>
                                <td>${i.quantity}</td>
                                <td>${formatCurrency(i.price)}</td>
                                <td>${formatCurrency(i.subtotal)}</td>
                            </tr>
                        `).join('') || ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    saleDetailModal.classList.remove('hidden');
};

function renderRecentSales() {
    const tbody = document.querySelector('#recentSalesTable tbody');
    const recentSales = sales.slice(0, 5);
    tbody.innerHTML = recentSales.map(s => `
        <tr>
            <td>${formatDate(s.date)}</td>
            <td>${s.customer?.name || 'Cliente removido'}</td>
            <td>${s.items?.length || 0}</td>
            <td>${formatCurrency(s.total)}</td>
        </tr>
    `).join('');
}

// ===== STOCK =====
function renderStockTable() {
    const filter = document.getElementById('stockFilter').value;
    const tbody = document.querySelector('#stockTable tbody');
    
    let filtered = products;
    if (filter === 'low') filtered = products.filter(p => p.stock > 0 && p.stock <= p.min_stock);
    else if (filter === 'out') filtered = products.filter(p => p.stock === 0);
    else if (filter === 'ok') filtered = products.filter(p => p.stock > p.min_stock);
    
    tbody.innerHTML = filtered.map(p => {
        let statusClass = 'badge-success', statusText = 'OK';
        if (p.stock === 0) { statusClass = 'badge-danger'; statusText = 'Sem Estoque'; }
        else if (p.stock <= p.min_stock) { statusClass = 'badge-warning'; statusText = 'Baixo'; }
        
        return `
            <tr>
                <td>${p.name}</td>
                <td>${p.stock}</td>
                <td>${p.min_stock}</td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-secondary action-btn" onclick="openStockAdjustModal('${p.id}')">Ajustar</button>
                </td>
            </tr>
        `;
    }).join('');
}

window.openStockAdjustModal = function(id) {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const newStock = prompt(`Ajustar estoque de "${product.name}" (atual: ${product.stock}):`, product.stock);
    if (newStock === null) return;
    
    const stock = parseInt(newStock);
    if (isNaN(stock) || stock < 0) {
        showToast('Quantidade inválida', 'error');
        return;
    }
    
    adjustStock(id, stock);
};

async function adjustStock(productId, newStock) {
    const { error } = await supabase
        .from('products')
        .update({ stock: newStock })
        .eq('id', productId);
    
    if (error) {
        showToast('Erro ao ajustar estoque: ' + error.message, 'error');
        return;
    }
    
    showToast('Estoque ajustado', 'success');
    await loadProducts();
    renderProductsTable();
    renderStockTable();
    populateProductSelects();
    await loadDashboardData();
}

// ===== REPORTS =====
async function generatePeriodReport() {
    const start = document.getElementById('reportStartDate').value;
    const end = document.getElementById('reportEndDate').value;
    
    if (!start || !end) {
        showToast('Selecione as datas', 'error');
        return;
    }
    
    const { data, error } = await supabase
        .from('sales')
        .select('date, total')
        .gte('date', start)
        .lte('date', end)
        .order('date');
    
    if (error) {
        showToast('Erro: ' + error.message, 'error');
        return;
    }
    
    // Agrupar por data
    const grouped = {};
    (data || []).forEach(s => {
        const d = s.date.split('T')[0];
        if (!grouped[d]) grouped[d] = { sales: 0, revenue: 0 };
        grouped[d].sales++;
        grouped[d].revenue += s.total;
    });
    
    const tbody = document.querySelector('#periodReportTable tbody');
    tbody.innerHTML = Object.entries(grouped).map(([date, vals]) => `
        <tr>
            <td>${formatDate(date)}</td>
            <td>${vals.sales}</td>
            <td>${formatCurrency(vals.revenue)}</td>
        </tr>
    `).join('');
}

async function generateTopProductsReport() {
    const { data, error } = await supabase
        .from('sale_items')
        .select(`
            quantity,
            subtotal,
            product:products(name)
        `);
    
    if (error) {
        showToast('Erro: ' + error.message, 'error');
        return;
    }
    
    const grouped = {};
    (data || []).forEach(item => {
        const name = item.product?.name || 'Produto removido';
        if (!grouped[name]) grouped[name] = { qty: 0, revenue: 0 };
        grouped[name].qty += item.quantity;
        grouped[name].revenue += item.subtotal;
    });
    
    const sorted = Object.entries(grouped)
        .sort((a, b) => b[1].qty - a[1].qty)
        .slice(0, 10);
    
    const tbody = document.querySelector('#topProductsTable tbody');
    tbody.innerHTML = sorted.map(([name, vals]) => `
        <tr>
            <td>${name}</td>
            <td>${vals.qty}</td>
            <td>${formatCurrency(vals.revenue)}</td>
        </tr>
    `).join('');
}

async function generateMonthlyRevenueReport() {
    const { data, error } = await supabase
        .from('sales')
        .select('date, total')
        .order('date');
    
    if (error) {
        showToast('Erro: ' + error.message, 'error');
        return;
    }
    
    const grouped = {};
    (data || []).forEach(s => {
        const month = s.date.substring(0, 7); // YYYY-MM
        if (!grouped[month]) grouped[month] = { sales: 0, revenue: 0 };
        grouped[month].sales++;
        grouped[month].revenue += s.total;
    });
    
    const sorted = Object.entries(grouped)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-12); // Últimos 12 meses
    
    const tbody = document.querySelector('#monthlyRevenueTable tbody');
    tbody.innerHTML = sorted.map(([month, vals]) => `
        <tr>
            <td>${month}</td>
            <td>${formatCurrency(vals.revenue)}</td>
            <td>${vals.sales}</td>
        </tr>
    `).join('');
}

// ===== DASHBOARD =====
async function loadDashboardData() {
    // Contadores
    const [{ count: prodCount }, { count: custCount }] = await Promise.all([
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('customers').select('*', { count: 'exact', head: true })
    ]);
    
    // Vendas de hoje
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySales } = await supabase
        .from('sales')
        .select('total')
        .eq('date', today);
    
    // Faturamento do mês
    const firstDay = new Date();
    firstDay.setDate(1);
    const { data: monthSales } = await supabase
        .from('sales')
        .select('total')
        .gte('date', firstDay.toISOString().split('T')[0]);
    
    document.getElementById('statProducts').textContent = prodCount || 0;
    document.getElementById('statCustomers').textContent = custCount || 0;
    document.getElementById('statSales').textContent = todaySales?.length || 0;
    document.getElementById('statRevenue').textContent = formatCurrency(
        monthSales?.reduce((sum, s) => sum + s.total, 0) || 0
    );
    
    renderRecentSales();
    renderLowStockTable();
}

function renderLowStockTable() {
    const tbody = document.querySelector('#lowStockTable tbody');
    const lowStock = products
        .filter(p => p.stock <= p.min_stock)
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 5);
    
    tbody.innerHTML = lowStock.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.stock}</td>
            <td>${p.min_stock}</td>
        </tr>
    `).join('');
}

// ===== UTILS =====
function closeModal(id) {
    document.getElementById(id).classList.add('hidden');
}

// ===== USERS MANAGEMENT =====
async function loadUsersTab() {
    // Verificar permissão
    const canManage = await hasPermission('users.manage');
    const hint = document.getElementById('usersPermissionHint');
    if (!canManage) {
        hint.textContent = '⚠️ Você não tem permissão para gerenciar usuários (necessário: users.manage)';
        hint.style.color = 'var(--warning)';
    } else {
        hint.textContent = '';
    }

    await renderUsersTable();
}

async function renderUsersTable() {
    // Buscar usuários do auth (precisa service role para listar todos)
    // Como fallback, buscamos da tabela user_roles
    const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select(`
            user_id,
            role:roles(name, description)
        `);

    if (error) {
        showToast('Erro ao carregar usuários: ' + error.message, 'error');
        return;
    }

    // Agrupar por user_id
    const usersMap = {};
    (userRoles || []).forEach(ur => {
        if (!usersMap[ur.user_id]) usersMap[ur.user_id] = { roles: [] };
        if (ur.role) usersMap[ur.user_id].roles.push(ur.role);
    });

    // Buscar emails dos usuários
    const userIds = Object.keys(usersMap);
    const emails = await fetchUserEmails(userIds);
    
    userIds.forEach(id => {
        usersMap[id].email = emails[id] || id;
    });

    // Buscar permissões para todos os usuários
    const allPermissions = {};
    for (const id of userIds) {
        allPermissions[id] = await getUserPermissionsForUser(id);
    }

    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = userIds.map(id => {
        const user = usersMap[id];
        const rolesHtml = user.roles.map(r => 
            `<span class="role-badge ${r.name}">${r.name}</span>`
        ).join('') || '<span style="color: var(--text-muted);">Sem role</span>';

        const perms = allPermissions[id] || [];
        const permsHtml = perms.slice(0, 8).map(p => 
            `<span class="permission-tag">${p.resource}.${p.action}</span>`
        ).join('') + (perms.length > 8 ? `<span class="permission-tag">+${perms.length - 8} mais</span>` : '');

        return `
            <tr>
                <td>${user.email}</td>
                <td><div class="roles-list">${rolesHtml}</div></td>
                <td><div class="permission-tags">${permsHtml || '<span style="color: var(--text-muted);">Nenhuma</span>'}</div></td>
                <td>
                    <button class="btn btn-secondary action-btn" onclick="openUserRolesModal('${id}', '${user.email}')" ${!canManage ? 'disabled' : ''}>
                        Editar Roles
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function fetchUserEmails(userIds) {
    // Tentar via RPC que usa service role
    const { data } = await supabase.rpc('get_user_emails', { user_ids: userIds });
    const emails = {};
    (data || []).forEach(u => { emails[u.id] = u.email; });
    return emails;
}

async function getUserPermissionsForUser(userId) {
    const { data } = await supabase.rpc('get_user_permissions', { user_uuid: userId });
    return data || [];
}

window.openUserRolesModal = async function(userId, email) {
    const modal = document.getElementById('userRolesModal');
    document.getElementById('userRolesUserId').value = userId;
    document.getElementById('userRolesEmail').textContent = email;

    // Carregar roles disponíveis
    const { data: roles } = await supabase.from('roles').select('*').order('name');
    
    // Carregar roles atuais do usuário
    const { data: userRoles } = await supabase
        .from('user_roles')
        .select('role_id')
        .eq('user_id', userId);
    
    const currentRoleIds = new Set((userRoles || []).map(r => r.role_id));

    const container = document.getElementById('userRolesCheckboxes');
    container.innerHTML = (roles || []).map(role => `
        <label>
            <input type="checkbox" name="roles" value="${role.id}" ${currentRoleIds.has(role.id) ? 'checked' : ''}>
            <strong>${role.name}</strong> - ${role.description}
        </label>
    `).join('');

    modal.classList.remove('hidden');
}

document.getElementById('userRolesForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const userId = document.getElementById('userRolesUserId').value;
    const selectedRoles = Array.from(document.querySelectorAll('#userRolesCheckboxes input:checked'))
        .map(cb => cb.value);

    // Remover roles atuais
    await supabase.from('user_roles').delete().eq('user_id', userId);

    // Adicionar novas roles
    if (selectedRoles.length > 0) {
        const inserts = selectedRoles.map(roleId => ({
            user_id: userId,
            role_id: roleId,
            assigned_by: currentUser.id
        }));
        const { error } = await supabase.from('user_roles').insert(inserts);
        if (error) {
            showToast('Erro ao salvar: ' + error.message, 'error');
            return;
        }
    }

    showToast('Roles atualizadas', 'success');
    closeModal('userRolesModal');
    await renderUsersTable();
});

// Expor funções globais para onclick inline
window.removeSaleItem = removeSaleItem;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.editCustomer = editCustomer;
window.deleteCustomer = deleteCustomer;
window.viewSaleDetail = viewSaleDetail;
window.openStockAdjustModal = openStockAdjustModal;
window.openUserRolesModal = openUserRolesModal;