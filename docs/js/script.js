// =====================
// 1. CART SYSTEM
// =====================

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function addToCart(name, price, image, redirect = false) {
  let cart = getCart();

  const sizeInput = document.getElementById("size");
  const size = sizeInput ? sizeInput.value.trim() : "";
  const errorMsg = document.getElementById("size-error");

  if (size === "" || size === "Default") {
    if (errorMsg) errorMsg.style.display = "block"; 
    return false;
  }

  const quantityInput = document.getElementById("quantity");
  const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;

  const mainImage = document.getElementById("mainImage");
  let imagePath = mainImage ? mainImage.getAttribute("src") : image;
  imagePath = imagePath.replace(/^\//, "");

  const existing = cart.find(item => item.name === name && item.size === size);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ name, price, image: imagePath, size, quantity });
  }

  saveCart(cart);
  updateCartIndicator();

  if (redirect) {
    window.location.href = "cart.html";
  }
  return true;
}

function addToCartWithPopup(name, price, image) {
  const sizeInput = document.getElementById("size");
  const size = sizeInput ? sizeInput.value.trim() : "";
  const errorMsg = document.getElementById("size-error");

  if (size === "" || size === "Default") {
    if (errorMsg) errorMsg.style.display = "block"; 
    return; 
  }

  addToCart(name, price, image, false);

  const quantityInput = document.getElementById("quantity");
  const quantity = quantityInput ? parseInt(quantityInput.value) || 1 : 1;

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
  message.textContent = `${quantity} × ${name} (Size: ${size}) has been added to your cart.`;
  modal.style.display = "flex";

  document.getElementById("viewCartBtn").onclick = () => window.location.href = "cart.html";
  document.getElementById("continueShoppingBtn").onclick = () => modal.style.display = "none";

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
  displayCheckoutSummary(); 
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
  displayCheckoutSummary(); 
}

