document.addEventListener("DOMContentLoaded", () => {
    initAdminThemeToggle(); // 🚀 Initializes the theme engine on load
    verifyAdminAndLoad();
    setupAdminTabs();

    const form = document.getElementById("productForm");
    if (form) {
        form.addEventListener("submit", saveProduct);
    }

    const adminLoginForm = document.getElementById("adminLoginForm");
    if (adminLoginForm) {
        adminLoginForm.addEventListener("submit", handleAdminLogin);
    }

    const promoForm = document.getElementById("adminPromoForm");
    if (promoForm) {
        promoForm.addEventListener("submit", createPromoCode);
    }
});

// ==========================================
// ADMIN AUTHENTICATION & GATE
// ==========================================
async function verifyAdminAndLoad() {
    const loginGate = document.getElementById("adminLoginGate");
    const dashboardContent = document.getElementById("adminDashboardContent");

    try {
        const res = await fetch('/api/users/me');
        if (!res.ok) {
            if (loginGate) loginGate.style.display = "flex";
            if (dashboardContent) dashboardContent.style.display = "none";
            return;
        }

        const data = await res.json();

        if (!data.user.isAdmin) {
            alert("Access Denied: Superuser privileges required.");
            if (loginGate) loginGate.style.display = "flex";
            if (dashboardContent) dashboardContent.style.display = "none";
            return;
        }

        // Authenticated as Admin
        if (loginGate) loginGate.style.display = "none";
        if (dashboardContent) dashboardContent.style.display = "flex";

        document.getElementById("adminNameDisplay").textContent = data.user.name;

        loadAllOrders();
        loadAdminStats();
        loadInventory();
        loadAdminReviews();
        loadPromoCodes(); 
        loadUsers(); // 🚀 Load Users

    } catch (err) {
        if (loginGate) loginGate.style.display = "flex";
        if (dashboardContent) dashboardContent.style.display = "none";
    }
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById("adminEmailInput").value;
    const password = document.getElementById("adminPasswordInput").value;

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        if (response.ok) {
            verifyAdminAndLoad(); // Re-check permissions and load panel
        } else {
            alert(data.message || "Invalid admin credentials.");
        }
    } catch (err) {
        alert("Network error connecting to server.");
    }
}

// ==========================================
// TAB LOGIC
// ==========================================
function setupAdminTabs() {
    const menuItems = document.querySelectorAll(".sidebar-menu .menu-item:not(.logout)");
    const ordersCard = document.getElementById("orders-card");
    const inventoryCard = document.getElementById("inventory-card");
    const promosCard = document.getElementById("promos-card"); 
    const reviewsCard = document.getElementById("reviews-card");
    const usersCard = document.getElementById("users-card"); // 🚀 Get Users Card

    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();

            menuItems.forEach(m => m.classList.remove("active"));
            item.classList.add("active");

            if (ordersCard) ordersCard.style.display = "none";
            if (inventoryCard) inventoryCard.style.display = "none";
            if (promosCard) promosCard.style.display = "none";
            if (reviewsCard) reviewsCard.style.display = "none";
            if (usersCard) usersCard.style.display = "none"; // 🚀 Hide Users Card

            const target = item.getAttribute("href");
            if (target === "#orders" && ordersCard) {
                ordersCard.style.display = "block";
            } else if (target === "#inventory" && inventoryCard) {
                inventoryCard.style.display = "block";
            } else if (target === "#promos" && promosCard) {
                promosCard.style.display = "block";
                loadPromoCodes(); 
            } else if (target === "#reviews" && reviewsCard) {
                reviewsCard.style.display = "block";
                loadAdminReviews();
            } else if (target === "#users" && usersCard) {
                usersCard.style.display = "block";
                loadUsers(); // 🚀 Reload users when tab is opened
            }
        });
    });
}

