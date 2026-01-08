// ===== Staff Portal JavaScript =====

const API_BASE = '../api';
let authToken = null;
let currentUser = null;
let cart = [];
let allProducts = [];
let selectedPaymentMethod = null;

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    authToken = localStorage.getItem('staff_token');
    if (authToken) {
        verifyToken();
    } else {
        window.location.href = '../login.html?role=staff';
    }

    // Event Listeners
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);
        });
    });

    // Record Sale View
    document.getElementById('productSearch').addEventListener('input', searchProducts);
    document.getElementById('categoryFilter').addEventListener('change', searchProducts);
    document.getElementById('clearCartBtn').addEventListener('click', clearCart);
    document.getElementById('confirmSaleBtn').addEventListener('click', confirmSale);

    // Payment buttons
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedPaymentMethod = btn.dataset.method;

            // Show/hide M-Pesa field
            const mpesaField = document.getElementById('mpesaField');
            if (selectedPaymentMethod === 'mpesa') {
                mpesaField.style.display = 'block';
            } else {
                mpesaField.style.display = 'none';
            }

            updateConfirmButton();
        });
    });

    // Catalog search
    document.getElementById('catalogSearch').addEventListener('input', loadProductCatalog);

    // Stock filters
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadStock(tab.dataset.filter);
        });
    });

    document.getElementById('refreshStockBtn').addEventListener('click', () => loadStock('all'));
});

// ===== Authentication =====
async function handleLogin(e) {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    showLoading(true);
    hideError();

    try {
        const response = await fetch(`${API_BASE}/auth/login.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.data.token;
            currentUser = data.data.user;

            // Only allow staff role (not admin)
            if (currentUser.role !== 'staff') {
                showError('This portal is for staff only. Please use admin portal.');
                showLoading(false);
                return;
            }

            localStorage.setItem('staff_token', authToken);
            localStorage.setItem('staff_user', JSON.stringify(currentUser));

            showScreen('mainScreen');
            loadProducts();
            showToast(`Welcome back, ${currentUser.first_name}!`);
        } else {
            showError(data.message || 'Login failed');
        }
    } catch (error) {
        showError('Connection error. Please try again.');
    } finally {
        showLoading(false);
    }
}

async function verifyToken() {
    try {
        const response = await fetch(`${API_BASE}/auth/verify.php`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            currentUser = JSON.parse(localStorage.getItem('staff_user'));
            showScreen('mainScreen');
            loadProducts();
        } else {
            localStorage.removeItem('staff_token');
            localStorage.removeItem('staff_user');
            window.location.href = '../login.html?role=staff';
        }
    } catch (error) {
        console.error('Token verification error:', error);
        window.location.href = '../login.html?role=staff';
    }
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('staff_token');
        localStorage.removeItem('staff_user');
        authToken = null;
        currentUser = null;
        cart = [];
        window.location.href = '../login.html?role=staff';
    }
}

// ===== View Management =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function switchView(viewName) {
    // Update nav
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

    // Update views
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`${viewName}View`).classList.add('active');

    // Load data for view
    if (viewName === 'history') {
        loadSalesHistory();
    } else if (viewName === 'products') {
        loadProductCatalog();
    } else if (viewName === 'stock') {
        loadStock('all');
    }
}

// ===== Products =====
async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products/list.php`);
        const data = await response.json();

        if (data.success) {
            allProducts = data.data;
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function searchProducts() {
    const search = document.getElementById('productSearch').value.toLowerCase();
    const category = document.getElementById('categoryFilter').value;

    let filtered = allProducts;

    if (search) {
        filtered = filtered.filter(p =>
            p.title.toLowerCase().includes(search) ||
            p.sku?.toLowerCase().includes(search)
        );
    }

    if (category) {
        filtered = filtered.filter(p => p.category === category);
    }

    displayProducts(filtered);
}

function displayProducts(products) {
    const container = document.getElementById('productResults');

    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No products found</p></div>';
        return;
    }

    container.innerHTML = products.slice(0, 10).map(product => `
        <div class="product-item" onclick="addToCart(${product.id})">
            <img src="${product.image_url || 'https://via.placeholder.com/60'}" class="product-img" alt="${product.title}">
            <div class="product-info">
                <div class="product-title">${product.title}</div>
                <div class="product-price">KSh ${formatPrice(product.price)}</div>
                <div class="product-stock ${product.total_stock <= 5 ? 'low' : ''}">
                    Stock: ${product.total_stock || 0}
                </div>
            </div>
            <i class="fas fa-plus-circle" style="color: var(--primary-color); font-size: 24px;"></i>
        </div>
    `).join('');
}

// ===== Cart Management =====
function addToCart(productId) {
    const product = allProducts.find(p => p.id == productId);
    if (!product) return;

    // Check stock
    if (product.total_stock <= 0) {
        showToast('Product out of stock!');
        return;
    }

    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        if (existingItem.quantity >= product.total_stock) {
            showToast('Cannot add more than available stock');
            return;
        }
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            title: product.title,
            price: parseFloat(product.price),
            quantity: 1,
            maxStock: product.total_stock
        });
    }

    updateCart();
    showToast(`${product.title} added to cart`);
}

function updateCartQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;

    item.quantity += change;

    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else if (item.quantity > item.maxStock) {
        item.quantity = item.maxStock;
        showToast('Maximum stock reached');
    }

    updateCart();
}

function removeFromCart(productId) {
    cart = cart.filter(i => i.id !== productId);
    updateCart();
}

function clearCart() {
    if (cart.length === 0) return;

    if (confirm('Clear all items from cart?')) {
        cart = [];
        updateCart();
        selectedPaymentMethod = null;
        document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('selected'));
        document.getElementById('mpesaField').style.display = 'none';
    }
}

function updateCart() {
    const cartSection = document.getElementById('cartSection');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');

    if (cart.length === 0) {
        cartSection.style.display = 'none';
        return;
    }

    cartSection.style.display = 'block';

    // Render cart items
    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.title}</div>
                <div class="cart-item-price">KSh ${formatPrice(item.price)} × ${item.quantity}</div>
            </div>
            <div class="cart-item-controls">
                <button class="qty-btn" onclick="updateCartQuantity(${item.id}, -1)">−</button>
                <span class="qty-display">${item.quantity}</span>
                <button class="qty-btn" onclick="updateCartQuantity(${item.id}, 1)">+</button>
                <button class="remove-btn" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Calculate total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = `KSh ${formatPrice(total)}`;

    updateConfirmButton();
}

function updateConfirmButton() {
    const btn = document.getElementById('confirmSaleBtn');
    btn.disabled = cart.length === 0 || !selectedPaymentMethod;
}

// ===== Confirm Sale =====
async function confirmSale() {
    if (cart.length === 0 || !selectedPaymentMethod) return;

    const customerName = document.getElementById('customerName').value || 'Walk-in Customer';
    const mpesaCode = document.getElementById('mpesaCode').value;
    const notes = document.getElementById('saleNotes').value;

    const saleData = {
        items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity
        })),
        payment_method: selectedPaymentMethod,
        customer_name: customerName,
        transaction_reference: selectedPaymentMethod === 'mpesa' ? mpesaCode : null,
        notes: notes || null
    };

    showLoading(true);

    try {
        const response = await fetch(`${API_BASE}/sales/record.php`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(saleData)
        });

        const data = await response.json();

        if (data.success) {
            showToast('✅ Sale recorded successfully!');

            // Reset form
            cart = [];
            updateCart();
            selectedPaymentMethod = null;
            document.getElementById('customerName').value = '';
            document.getElementById('mpesaCode').value = '';
            document.getElementById('saleNotes').value = '';
            document.querySelectorAll('.payment-btn').forEach(b => b.classList.remove('selected'));
            document.getElementById('mpesaField').style.display = 'none';
            document.getElementById('productSearch').value = '';
            document.getElementById('categoryFilter').value = '';
            document.getElementById('productResults').innerHTML = '';

            // Reload products to update stock
            loadProducts();
        } else {
            showToast(`❌ ${data.message}`);
        }
    } catch (error) {
        showToast('❌ Connection error. Please try again.');
    } finally {
        showLoading(false);
    }
}

