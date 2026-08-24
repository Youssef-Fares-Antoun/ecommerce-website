document.addEventListener("DOMContentLoaded", () => {
    verifyAdminAndLoad();
    setupAdminTabs();

    // Attach submit listener to the product modal
    document.getElementById("productForm").addEventListener("submit", saveProduct);
});

async function verifyAdminAndLoad() {
    try {
        const res = await fetch('/api/users/me');
        if (!res.ok) {
            window.location.href = "index.html"; 
            return;
        }
        
        const data = await res.json();
        
        if (!data.user.isAdmin) {
            alert("Access Denied: You do not have permission to view the garage dashboard.");
            window.location.href = "index.html";
            return;
        }

        document.getElementById("adminNameDisplay").textContent = data.user.name;
        
        // Load data for both tabs!
        loadAllOrders();
        loadInventory();

    } catch (err) {
        window.location.href = "index.html";
    }
}

// ==========================================
// TAB LOGIC
// ==========================================
function setupAdminTabs() {
    const menuItems = document.querySelectorAll(".sidebar-menu .menu-item:not(.logout)");
    const ordersCard = document.getElementById("orders-card");
    const inventoryCard = document.getElementById("inventory-card");

    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            
            menuItems.forEach(m => m.classList.remove("active"));
            item.classList.add("active");

            ordersCard.style.display = "none";
            inventoryCard.style.display = "none";

            const target = item.getAttribute("href");
            if (target === "#orders") {
                ordersCard.style.display = "block";
            } else if (target === "#inventory") {
                inventoryCard.style.display = "block";
            }
        });
    });
}

// ==========================================
// ORDERS LOGIC
// ==========================================
async function loadAllOrders() {
    const tableBody = document.getElementById("admin-order-list");
    
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
            order.OrderItems.forEach(item => {
                itemsHtml += `<li>${item.quantity}x ${item.name} (${item.size})</li>`;
            });
            itemsHtml += `</ul>`;

            let statusColor = "#f39c12"; 
            if (order.status === "Shipped") statusColor = "#3498db"; 
            if (order.status === "Delivered") statusColor = "#2ecc71"; 
            if (order.status === "Cancelled") statusColor = "#e74c3c"; 

            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid #eee";
            
            tr.innerHTML = `
                <td style="padding: 12px; font-weight: bold;">#${order.id}</td>
                <td style="padding: 12px; font-size: 0.9em; color: #555;">${date}</td>
                <td style="padding: 12px; font-size: 0.9em;">
                    <strong>${order.User.name}</strong><br>
                    <span style="color:#666;">${order.User.email}</span><br>
                    <span style="color:#666;">${order.User.phone || 'No phone'}</span>
                </td>
                <td style="padding: 12px;">${itemsHtml}</td>
                <td style="padding: 12px; font-size: 0.9em;">
                    <strong>LE ${parseFloat(order.totalAmount).toFixed(2)}</strong><br>
                    <span style="color:#666; text-transform: uppercase;">${order.paymentMethod}</span>
                </td>
                <td style="padding: 12px;">
                    <span style="background: ${statusColor}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: bold;">
                        ${order.status}
                    </span>
                </td>
                <td style="padding: 12px;">
                    <select onchange="updateOrderStatus(${order.id}, this.value)" style="padding: 6px; border-radius: 4px; border: 1px solid #ccc;">
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
            alert("Failed to update status. Server rejected the request.");
        }
    } catch (err) { alert("Network error."); }
}

// ==========================================
// INVENTORY LOGIC
// ==========================================
async function loadInventory() {
    const tableBody = document.getElementById("admin-inventory-list");
    
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        tableBody.innerHTML = "";

        // Sort by ID to keep it neat
        products.sort((a, b) => a.id - b.id);

        products.forEach(product => {
            // Handle image pathing safely
            let imgSrc = product.image.replace(/^\//, "");
            if (!imgSrc.startsWith("images/")) imgSrc = "images/" + imgSrc.split('/').pop();

            // Render visual badges
            let badges = "";
            if (product.isFeatured) badges += `<span style="background: #8e44ad; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75em; margin-right: 4px;">Featured</span>`;
            if (product.isBestSeller) badges += `<span style="background: #e67e22; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.75em;">Best Seller</span>`;

            const tr = document.createElement("tr");
            tr.style.borderBottom = "1px solid #eee";
            
            // We store the raw product object as a string inside a hidden data attribute so the Edit button can access it easily!
            const productString = JSON.stringify(product).replace(/"/g, '&quot;');

            tr.innerHTML = `
                <td style="padding: 12px; font-weight: bold; color: #555;">#${product.id}</td>
                <td style="padding: 12px;">
                    <img src="${imgSrc}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #ccc;">
                </td>
                <td style="padding: 12px; font-weight: bold;">${product.name}</td>
                <td style="padding: 12px;">${parseFloat(product.price).toFixed(2)}</td>
                <td style="padding: 12px; text-transform: capitalize; color: #666;">${product.category || 'N/A'}</td>
                <td style="padding: 12px;">${badges}</td>
                <td style="padding: 12px; text-align: right;">
                    <button onclick="openProductModal(${productString})" style="background: #f1c40f; color: #111; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-right: 5px;">Edit</button>
                    <button onclick="deleteProduct(${product.id})" style="background: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-weight: bold;">Delete</button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

    } catch (err) {
        console.error("Inventory Load Error:", err);
    }
}