// ==========================================
// 🚀 USER MANAGEMENT LOGIC
// ==========================================
async function loadUsers() {
    const tableBody = document.getElementById("admin-user-list");
    if (!tableBody) return;

    try {
        // Adjust this endpoint if your backend route is named differently (e.g., /api/users)
        const response = await fetch('/api/admin/users'); 
        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Failed to load users.</td></tr>`;
            return;
        }

        const users = await response.json();
        tableBody.innerHTML = "";

        if (users.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No users found.</td></tr>`;
            return;
        }

        users.forEach(user => {
            const date = new Date(user.createdAt).toLocaleDateString();
            
            // Generate visual badge based on user role
            const roleBadge = user.isAdmin 
                ? `<span style="background: rgba(46, 204, 113, 0.15); color: #2ecc71; padding: 4px 10px; border-radius: 4px; font-size: 0.85em; font-weight: bold; border: 1px solid #2ecc71;">Admin</span>`
                : `<span style="background: rgba(149, 165, 166, 0.15); color: #95a5a6; padding: 4px 10px; border-radius: 4px; font-size: 0.85em; font-weight: bold; border: 1px solid #95a5a6;">User</span>`;

            // Prevent deleting other admins or yourself by disabling the button
            const actionButton = user.isAdmin 
                ? `<button disabled style="background: transparent; color: var(--text-muted); border: 1px solid var(--border-subtle); padding: 6px 12px; border-radius: 4px; cursor: not-allowed; font-weight: bold;">Protected</button>`
                : `<button onclick="deleteUser(${user.id}, '${user.name}')" style="background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid #e74c3c; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Delete</button>`;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-weight: bold; color: var(--text-main);">#${user.id}</td>
                <td style="font-weight: bold; color: var(--text-main);">${user.name}</td>
                <td style="color: var(--text-muted);">${user.email}</td>
                <td>${roleBadge}</td>
                <td>${date}</td>
                <td style="text-align: right;">${actionButton}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) {
        console.error("Admin Users Load Error:", err);
        tableBody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Network error loading users.</td></tr>`;
    }
}

async function deleteUser(userId, userName) {
    if (!confirm(`WARNING: Are you absolutely sure you want to delete user "${userName}"? This action cannot be undone.`)) return;

    try {
        const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        if (res.ok) {
            loadUsers(); // Refresh the list
        } else {
            const data = await res.json();
            alert(data.error || "Failed to delete user.");
        }
    } catch (err) {
        alert("Network error.");
    }
}

// ==========================================
// PROMO CODES LOGIC
// ==========================================
async function loadPromoCodes() {
    const tableBody = document.getElementById("admin-promo-list");
    if (!tableBody) return;

    try {
        const response = await fetch('/api/admin/promos');
        const promos = await response.json();
        tableBody.innerHTML = "";

        if (promos.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">No promo codes exist yet.</td></tr>`;
            return;
        }

        promos.forEach(promo => {
            const date = new Date(promo.createdAt).toLocaleDateString();
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-weight: bold; color: var(--accent); font-family: 'Syncopate', sans-serif;">${promo.code}</td>
                <td><strong style="color: var(--text-main);">${promo.discountPercent}%</strong></td>
                <td>${date}</td>
                <td style="text-align: right;">
                    <button onclick="deletePromoCode(${promo.id}, '${promo.code}')" style="background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid #e74c3c; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) {
        tableBody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Failed to load promos.</td></tr>`;
    }
}

async function createPromoCode(e) {
    e.preventDefault();
    const code = document.getElementById("newPromoCode").value;
    const discountPercent = document.getElementById("newPromoDiscount").value;

    try {
        const res = await fetch('/api/admin/promos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, discountPercent })
        });

        if (res.ok) {
            document.getElementById("adminPromoForm").reset();
            loadPromoCodes();
        } else {
            const data = await res.json();
            alert(data.error || "Failed to create promo code.");
        }
    } catch (err) {
        alert("Network error.");
    }
}

async function deletePromoCode(id, codeString) {
    if (!confirm(`Are you sure you want to delete promo code ${codeString}?`)) return;

    try {
        const res = await fetch(`/api/admin/promos/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadPromoCodes();
        } else {
            alert("Failed to delete promo code.");
        }
    } catch (err) {
        alert("Network error.");
    }
}

// ==========================================
// ORDERS LOGIC
// ==========================================
async function loadAllOrders() {
    const tableBody = document.getElementById("admin-order-list");
    if (!tableBody) return;

    try {
        const response = await fetch('/api/admin/orders');
        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Failed to load orders.</td></tr>`;
            return;
        }

        const orders = await response.json();
        tableBody.innerHTML = "";

        if (orders.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">No orders have been placed yet.</td></tr>`;
            return;
        }

        orders.forEach(order => {
            const date = new Date(order.createdAt).toLocaleString();

            let itemsHtml = `<ul style="margin:0; padding-left: 15px; font-size: 0.9em;">`;
            if (order.OrderItems) {
                order.OrderItems.forEach(item => {
                    itemsHtml += `<li>${item.quantity}x ${item.name} (${item.size})</li>`;
                });
            }
            itemsHtml += `</ul>`;

            let statusBg = "rgba(243, 156, 18, 0.15)";
            let statusColor = "#f39c12"; 
            if (order.status === "Shipped") { statusBg = "rgba(52, 152, 219, 0.15)"; statusColor = "#3498db"; }
            if (order.status === "Delivered") { statusBg = "rgba(46, 204, 113, 0.15)"; statusColor = "#2ecc71"; }
            if (order.status === "Cancelled") { statusBg = "rgba(231, 76, 60, 0.15)"; statusColor = "#e74c3c"; }

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-weight: bold; color: var(--text-main);">#${order.id}</td>
                <td style="font-size: 0.9em;">${date}</td>
                <td style="font-size: 0.9em;">
                    <strong style="color: var(--text-main);">${order.User ? order.User.name : 'Unknown'}</strong><br>
                    <span style="color: var(--text-muted);">${order.User ? order.User.email : ''}</span>
                </td>
                <td>${itemsHtml}</td>
                <td style="font-size: 0.9em;">
                    <strong style="color: var(--text-main);">LE ${parseFloat(order.totalAmount).toFixed(2)}</strong><br>
                    <span style="color: var(--text-muted); text-transform: uppercase;">${order.paymentMethod}</span>
                </td>
                <td>
                    <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 4px; font-size: 0.85em; font-weight: bold; border: 1px solid ${statusColor};">
                        ${order.status}
                    </span>
                </td>
                <td>
                    <select onchange="updateOrderStatus(${order.id}, this.value)" style="padding: 6px; border-radius: 4px; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-subtle); font-family: 'Rajdhani', sans-serif;">
                        <option value="" disabled selected>Update...</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                    </select>
                </td>
            `;
            tableBody.appendChild(tr);
        });

    } catch (err) {
        console.error("Admin Load Error:", err);
    }
}

async function updateOrderStatus(orderId, newStatus) {
    if (!confirm(`Are you sure you want to change Order #${orderId} to ${newStatus}?`)) {
        loadAllOrders(); 
        return;
    }
    try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            loadAllOrders(); 
        } else {
            alert("Failed to update status.");
        }
    } catch (err) { alert("Network error."); }
}

