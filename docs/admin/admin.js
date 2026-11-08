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
        loadAdminProductReviews();
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
    const productReviewsCard = document.getElementById("product-reviews-card");
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
            if (productReviewsCard) productReviewsCard.style.display = "none";
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
            } else if (target === "#product-reviews" && productReviewsCard) {
                productReviewsCard.style.display = "block";
                loadAdminProductReviews();
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
            const isPrimaryOwner = Number(user.id) === 1 || String(user.email || '').trim().toLowerCase() === 'yousseffantounn@gmail.com';
            
            // Generate visual badges based on user role & status
            const statusBadge = user.isBanned 
                ? `<span style="background: rgba(231, 76, 60, 0.15); color: #e74c3c; padding: 4px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold; border: 1px solid #e74c3c; margin-left: 5px;">Banned (Email & IP Blocked)</span>`
                : `<span style="background: rgba(46, 204, 113, 0.15); color: #2ecc71; padding: 4px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold; border: 1px solid #2ecc71; margin-left: 5px;">Active</span>`;

            const roleBadge = user.isAdmin 
                ? `<span style="background: rgba(52, 152, 219, 0.15); color: #3498db; padding: 4px 10px; border-radius: 4px; font-size: 0.85em; font-weight: bold; border: 1px solid #3498db;">Admin</span>`
                : `<span style="background: rgba(149, 165, 166, 0.15); color: #95a5a6; padding: 4px 10px; border-radius: 4px; font-size: 0.85em; font-weight: bold; border: 1px solid #95a5a6;">User</span>`;

            // Only the primary owner account (#1 / yousseffantounn@gmail.com) is a Protected Account
            let actionButtons = '';
            if (isPrimaryOwner) {
                actionButtons = `<span style="color: var(--text-muted); font-style: italic;">Protected Account</span>`;
            } else {
                const adminBtnText = user.isAdmin ? "Demote" : "Make Admin";
                const adminBtnColor = user.isAdmin ? "#e67e22" : "#3498db";
                const banBtnText = user.isBanned ? "Unban" : "Ban";
                const banBtnColor = user.isBanned ? "#2ecc71" : "#e74c3c";
                
                // Escape names for inline onclick handlers to prevent breaks on names with quotes
                const safeName = user.name.replace(/'/g, "\\'");

                actionButtons = `
                    <button onclick="toggleAdmin(${user.id}, '${safeName}', ${user.isAdmin})" style="background: rgba(52, 152, 219, 0.2); color: ${adminBtnColor}; border: 1px solid ${adminBtnColor}; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-right: 5px;">${adminBtnText}</button>
                    <button onclick="toggleBan(${user.id}, '${safeName}', ${user.isBanned})" style="background: rgba(231, 76, 60, 0.2); color: ${banBtnColor}; border: 1px solid ${banBtnColor}; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-right: 5px;">${banBtnText}</button>
                    <button onclick="deleteUser(${user.id}, '${safeName}')" style="background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid #e74c3c; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-weight: bold;">Delete</button>
                `;
            }

            const ipTag = user.lastIp
                ? `<div style="font-size: 0.78em; color: #7f8c8d; margin-top: 2px;">IP: ${user.lastIp}</div>`
                : `<div style="font-size: 0.78em; color: #7f8c8d; margin-top: 2px;">IP: Not recorded yet</div>`;

            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-weight: bold; color: var(--text-main);">#${user.id}</td>
                <td style="font-weight: bold; color: var(--text-main);">${user.name}</td>
                <td style="color: var(--text-muted);">${user.email}${ipTag}</td>
                <td>${roleBadge} ${statusBadge}</td>
                <td>${date}</td>
                <td style="text-align: right; min-width: 250px;">${actionButtons}</td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (err) {
        console.error("Admin Users Load Error:", err);
        tableBody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Network error loading users.</td></tr>`;
    }
}

async function toggleAdmin(userId, userName, currentStatus) {
    const action = currentStatus ? "remove admin privileges from" : "grant admin privileges to";
    if (!confirm(`Are you sure you want to ${action} ${userName}?`)) return;

    try {
        const res = await fetch(`/api/admin/users/${userId}/toggle-admin`, { method: 'PUT' });
        if (res.ok) {
            adminUsersCache = [];
            loadUsers(); // Refresh the list to show updated UI
        } else {
            const data = await res.json();
            alert(data.error || "Failed to update admin role.");
        }
    } catch (err) {
        alert("Network error.");
    }
}

async function toggleBan(userId, userName, currentStatus) {
    const confirmMsg = currentStatus
        ? `Are you sure you want to UNBAN "${userName}" and unblock their email and IP address?`
        : `Are you sure you want to BAN "${userName}"?\n\nThis will lock their account and block their email and IP address from logging in or creating any new accounts.`;
    if (!confirm(confirmMsg)) return;

    try {
        const res = await fetch(`/api/admin/users/${userId}/toggle-ban`, { method: 'PUT' });
        const data = await res.json();
        if (res.ok) {
            adminUsersCache = [];
            loadUsers(); // Refresh the list to show updated UI
        } else {
            alert(data.error || "Failed to update ban status.");
        }
    } catch (err) {
        alert("Network error.");
    }
}

async function deleteUser(userId, userName) {
    if (!confirm(`WARNING: Are you absolutely sure you want to permanently delete user "${userName}"? This action cannot be undone.`)) return;

    try {
        const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
        if (res.ok) {
            adminUsersCache = [];
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
let adminProductReviewsCache = [];
let adminProductsMapCache = {};
let adminUsersCache = [];

function escapeAdminHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

async function ensureAdminUsersCache() {
    if (adminUsersCache && adminUsersCache.length > 0) return adminUsersCache;
    try {
        const res = await fetch('/api/admin/users');
        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) adminUsersCache = data;
        }
    } catch (e) {}
    return adminUsersCache;
}

function formatReviewUserAccountHtml(review) {
    let linkedUser = review.User || null;

    if (!linkedUser && review.UserId && adminUsersCache.length > 0) {
        linkedUser = adminUsersCache.find(u => Number(u.id) === Number(review.UserId)) || null;
    }

    let isNameMatchedFallback = false;
    if (!linkedUser && review.reviewerName && adminUsersCache.length > 0) {
        const rName = review.reviewerName.trim().toLowerCase();
        const rFirst = rName.split(/\s+/)[0];
        linkedUser = adminUsersCache.find(u => {
            if (!u.name) return false;
            const uName = u.name.trim().toLowerCase();
            if (uName === rName) return true;
            const uFirst = uName.split(/\s+/)[0];
            return rFirst.length >= 3 && rFirst === uFirst;
        }) || null;
        if (linkedUser) isNameMatchedFallback = true;
    }

    if (linkedUser) {
        const badgeColor = linkedUser.isAdmin ? "#3498db" : "#2ecc71";
        const badgeBg = linkedUser.isAdmin ? "rgba(52, 152, 219, 0.15)" : "rgba(46, 204, 113, 0.15)";
        const roleLabel = linkedUser.isAdmin ? `ADMIN #${linkedUser.id}` : `USER #${linkedUser.id}`;
        return `
            <div style="line-height: 1.35;">
                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 2px 7px; border-radius: 4px; font-size: 0.7em; font-weight: bold; border: 1px solid ${badgeColor}; font-family: 'Syncopate', sans-serif; white-space: nowrap;">${roleLabel}</span>
                    <strong style="color: var(--text-main); font-family: 'Rajdhani', sans-serif;">${escapeAdminHtml(linkedUser.name)}</strong>
                </div>
                ${linkedUser.email ? `<div style="font-size: 0.85em; color: var(--text-muted); font-family: 'Rajdhani', sans-serif; margin-top: 2px;">${escapeAdminHtml(linkedUser.email)}</div>` : ''}
            </div>
        `;
    }

    return `
        <div>
            <span style="background: rgba(149, 165, 166, 0.15); color: #95a5a6; padding: 3px 8px; border-radius: 4px; font-size: 0.72em; font-weight: bold; border: 1px solid #95a5a6; font-family: 'Syncopate', sans-serif; white-space: nowrap;">GUEST</span>
            <div style="font-size: 0.82em; color: var(--text-muted); font-family: 'Rajdhani', sans-serif; margin-top: 3px;">Unregistered Visitor</div>
        </div>
    `;
}

async function loadAdminReviews() {
    const tableBody = document.getElementById("admin-review-list");
    if (!tableBody) return;

    try {
        await ensureAdminUsersCache();
        const response = await fetch('/api/admin/site-reviews');
        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Failed to load reviews.</td></tr>`;
            return;
        }

        const reviews = await response.json();
        tableBody.innerHTML = "";

        if (reviews.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No telemetry feedback submitted yet.</td></tr>`;
            return;
        }

        reviews.forEach(review => {
            const stars = "⭐".repeat(review.rating);
            const dateStr = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "-";
            const userAccountHtml = formatReviewUserAccountHtml(review);
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td style="font-weight: bold; color: var(--text-main); font-family: 'Rajdhani', sans-serif;">${escapeAdminHtml(review.reviewerName)}</td>
                <td>${userAccountHtml}</td>
                <td>${stars}</td>
                <td style="font-style: italic; font-family: 'Rajdhani', sans-serif;">"${escapeAdminHtml(review.comment)}"</td>
                <td style="font-family: 'Rajdhani', sans-serif; font-size: 0.9em; color: var(--text-muted);">${dateStr}</td>
                <td style="text-align: right;">
                    <button onclick="deleteReview(${review.id})" style="background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid #e74c3c; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: 'Rajdhani', sans-serif;">Purge</button>
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
// PRODUCT REVIEWS MODERATION (CLASSIFIED BY PRODUCT)
// ==========================================
async function loadAdminProductReviews() {
    const container = document.getElementById("admin-product-reviews-container");
    if (!container) return;

    try {
        await ensureAdminUsersCache();
        const [reviewsRes, productsRes] = await Promise.all([
            fetch('/api/admin/product-reviews'),
            fetch('/api/products')
        ]);

        if (!reviewsRes.ok) {
            container.innerHTML = `<p style="color:red; text-align:center; padding: 20px; font-family: 'Rajdhani', sans-serif;">Failed to load product reviews.</p>`;
            return;
        }

        const reviews = await reviewsRes.json();
        const products = productsRes.ok ? await productsRes.json() : [];

        adminProductReviewsCache = Array.isArray(reviews) ? reviews : [];
        adminProductsMapCache = {};
        if (Array.isArray(products)) {
            products.forEach(p => { adminProductsMapCache[p.id] = p; });
        }
        adminProductReviewsCache.forEach(r => {
            if (r.Product && r.Product.id) {
                adminProductsMapCache[r.Product.id] = r.Product;
            }
        });

        // Populate product classification filter dropdown
        const filterSelect = document.getElementById("productReviewFilter");
        if (filterSelect) {
            const previousSelection = filterSelect.value || "All";
            const countByProduct = {};
            adminProductReviewsCache.forEach(r => {
                const pid = r.ProductId || (r.Product && r.Product.id) || 'unknown';
                countByProduct[pid] = (countByProduct[pid] || 0) + 1;
            });

            // Collect products that have reviews first, then other products
            const productIdsWithReviews = Object.keys(countByProduct);
            let optionsHtml = `<option value="All">All Products (${adminProductReviewsCache.length} Reviews)</option>`;

            productIdsWithReviews
                .sort((a, b) => Number(a) - Number(b))
                .forEach(pid => {
                    const prod = adminProductsMapCache[pid];
                    const prodName = prod ? prod.name : `Product #${pid}`;
                    const count = countByProduct[pid] || 0;
                    optionsHtml += `<option value="${pid}">${escapeAdminHtml(prodName)} (${count})</option>`;
                });

            filterSelect.innerHTML = optionsHtml;
            if ([...filterSelect.options].some(o => o.value === previousSelection)) {
                filterSelect.value = previousSelection;
            }
        }

        renderAdminProductReviews();
    } catch (err) {
        console.error("Admin Product Reviews Load Error:", err);
        container.innerHTML = `<p style="color:red; text-align:center; padding: 20px; font-family: 'Rajdhani', sans-serif;">Network error loading product reviews.</p>`;
    }
}

function filterAdminProductReviews() {
    renderAdminProductReviews();
}

function renderAdminProductReviews() {
    const container = document.getElementById("admin-product-reviews-container");
    if (!container) return;

    const filterSelect = document.getElementById("productReviewFilter");
    const selectedProductId = filterSelect ? filterSelect.value : "All";

    if (adminProductReviewsCache.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 25px; color: var(--text-muted); font-family: 'Rajdhani', sans-serif; font-size: 16px;">No product reviews have been submitted yet.</p>`;
        return;
    }

    // Group reviews by ProductId
    const groupedByProduct = {};
    adminProductReviewsCache.forEach(review => {
        const pid = String(review.ProductId || (review.Product && review.Product.id) || 'unknown');
        if (selectedProductId !== "All" && pid !== String(selectedProductId)) return;
        if (!groupedByProduct[pid]) groupedByProduct[pid] = [];
        groupedByProduct[pid].push(review);
    });

    const groupKeys = Object.keys(groupedByProduct).sort((a, b) => Number(a) - Number(b));

    if (groupKeys.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 25px; color: var(--text-muted); font-family: 'Rajdhani', sans-serif; font-size: 16px;">No reviews found for this product.</p>`;
        return;
    }

    container.innerHTML = "";

    groupKeys.forEach(pid => {
        const prodReviews = groupedByProduct[pid];
        const product = adminProductsMapCache[pid] || (prodReviews[0] && prodReviews[0].Product) || null;
        const prodName = product ? product.name : `Product #${pid}`;
        const prodCategory = product && product.category ? product.category.toUpperCase() : "CARTEE";
        const avgRating = (prodReviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / prodReviews.length).toFixed(1);

        let imgSrc = product && product.image ? product.image.replace(/^\//, "") : "images/default.jpg";
        if (!imgSrc.startsWith("http") && !imgSrc.startsWith("images/")) {
            imgSrc = "images/" + imgSrc.split('/').pop();
        }
        if (!imgSrc.startsWith("http")) {
            imgSrc = '/' + imgSrc;
        }

        const section = document.createElement("div");
        section.style.cssText = "margin-bottom: 30px; border: 1px solid var(--border-subtle); border-radius: 4px; overflow: hidden; background: var(--bg-deep);";

        const rowsHtml = prodReviews.map(review => {
            const stars = "⭐".repeat(review.rating);
            const dateStr = review.createdAt ? new Date(review.createdAt).toLocaleDateString() : "-";
            const userAccountHtml = formatReviewUserAccountHtml(review);
            return `
                <tr>
                    <td style="font-weight: bold; color: var(--text-main); font-family: 'Rajdhani', sans-serif;">${escapeAdminHtml(review.reviewerName)}</td>
                    <td>${userAccountHtml}</td>
                    <td style="font-family: 'Rajdhani', sans-serif;">${stars}</td>
                    <td style="font-style: italic; font-family: 'Rajdhani', sans-serif; color: var(--text-muted);">"${escapeAdminHtml(review.comment)}"</td>
                    <td style="font-family: 'Rajdhani', sans-serif; font-size: 0.9em; color: var(--text-muted);">${dateStr}</td>
                    <td style="text-align: right;">
                        <button onclick="deleteProductReview(${review.id})" style="background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid #e74c3c; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; font-family: 'Rajdhani', sans-serif;">Purge</button>
                    </td>
                </tr>
            `;
        }).join('');

        section.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; padding: 15px 20px; background: var(--bg-hover); border-bottom: 1px solid var(--border-subtle); border-left: 4px solid var(--accent);">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="${imgSrc}" alt="${escapeAdminHtml(prodName)}" style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-subtle);">
                    <div>
                        <h3 style="margin: 0; font-family: 'Syncopate', sans-serif; font-size: 0.95rem; color: var(--text-main); text-transform: uppercase;">
                            ${escapeAdminHtml(prodName)} <span style="color: var(--text-muted); font-size: 0.8em;">#${pid}</span>
                        </h3>
                        <span style="display: inline-block; margin-top: 4px; font-family: 'Syncopate', sans-serif; font-size: 0.65rem; color: var(--accent); border: 1px solid var(--accent); padding: 2px 6px; border-radius: 3px; text-transform: uppercase;">
                            ${escapeAdminHtml(prodCategory)}
                        </span>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; font-family: 'Syncopate', sans-serif; font-size: 0.75rem;">
                    <span style="color: var(--text-muted);">AVG: <strong style="color: var(--accent);">⭐ ${avgRating}</strong></span>
                    <span style="background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border-subtle); padding: 5px 10px; border-radius: 4px; font-weight: 700;">
                        ${prodReviews.length} ${prodReviews.length === 1 ? 'Review' : 'Reviews'}
                    </span>
                </div>
            </div>
            <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Driver (Display)</th>
                            <th>User Account</th>
                            <th>Rating</th>
                            <th>Comment</th>
                            <th>Date</th>
                            <th style="text-align: right;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;

        container.appendChild(section);
    });
}

async function deleteProductReview(reviewId) {
    if (!confirm(`Are you sure you want to purge Product Review #${reviewId}?`)) return;
    try {
        const res = await fetch(`/api/admin/product-reviews/${reviewId}`, { method: 'DELETE' });
        if (res.ok) {
            loadAdminProductReviews();
        } else {
            alert("Failed to delete product review.");
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