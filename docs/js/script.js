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
// 5. AUTHENTICATION SYSTEM (MODAL VERSION)
// =====================

function initAuth() {
  const loginModal = document.getElementById("loginModal");
  const registerModal = document.getElementById("registerModal");
  const userIcon = document.getElementById("userIcon");

  // A. Check Login State on Page Load
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (currentUser && userIcon) {
    // User is logged in
    userIcon.textContent = "✅"; // Change icon to indicate success
    userIcon.style.border = "2px solid #145214";
    userIcon.style.borderRadius = "50%";
    userIcon.style.padding = "2px";
    userIcon.title = `Logged in as ${currentUser.name}`;
    
    // Logout logic
    userIcon.onclick = (e) => {
      e.preventDefault();
      if (confirm(`Hello, ${currentUser.name}! Do you want to logout?`)) {
        localStorage.removeItem("currentUser");
        location.reload(); 
      }
    };
  } else if (userIcon) {
    // User is NOT logged in -> Click opens Login Modal
    userIcon.onclick = (e) => {
      e.preventDefault();
      openModal('login');
    };
  }

  // B. Handle Registration
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("regName").value;
      const email = document.getElementById("regEmail").value;
      const password = document.getElementById("regPassword").value;

      const users = JSON.parse(localStorage.getItem("users")) || [];
      
      if (users.find(u => u.email === email)) {
        alert("This email is already registered!");
        return;
      }

      users.push({ name, email, password });
      localStorage.setItem("users", JSON.stringify(users));
      
      alert("Registration successful! Please login.");
      openModal('login'); // Switch to login
      registerForm.reset();
    });
  }

  // C. Handle Login
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      const users = JSON.parse(localStorage.getItem("users")) || [];
      const user = users.find(u => u.email === email && u.password === password);

      if (user) {
        localStorage.setItem("currentUser", JSON.stringify(user));
        alert("Login successful!");
        closeAuthModals();
        location.reload(); 
      } else {
        alert("Invalid email or password.");
      }
    });
  }
}

// Helper: Open Modal
function openModal(type) {
  closeAuthModals();
  if (type === 'login') {
    const modal = document.getElementById("loginModal");
    if(modal) modal.style.display = "flex";
  } else if (type === 'register') {
    const modal = document.getElementById("registerModal");
    if(modal) modal.style.display = "flex";
  }
}

// Helper: Close Modals
function closeAuthModals() {
  const loginModal = document.getElementById("loginModal");
  const registerModal = document.getElementById("registerModal");
  if (loginModal) loginModal.style.display = "none";
  if (registerModal) registerModal.style.display = "none";
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

  // Auth Modal Close Buttons (X)
  document.querySelectorAll('.close-auth').forEach(btn => {
    btn.addEventListener('click', closeAuthModals);
  });

  // Switch Links (Login <-> Register)
  const toRegister = document.getElementById("toRegister");
  const toLogin = document.getElementById("toLogin");
  
  if (toRegister) {
    toRegister.addEventListener("click", (e) => {
        e.preventDefault();
        openModal('register');
    });
  }
  if (toLogin) {
    toLogin.addEventListener("click", (e) => {
        e.preventDefault();
        openModal('login');
    });
  }

  // Close modals when clicking outside
  window.addEventListener("click", (e) => {
    const loginModal = document.getElementById("loginModal");
    const registerModal = document.getElementById("registerModal");
    if (e.target === loginModal) loginModal.style.display = "none";
    if (e.target === registerModal) registerModal.style.display = "none";
  });
});