// ===== Sales History =====
async function loadSalesHistory() {
    showLoading(true);

    try {
        // Get today's sales
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${API_BASE}/sales/list.php?from_date=${today}&limit=100`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            const sales = data.data.sales;

            // Update stats
            const totalRevenue = sales.reduce((sum, sale) => sum + parseFloat(sale.total_amount), 0);
            document.querySelector('#todayStats .stat-card:nth-child(1) .stat-value').textContent = sales.length;
            document.querySelector('#todayStats .stat-card:nth-child(2) .stat-value').textContent = `KSh ${formatPrice(totalRevenue)}`;

            // Display sales
            const container = document.getElementById('salesHistory');

            if (sales.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-receipt"></i><p>No sales recorded today</p></div>';
                return;
            }

            container.innerHTML = sales.map(sale => `
                <div class="sale-card">
                    <div class="sale-header">
                        <div class="sale-number">${sale.sale_number}</div>
                        <div class="sale-amount">KSh ${formatPrice(sale.total_amount)}</div>
                    </div>
                    <div class="sale-details">
                        <div><i class="fas fa-user"></i> ${sale.customer_name || 'Walk-in'}</div>
                        <div><i class="fas fa-credit-card"></i> ${sale.payment_method.toUpperCase()}</div>
                        <div><i class="fas fa-clock"></i> ${formatTime(sale.created_at)}</div>
                        <div><i class="fas fa-box"></i> ${sale.items_count} item(s)</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        showToast('Error loading sales history');
    } finally {
        showLoading(false);
    }
}

// ===== Product Catalog =====
async function loadProductCatalog() {
    const search = document.getElementById('catalogSearch').value.toLowerCase();
    const container = document.getElementById('catalogList');

    let products = allProducts;

    if (search) {
        products = products.filter(p =>
            p.title.toLowerCase().includes(search) ||
            p.category.toLowerCase().includes(search)
        );
    }

    container.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.image_url || 'https://via.placeholder.com/150'}" class="product-card-img" alt="${product.title}">
            <div class="product-card-body">
                <div class="product-card-title">${product.title}</div>
                <div class="product-card-price">KSh ${formatPrice(product.price)}</div>
                <div class="product-stock ${product.total_stock <= 5 ? 'low' : ''}">
                    Stock: ${product.total_stock || 0}
                </div>
            </div>
        </div>
    `).join('');
}

// ===== Stock Management =====
async function loadStock(filter) {
    showLoading(true);

    try {
        const url = filter === 'low'
            ? `${API_BASE}/inventory/list.php?low_stock=true`
            : `${API_BASE}/inventory/list.php`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        const data = await response.json();

        if (data.success) {
            const container = document.getElementById('stockList');
            const items = data.data;

            if (items.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="fas fa-boxes"></i><p>No items found</p></div>';
                return;
            }

            container.innerHTML = items.map(item => {
                let qtyClass = 'normal';
                if (item.stock <= 0) qtyClass = 'critical';
                else if (item.is_low_stock) qtyClass = 'low';

                return `
                    <div class="stock-item">
                        <div>
                            <div class="product-title">${item.title}</div>
                            <div class="product-stock">${item.category} • ${item.sku || ''}</div>
                        </div>
                        <div class="stock-qty ${qtyClass}">${item.stock || 0}</div>
                    </div>
                `;
            }).join('');
        }
    } catch (error) {
        showToast('Error loading stock');
    } finally {
        showLoading(false);
    }
}

// ===== Utilities =====
function formatPrice(price) {
    return parseFloat(price).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
}

function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function showError(message) {
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = message;
    errorEl.style.display = 'block';
}

function hideError() {
    document.getElementById('loginError').style.display = 'none';
}
