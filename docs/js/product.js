// =====================
// DYNAMIC PRODUCT MANAGER
// =====================

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Get the Product ID from the URL (e.g., product-detail.html?id=3)
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    // Safety check: if no ID, go back to the shop
    if (!productId) {
        console.error("No product ID found in URL.");
        window.location.href = 'shop.html';
        return;
    }

    try {
        // 2. Fetch the specific car from your PostgreSQL API
        const response = await fetch(`/api/products/${productId}`);
        const product = await response.json();

        if (product.error) {
            console.error("Product not found in database.");
            return;
        }

        // 3. Update the Page Content
        document.title = `${product.name} | CarTees`;
        
        const titleEl = document.getElementById('productTitle');
        const mainImg = document.getElementById('mainImage');
        const descEl = document.getElementById('productDescription');
        
        if (titleEl) titleEl.innerText = product.name;
        if (mainImg) mainImg.src = `images/${product.image}`;
        
        // 4. Handle Pricing Logic (Adding the "Sale" effect)
        const currentPriceVal = product.price;
        const oldPriceVal = currentPriceVal + 200;

        const currentPriceEl = document.getElementById('currentPrice');
        const oldPriceEl = document.getElementById('oldPrice');
        const savingsEl = document.getElementById('savingsAmount');

        if (currentPriceEl) currentPriceEl.innerText = `LE ${currentPriceVal.toFixed(2)}`;
        if (oldPriceEl) oldPriceEl.innerText = `LE ${oldPriceVal.toFixed(2)}`;
        if (savingsEl) savingsEl.innerText = `Save LE 200.00`;

        // 5. Description Fallback
        if (descEl) {
            descEl.innerText = `A premium ${product.name} inspired tee made from high-quality cotton. Perfect for motorsport fans who love performance and style.`;
        }

        // 6. Update Button Logic
        // These now use the real data from the database
        const addToCartBtn = document.getElementById('addToCartBtn');
        const buyNowBtn = document.getElementById('buyNowBtn');

        if (addToCartBtn) {
            addToCartBtn.onclick = () => {
                addToCartWithPopup(product.name, product.price, `images/${product.image}`);
            };
        }

        if (buyNowBtn) {
            buyNowBtn.onclick = () => {
                addToCart(product.name, product.price, `images/${product.image}`, false);
                window.location.href = 'checkout.html';
            };
        }

    } catch (err) {
        console.error("❌ Showroom Load Failed:", err);
    }
});

// =====================
// IMAGE SWITCHER (Keep this for the thumbnails)
// =====================
function changeImage(newSrc) {
    const mainImg = document.getElementById("mainImage");
    if (mainImg) mainImg.src = newSrc;
}