// ==========================================
// ANALYTICS LOGIC
// ==========================================
async function loadAdminStats() {
    try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('stat-orders').textContent = stats.totalOrders || 0;
            document.getElementById('stat-revenue').textContent = `LE ${(stats.totalRevenue || 0).toFixed(2)}`;
            document.getElementById('stat-topseller').textContent = stats.topSeller || 'N/A';
        }
    } catch (err) {
        console.error("Failed to load admin stats:", err);
    }
}

// ==========================================
// INVENTORY LOGIC
// ==========================================
async function loadInventory() {
    const tableBody = document.getElementById("admin-inventory-list");
    if (!tableBody) return;

    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        tableBody.innerHTML = "";

        products.sort((a, b) => a.id - b.id);

        products.forEach(product => {
            let imgSrc = product.image ? product.image.replace(/^\//, "") : "images/default.jpg";
            if (!imgSrc.startsWith("http") && !imgSrc.startsWith("images/")) {
                imgSrc = "images/" + imgSrc.split('/').pop();
            }
            if (!imgSrc.startsWith("http")) {
                imgSrc = '/' + imgSrc;
            }

            let badges = "";
            if (product.isFeatured) badges += `<span style="background: rgba(142, 68, 173, 0.2); color: #af7ac5; border: 1px solid #af7ac5; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; margin-right: 4px; font-weight: bold;">Featured</span>`;
            if (product.isBestSeller) badges += `<span style="background: rgba(230, 126, 34, 0.2); color: #eb984e; border: 1px solid #eb984e; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; font-weight: bold;">Best Seller</span>`;

            const tr = document.createElement("tr");
            const productString = JSON.stringify(product).replace(/"/g, '&quot;');

            tr.innerHTML = `
                <td style="font-weight: bold; color: var(--text-main);">#${product.id}</td>
                <td>
                    <img src="${imgSrc}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-subtle);">
                </td>
                <td style="font-weight: bold; color: var(--text-main);">${product.name}</td>
                <td>LE ${parseFloat(product.price).toFixed(2)}</td>
                <td style="text-transform: capitalize;">${product.category || 'N/A'}</td>
                <td>${badges}</td>
                <td style="text-align: right;">
                    <button onclick="openProductModal(${productString})" style="background: rgba(241, 196, 15, 0.2); color: #f39c12; border: 1px solid #f39c12; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-right: 5px;">Edit</button>
                    <button onclick="deleteProduct(${product.id})" style="background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid #e74c3c; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

    } catch (err) {
        console.error("Inventory Load Error:", err);
    }
}

// ==========================================
// REVIEWS MODERATION LOGIC
// ==========================================
async function loadAdminReviews() {
    const tableBody = document.getElementById("admin-review-list");
    if (!tableBody) return;

    try {
        const response = await fetch('/api/site-reviews');
        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Failed to load reviews.</td></tr>`;
            return;
        }

        const reviews = await response.json();
        tableBody.innerHTML = "";

        if (reviews.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">No telemetry feedback submitted yet.</td></tr>`;
            return;
        }

        reviews.forEach(review => {
            const stars = "⭐".repeat(review.rating);
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-weight: bold; color: var(--text-main);">${review.reviewerName}</td>
                <td>${stars}</td>
                <td style="font-style: italic;">"${review.comment}"</td>
                <td style="text-align: right;">
                    <button onclick="deleteReview(${review.id})" style="background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid #e74c3c; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Purge</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) {
        console.error("Admin Reviews Load Error:", err);
    }
}

async function deleteReview(reviewId) {
    if (!confirm(`Are you sure you want to purge Review #${reviewId}?`)) return;
    try {
        const res = await fetch(`/api/site-reviews/${reviewId}`, { method: 'DELETE' });
        if (res.ok) {
            loadAdminReviews();
        } else {
            alert("Failed to delete review.");
        }
    } catch (e) {
        alert("Network error.");
    }
}

// ==========================================
// PRODUCT MODAL CONTROLS
// ==========================================
function openProductModal(product = null) {
    const modal = document.getElementById("productModal");
    const form = document.getElementById("productForm");

    if (form) form.reset(); 

    if (product && typeof product === 'object' && !product.target) {
        document.getElementById("modalTitle").textContent = "Edit Product #" + product.id;
        document.getElementById("prodId").value = product.id;
        document.getElementById("prodName").value = product.name;
        document.getElementById("prodPrice").value = product.price;
        document.getElementById("prodCategory").value = product.category || '';
        document.getElementById("prodFeatured").checked = product.isFeatured;
        document.getElementById("prodBestSeller").checked = product.isBestSeller;

        document.getElementById("existingImage").value = product.image || '';
        document.getElementById("currentImageText").style.display = 'block';
        document.getElementById("prodImageFile").required = false; 
    } else {
        document.getElementById("modalTitle").textContent = "Add New Product";
        document.getElementById("prodId").value = "";
        document.getElementById("existingImage").value = "";
        document.getElementById("currentImageText").style.display = 'none';
        document.getElementById("prodImageFile").required = true; 
    }

    if (modal) modal.style.display = "flex";
}

async function saveProduct(e) {
    e.preventDefault();

    const productId = document.getElementById("prodId").value;
    const isEditing = productId !== "";

    const formData = new FormData();
    formData.append("name", document.getElementById("prodName").value);
    formData.append("price", document.getElementById("prodPrice").value);
    formData.append("category", document.getElementById("prodCategory").value.toLowerCase());
    formData.append("isFeatured", document.getElementById("prodFeatured").checked);
    formData.append("isBestSeller", document.getElementById("prodBestSeller").checked);

    const fileInput = document.getElementById("prodImageFile");

    if (fileInput.files.length > 0) {
        formData.append("imageFile", fileInput.files[0]);
    } else if (isEditing) {
        formData.append("image", document.getElementById("existingImage").value);
    }

    try {
        const url = isEditing ? `/api/products/${productId}` : `/api/products`;
        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            body: formData 
        });

        if (response.ok) {
            document.getElementById("productModal").style.display = "none";
            loadInventory(); 
            loadAdminStats();
            alert(isEditing ? "Product updated successfully!" : "New product added to the garage!");
        } else {
            alert("Server failed to save the product.");
        }
    } catch (err) {
        alert("Network error.");
    }
}

async function deleteProduct(productId) {
    if (!confirm(`Are you absolutely sure you want to delete Product #${productId}?`)) return;

    try {
        const response = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
        if (response.ok) {
            loadInventory();
            loadAdminStats();
        } else {
            alert("Failed to delete product.");
        }
    } catch (err) { alert("Network error."); }
}

async function handleAdminLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = "/index.html"; 
    } catch (err) {
        console.error("Logout Error:", err);
    }
}

