// Get cart items from localStorage
let cart = JSON.parse(localStorage.getItem("cart")) || [];

// Cart container (only exists on cart.html)
let cartContainer = document.getElementById('cartItems');

if (cartContainer) {
  // Clear existing content
  cartContainer.innerHTML = "";

  // Render each cart item
  cart.forEach(item => {
    // Create item container
    let itemDiv = document.createElement('div');
    itemDiv.classList.add('cart-item');

    // Make sure image path is correct relative to cart.html
    let imgPath = item.image;
    if (!imgPath.startsWith('/') && !imgPath.startsWith('http')) {
      imgPath = imgPath.replace(/^(\.\.\/)+/, ''); 
      imgPath = 'images/' + imgPath.split('/').pop(); 
    }

    // Set inner HTML
    itemDiv.innerHTML = `
      <img src="${imgPath}" alt="${item.name}" class="cart-item-image">
      <div class="cart-item-details">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-price">LE ${item.price}</p>
        <p class="cart-item-quantity">Quantity: ${item.quantity}</p>
      </div>
    `;

    cartContainer.appendChild(itemDiv);
  });
}

// Update cart indicator (green dot)
function updateCartIndicator() {
  const indicator = document.getElementById("cart-indicator") || document.getElementById("cart-count");
  if (!indicator) return; 

  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  
  if (cart.length > 0) {
    indicator.classList.add("active");
    indicator.style.display = 'block';
  } else {
    indicator.classList.remove("active");
    indicator.style.display = 'none';
  }
}

// ✅ NEW: Logic to show the In-App Pop-up
function proceedToCheckout() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];
  
  if (cart.length === 0) {
    // 1. Get the modal element
    const modal = document.getElementById("emptyCartModal");
    
    if (modal) {
      // 2. Show the modal (using flex to center it as per style.css)
      modal.style.display = "flex";

      // 3. Setup Close Button
      const closeBtn = document.getElementById("modalCloseBtn");
      if (closeBtn) {
        closeBtn.onclick = function() {
          modal.style.display = "none";
        }
      }

      // 4. Setup 'Start Shopping' Button
      const shopBtn = document.getElementById("modalShopBtn");
      if (shopBtn) {
        shopBtn.onclick = function() {
          window.location.href = "shop.html";
        }
      }

      // 5. Close if user clicks outside the box
      window.onclick = function(event) {
        if (event.target === modal) {
          modal.style.display = "none";
        }
      }
    } else {
      // Fallback just in case HTML is missing
      alert("Your cart is empty!");
    }
  } else {
    // Cart has items -> Go to checkout
    window.location.href = 'checkout.html';
  }
}

// ✅ NEW: Logic for the "Added to Cart" Success Pop-up
function addToCartWithPopup(name, price, image) {
  // 1. Call your existing addToCart logic (assuming it's in your script.js or cart.js)
  if (typeof addToCart === "function") {
    addToCart(name, price, image);
  }

  // 2. Show the Success Modal
  const modal = document.getElementById('cartModal');
  const message = document.getElementById('cartModalMessage');
  
  if (modal && message) {
    message.innerText = `The ${name} has been added to your fleet!`;
    modal.style.display = 'flex';
    
    // Update the green dot immediately
    updateCartIndicator();
  }
}

// Function to close the success modal
function closeModal() {
  const modal = document.getElementById('cartModal');
  if (modal) modal.style.display = 'none';
}

// Run on page load
document.addEventListener("DOMContentLoaded", updateCartIndicator);