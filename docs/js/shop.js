// =====================
// SHOP.JS
// =====================

// ---- Add to Cart ----
// Note: addToCart functions are now globally in script.js
// This file can now focus on filtering/sorting

// ---- Update Cart Indicator ----
// Note: updateCartIndicator is now globally in script.js

// ---- Cart Modal ----
// Note: addToCartWithPopup in script.js handles this

// ---- Product Filtering ----
// Note: initSearchFilter in script.js handles this

// ---- Sorting ----
// Note: initSearchFilter in script.js handles this

// ---- Sidebar Click Handling ----
document.querySelectorAll("#brandFilter li").forEach(li => {
  li.addEventListener("click", () => {
    document.querySelectorAll("#brandFilter li").forEach(el => el.classList.remove("active"));
    li.classList.add("active");
    
    // We need to call the global filter function
    const brand = li.dataset.brand;
    const products = document.querySelectorAll(".products .grid .card");
    const brandFilter = document.getElementById("brandFilter");
    applyBrandFilter(brand, products, brandFilter); // This function is in script.js
  });
});


// ---- Toggle Search Bar ----
document.addEventListener("DOMContentLoaded", () => {
  // The global script.js now handles search toggle, sorting, and indicator
  
  // ---- Brand Pre-Selection from URL ----
  const urlParams = new URLSearchParams(window.location.search);
  const brandParam = urlParams.get("brand");

  if (brandParam) {
    const brandItem = document.querySelector(`#brandFilter li[data-brand="${brandParam.toLowerCase()}"]`);
    if (brandItem) {
      document.querySelectorAll("#brandFilter li").forEach(el => el.classList.remove("active"));
      brandItem.classList.add("active");
      
      // We need to call the global filter function
      const products = document.querySelectorAll(".products .grid .card");
      const brandFilter = document.getElementById("brandFilter");
      applyBrandFilter(brandParam.toLowerCase(), products, brandFilter);
    }
  }

});