// ==========================================
// ADMIN THEME ENGINE
// ==========================================
function initAdminThemeToggle() {
    const themeToggleBtn = document.getElementById('themeToggle');
    if (!themeToggleBtn) return;

    const currentTheme = localStorage.getItem('theme');

    // Apply the saved theme on load so it matches the storefront
    if (currentTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggleBtn.textContent = '🌒'; 
    } else {
        themeToggleBtn.textContent = '🌗';
    }

    // Toggle theme on click and sync with localStorage
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');

        if (document.body.classList.contains('light-mode')) {
            localStorage.setItem('theme', 'light');
            themeToggleBtn.textContent = '🌒';
        } else {
            localStorage.setItem('theme', 'dark');
            themeToggleBtn.textContent = '🌗';
        }
    });
}

// ==========================================
// EXPORT & FILTER LOGIC
// ==========================================
function filterOrders() {
    const filterValue = document.getElementById("orderStatusFilter").value;
    const rows = document.querySelectorAll("#admin-order-list tr");

    rows.forEach(row => {
        const statusCell = row.cells[5]; 
        if (!statusCell) return;
        
        const statusText = statusCell.textContent.trim();
        
        if (filterValue === "All" || statusText === filterValue) {
            row.style.display = ""; 
        } else {
            row.style.display = "none"; 
        }
    });
}

function exportOrdersCSV() {
    const rows = document.querySelectorAll("#admin-order-list tr");
    if (rows.length === 0 || rows[0].innerText.includes("Loading")) {
        alert("No data to export.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Order ID,Date,Customer Name,Customer Email,Total Amount,Payment Method,Status\n";

    rows.forEach(row => {
        if (row.style.display === "none") return;
        
        const orderId = row.cells[0].innerText.replace('#', '');
        const date = row.cells[1].innerText.replace(/,/g, '');
        
        const customerData = row.cells[2].innerText.split('\n');
        const name = customerData[0];
        const email = customerData[1] || '';
        
        const paymentData = row.cells[4].innerText.split('\n');
        const total = paymentData[0].replace('LE ', '');
        const method = paymentData[1] || '';
        
        const status = row.cells[5].innerText.trim();

        const rowData = [orderId, date, name, email, total, method, status];
        csvContent += rowData.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CarTees_Orders_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}