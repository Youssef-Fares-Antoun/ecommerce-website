// =====================
// 1. CART SYSTEM
// =====================

// Load cart from localStorage
function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

// Save cart to localStorage
function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// Add product to cart
function addToCart(name, price, image, redirect = false) {
  let cart = getCart();

  // Get size & quantity from inputs (if available on the page)
  const sizeInput = document.getElementById("size");
  const size = sizeInput ? sizeInput.value : "Default";

  const quantityInput = document.getElementById("quantity");
  const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;

  // Get current main image if exists (always save relative path)
  const mainImage = document.getElementById("mainImage");
  let imagePath = mainImage ? mainImage.getAttribute("src") : image;

  // Normalize image path
  imagePath = imagePath.replace(/^\//, "");

  // Check if same product + size already exists
  const existing = cart.find(item => item.name === name && item.size === size);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ name, price, image: imagePath, size, quantity });
  }

  saveCart(cart);
  updateCartIndicator(); // Update dot immediately

  if (redirect) {
    window.location.href = "cart.html";
  }
}

// Custom Add to Cart Popup (Centered)
function addToCartWithPopup(name, price, image) {
  addToCart(name, price, image, false);

  const sizeInput = document.getElementById("size");
  const size = sizeInput ? sizeInput.value : "Default";
  const quantityInput = document.getElementById("quantity");
  const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;

  // Create modal if it doesn’t exist
  let modal = document.getElementById("cartModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "cartModal";
    modal.className = "cart-modal";
    modal.innerHTML = `
      <div class="cart-modal-content">
        <p id="cartModalMessage"></p>
        <div class="cart-modal-buttons">
          <button id="continueShoppingBtn" style="background:#145214;color:#fff;padding:10px 18px;border:none;border-radius:6px;cursor:pointer;">Continue Shopping</button>
          <button id="viewCartBtn" style="background:#007bff;color:#fff;padding:10px 18px;border:none;border-radius:6px;cursor:pointer;">Go to Cart</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const message = document.getElementById("cartModalMessage");
  const viewCartBtn = document.getElementById("viewCartBtn");
  const continueBtn = document.getElementById("continueShoppingBtn");

  message.textContent = `${quantity} × ${name} (Size: ${size}) has been added to your cart.`;
  modal.style.display = "flex";

  viewCartBtn.onclick = () => window.location.href = "cart.html";
  continueBtn.onclick = () => modal.style.display = "none";

  window.addEventListener("click", function outsideClick(e) {
    if (e.target === modal) {
      modal.style.display = "none";
      window.removeEventListener("click", outsideClick);
    }
  });
}

// =====================
// 2. CART PAGE LOGIC
// =====================

function removeFromCart(name, size) {
  let cart = getCart().filter(item => !(item.name === name && item.size === size));
  saveCart(cart);
  displayCart();
  updateCartIndicator();
}

function updateQuantity(name, size, change) {
  let cart = getCart();
  let item = cart.find(i => i.name === name && i.size === size);

  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      cart = cart.filter(i => !(i.name === name && i.size === size));
    }
  }

  saveCart(cart);
  displayCart();
  updateCartIndicator();
}

function displayCart() {
  const cartItemsContainer = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");
  if (!cartItemsContainer || !cartTotal) return; // Only run on cart.html

  const cart = getCart();
  let total = 0;
  cartItemsContainer.innerHTML = "";

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = "<p>Your cart is empty.</p>";
    cartTotal.textContent = "LE 0.00";
    return;
  }

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    let imgSrc = item.image.replace(/^\//, "");
    if (!imgSrc.startsWith("images/")) {
        imgSrc = "images/" + imgSrc.split('/').pop();
    }

    const div = document.createElement("div");
    div.classList.add("cart-item");
    div.innerHTML = `
      <img src="${imgSrc}" alt="${item.name}" class="cart-item-img">
      <div class="cart-item-info">
        <h3>${item.name}</h3>
        <p>Size: ${item.size}</p>
        <p>Price: LE ${item.price}</p>
        <div class="quantity-controls">
          <button class="qty-btn" onclick="updateQuantity('${item.name}', '${item.size}', -1)">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" onclick="updateQuantity('${item.name}', '${item.size}', 1)">+</button>
        </div>
        <button class="remove-btn" onclick="removeFromCart('${item.name}', '${item.size}')">Remove</button>
      </div>
    `;
    cartItemsContainer.appendChild(div);
  });

  cartTotal.textContent = "LE " + total.toFixed(2);
}

function clearCart() {
  localStorage.removeItem("cart");
  displayCart();
  updateCartIndicator();
}

// Checkout Handler
function proceedToCheckout() {
  const cart = getCart();
  if (cart.length === 0) {
    const modal = document.getElementById("emptyCartModal");
    if (modal) {
      modal.style.display = "flex";
      document.getElementById("modalCloseBtn").onclick = () => modal.style.display = "none";
      document.getElementById("modalShopBtn").onclick = () => window.location.href = "shop.html";
      window.onclick = (e) => { if (e.target === modal) modal.style.display = "none"; };
    } else {
      alert("Your cart is empty!");
    }
  } else {
    window.location.href = 'checkout.html';
  }
}

// =====================
// 3. CHECKOUT PAGE LOGIC
// =====================
function handlePlaceOrder(e) {
  e.preventDefault();

  const fields = ["firstName", "lastName", "address", "city", "governorate", "phone", "payment"];
  let allValid = true;

  // Clear errors
  fields.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        el.style.borderColor = "#ccc";
        if (el.nextElementSibling && el.nextElementSibling.classList.contains("error-msg")) {
        el.nextElementSibling.remove();
        }
    }
  });

  // Validate
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el && !el.value.trim()) {
      allValid = false;
      el.style.borderColor = "red";
      const msg = document.createElement("div");
      msg.className = "error-msg";
      msg.innerText = "Required";
      msg.style.color = "red";
      msg.style.fontSize = "12px";
      el.parentNode.appendChild(msg);
    }
  });

  if (!allValid) return;

  alert("✅ Order placed successfully!");
  localStorage.removeItem("cart");
  window.location.href = "index.html";
}


// =====================
// 4. SHARED UTILITIES
// =====================

function updateCartIndicator() {
  const cart = getCart();
  const indicator = document.getElementById("cart-indicator") || document.getElementById("cart-count");
  if (!indicator) return;

  if (cart.length > 0) {
    indicator.style.display = "block";
    indicator.classList.add("active");
  } else {
    indicator.style.display = "none";
    indicator.classList.remove("active");
  }
}

function initSearchFilter() {
  const searchIcon = document.getElementById("searchIcon") || document.getElementById("searchToggle");
  const searchInput = document.getElementById("searchInput");
  const brandFilter = document.getElementById("brandFilter");
  const products = document.querySelectorAll(".products .card"); // Assuming shop.html structure
  const sortSelect = document.getElementById("sortSelect");
  const grid = document.getElementById("productGrid"); // or .grid

  // Search
  if (searchIcon && searchInput) {
  // 1. Get the container wrapper for the animation
  const searchBar = document.getElementById("searchBar"); 

  searchIcon.addEventListener("click", (e) => {
    e.preventDefault();
    
    // 2. Toggle classes from your CSS
    if (searchBar) searchBar.classList.toggle("show");
    searchInput.classList.toggle("active");
    
    // 3. Auto-focus when opened
    if (searchInput.classList.contains("active")) {
      searchInput.focus();
    }
  });

  // 4. Live Filtering Logic
  searchInput.addEventListener("input", () => { // "input" is better than "keyup" for instant results
    const filter = searchInput.value.toLowerCase();
    
    // If you are using the array-filtering from shop.js, call that function:
    if (typeof searchProducts === "function") {
        searchProducts(); 
    } else {
        // Fallback: DOM-based filtering for static elements
        products.forEach(product => {
          const name = product.querySelector("h4").textContent.toLowerCase();
          const brand = product.dataset.brand ? product.dataset.brand.toLowerCase() : "";
          
          if (name.includes(filter) || brand.includes(filter)) {
              product.style.display = "flex";
          } else {
              product.style.display = "none";
          }
        });
    }
  });

  }

  // Brand Filter
  if (brandFilter) {
    brandFilter.addEventListener("click", e => {
      if (e.target.tagName === "LI") {
        const brand = e.target.getAttribute("data-brand");
        
        // Update Active Class
        brandFilter.querySelectorAll("li").forEach(li => li.classList.remove("active"));
        e.target.classList.add("active");

        // Filter
        products.forEach(product => {
            const productBrand = product.getAttribute("data-brand");
            product.style.display = (brand === "all" || productBrand.toLowerCase() === brand.toLowerCase()) ? "flex" : "none";
        });
        
        // Update Heading
        const heading = document.querySelector(".sortbar p strong");
        if (heading) {
            heading.textContent = brand === "all" ? "Showing All Products" : `Showing ${brand} Products`;
        }
      }
    });
  }

  // Sort
  if (sortSelect && grid) {
    sortSelect.addEventListener("change", () => {
      let cards = Array.from(grid.querySelectorAll(".card"));
      const val = sortSelect.value;

      if(val === 'low-high') {
          cards.sort((a, b) => parseFloat(a.dataset.price) - parseFloat(b.dataset.price));
      } else if (val === 'high-low') {
          cards.sort((a, b) => parseFloat(b.dataset.price) - parseFloat(a.dataset.price));
      } else if (val === 'a-z') {
          cards.sort((a, b) => a.querySelector("h4").textContent.localeCompare(b.querySelector("h4").textContent));
      } else if (val === 'z-a') {
          cards.sort((a, b) => {
            const nameA = a.querySelector("h4").textContent.toLowerCase();
            const nameB = b.querySelector("h4").textContent.toLowerCase();
            return nameB.localeCompare(nameA);
          });
      }

      cards.forEach(card => grid.appendChild(card));
    });
  }
}

// =====================
// 4.5 COMPONENT INJECTION
// =====================
function injectAuthModal() {
  // If the modal is already on the page, don't inject it twice
  if (document.getElementById("authModal")) return;

  const modalHTML = `
  <div id="authModal" class="cart-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 1000; justify-content: center; align-items: center;">
    <div style="background: white; padding: 30px; border-radius: 8px; width: 90%; max-width: 400px; position: relative;">
      
      <span onclick="document.getElementById('authModal').style.display='none'" style="position: absolute; top: 10px; right: 15px; font-size: 20px; cursor: pointer;">&times;</span>

      <div id="loginSection">
        <h2 style="margin-bottom: 20px;">Garage Access</h2>
        <form id="loginForm">
          <input type="email" id="loginEmail" placeholder="Email" required style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;" />
          <input type="password" id="loginPassword" placeholder="Password" required style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;" />
          <button type="submit" class="btn-primary" style="width: 100%;">Ignition (Login)</button>
        </form>
        <p style="margin-top: 15px; font-size: 0.9em; text-align: center;">
          No keys? <a href="javascript:void(0)" onclick="document.getElementById('loginSection').style.display='none'; document.getElementById('registerSection').style.display='block';" style="color: red;">Register here</a>
        </p>
      </div>

      <div id="registerSection" style="display: none;">
        <h2 style="margin-bottom: 20px;">Join the Crew</h2>
        <form id="registerForm">
          <input type="text" id="regName" placeholder="Full Name" required style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;" />
          <input type="email" id="regEmail" placeholder="Email" required style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;" />
          <input type="password" id="regPassword" placeholder="Password" required style="width: 100%; padding: 10px; margin-bottom: 15px; border: 1px solid #ccc; border-radius: 4px;" />
          <button type="submit" class="btn-primary" style="width: 100%;">Create Profile</button>
        </form>
        <p style="margin-top: 15px; font-size: 0.9em; text-align: center;">
          Already in the crew? <a href="javascript:void(0)" onclick="document.getElementById('registerSection').style.display='none'; document.getElementById('loginSection').style.display='block';" style="color: red;">Login here</a>
        </p>
      </div>

    </div>
  </div>
  `;

  // Inject the HTML right before the closing </body> tag
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// =====================
// 5. AUTHENTICATION SYSTEM (DATABASE VERSION)
// =====================

function initAuth() {
  injectAuthModal(); 
  const userIcon = document.getElementById("userIcon");
  const authModal = document.getElementById("authModal");

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (currentUser && userIcon) {

    // User is logged in
    userIcon.innerHTML = "👤 "; 
    userIcon.href = "profile.html"; 
    userIcon.style.border = "none";
    userIcon.style.padding = "0";
    userIcon.title = `Profile of ${currentUser.name}`;
    
    userIcon.onclick = null; 
  } else if (userIcon && authModal) {
    // User is NOT logged in -> Click opens the Auth Modal
    userIcon.innerHTML = "Login / Register";
    userIcon.href = "javascript:void(0)";
    
    userIcon.onclick = (e) => {
      e.preventDefault();
      authModal.style.display = "flex";
    };
  }
  

  // B. Handle Registration (Sending to PostgreSQL)
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("regName").value;
      const email = document.getElementById("regEmail").value;
      const password = document.getElementById("regPassword").value;

      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password })
        });
        const data = await response.json();

        if (response.ok) {
          alert("Registration successful! Please login.");
          // Switch to Login view
          document.getElementById('registerSection').style.display = 'none';
          document.getElementById('loginSection').style.display = 'block';
          registerForm.reset();
        } else {
          alert(data.message); 
        }
      } catch (err) {
        console.error("Registration Error:", err);
      }
    });
  }

  // C. Handle Login (Checking PostgreSQL)
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (response.ok) {
          // Store safe user data locally to keep them logged in (No Passwords!)
          localStorage.setItem("currentUser", JSON.stringify(data.user));
          alert("Login successful!");
          authModal.style.display = "none";
          location.reload(); 
        } else {
          alert(data.message); 
        }
      } catch (err) {
        console.error("Login Error:", err);
      }
    });
  }
}

// =====================
// 5.5 PROFILE DASHBOARD LOGIC
// =====================

function initProfile() {
  const userNameDisplay = document.getElementById("userNameDisplay");
  const userEmailDisplay = document.getElementById("userEmailDisplay");
  const inputName = document.getElementById("inputName");
  const inputEmail = document.getElementById("inputEmail");
  
  // If we are not on the profile page, skip this logic
  if (!userNameDisplay) return;

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  
  // Security Check: Kick unauthenticated users back to the homepage
  if (!currentUser) {
    window.location.href = "home.html";
    return;
  }

  // 1. Populate the Sidebar
  userNameDisplay.textContent = currentUser.name;
  userEmailDisplay.textContent = currentUser.email;

  // 2. Populate the Account Details Form
  if (inputName) inputName.value = currentUser.name;
  if (inputEmail) inputEmail.value = currentUser.email;
}

function handleLogout() {
  if (confirm("Are you sure you want to cut the engine and log out?")) {
    localStorage.removeItem("currentUser");
    window.location.href = "home.html"; // Redirect to storefront
  }
}

// =====================
// 6. INITIALIZATION
// =====================
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Page Specifics
  displayCart(); 
  initSearchFilter(); 
  updateCartIndicator(); 
  initAuth(); 
  initProfile();

  // Initialize Hamburger
  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("nav-active");
      hamburger.classList.toggle("active");
    });
  }

  // Initialize Checkout Form
  const checkoutForm = document.getElementById("checkoutForm");
  if (checkoutForm) {
      checkoutForm.addEventListener("submit", handlePlaceOrder);
  }
  
  // Payment method toggle (Instapay)
  const paymentSelect = document.getElementById("payment");
  const instapayInfo = document.getElementById("instapayInfo");
  if (paymentSelect && instapayInfo) {
      paymentSelect.addEventListener("change", () => {
        instapayInfo.style.display = paymentSelect.value === "instapay" ? "block" : "none";
      });
  }

  // Close auth modal when clicking outside of it
  window.addEventListener("click", (e) => {
    const authModal = document.getElementById("authModal");
    if (e.target === authModal) {
      authModal.style.display = "none";
    }
  });
});