// docs/js/shop.js
let fetchedProducts = []; // To store products fetched from the database
// 1. Fetch products from the Database
async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();

        const featuredItem = products.find(p => p.isFeatured === true);

    if (featuredItem) {
        const featuredContainer = document.querySelector('.featured');
        featuredContainer.innerHTML = `
        <h4>🌟 Featured</h4>
        <a href="product_detail.html?id=${featuredItem.id}">
            <img src="${featuredItem.image}" alt="${featuredItem.name}" />
        </a>
        <p><strong>${featuredItem.name}</strong></p>
        <p class="price">
            <span class="old-price">LE ${(featuredItem.price + 200).toFixed(2)}</span>
            <span class="new-price">LE ${featuredItem.price.toFixed(2)}</span>
        </p>
        <button class="btn-add" onclick="addToCartWithPopup('${featuredItem.name}', ${featuredItem.price}, '${featuredItem.image}')">
    Add to Cart
</button>
    `;
    }

        const grid = document.getElementById('productGrid');
        if (!grid) return;

        grid.innerHTML = ''; // Clear hardcoded items

        fetchedProducts = products; // Store for sorting/filtering
        renderGrid(fetchedProducts);

        // After cards exist, check if the URL wants a specific brand
        handleUrlParams();

    } catch (err) {
        console.error("❌ Showroom Load Failed:", err);
    }
}

// 2. Sidebar Logic
async function loadBrandsSidebar() {
    const filterList = document.getElementById("brandFilter");
    if(!filterList) return;

    try{
        const response = await fetch('/api/brands');
        const brands = await response.json();

        filterList.innerHTML = '<li data-brand="all" class="active">All</li>';

        brands.forEach(brand => {
            const li = document.createElement("li");
            li.dataset.brand = brand.filterValue;
            li.textContent = brand.name;
            filterList.appendChild(li);
        });
    } catch (err) {
        console.error("Brand Load Error:", err);
    }
}

//Sidebar Click Handling
const brandFilterContainer = document.getElementById("brandFilter");
if (brandFilterContainer) {
    brandFilterContainer.addEventListener("click", (e) => {
        if (e.target.tagName === "LI") {
            document.querySelectorAll("#brandFilter li").forEach(el => el.classList.remove("active"));
            e.target.classList.add("active");
            
            const brand = e.target.dataset.brand;
            applyBrandFilter(brand); 
        }
    });
}


// 3. Brand Pre-Selection Logic
function handleUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const brandParam = urlParams.get("brand");

    if (brandParam) {
        const brandItem = document.querySelector(`#brandFilter li[data-brand="${brandParam.toLowerCase()}"]`);
        if (brandItem) brandItem.click();
    }
}


// Logic for the Brand Sidebar
function applyBrandFilter(brand) {
    if (brand === "all") {
        renderGrid(fetchedProducts);
    } else {
        // Filter the global fleet and send the results to the grid
        const filtered = fetchedProducts.filter(p => p.category.toLowerCase() === brand.toLowerCase());
        renderGrid(filtered);
    }
}

// Logic for the Sort Dropdown
function sortProducts() {
    const criteria = document.getElementById('sortSelect').value;
    let results = [...fetchedProducts]; // Work on a copy to keep the original data safe

    if (criteria === "low-high") results.sort((a, b) => a.price - b.price);
    if (criteria === "high-low") results.sort((a, b) => b.price - a.price);
    if (criteria === "a-z") results.sort((a, b) => a.name.localeCompare(b.name));
    if (criteria === "z-a") results.sort((a, b) => b.name.localeCompare(a.name));

    renderGrid(results);
}

// Grid Rendering Logic (Used for both initial load and filtering/sorting)
function renderGrid(products) {
  const grid = document.getElementById('productGrid');
    if (!grid) return;
    grid.innerHTML = ''; // clearing the grid before rendering

    products.forEach(product => {
      const oldprice = product.price + 200;
      const card = `
        <div class="card" data-brand="${product.category}">
          <div class="badge">Sale</div>
          <a href="product_detail.html?id=${product.id}">
            <img src="${product.image}" alt="${product.name}" />
          </a>
          <h4>${product.name}</h4>
          <p class="price">
            <span class="old-price">LE ${oldprice.toFixed(2)}</span>
            <span class="new-price">LE ${product.price.toFixed(2)}</span>
            <span class="save-price">Save LE 200.00</span>
          </p>
          <button class="btn-add" onclick="addToCartWithPopup('${product.name}', ${product.price}, '${product.image}')">
            Add to Cart
          </button>
        </div>
        `;
      grid.innerHTML += card;
    });
}

// Logic for the Search Bar
function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    // Filter the current fleet based on name or brand category
    const filteredResults = fetchedProducts.filter(product => {
        const nameMatch = product.name.toLowerCase().includes(searchTerm);
        const brandMatch = product.category.toLowerCase().includes(searchTerm);
        return nameMatch || brandMatch;
    });

    // Update the showroom grid
    renderGrid(filteredResults);
    
    // Update the counter text
    const counterText = document.querySelector('.sortbar p strong');
    if (counterText) {
        counterText.innerText = searchTerm === "" 
            ? "Showing All Products" 
            : `Found ${filteredResults.length} results for "${searchTerm}"`;
    }
}

// 4. Initialize everything
document.addEventListener("DOMContentLoaded", async () => {
    await loadBrandsSidebar(); // 1st: Build the sidebar
    await loadProducts();      // 2nd: Build the products
});