// Opens the modal for BOTH Adding and Editing
function openProductModal(product = null) {
    const modal = document.getElementById("productModal");
    const form = document.getElementById("productForm");
    
    form.reset(); // Clear old data

    if (product) {
        // Editing an existing product
        document.getElementById("modalTitle").textContent = "Edit Product #" + product.id;
        document.getElementById("prodId").value = product.id;
        document.getElementById("prodName").value = product.name;
        document.getElementById("prodPrice").value = product.price;
        document.getElementById("prodCategory").value = product.category || '';
        document.getElementById("prodImage").value = product.image || '';
        document.getElementById("prodFeatured").checked = product.isFeatured;
        document.getElementById("prodBestSeller").checked = product.isBestSeller;
    } else {
        // Adding a new product
        document.getElementById("modalTitle").textContent = "Add New Product";
        document.getElementById("prodId").value = "";
    }
    
    modal.style.display = "flex";
}

async function saveProduct(e) {
    e.preventDefault();

    const productId = document.getElementById("prodId").value;
    const isEditing = productId !== ""; // If we have an ID, we are updating.

    const productData = {
        name: document.getElementById("prodName").value,
        price: parseFloat(document.getElementById("prodPrice").value),
        category: document.getElementById("prodCategory").value.toLowerCase(),
        image: document.getElementById("prodImage").value,
        isFeatured: document.getElementById("prodFeatured").checked,
        isBestSeller: document.getElementById("prodBestSeller").checked
    };

    try {
        const url = isEditing ? `/api/products/${productId}` : `/api/products`;
        const method = isEditing ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        if (response.ok) {
            document.getElementById("productModal").style.display = "none";
            loadInventory(); // Refresh the table instantly
            alert(isEditing ? "Product updated successfully!" : "New product added to the garage!");
        } else {
            alert("Server failed to save the product.");
        }
    } catch (err) {
        alert("Network error.");
    }
}

async function deleteProduct(productId) {
    if (!confirm(`Are you absolutely sure you want to delete Product #${productId}? This cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/products/${productId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            loadInventory(); // Refresh the table instantly
        } else {
            alert("Failed to delete product.");
        }
    } catch (err) {
        alert("Network error.");
    }
}

async function handleAdminLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = "index.html"; 
    } catch (err) {
        console.error("Logout Error:", err);
    }
}