// =====================
// PRODUCT DATA
// =====================
const products = {
  1: {
    name: "Porsche 911 Tee",
    price: 850,
    description:
      "A premium Porsche 911 inspired tee made from high-quality cotton. Perfect for motorsport fans who love performance and style.",
    images: ["/images/911Front.png", "/images/911Back.png"]
  },
  2: {
    name: "Ferrari SF90 Tee",
    price: 950,
    description:
      "Exclusive Ferrari SF90 tee crafted with precision stitching and premium cotton. A must-have for Ferrari enthusiasts.",
    images: ["/images/SF90Front.png", "/images/SF90Back.png"]
  },
  3: {
    name: "McLaren P1 Tee",
    price: 900,
    description:
      "A premium McLaren P1 inspired tee made from high-quality cotton. Perfect for motorsport fans who appreciate cutting-edge design.",
    images: ["/images/P1Front.png", "/images/P1Back.png"]
  },
  4: {
    name: "McLaren Senna Tee",
    price: 850,
    description:
      "A premium McLaren Senna inspired tee made from high-quality cotton. Perfect for motorsport fans who love speed and British design.",
    images: ["/images/SennaFront.png", "/images/SennaBack.png"]
  },
  5: {
    name: "AMG GT Black Tee",
    price: 850,
    description:
      "A premium AMG GT Black inspired tee. Perfect for fans of German engineering.",
    images: ["/images/GtBlackFront.png", "/images/GtBlackBack.png"]
  },
  6: {
    name: "M4 Competition Tee",
    price: 850,
    description:
      "A premium M4 Competition inspired tee. Perfect for fans of BMW M power.",
    images: ["/images/M4 CompetitionFront.png", "/images/M4 CompetitionBack.png"]
  }
};

// =====================
// HELPERS
// =====================
function toRootPath(src) {
  try {
    const u = new URL(src, window.location.origin);
    return u.pathname;
  } catch (e) {
    if (src.startsWith("/")) return src;
    return "/" + src.replace(/^(\.\/|(\.\.\/)+)/, "");
  }
}

// LocalStorage helpers are in script.js

// =====================
// RENDER PRODUCT BASED ON ID
// =====================
// Note: This logic seems to be overridden by your static product1.html, product2.html etc.
// The code below would be for a dynamic product page, which you are not using.
/*
const urlParams = new URLSearchParams(window.location.search);
const productId = urlParams.get("id");
const product = products[productId];

if (product) {
  const container = document.getElementById("product-details");
  if (container) {
    container.innerHTML = `
      ... (dynamic content) ...
    `;
  }
}
*/

// =====================
// IMAGE SWITCHER
// =====================
function changeImage(newSrc) {
  const mainImg = document.getElementById("mainImage");
  if (mainImg) mainImg.src = newSrc;
}

// =====================
// ADD TO CART / BUY NOW
// =====================
// Note: These functions (addToCart, buyNow, addToCartWithPopup) are in the global script.js
// and are called directly from the HTML's onclick attribute.

// =====================
// MODAL BEHAVIOR
// =====================
// Note: This is also handled by addToCartWithPopup in script.js

// =====================
// CART INDICATOR
// =====================
// Note: This is handled by updateCartIndicator in script.js
// Run once on load
document.addEventListener("DOMContentLoaded", updateCartIndicator);