function displayCart() {
  const cartItemsContainer = document.getElementById("cart-items");
  const cartTotal = document.getElementById("cart-total");
  if (!cartItemsContainer || !cartTotal) return; 

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

function displayCheckoutSummary() {
  const orderSummaryContainer = document.getElementById("order-items"); 
  const orderTotalDisplay = document.getElementById("order-total");     

  if (!orderSummaryContainer || !orderTotalDisplay) return; 

  const cart = getCart();
  let total = 0;
  orderSummaryContainer.innerHTML = "";

  if (cart.length === 0) {
    orderSummaryContainer.innerHTML = "<p style='color:red;'>Your cart is empty.</p>";
    orderTotalDisplay.textContent = "0.00";
    return;
  }

  cart.forEach(item => {
    const itemTotal = item.price * item.quantity;
    total += itemTotal;

    const itemDiv = document.createElement("div");
    itemDiv.style.display = "flex";
    itemDiv.style.justifyContent = "space-between";
    itemDiv.style.padding = "10px 0";
    itemDiv.style.borderBottom = "1px solid #eee";

    itemDiv.innerHTML = `
      <div style="font-size: 14px;">
        <strong>${item.quantity}x</strong> ${item.name} <br>
        <small style="color: #666;">Size: ${item.size}</small>
      </div>
      <div style="font-weight: bold; font-size: 14px;">
        LE ${itemTotal.toFixed(2)}
      </div>
    `;
    orderSummaryContainer.appendChild(itemDiv);
  });

  orderTotalDisplay.textContent = total.toFixed(2);
}

async function autofillCheckout() {
    const guestForm = document.getElementById("guestAddressForm");
    const savedView = document.getElementById("savedAddressView");
    const addressList = document.getElementById("checkout-address-list");
    if (!guestForm) return; 
  
    try {
      const response = await fetch('/api/addresses/me');
      if (response.ok) {
        const addresses = await response.json();
  
        if (addresses.length > 0) {
            guestForm.style.display = "none";
            savedView.style.display = "block";
            window.isAmazonMode = true;
            
            addressList.innerHTML = "";
            addresses.forEach((addr, index) => {
                const isChecked = (addr.isDefault || index === 0) ? "checked" : "";
                const selectedClass = isChecked ? "selected-address" : "";
                
                const div = document.createElement("div");
                div.className = `amazon-address-card ${selectedClass}`;
                div.innerHTML = `
                    <input type="radio" name="selectedAddress" value="${addr.id}" id="addr_${addr.id}" ${isChecked} 
                           style="margin-top: 5px; cursor: pointer; transform: scale(1.2);" 
                           onclick="document.querySelectorAll('.amazon-address-card').forEach(c => c.classList.remove('selected-address')); this.parentElement.classList.add('selected-address');">
                    <label for="addr_${addr.id}" style="cursor: pointer; width: 100%;">
                        <strong style="display:block; font-size: 1.1em; color: #222;">${addr.firstName} ${addr.lastName}</strong>
                        <span style="display:block; color: #555; margin-top: 4px;">${addr.street}</span>
                        <span style="display:block; color: #555;">${addr.city}, ${addr.governorate}</span>
                        <span style="display:block; color: #555; margin-top: 4px;">Phone: ${addr.phone}</span>
                    </label>
                `;
                addressList.appendChild(div);
            });
        }
      }
    } catch (err) {
      console.log("Guest checkout. Showing normal form.");
    }
}

async function handlePlaceOrder(e) {
  e.preventDefault();

  let fieldsToValidate = ["payment"];
  if (!window.isAmazonMode) {
      fieldsToValidate = ["firstName", "lastName", "address", "city", "governorate", "phone", "payment"];
  }

  let allValid = true;

  fieldsToValidate.forEach(id => {
    const el = document.getElementById(id);
    if(el) {
        el.style.borderColor = "#ccc";
        if (el.nextElementSibling && el.nextElementSibling.classList.contains("error-msg")) {
          el.nextElementSibling.remove();
        }
    }
  });

  fieldsToValidate.forEach(id => {
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

  const cart = getCart();
  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cart: cart })
    });
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Error connecting to the payment gateway.");
    }
  } catch (err) {
    console.error("Checkout Error:", err);
    alert("Network error. Could not reach the server.");
  }
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
  const products = document.querySelectorAll(".products .card"); 
  const sortSelect = document.getElementById("sortSelect");
  const grid = document.getElementById("productGrid"); 

  if (searchIcon && searchInput) {
  const searchBar = document.getElementById("searchBar"); 
  searchIcon.addEventListener("click", (e) => {
    e.preventDefault();
    if (searchBar) searchBar.classList.toggle("show");
    searchInput.classList.toggle("active");
    if (searchInput.classList.contains("active")) {
      searchInput.focus();
    }
  });

  searchInput.addEventListener("input", () => { 
    const filter = searchInput.value.toLowerCase();
    if (typeof searchProducts === "function") {
        searchProducts(); 
    } else {
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

  if (brandFilter) {
    brandFilter.addEventListener("click", e => {
      if (e.target.tagName === "LI") {
        const brand = e.target.getAttribute("data-brand");
        brandFilter.querySelectorAll("li").forEach(li => li.classList.remove("active"));
        e.target.classList.add("active");

        products.forEach(product => {
            const productBrand = product.getAttribute("data-brand");
            product.style.display = (brand === "all" || productBrand.toLowerCase() === brand.toLowerCase()) ? "flex" : "none";
        });
        const heading = document.querySelector(".sortbar p strong");
        if (heading) {
            heading.textContent = brand === "all" ? "Showing All Products" : `Showing ${brand} Products`;
        }
      }
    });
  }

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
  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// =====================
// 5. AUTHENTICATION SYSTEM
// =====================

async function initAuth() {
  injectAuthModal(); 
  const userIcon = document.getElementById("userIcon");
  const authModal = document.getElementById("authModal");

  let currentUser = null;
    try {
      const response = await fetch('/api/users/me');
      if (response.ok) {
        const data = await response.json();
        currentUser = data.user;
      }
    } catch (err) {
      console.error("Auth check failed:", err);
  }  
  if (currentUser && userIcon) {
    userIcon.innerHTML = "👤 "; 
    userIcon.href = "profile.html"; 
    userIcon.style.border = "none";
    userIcon.style.padding = "0";
    userIcon.title = `Profile of ${currentUser.name}`;
    userIcon.onclick = null; 
  } else if (userIcon && authModal) {
    userIcon.innerHTML = "Login / Register";
    userIcon.href = "javascript:void(0)";
    userIcon.onclick = (e) => {
      e.preventDefault();
      authModal.style.display = "flex";
    };
  }
  
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

async function initProfile() {
  const userNameDisplay = document.getElementById("userNameDisplay");
  const userEmailDisplay = document.getElementById("userEmailDisplay");
  
  if (!userNameDisplay) return;

  let currentUser = null;
  try {
    const response = await fetch('/api/users/me');
    if (response.ok) {
      const data = await response.json();
      currentUser = data.user;
    }
  } catch (err) {
    console.error("Profile load error:", err);
  }
    
  if (!currentUser) {
    window.location.href = "index.html";
    return;
  }

  userNameDisplay.textContent = currentUser.name;
  userEmailDisplay.textContent = currentUser.email;
  if(document.getElementById("displayUserName")) document.getElementById("displayUserName").textContent = currentUser.name;
  if(document.getElementById("displayUserEmail")) document.getElementById("displayUserEmail").textContent = currentUser.email;

  // 🚀 Fetch and Draw the Address Book
  const loadAddresses = async () => {
      const addrList = document.getElementById("saved-addresses-list");
      if(!addrList) return;
      try {
          const res = await fetch('/api/addresses/me');
          const addresses = await res.json();
          addrList.innerHTML = "";
          
          if(addresses.length === 0) {
              addrList.innerHTML = "<p>You haven't saved any addresses yet.</p>";
              return;
          }
          
          addresses.forEach(addr => {
              const div = document.createElement("div");
              div.style.padding = "20px";
              div.style.borderStyle = "solid";
              div.style.borderWidth = addr.isDefault ? "2px" : "1px";
              div.style.borderColor = addr.isDefault ? "#145214" : "#e5e7eb";
              div.style.borderRadius = "8px";
              div.style.background = addr.isDefault ? "#f4fff4" : "#ffffff";
              div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
              
              const badgeOrButton = addr.isDefault 
                ? '<span style="background: #e8f5e9; color:#145214; padding: 4px 10px; border-radius: 4px; font-size:0.75em; font-weight:bold; border: 1px solid #c8e6c9; white-space: nowrap; flex-shrink: 0; text-transform: uppercase; letter-spacing: 0.5px;">Default</span>'
                : `<button type="button" onclick="setDefaultAddress(${addr.id})" style="background: transparent !important; color: #007bff !important; border: none !important; padding: 0 !important; font-size: 0.9em; font-weight: bold; cursor: pointer; width: auto !important; min-width: 0 !important; white-space: nowrap; flex-shrink: 0; text-decoration: none;" onmouseover="this.style.textDecoration='underline'; this.style.color='#0056b3';" onmouseout="this.style.textDecoration='none'; this.style.color='#007bff';">Set as Default</button>`;

              div.innerHTML = `
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 15px;">
                      <strong style="font-size:1.1em; color: #222; flex-grow: 1; word-break: break-word;">${addr.firstName} ${addr.lastName}</strong>
                      ${badgeOrButton}
                  </div>
                  <span style="display:block; color:#444; margin-bottom: 4px;">${addr.street}</span>
                  <span style="display:block; color:#444; margin-bottom: 4px;">${addr.city}, ${addr.governorate}</span>
                  <span style="display:block; color:#444; margin-top: 8px;">Phone: ${addr.phone}</span>
              `;
              addrList.appendChild(div);
          });
      } catch(e) { 
          console.error(e); 
          addrList.innerHTML = "<p>Could not load addresses.</p>";
      }
  };
  loadAddresses();

  // 🚀 Toggle Form Logic
  const showFormBtn = document.getElementById("showFormBtn");
  const cancelFormBtn = document.getElementById("cancelFormBtn");
  const newAddressWrapper = document.getElementById("newAddressWrapper");

  if(showFormBtn && newAddressWrapper) {
      showFormBtn.addEventListener("click", () => {
          newAddressWrapper.style.display = "block";
          showFormBtn.style.display = "none"; // Hides the "+ Add New" button while form is open
      });
  }

  if(cancelFormBtn && newAddressWrapper) {
      cancelFormBtn.addEventListener("click", () => {
          newAddressWrapper.style.display = "none";
          showFormBtn.style.display = "block"; // Brings the button back
          document.getElementById("newAddressForm").reset(); // Clears any half-typed info
      });
  }

  // 🚀 Save a New Address
  const newAddrForm = document.getElementById("newAddressForm");
  if(newAddrForm) {
      newAddrForm.addEventListener("submit", async (e) => {
          e.preventDefault();
          const data = {
              firstName: document.getElementById("addrFirst").value,
              lastName: document.getElementById("addrLast").value,
              street: document.getElementById("addrStreet").value,
              city: document.getElementById("addrCity").value,
              governorate: document.getElementById("addrGov").value,
              phone: document.getElementById("addrPhone").value
          };
          try {
              const res = await fetch('/api/addresses/me', {
                  method: 'POST',
                  headers: {'Content-Type': 'application/json'},
                  body: JSON.stringify(data)
              });
              if(res.ok) {
                  alert("Address saved to your Address Book!");
                  newAddrForm.reset();
                  
                  // Hide the form and show the button again!
                  if (newAddressWrapper && showFormBtn) {
                      newAddressWrapper.style.display = "none";
                      showFormBtn.style.display = "block";
                  }
                  
                  loadAddresses(); // Instantly update the visual list
              } else {
                  alert("Failed to save address.");
              }
          } catch(e) { alert("Network error. Could not save address."); }
      });
  }

  // Profile Tab Switching
  const menuItems = document.querySelectorAll(".sidebar-menu .menu-item:not(.logout)");
  const detailsCard = document.getElementById("details-card");
  const addressesCard = document.getElementById("addresses-card");
  const ordersCard = document.getElementById("orders-card");
  const settingsCard = document.getElementById("settings-card");

  menuItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      
      menuItems.forEach(m => m.classList.remove("active"));
      item.classList.add("active");

      if (detailsCard) detailsCard.style.display = "none";
      if (addressesCard) addressesCard.style.display = "none";
      if (ordersCard) ordersCard.style.display = "none";
      if (settingsCard) settingsCard.style.display = "none";

      const target = item.getAttribute("href");
      if (target === "#details") {
        if (detailsCard) detailsCard.style.display = "block";
      } else if (target === "#addresses") {
        if (addressesCard) addressesCard.style.display = "block";
      } else if (target === "#orders") {
        if (ordersCard) ordersCard.style.display = "block";
        if (typeof loadOrderHistory === 'function') loadOrderHistory(); 
      } else if (target === "#settings") {
        if (settingsCard) settingsCard.style.display = "block";
      }
    });
  });

  // 🚀 MAGIC FIX: Check URL on load and open the right tab!
  const urlHash = window.location.hash;
  if (urlHash) {
      const targetTab = document.querySelector(`.sidebar-menu a[href="${urlHash}"]`);
      if (targetTab) {
          targetTab.click(); 
      }
  }
}

// 🚀 NEW: Global function so the generated buttons can trigger the API
window.setDefaultAddress = async function(addressId) {
    try {
        const res = await fetch(`/api/addresses/${addressId}/default`, { 
            method: 'PUT' 
        });
        if(res.ok) {
            // Instantly reload the page to snap the new default to the top!
            location.reload(); 
        } else {
            alert("Failed to update default address.");
        }
    } catch(e) {
        console.error("Default Address Error:", e);
    }
};

async function loadOrderHistory() {
  const orderList = document.getElementById("order-history-list");
  if (!orderList) return;

  try {
    orderList.innerHTML = "<p>Loading your past orders...</p>";
    
    const response = await fetch('/api/orders/me');
    
    if (!response.ok) {
       orderList.innerHTML = "<p style='color:red;'>Failed to load orders.</p>";
       return;
    }

    const orders = await response.json();
    orderList.innerHTML = ""; 

    if (orders.length === 0) {
      orderList.innerHTML = "<p>You haven't added any tees to your fleet yet. Time to hit the shop!</p>";
      return;
    }

    orders.forEach(order => {
      const date = new Date(order.createdAt).toLocaleDateString();
      const orderDiv = document.createElement("div");
      
      orderDiv.style.border = "1px solid #ccc";
      orderDiv.style.borderRadius = "8px";
      orderDiv.style.padding = "15px";
      orderDiv.style.marginBottom = "15px";
      orderDiv.style.background = "#fafafa";

      orderDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px;">
          <strong>Order #${order.id}</strong>
          <span style="color: #666;">${date}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <p style="margin: 0; font-size: 14px;">Status: <strong style="color: #145214;">${order.status || 'Processing'}</strong></p>
          <p style="margin: 0; font-weight: bold;">Total: LE ${parseFloat(order.totalAmount || order.total).toFixed(2)}</p>
        </div>
      `;
      orderList.appendChild(orderDiv);
    });

  } catch (err) {
    console.error("Order Load Error:", err);
    orderList.innerHTML = "<p style='color:red;'>Could not connect to the database.</p>";
  }
}

async function handleLogout() {
  if (confirm("Are you sure you want to cut the engine and log out?")) {
  try {
      await fetch('/api/logout', { method: 'POST' });
      window.location.href = "index.html"; 
    } catch (err) {
      console.error("Logout Error:", err);
    }
  }
}

// =====================
// 5.6 DYNAMIC SHOWROOM
// =====================
async function loadShowroom() {
  const showroom = document.getElementById("dynamic-showroom");
  if(!showroom) return;

  try {
    const response = await fetch('/api/products');
    const products = await response.json();
    showroom.innerHTML = "";
    const bestSellers = products.filter(product => product.isBestSeller === true).slice(0,4);

    bestSellers.forEach(product => {
      const card = document.createElement("article");
      card.className = "product-card";
      card.innerHTML = `
        <a href="product_detail.html?id=${product.id}">
          <img src="${product.image}" alt="${product.name}">
        </a>
        <h3>${product.name}</h3>
        <p class="price"><span class="new-price">LE ${parseFloat(product.price).toFixed(2)}</span></p>
        <button onclick="window.location.href='product_detail.html?id=${product.id}'">View</button>
      `;
      showroom.appendChild(card);
    });
  } catch (err) {
    console.error("Showroom Load Error:", err);
    showroom.innerHTML = "<p>The garage is currently closed. Please check back later!</p>";
  }
}

// =====================
// 5.7 DYNAMIC BRANDS
// =====================
async function loadBrands() {
  const brandGrid = document.getElementById("dynamic-brands");
  if (!brandGrid) return;

  try {
    const response = await fetch('/api/brands');
    const brands = await response.json();
    brandGrid.innerHTML = "";
    brands.forEach(brand => {
      const article = document.createElement("article");
      article.className = "brand-card";
      article.onclick = () => window.location.href = `shop.html?brand=${brand.filterValue}`;
      article.innerHTML = `<img src="${brand.logo}" alt="${brand.name} Logo"><h3>${brand.name}</h3>`;
      brandGrid.appendChild(article);
    });
  } catch (err) {
    console.error("Brand Load Error:", err);  
  }
}

// =====================
// 5.8 DYNAMIC SITE REVIEWS
// =====================
async function loadSiteReviews() {
  const reviewGrid = document.getElementById("dynamic-reviews");
  if (!reviewGrid) return;

  try {
    const response = await fetch('/api/site-reviews');
    const reviews = await response.json();
    reviewGrid.innerHTML = "";

    const sortedReviews = reviews.sort((a, b) => b.rating - a.rating); 
    
    const renderSiteReviews = (reviewsToRender) => {
        reviewsToRender.forEach(review => {
          const stars = "⭐".repeat(review.rating); 
          const article = document.createElement("article");
          article.className = "review-card"; 
          article.innerHTML = `
            <h4>${stars}</h4>
            <p class="review-comment">"${review.comment}"</p>
            <p><strong>- ${review.reviewerName}</strong></p>
          `;
          reviewGrid.appendChild(article);
        });
    };

    const initialSiteReviews = sortedReviews.slice(0, 4);
    renderSiteReviews(initialSiteReviews);

    if (sortedReviews.length > 4) {
        const btnWrapper = document.createElement("div");
        btnWrapper.style.gridColumn = "1 / -1"; 
        btnWrapper.style.textAlign = "center";
        btnWrapper.style.marginTop = "20px";

        const showAllBtn = document.createElement("button");
        showAllBtn.innerText = `Read All ${sortedReviews.length} Reviews`;
        showAllBtn.style.padding = "10px 20px";
        showAllBtn.style.background = "#333";
        showAllBtn.style.color = "#fff";
        showAllBtn.style.border = "none";
        showAllBtn.style.cursor = "pointer";
        showAllBtn.style.borderRadius = "4px";
        
        showAllBtn.onclick = () => {
            const remainingSiteReviews = sortedReviews.slice(4);
            renderSiteReviews(remainingSiteReviews);
            btnWrapper.style.display = "none"; 
        };

        btnWrapper.appendChild(showAllBtn);
        reviewGrid.appendChild(btnWrapper);
    }
  } catch (err) {
    console.error("Reviews Load Error:", err);
    reviewGrid.innerHTML = "<p>Could not load reviews at this time.</p>";
  }
}

function initSiteReviewForm() {
  const form = document.getElementById("siteReviewForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("reviewerName").value;
    const rating = document.getElementById("reviewRating").value;
    const comment = document.getElementById("reviewComment").value;

    try {
      const response = await fetch('/api/site-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerName: name, rating: parseInt(rating), comment: comment })
      });
      if (response.ok) {
        alert("Thank you for your review!");
        form.reset();
        loadSiteReviews();
      }
    } catch (err) {
      console.error("Failed to post review:", err);
    }
  });
}

// =====================
// 5.9 DYNAMIC PRODUCT REVIEWS
// =====================
async function loadProductReviews(productId) {
  const reviewGrid = document.getElementById("dynamic-product-reviews");
  if (!reviewGrid) return;

  try {
    const response = await fetch(`/api/products/${productId}/reviews`);
    const reviews = await response.json();
    reviewGrid.innerHTML = ""; 

    if (reviews.length === 0) {
      reviewGrid.innerHTML = "<p style='color: #fff;'>No reviews yet. Be the first to review this tee!</p>";
      return;
    }

    const renderProductReviews = (reviewsToRender) => {
        reviewsToRender.forEach(review => {
          const stars = "⭐".repeat(review.rating); 
          const article = document.createElement("article");
          article.className = "detailed-review-row"; 
          article.innerHTML = `
            <div class="reviewer-profile">
              <div class="avatar">👤</div>
              <span class="reviewer-name">${review.reviewerName}</span>
            </div>
            <div class="review-rating-row">
              <span class="review-stars">${stars}</span>
              <span class="verified-purchase">Verified Purchase</span>
            </div>
            <p class="review-text">"${review.comment}"</p>
          `;
          reviewGrid.appendChild(article);
        });
    };

    const initialReviews = reviews.slice(0, 3);
    renderProductReviews(initialReviews);

    if (reviews.length > 3) {
        const btnWrapper = document.createElement("div");
        btnWrapper.style.textAlign = "center";
        btnWrapper.style.marginTop = "20px";

        const showAllBtn = document.createElement("button");
        showAllBtn.innerText = `Show All ${reviews.length} Reviews`;
        showAllBtn.style.padding = "10px 20px";
        showAllBtn.style.background = "#145214"; 
        showAllBtn.style.color = "#fff";
        showAllBtn.style.border = "none";
        showAllBtn.style.cursor = "pointer";
        showAllBtn.style.borderRadius = "4px";
        
        showAllBtn.onclick = () => {
            const remainingReviews = reviews.slice(3);
            renderProductReviews(remainingReviews);
            btnWrapper.style.display = "none"; 
        };

        btnWrapper.appendChild(showAllBtn);
        reviewGrid.appendChild(btnWrapper);
    }
  } catch (err) {
    console.error("Product Reviews Load Error:", err);
  }
}

function initProductReviewForm(productId) {
  const form = document.getElementById("productReviewForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); 
    const name = document.getElementById("prodReviewerName").value;
    const rating = document.getElementById("prodReviewRating").value;
    const comment = document.getElementById("prodReviewComment").value;

    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerName: name, rating: parseInt(rating), comment: comment })
      });
      if (response.ok) {
        alert("Thanks for your review!");
        form.reset(); 
        loadProductReviews(productId); 
      } else {
        alert("Server Error: The backend refused to save the review.");
      }
    } catch (err) {
      alert("Network Error: Could not reach the Node server!");
    }
  });
}

// =====================
// 6. INITIALIZATION & EVENT DELEGATION
// =====================

document.addEventListener("DOMContentLoaded", () => {
  displayCart(); 
  displayCheckoutSummary(); 
  autofillCheckout(); 
  initSearchFilter(); 
  updateCartIndicator(); 
  initAuth(); 
  initProfile();
  loadShowroom();
  loadBrands();

  if (document.getElementById("dynamic-reviews")) {
    loadSiteReviews();
    initSiteReviewForm();
  }

  const urlParams = new URLSearchParams(window.location.search);
  const currentProductId = urlParams.get('id');
  if (currentProductId && document.getElementById("dynamic-product-reviews")) {
      loadProductReviews(currentProductId);
      initProductReviewForm(currentProductId);
  }

  const hamburger = document.querySelector(".hamburger");
  const navLinks = document.querySelector(".nav-links");
  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      navLinks.classList.toggle("nav-active");
      hamburger.classList.toggle("active");
    });
  }

  const checkoutForm = document.getElementById("checkoutForm");
  if (checkoutForm) {
      checkoutForm.addEventListener("submit", handlePlaceOrder);
  }
  
  const paymentSelect = document.getElementById("payment");
  const instapayInfo = document.getElementById("instapayInfo");
  if (paymentSelect && instapayInfo) {
      paymentSelect.addEventListener("change", () => {
        instapayInfo.style.display = paymentSelect.value === "instapay" ? "block" : "none";
      });
  }
});

// 🚀 THE BULLETPROOF INTERACTION CATCHER
document.addEventListener("click", function(e) {
    
    // 1. CATCH: "BUY NOW" BUTTON
    const buyNowBtn = e.target.closest("#buyNowBtn") || e.target.closest(".buy-now");
    if (buyNowBtn) {
        e.preventDefault(); 

        const sizeInput = document.getElementById("size");
        const size = sizeInput ? sizeInput.value.trim() : "";
        const errorMsg = document.getElementById("size-error");

        if (size === "" || size === "Default") {
            if (errorMsg) errorMsg.style.display = "block";
            return; 
        }

        const titleElement = document.querySelector("h1") || document.getElementById("productTitle");
        const name = titleElement ? titleElement.innerText.trim() : "CarTees Product";
        
        const imageElement = document.getElementById("mainImage") || document.querySelector("img");
        const image = imageElement ? imageElement.getAttribute("src") : "images/default.jpg";

        let price = 0;
        const priceElement = document.querySelector(".price .new-price") || document.querySelector(".price");
        if (priceElement) {
            const numbers = priceElement.innerText.match(/\d+(\.\d+)?/g);
            if (numbers) {
                price = Math.min(...numbers.map(n => parseFloat(n)));
            }
        }

        const success = addToCart(name, price, image, false);
        
        if (success) {
            window.location.href = "checkout.html";
        }
    }

    // 2. CATCH: SIZE SELECTOR CIRCLES
    const sizeBtn = e.target.closest(".size-btn");
    if (sizeBtn) {
        e.preventDefault();

        document.querySelectorAll(".size-btn").forEach(b => b.classList.remove("selected"));
        sizeBtn.classList.add("selected");
        
        const hiddenSizeInput = document.getElementById("size");
        if (hiddenSizeInput) {
            hiddenSizeInput.value = sizeBtn.innerText.trim();
        }
        
        const sizeErrorText = document.getElementById("size-error");
        if (sizeErrorText) {
            sizeErrorText.style.display = "none";
        }
    }

    // 3. CATCH: OUTSIDE CLICKS (Auth Modal)
    const authModal = document.getElementById("authModal");
    if (authModal && e.target === authModal) {
        authModal.style.display = "none";
    }
});