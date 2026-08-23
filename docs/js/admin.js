document.addEventListener("DOMContentLoaded", () => {
    verifyAdminAndLoad();
});

async function verifyAdminAndLoad() {
    try {
        // 1. Verify who is logged in
        const res = await fetch('/api/users/me');
        if (!res.ok) {
            window.location.href = "index.html"; // Kick out if not logged in
            return;
        }
        
        const data = await res.json();
        
        // 2. Check if they have the Admin crown
        if (!data.user.isAdmin) {
            alert("Access Denied: You do not have permission to view the garage dashboard.");
            window.location.href = "index.html";
            return;
        }

        // 3. Setup Admin UI
        document.getElementById("adminNameDisplay").textContent = data.user.name;
        loadAllOrders();

    } catch (err) {
        window.location.href = "index.html";
    }
}

async function loadAllOrders() {
    const tableBody = document.getElementById("admin-order-list");
    
    try {
        const response = await fetch('/api/admin/orders');
        if (!response.ok) {
            tableBody.innerHTML = `<tr><td colspan="7" style="color:red; text-align:center;">Failed to load orders. Are you sure you are an admin?</td></tr>`;
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
            
            // Build a mini-list of the shirts they bought
            let itemsHtml = `<ul style="margin:0; padding-left: 15px; font-size: 0.9em;">`;
            order.OrderItems.forEach(item => {
                itemsHtml += `<li>${item.quantity}x ${item.name} (${item.size})</li>`;
            });
            itemsHtml += `</ul>`;

            // Color code the status
            let statusColor = "#f39c12"; // Yellow for processing
            if (order.status === "Shipped") statusColor = "#3498db"; // Blue
            if (order.status === "Delivered") statusColor = "#2ecc71"; // Green
            if (order.status === "Cancelled") statusColor = "#e74c3c"; // Red

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
        loadAllOrders(); // Reset the dropdown if they cancel
        return;
    }

    try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            loadAllOrders(); // Instantly refresh the table to show the new colored badge!
        } else {
            alert("Failed to update status. Server rejected the request.");
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