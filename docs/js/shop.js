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
            <button class="btn-add" onclick="window.location.href='product_detail.html?id=${featuredItem.id}'">
                View Details
            </button>
        `;
        }

        const grid = document.getElementById('productGrid');
        if (!grid) return;

        grid.innerHTML = ''; // Clear hardcoded items

        fetchedProducts = products; // Store for sorting/filtering
        applyShopFilters();

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

// Shared filter state so brand, sort and search all work together
// (previously each one re-rendered from the full product list and wiped out the others)
const shopFilters = {
    brand: "all",
    sort: "default",
    search: ""
};

// Single pipeline: brand -> search -> sort -> render
function applyShopFilters() {
    let results = [...fetchedProducts]; // Work on a copy to keep the original data safe

    // 1. Brand
    if (shopFilters.brand !== "all") {
        results = results.filter(p => (p.category || "").toLowerCase() === shopFilters.brand.toLowerCase());
    }

    // 2. Search (name or brand category)
    if (shopFilters.search) {
        results = results.filter(p =>
            p.name.toLowerCase().includes(shopFilters.search) ||
            (p.category || "").toLowerCase().includes(shopFilters.search)
        );
    }

    // 3. Sort
    const criteria = shopFilters.sort;
    if (criteria === "low-high") results.sort((a, b) => a.price - b.price);
    if (criteria === "high-low") results.sort((a, b) => b.price - a.price);
    if (criteria === "a-z") results.sort((a, b) => a.name.localeCompare(b.name));
    if (criteria === "z-a") results.sort((a, b) => b.name.localeCompare(a.name));

    renderGrid(results);
    updateResultsHeading(results.length);
}

// Keeps the "Showing ..." text in the sort bar in sync with the active filters
function updateResultsHeading(count) {
    const counterText = document.querySelector('.sortbar p strong');
    if (!counterText) return;

    const activeLi = document.querySelector('#brandFilter li.active');
    const brandLabel = shopFilters.brand === "all" ? "" : (activeLi ? activeLi.textContent : shopFilters.brand);

    if (shopFilters.search) {
        counterText.textContent = `Found ${count} results for "${shopFilters.search}"${brandLabel ? ` in ${brandLabel}` : ""}`;
    } else {
        counterText.textContent = brandLabel ? `Showing ${brandLabel} Products` : "Showing All Products";
    }
}

// Logic for the Brand Sidebar
function applyBrandFilter(brand) {
    shopFilters.brand = brand || "all";
    applyShopFilters();
}

// Logic for the Sort Dropdown
function sortProducts() {
    shopFilters.sort = document.getElementById('sortSelect').value;
    applyShopFilters();
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
          <button class="btn-add" onclick="window.location.href='product_detail.html?id=${product.id}'">
            View Details
          </button>
        </div>
        `;
      grid.innerHTML += card;
    });
}

// Logic for the Search Bar
function searchProducts() {
    shopFilters.search = document.getElementById('searchInput').value.trim().toLowerCase();
    applyShopFilters(); // Respects the selected brand + sort order
}

// 4. Initialize everything
document.addEventListener("DOMContentLoaded", async () => {
    await loadBrandsSidebar(); // 1st: Build the sidebar
    await loadProducts();      // 2nd: Build the products
});