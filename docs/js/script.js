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
if (!imgSrc.startsWith("http") && !imgSrc.startsWith("images/")) {
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
// 3. CHECKOUT PAGE LOGIC & PROMO ENGINE
// =====================

let appliedDiscountPercent = 0;
let appliedPromoString = null;

window.applyPromoCode = async function() {
    const input = document.getElementById("promoCodeInput");
    const msg = document.getElementById("promoMessage");
    const code = input.value.trim();

    if (!code) return;

    try {
        const res = await fetch('/api/promo/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code })
        });
        const data = await res.json();

        if (res.ok) {
            appliedDiscountPercent = data.discountPercent;
            appliedPromoString = data.code;
            msg.style.color = "var(--accent)";
            msg.textContent = `✔ ${data.discountPercent}% discount applied successfully!`;
            input.disabled = true;
            displayCheckoutSummary(); 
        } else {
            msg.style.color = "#e74c3c";
            msg.textContent = data.message || "Invalid code.";
        }
    } catch (err) {
        msg.style.color = "#e74c3c";
        msg.textContent = "Network error validating code.";
    }
};

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
    itemDiv.style.borderBottom = "1px solid var(--border-subtle)";

    itemDiv.innerHTML = `
      <div style="font-size: 14px; color: var(--text-main);">
        <strong>${item.quantity}x</strong> ${item.name} <br>
        <small style="color: var(--text-muted);">Size: ${item.size}</small>
      </div>
      <div style="font-weight: bold; font-size: 14px; color: var(--text-main);">
        LE ${itemTotal.toFixed(2)}
      </div>
    `;
    orderSummaryContainer.appendChild(itemDiv);
  });

  if (appliedDiscountPercent > 0) {
    const discountAmount = (total * appliedDiscountPercent) / 100;
    total = total - discountAmount;
    
    const discountDiv = document.createElement("div");
    discountDiv.style.display = "flex";
    discountDiv.style.justifyContent = "space-between";
    discountDiv.style.padding = "10px 0";
    discountDiv.style.color = "var(--accent)";
    discountDiv.style.fontSize = "14px";
    discountDiv.innerHTML = `<span>Discount (${appliedDiscountPercent}%)</span><span>-LE ${discountAmount.toFixed(2)}</span>`;
    orderSummaryContainer.appendChild(discountDiv);
  }

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
                        <strong style="display:block; font-size: 1.1em; color: var(--text-main);">${addr.firstName} ${addr.lastName}</strong>
                        <span style="display:block; color: var(--text-muted); margin-top: 4px;">${addr.street}</span>
                        <span style="display:block; color: var(--text-muted);">${addr.city}, ${addr.governorate}</span>
                        <span style="display:block; color: var(--text-muted); margin-top: 4px;">Phone: ${addr.phone}</span>
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
        el.style.borderColor = "var(--border-subtle)";
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
  
  const paymentSelect = document.getElementById("payment");
  const selectedPayment = paymentSelect ? paymentSelect.value : "card";
  
  const submitBtn = document.querySelector(".checkout-btn");
  const originalBtnText = submitBtn ? submitBtn.innerText : "PLACE YOUR ORDER";
  if (submitBtn) {
      submitBtn.innerText = "Processing...";
      submitBtn.disabled = true;
  }

  try {
    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          cart: cart,
          payment: selectedPayment,
          promoCode: appliedPromoString 
      })
    });
    
    const data = await response.json();
    
    if (data.url) {
      if (selectedPayment === 'cod') {
          localStorage.removeItem('cart');
      }
      window.location.href = data.url;
    } else {
      alert("Error connecting to the payment gateway.");
      if (submitBtn) { submitBtn.innerText = originalBtnText; submitBtn.disabled = false; }
    }
  } catch (err) {
    console.error("Checkout Error:", err);
    alert("Network error. Could not reach the server.");
    if (submitBtn) { submitBtn.innerText = originalBtnText; submitBtn.disabled = false; }
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

  // shop.js has its own unified brand + sort + search pipeline; if it's loaded,
  // don't attach these legacy DOM handlers (they override its heading and
  // re-sort cards by a non-existent data-price, scrambling the results).
  const shopPipelineActive = typeof applyShopFilters === "function";

  if (brandFilter && !shopPipelineActive) {
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

  if (sortSelect && grid && !shopPipelineActive) {
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
// 4.1 THEME TOGGLE LOGIC
// =====================
function initThemeToggle() {
  const themeToggleBtns = document.querySelectorAll('#themeToggle');
  const currentTheme = localStorage.getItem('theme');

  if (currentTheme === 'light') {
    document.body.classList.add('light-mode');
    updateToggleIcons('🌒'); 
  } else {
    updateToggleIcons('🌗');
  }

  themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      document.body.classList.toggle('light-mode');
      
      if (document.body.classList.contains('light-mode')) {
        localStorage.setItem('theme', 'light');
        updateToggleIcons('🌒');
      } else {
        localStorage.setItem('theme', 'dark');
        updateToggleIcons('🌗');
      }
    });
  });

  function updateToggleIcons(icon) {
    themeToggleBtns.forEach(btn => {
      btn.textContent = icon;
    });
  }
}

// =====================
// 4.5 COMPONENT INJECTION
// =====================
function injectAuthModal() {
  if (document.getElementById("authModal")) return;

  const modalHTML = `
  <div id="authModal" class="cart-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(5px); z-index: 1000; justify-content: center; align-items: center; font-family: 'Rajdhani', sans-serif;">
    <div style="background: var(--bg-card); color: var(--text-main); padding: 30px; border-radius: 4px; border: 1px solid var(--border-subtle); width: 90%; max-width: 400px; position: relative; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
      <span onclick="if(window.resetAuthModalToLogin) window.resetAuthModalToLogin(); document.getElementById('authModal').style.display='none';" style="position: absolute; top: 15px; right: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);">&times;</span>
      
      <div id="loginSection">
        <h2 style="margin-bottom: 20px; font-family: 'Syncopate', sans-serif; text-transform: uppercase; font-size: 20px; color: var(--text-main);">Garage Access</h2>
        <form id="loginForm">
          <input type="email" id="loginEmail" placeholder="Email" required style="width: 100%; padding: 14px; margin-bottom: 15px; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 16px;" />
          <input type="password" id="loginPassword" placeholder="Password" required style="width: 100%; padding: 14px; margin-bottom: 10px; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 16px;" />
          <div style="text-align: right; margin-bottom: 15px;">
            <a href="javascript:void(0)" id="openForgotPasswordLink" style="color: var(--accent); text-decoration: none; font-size: 0.9em; font-weight: 700;">Forgot Password?</a>
          </div>
          <button type="submit" class="btn-primary" style="width: 100%; padding: 14px; background: transparent; border: 2px solid var(--accent); color: var(--accent); font-family: 'Syncopate', sans-serif; font-weight: 700; text-transform: uppercase; cursor: pointer; border-radius: 0;">Ignition (Login)</button>
        </form>
        <p style="margin-top: 15px; font-size: 0.9em; text-align: center; color: var(--text-muted);">
          No keys? <a href="javascript:void(0)" onclick="document.getElementById('loginSection').style.display='none'; document.getElementById('forgotPasswordSection').style.display='none'; document.getElementById('registerSection').style.display='block';" style="color: var(--accent); text-decoration: none; font-weight: bold;">Register here</a>
        </p>
      </div>

      <div id="registerSection" style="display: none;">
        <h2 style="margin-bottom: 20px; font-family: 'Syncopate', sans-serif; text-transform: uppercase; font-size: 20px; color: var(--text-main);">Join the Crew</h2>
        <form id="registerForm">
          <input type="text" id="regName" placeholder="Full Name" required style="width: 100%; padding: 14px; margin-bottom: 15px; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 16px;" />
          <input type="email" id="regEmail" placeholder="Email" required style="width: 100%; padding: 14px; margin-bottom: 15px; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 16px;" />
          <input type="password" id="regPassword" placeholder="Password" required style="width: 100%; padding: 14px; margin-bottom: 15px; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 16px;" />
          <button type="submit" class="btn-primary" style="width: 100%; padding: 14px; background: transparent; border: 2px solid var(--accent); color: var(--accent); font-family: 'Syncopate', sans-serif; font-weight: 700; text-transform: uppercase; cursor: pointer; border-radius: 0;">Create Profile</button>
        </form>
        <p style="margin-top: 15px; font-size: 0.9em; text-align: center; color: var(--text-muted);">
          Already in the crew? <a href="javascript:void(0)" onclick="document.getElementById('registerSection').style.display='none'; document.getElementById('forgotPasswordSection').style.display='none'; document.getElementById('loginSection').style.display='block';" style="color: var(--accent); text-decoration: none; font-weight: bold;">Login here</a>
        </p>
      </div>

      <div id="forgotPasswordSection" style="display: none;">
        <h2 style="margin-bottom: 10px; font-family: 'Syncopate', sans-serif; text-transform: uppercase; font-size: 18px; color: var(--text-main);">2FA Password Reset</h2>

        <!-- Step 1: Enter Email to receive 6-digit 2FA code -->
        <form id="forgotStep1Form">
          <p style="font-size: 0.92em; color: var(--text-muted); margin-bottom: 15px;">
            Enter your account email.
          </p>
          <input type="email" id="forgotEmail" placeholder="Account Email" required style="width: 100%; padding: 14px; margin-bottom: 15px; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 16px;" />
          <button type="submit" id="forgotSendCodeBtn" class="btn-primary" style="width: 100%; padding: 14px; background: transparent; border: 2px solid var(--accent); color: var(--accent); font-family: 'Syncopate', sans-serif; font-weight: 700; text-transform: uppercase; cursor: pointer; border-radius: 0;">Send 2FA Code</button>
        </form>

        <!-- Step 2: Enter 6-digit 2FA code from email -->
        <form id="forgotStep2Form" style="display: none;">
          <p style="font-size: 0.92em; color: var(--text-muted); margin-bottom: 15px;">
            Type the 6-digit code sent to <strong id="forgotEmailDisplay" style="color: var(--text-main);"></strong>
          </p>
          <input type="text" id="forgotOtpCode" maxlength="6" pattern="[0-9]{6}" placeholder="6-Digit 2FA Code" required style="width: 100%; padding: 14px; margin-bottom: 15px; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 20px; text-align: center; letter-spacing: 6px; font-weight: 700;" />
          <button type="submit" id="forgotVerifyCodeBtn" class="btn-primary" style="width: 100%; padding: 14px; background: transparent; border: 2px solid var(--accent); color: var(--accent); font-family: 'Syncopate', sans-serif; font-weight: 700; text-transform: uppercase; cursor: pointer; border-radius: 0;">Verify 2FA Code</button>
          <p style="margin-top: 12px; font-size: 0.85em; text-align: center; color: var(--text-muted);">
            Didn't receive it? <a href="javascript:void(0)" id="resendForgotCodeLink" style="color: var(--accent); text-decoration: none; font-weight: bold;">Resend 2FA Code</a>
          </p>
        </form>

        <!-- Step 3: Set New Password -->
        <form id="forgotStep3Form" style="display: none;">
          <p id="forgotVerifiedBanner" style="font-size: 0.92em; color: #2ecc71; margin-bottom: 15px; font-weight: 700;">
            ✅ Identity verified! Enter your new password below:
          </p>
          <input type="password" id="forgotNewPassword" placeholder="New Password (min 6 chars)" minlength="6" required style="width: 100%; padding: 14px; margin-bottom: 12px; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 16px;" />
          <input type="password" id="forgotConfirmPassword" placeholder="Confirm New Password" minlength="6" required style="width: 100%; padding: 14px; margin-bottom: 15px; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 16px;" />
          <button type="submit" id="forgotResetPasswordBtn" class="btn-primary" style="width: 100%; padding: 14px; background: transparent; border: 2px solid var(--accent); color: var(--accent); font-family: 'Syncopate', sans-serif; font-weight: 700; text-transform: uppercase; cursor: pointer; border-radius: 0;">Update Password</button>
        </form>

        <p style="margin-top: 15px; font-size: 0.9em; text-align: center; color: var(--text-muted);">
          Remembered your keys? <a href="javascript:void(0)" id="backToLoginFromForgot" style="color: var(--accent); text-decoration: none; font-weight: bold;">Back to Login</a>
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

let currentUserPromise = null;
async function getCurrentUser() {
  if (window.currentUser !== undefined) return window.currentUser;
  if (!currentUserPromise) {
    currentUserPromise = fetch('/api/users/me')
      .then(async r => {
        if (r.status === 403) {
          const errData = await r.json().catch(() => ({}));
          if (errData && errData.isBanned) {
            alert(errData.error || "Access Denied: Your account has been banned.");
          }
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then(data => {
        window.currentUser = (data && data.user) ? data.user : null;
        return window.currentUser;
      })
      .catch(() => {
        window.currentUser = null;
        return null;
      });
  }
  return currentUserPromise;
}

async function initAuth() {
  injectAuthModal(); 
  const userIcon = document.getElementById("userIcon");
  const authModal = document.getElementById("authModal");

  const currentUser = await getCurrentUser();

  if (currentUser) {
    // 🚀 NEW: Unhide or inject Admin Garage button on all storefront pages if user is an admin
    if (currentUser.isAdmin) {
      let adminNavBtn = document.getElementById("adminNavBtn");
      if (!adminNavBtn) {
        const navLinks = document.querySelector(".nav-links");
        if (navLinks) {
          adminNavBtn = document.createElement("a");
          adminNavBtn.href = "/admin";
          adminNavBtn.id = "adminNavBtn";
          adminNavBtn.style.color = "var(--accent)";
          adminNavBtn.style.fontWeight = "800";
          adminNavBtn.textContent = "Admin Garage";
          navLinks.appendChild(adminNavBtn);
        }
      } else {
        adminNavBtn.style.display = "inline-block";
      }
    }

    // Auto-fill reviewer name input if present
    const siteNameInput = document.getElementById("reviewerName");
    if (siteNameInput && !siteNameInput.value) siteNameInput.value = currentUser.name;
    const prodNameInput = document.getElementById("prodReviewerName");
    if (prodNameInput && !prodNameInput.value) prodNameInput.value = currentUser.name;
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
      if (window.resetAuthModalToLogin) window.resetAuthModalToLogin();
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
          
          // 🚀 NEW: Check if the user is an admin and redirect them appropriately
          if (data.user && data.user.isAdmin) {
              window.location.href = "/admin"; // Send admins straight to the garage
          } else {
              location.reload(); // Reload for normal users to update nav state
          }
        } else {
          alert(data.message); 
        }
      } catch (err) {
        console.error("Login Error:", err);
      }
    });
  }

  // 🚀 2FA FORGOT PASSWORD FLOW
  let forgotState = { email: '', code: '', resetToken: '' };

  const openForgotLink = document.getElementById("openForgotPasswordLink");
  const backToLoginLink = document.getElementById("backToLoginFromForgot");
  const forgotSection = document.getElementById("forgotPasswordSection");
  const loginSection = document.getElementById("loginSection");
  const registerSection = document.getElementById("registerSection");
  const forgotStep1Form = document.getElementById("forgotStep1Form");
  const forgotStep2Form = document.getElementById("forgotStep2Form");
  const forgotStep3Form = document.getElementById("forgotStep3Form");
  const resendCodeLink = document.getElementById("resendForgotCodeLink");

  function resetForgotPasswordUI() {
    forgotState = { email: '', code: '', resetToken: '' };
    if (forgotStep1Form) {
      forgotStep1Form.reset();
      forgotStep1Form.style.display = "block";
    }
    if (forgotStep2Form) {
      forgotStep2Form.reset();
      forgotStep2Form.style.display = "none";
    }
    if (forgotStep3Form) {
      forgotStep3Form.reset();
      forgotStep3Form.style.display = "none";
    }
  }

  window.resetAuthModalToLogin = function() {
    resetForgotPasswordUI();
    if (forgotSection) forgotSection.style.display = "none";
    if (registerSection) registerSection.style.display = "none";
    if (loginSection) loginSection.style.display = "block";
  };

  if (openForgotLink) {
    openForgotLink.addEventListener("click", () => {
      resetForgotPasswordUI();
      const loginEmailVal = document.getElementById("loginEmail")?.value?.trim();
      if (loginEmailVal) {
        const forgotEmailInput = document.getElementById("forgotEmail");
        if (forgotEmailInput) forgotEmailInput.value = loginEmailVal;
      }
      if (loginSection) loginSection.style.display = "none";
      if (registerSection) registerSection.style.display = "none";
      if (forgotSection) forgotSection.style.display = "block";
    });
  }

  if (backToLoginLink) {
    backToLoginLink.addEventListener("click", () => {
      resetForgotPasswordUI();
      if (forgotSection) forgotSection.style.display = "none";
      if (registerSection) registerSection.style.display = "none";
      if (loginSection) loginSection.style.display = "block";
    });
  }

  if (forgotStep1Form) {
    forgotStep1Form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("forgotEmail").value.trim();
      const btn = document.getElementById("forgotSendCodeBtn");
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Sending Code...";

      try {
        const res = await fetch('/api/auth/forgot-password/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok) {
          forgotState.email = email;
          const emailDisp = document.getElementById("forgotEmailDisplay");
          if (emailDisp) emailDisp.textContent = email;
          forgotStep1Form.style.display = "none";
          forgotStep2Form.style.display = "block";
          alert(data.message || "A 6-digit 2FA verification code has been sent to your email.");
        } else {
          alert(data.message || "Could not send verification code.");
        }
      } catch (err) {
        console.error("Forgot Password Step 1 Error:", err);
        alert("Network error sending verification code.");
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    });
  }

  if (resendCodeLink) {
    resendCodeLink.addEventListener("click", async () => {
      if (!forgotState.email) return;
      try {
        const res = await fetch('/api/auth/forgot-password/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotState.email })
        });
        const data = await res.json();
        alert(data.message || "Verification code resent!");
      } catch (err) {
        alert("Failed to resend code.");
      }
    });
  }

  if (forgotStep2Form) {
    forgotStep2Form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = document.getElementById("forgotOtpCode").value.trim();
      const btn = document.getElementById("forgotVerifyCodeBtn");
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Verifying...";

      try {
        const res = await fetch('/api/auth/forgot-password/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: forgotState.email, code })
        });
        const data = await res.json();
        if (res.ok && data.verified) {
          forgotState.code = code;
          forgotState.resetToken = data.resetToken || '';
          const banner = document.getElementById("forgotVerifiedBanner");
          if (banner && data.userName) {
            banner.textContent = `✅ Identity verified for ${data.userName}! Set your new password below:`;
          }
          forgotStep2Form.style.display = "none";
          forgotStep3Form.style.display = "block";
        } else {
          alert(data.message || "Invalid 2FA verification code.");
        }
      } catch (err) {
        console.error("Forgot Password Step 2 Error:", err);
        alert("Network error verifying 2FA code.");
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    });
  }

  if (forgotStep3Form) {
    forgotStep3Form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById("forgotNewPassword").value;
      const confirmPassword = document.getElementById("forgotConfirmPassword").value;

      if (newPassword !== confirmPassword) {
        alert("Passwords do not match. Please confirm your new password.");
        return;
      }

      const btn = document.getElementById("forgotResetPasswordBtn");
      const origText = btn.textContent;
      btn.disabled = true;
      btn.textContent = "Updating...";

      try {
        const res = await fetch('/api/auth/forgot-password/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: forgotState.email,
            code: forgotState.code,
            resetToken: forgotState.resetToken,
            newPassword
          })
        });
        const data = await res.json();
        if (res.ok) {
          alert(data.message || "Password updated successfully! Please log in.");
          const savedEmail = forgotState.email;
          resetForgotPasswordUI();
          if (forgotSection) forgotSection.style.display = "none";
          if (loginSection) loginSection.style.display = "block";
          const loginEmailInput = document.getElementById("loginEmail");
          if (loginEmailInput && savedEmail) loginEmailInput.value = savedEmail;
        } else {
          alert(data.message || "Failed to update password.");
        }
      } catch (err) {
        console.error("Forgot Password Step 3 Error:", err);
        alert("Network error updating password.");
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
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
              div.style.borderColor = addr.isDefault ? "var(--accent)" : "var(--border-subtle)";
              div.style.borderRadius = "8px";
              div.style.background = addr.isDefault ? "var(--bg-hover)" : "var(--bg-deep)";
              div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.02)";
              
              const badgeOrButton = addr.isDefault 
                ? '<span style="background: rgba(204, 255, 0, 0.1); color: var(--accent); padding: 4px 10px; border-radius: 4px; font-size:0.75em; font-weight:bold; border: 1px solid var(--accent); white-space: nowrap; flex-shrink: 0; text-transform: uppercase; letter-spacing: 0.5px;">Default</span>'
                : `<button type="button" onclick="setDefaultAddress(${addr.id})" style="background: transparent !important; color: #007bff !important; border: none !important; padding: 0 !important; font-size: 0.9em; font-weight: bold; cursor: pointer; width: auto !important; min-width: 0 !important; white-space: nowrap; flex-shrink: 0; text-decoration: none;" onmouseover="this.style.textDecoration='underline'; this.style.color='#0056b3';" onmouseout="this.style.textDecoration='none'; this.style.color='#007bff';">Set as Default</button>`;

              div.innerHTML = `
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; gap: 15px;">
                      <strong style="font-size:1.1em; color: var(--text-main); flex-grow: 1; word-break: break-word;">${addr.firstName} ${addr.lastName}</strong>
                      ${badgeOrButton}
                  </div>
                  <span style="display:block; color: var(--text-muted); margin-bottom: 4px;">${addr.street}</span>
                  <span style="display:block; color: var(--text-muted); margin-bottom: 4px;">${addr.city}, ${addr.governorate}</span>
                  <span style="display:block; color: var(--text-muted); margin-top: 8px;">Phone: ${addr.phone}</span>
              `;
              addrList.appendChild(div);
          });
      } catch(e) { 
          console.error(e); 
          addrList.innerHTML = "<p>Could not load addresses.</p>";
      }
  };
  loadAddresses();

  const showFormBtn = document.getElementById("showFormBtn");
  const cancelFormBtn = document.getElementById("cancelFormBtn");
  const newAddressWrapper = document.getElementById("newAddressWrapper");

  if(showFormBtn && newAddressWrapper) {
      showFormBtn.addEventListener("click", () => {
          newAddressWrapper.style.display = "block";
          showFormBtn.style.display = "none"; 
      });
  }

  if(cancelFormBtn && newAddressWrapper) {
      cancelFormBtn.addEventListener("click", () => {
          newAddressWrapper.style.display = "none";
          showFormBtn.style.display = "block"; 
          document.getElementById("newAddressForm").reset(); 
      });
  }

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
                  
                  if (newAddressWrapper && showFormBtn) {
                      newAddressWrapper.style.display = "none";
                      showFormBtn.style.display = "block";
                  }
                  
                  loadAddresses(); 
              } else {
                  alert("Failed to save address.");
              }
          } catch(e) { alert("Network error. Could not save address."); }
      });
  }

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

  const urlHash = window.location.hash;
  if (urlHash) {
      const targetTab = document.querySelector(`.sidebar-menu a[href="${urlHash}"]`);
      if (targetTab) {
          targetTab.click(); 
      }
  }
}

window.setDefaultAddress = async function(addressId) {
    try {
        const res = await fetch(`/api/addresses/${addressId}/default`, { 
            method: 'PUT' 
        });
        if(res.ok) {
            location.reload(); 
        } else {
            alert("Failed to update default address.");
        }
    } catch(e) {
        console.error("Default Address Error:", e);
    }
};

window.cancelOrder = async function(orderId) {
    if (!confirm(`Are you absolutely sure you want to cancel Order #${orderId}?`)) return;
    
    try {
        const res = await fetch(`/api/orders/me/${orderId}/cancel`, { method: 'PUT' });
        const data = await res.json();
        
        if (res.ok) {
            loadOrderHistory(); 
        } else {
            alert(data.message || "Failed to cancel order.");
        }
    } catch(e) {
        console.error("Cancel Order Error:", e);
        alert("Network error. Could not reach the server.");
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
      
      orderDiv.style.border = "1px solid var(--border-subtle)";
      orderDiv.style.borderRadius = "8px";
      orderDiv.style.padding = "15px";
      orderDiv.style.marginBottom = "20px";
      orderDiv.style.background = "var(--bg-hover)";

      let itemsHtml = '<ul style="margin: 15px 0; padding-left: 20px; color: var(--text-muted); font-size: 0.9em;">';
      if (order.OrderItems && order.OrderItems.length > 0) {
          order.OrderItems.forEach(item => {
              itemsHtml += `<li>${item.quantity}x ${item.name} (Size: ${item.size})</li>`;
          });
      } else {
          itemsHtml += `<li>Items details unavailable</li>`;
      }
      itemsHtml += '</ul>';

      let statusColor = "var(--accent)";
      if (order.status === "Cancelled") statusColor = "#e74c3c";
      if (order.status === "Shipped") statusColor = "#3498db";
      if (order.status === "Delivered") statusColor = "#2ecc71";

      let cancelBtnHtml = '';
      if (order.status === 'Processing') {
          cancelBtnHtml = `<button onclick="cancelOrder(${order.id})" style="background: transparent; color: #e74c3c; border: 1px solid #e74c3c; padding: 6px 12px; border-radius: 4px; font-family: 'Syncopate', sans-serif; font-size: 0.7em; font-weight: bold; cursor: pointer; transition: 0.3s; margin-top: 10px;" onmouseover="this.style.background='#e74c3c'; this.style.color='#fff';" onmouseout="this.style.background='transparent'; this.style.color='#e74c3c';">CANCEL ORDER</button>`;
      }

      orderDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 10px; margin-bottom: 10px;">
          <strong style="color: var(--text-main); font-family: 'Syncopate', sans-serif;">Order #${order.id}</strong>
          <span style="color: var(--text-muted);">${date}</span>
        </div>
        
        ${itemsHtml}
        
        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 15px; border-top: 1px dashed var(--border-subtle); padding-top: 15px;">
          <div>
              <p style="margin: 0 0 5px 0; font-size: 14px; color: var(--text-main);">Status: <strong style="color: ${statusColor};">${order.status || 'Processing'}</strong></p>
              <p style="margin: 0; font-size: 12px; color: var(--text-muted); text-transform: uppercase;">Payment: ${order.paymentMethod || 'Card'}</p>
              ${cancelBtnHtml}
          </div>
          <p style="margin: 0; font-weight: bold; font-family: 'Syncopate', sans-serif; color: var(--text-main); font-size: 1.1em;">Total: LE ${parseFloat(order.totalAmount || order.total).toFixed(2)}</p>
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
let currentSiteReviews = [];
let editingSiteReviewId = null;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function rememberMyReview(type, reviewId) {
  const storageKey = type === 'site' ? 'revvo_my_site_reviews' : 'revvo_my_product_reviews';
  try {
    const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!list.includes(reviewId)) {
      list.push(reviewId);
      localStorage.setItem(storageKey, JSON.stringify(list));
    }
  } catch (e) {}
}

function isClaimedInBrowser(reviewId, type) {
  const storageKey = type === 'site' ? 'revvo_my_site_reviews' : 'revvo_my_product_reviews';
  try {
    const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return list.includes(reviewId);
  } catch (e) {
    return false;
  }
}

function isMyReview(review, type) {
  if (!review) return false;
  // 1. If the review is linked to a registered user account, ONLY that logged-in user owns it
  if (review.UserId) {
    return Boolean(window.currentUser && window.currentUser.id === review.UserId);
  }
  // 2. For legacy/guest reviews without a UserId, check if created in this browser session
  if (isClaimedInBrowser(review.id, type)) {
    return true;
  }
  // 3. Or if logged in and the legacy review name matches the logged-in user's name
  if (window.currentUser && window.currentUser.name && review.reviewerName) {
    const rName = review.reviewerName.trim().toLowerCase();
    const uName = window.currentUser.name.trim().toLowerCase();
    if (rName === uName) return true;
    const rFirst = rName.split(/\s+/)[0];
    const uFirst = uName.split(/\s+/)[0];
    if (rFirst.length >= 3 && rFirst === uFirst) return true;
  }
  return false;
}

function getAdminAuthorBadgeHtml(review) {
  if (!window.currentUser || !window.currentUser.isAdmin) return '';
  if (review.User && review.User.id) {
    const emailPart = review.User.email ? ` &bull; ${escapeHtml(review.User.email)}` : '';
    return `<div style="margin-top: 6px; padding: 4px 8px; background: rgba(52, 152, 219, 0.12); border: 1px solid rgba(52, 152, 219, 0.4); border-radius: 3px; font-size: 11px; color: #3498db; font-family: 'Rajdhani', sans-serif; display: inline-block;">👑 <strong>Account #${review.User.id}:</strong> ${escapeHtml(review.User.name)}${emailPart}</div>`;
  }
  return `<div style="margin-top: 6px; padding: 4px 8px; background: rgba(149, 165, 166, 0.12); border: 1px solid rgba(149, 165, 166, 0.4); border-radius: 3px; font-size: 11px; color: #95a5a6; font-family: 'Rajdhani', sans-serif; display: inline-block;">👑 <strong>Account:</strong> Guest (Unregistered)</div>`;
}

async function loadSiteReviews() {
  const reviewGrid = document.getElementById("dynamic-reviews");
  if (!reviewGrid) return;

  await getCurrentUser();

  try {
    const response = await fetch('/api/site-reviews');
    if (!response.ok) throw new Error("Failed to fetch site reviews");
    const reviews = await response.json();
    reviewGrid.innerHTML = "";

    currentSiteReviews = Array.isArray(reviews) ? reviews : [];
    const sortedReviews = [...currentSiteReviews].sort((a, b) => b.rating - a.rating);

    const renderSiteReviews = (reviewsToRender) => {
      reviewsToRender.forEach(review => {
        const isMine = isMyReview(review, 'site');
        const stars = "⭐".repeat(review.rating);
        const article = document.createElement("article");
        article.className = "review-card";
        article.id = `site-review-${review.id}`;
        article.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px;">
            <h4 style="margin: 0; color: var(--accent);">${stars}</h4>
            ${isMine ? `<button type="button" class="btn-edit-review" onclick="openSiteReviewEdit(${review.id})" style="width: auto !important; margin: 0 !important; background: transparent; color: var(--accent); border: 1px solid var(--accent); padding: 4px 10px; font-size: 11px; font-family: 'Syncopate', sans-serif; font-weight: 700; text-transform: uppercase; cursor: pointer; border-radius: 2px; transition: 0.2s; white-space: nowrap;">✏️ Edit</button>` : ''}
          </div>
          <p class="review-comment" id="site-review-comment-${review.id}">"${escapeHtml(review.comment)}"</p>
          <p style="margin-top: 10px;">
            <strong>- ${escapeHtml(review.reviewerName)}</strong>
            ${isMine ? `<span style="font-size: 0.8em; color: var(--accent); font-weight: bold; margin-left: 6px;">(Your Review)</span>` : ''}
          </p>
          ${getAdminAuthorBadgeHtml(review)}
        `;
        reviewGrid.appendChild(article);
      });
    };

    // Show Top 3 reviews initially
    const initialSiteReviews = sortedReviews.slice(0, 3);
    renderSiteReviews(initialSiteReviews);

    // "See All Reviews" button when there are more than 3 reviews
    if (sortedReviews.length > 3) {
      const btnWrapper = document.createElement("div");
      btnWrapper.style.width = "100%";
      btnWrapper.style.flexBasis = "100%";
      btnWrapper.style.textAlign = "center";
      btnWrapper.style.marginTop = "20px";

      const showAllBtn = document.createElement("button");
      showAllBtn.type = "button";
      showAllBtn.innerText = "See All Reviews";
      showAllBtn.style.padding = "12px 28px";
      showAllBtn.style.background = "transparent";
      showAllBtn.style.color = "var(--accent)";
      showAllBtn.style.border = "2px solid var(--accent)";
      showAllBtn.style.cursor = "pointer";
      showAllBtn.style.borderRadius = "0";
      showAllBtn.style.fontFamily = "'Syncopate', sans-serif";
      showAllBtn.style.textTransform = "uppercase";
      showAllBtn.style.fontWeight = "700";
      showAllBtn.style.fontSize = "12px";
      showAllBtn.style.width = "auto";
      showAllBtn.style.margin = "0 auto";

      showAllBtn.onclick = () => {
        const remainingSiteReviews = sortedReviews.slice(3);
        renderSiteReviews(remainingSiteReviews);
        btnWrapper.style.display = "none";
      };

      btnWrapper.appendChild(showAllBtn);
      reviewGrid.appendChild(btnWrapper);
    }

    populateSitePastReviewSelector();
  } catch (err) {
    console.error("Reviews Load Error:", err);
    reviewGrid.innerHTML = "<p>Could not load reviews at this time.</p>";
  }
}

function populateSitePastReviewSelector() {
  const form = document.getElementById("siteReviewForm");
  if (!form) return;

  let selectorBox = document.getElementById("sitePastReviewSelectorBox");
  if (!selectorBox) {
    selectorBox = document.createElement("div");
    selectorBox.id = "sitePastReviewSelectorBox";
    selectorBox.style.cssText = "margin-bottom: 10px; padding: 12px; background: var(--bg-card); border: 1px solid var(--border-subtle); text-align: left;";
    form.parentNode.insertBefore(selectorBox, form);
  }

  const myReviews = (currentSiteReviews || []).filter(r => isMyReview(r, 'site'));
  if (myReviews.length === 0) {
    selectorBox.style.display = "none";
    return;
  }

  selectorBox.style.display = "block";
  const optionsHtml = myReviews.map(r => {
    const snippet = r.comment.length > 35 ? r.comment.slice(0, 35) + '...' : r.comment;
    return `<option value="${r.id}" ${editingSiteReviewId === r.id ? 'selected' : ''}>${escapeHtml(r.reviewerName)} - ${"⭐".repeat(r.rating)} "${escapeHtml(snippet)}"</option>`;
  }).join('');

  selectorBox.innerHTML = `
    <label for="sitePastReviewSelect" style="display: block; font-family: 'Syncopate', sans-serif; font-size: 11px; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; font-weight: 700;">
      ✏️ Edit Your Past Review:
    </label>
    <select id="sitePastReviewSelect" style="width: 100%; padding: 10px; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-subtle); font-family: 'Rajdhani', sans-serif; font-size: 15px;">
      <option value="">-- Write a New Review --</option>
      ${optionsHtml}
    </select>
  `;

  const selectEl = document.getElementById("sitePastReviewSelect");
  selectEl.addEventListener("change", () => {
    const val = parseInt(selectEl.value);
    if (!val) {
      resetSiteReviewFormMode();
    } else {
      startSiteReviewFormEdit(val);
    }
  });
}

// 🚀 CLICKABLE STAR RATING WIDGET HELPER
window.setStarRating = function(inputId, ratingValue) {
  const rating = Math.max(1, Math.min(5, parseInt(ratingValue) || 5));
  const inputEl = document.getElementById(inputId);
  if (inputEl) inputEl.value = String(rating);

  const container = document.getElementById(`stars-for-${inputId}`);
  if (!container) return;
  container.dataset.rating = String(rating);

  const paintStars = (activeCount) => {
    const stars = container.querySelectorAll('.clickable-star');
    stars.forEach(star => {
      const val = parseInt(star.dataset.value);
      if (val <= activeCount) {
        star.style.color = '#f1c40f';
        star.style.textShadow = '0 0 8px rgba(241, 196, 15, 0.45)';
        star.style.transform = 'scale(1.08)';
      } else {
        star.style.color = 'rgba(150, 150, 150, 0.35)';
        star.style.textShadow = 'none';
        star.style.transform = 'scale(1)';
      }
    });
  };

  if (!container.dataset.initialized) {
    container.dataset.initialized = 'true';
    container.innerHTML = [1, 2, 3, 4, 5].map(num => `
      <span class="clickable-star" data-value="${num}" title="${num} Star${num > 1 ? 's' : ''}" style="font-size: 24px; cursor: pointer; user-select: none; transition: transform 0.15s ease, color 0.15s ease; line-height: 1; display: inline-block;">★</span>
    `).join('');

    container.querySelectorAll('.clickable-star').forEach(star => {
      star.addEventListener('mouseenter', () => {
        paintStars(parseInt(star.dataset.value));
      });
      star.addEventListener('click', () => {
        const chosen = parseInt(star.dataset.value);
        window.setStarRating(inputId, chosen);
      });
    });

    container.addEventListener('mouseleave', () => {
      paintStars(parseInt(container.dataset.rating) || 5);
    });
  }

  paintStars(rating);
};

function ensureStarPickerForInput(inputId, defaultRating = 5) {
  const existingEl = document.getElementById(inputId);
  if (existingEl && existingEl.tagName === 'SELECT') {
    const wrapper = document.createElement('div');
    wrapper.className = 'star-rating-picker';
    wrapper.style.cssText = 'display: flex; align-items: center; justify-content: space-between; padding: 12px 15px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 4px;';
    wrapper.innerHTML = `
      <span style="font-family: 'Syncopate', sans-serif; font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Your Rating</span>
      <div class="star-buttons" id="stars-for-${inputId}" style="display: flex; gap: 6px; align-items: center;"></div>
    `;
    const hidden = document.createElement('input');
    hidden.type = 'hidden';
    hidden.id = inputId;
    hidden.value = String(defaultRating);
    existingEl.replaceWith(wrapper, hidden);
  }
  window.setStarRating(inputId, defaultRating);
}

function startSiteReviewFormEdit(reviewId) {
  const review = currentSiteReviews.find(r => r.id === reviewId);
  if (!review || !isMyReview(review, 'site')) return;
  editingSiteReviewId = review.id;

  const nameInput = document.getElementById("reviewerName");
  const commentInput = document.getElementById("reviewComment");
  const form = document.getElementById("siteReviewForm");

  if (nameInput) nameInput.value = review.reviewerName;
  window.setStarRating("reviewRating", review.rating);
  if (commentInput) commentInput.value = review.comment;

  const pastSelect = document.getElementById("sitePastReviewSelect");
  if (pastSelect) pastSelect.value = String(review.id);

  if (form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "Update My Review";

    let cancelBtn = document.getElementById("cancelSiteFormEditBtn");
    if (!cancelBtn) {
      cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.id = "cancelSiteFormEditBtn";
      cancelBtn.textContent = "Cancel Edit";
      cancelBtn.style.cssText = "padding: 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border-subtle); font-family: 'Syncopate', sans-serif; font-size: 12px; font-weight: 700; text-transform: uppercase; cursor: pointer; margin-top: 0;";
      cancelBtn.onclick = resetSiteReviewFormMode;
      form.appendChild(cancelBtn);
    }
  }
}

function resetSiteReviewFormMode() {
  editingSiteReviewId = null;
  const form = document.getElementById("siteReviewForm");
  if (form) {
    form.reset();
    window.setStarRating("reviewRating", 5);
    if (window.currentUser && window.currentUser.name) {
      const nameInput = document.getElementById("reviewerName");
      if (nameInput) nameInput.value = window.currentUser.name;
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "Submit Feedback";
  }
  const cancelBtn = document.getElementById("cancelSiteFormEditBtn");
  if (cancelBtn) cancelBtn.remove();
  const pastSelect = document.getElementById("sitePastReviewSelect");
  if (pastSelect) pastSelect.value = "";
}

window.openSiteReviewEdit = function(reviewId) {
  const review = currentSiteReviews.find(r => r.id === reviewId);
  if (!review || !isMyReview(review, 'site')) return;
  const card = document.getElementById(`site-review-${reviewId}`);
  if (!card) return;

  card.dataset.origHtml = card.innerHTML;
  const ratingInputId = `edit-site-rating-${reviewId}`;

  card.innerHTML = `
    <div class="review-edit-box" style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
      <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap;">
        <span style="font-family: 'Syncopate', sans-serif; font-size: 11px; font-weight: bold; color: var(--accent); text-transform: uppercase;">Edit Your Review</span>
        <div class="star-buttons" id="stars-for-${ratingInputId}" style="display: flex; gap: 6px; align-items: center;"></div>
        <input type="hidden" id="${ratingInputId}" value="${review.rating}" />
      </div>
      <input type="text" id="edit-site-name-${reviewId}" value="${escapeHtml(review.reviewerName)}" placeholder="Your Name" style="width: 100%; padding: 8px 10px; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 15px;" required />
      <textarea id="edit-site-comment-${reviewId}" rows="3" style="width: 100%; padding: 10px; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 15px; resize: vertical;" required>${escapeHtml(review.comment)}</textarea>
      <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px;">
        <button type="button" onclick="cancelSiteReviewEdit(${reviewId})" style="width: auto !important; margin: 0 !important; background: transparent; color: var(--text-muted); border: 1px solid var(--border-subtle); padding: 6px 14px; font-size: 11px; font-family: 'Syncopate', sans-serif; font-weight: 700; text-transform: uppercase; cursor: pointer; border-radius: 2px;">Cancel</button>
        <button type="button" onclick="saveSiteReviewEdit(${reviewId})" style="width: auto !important; margin: 0 !important; background: var(--accent); color: var(--bg-deep); border: 1px solid var(--accent); padding: 6px 14px; font-size: 11px; font-family: 'Syncopate', sans-serif; font-weight: 700; text-transform: uppercase; cursor: pointer; border-radius: 2px;">Save</button>
      </div>
    </div>
  `;
  window.setStarRating(ratingInputId, review.rating);
};

window.cancelSiteReviewEdit = function(reviewId) {
  const card = document.getElementById(`site-review-${reviewId}`);
  if (card && card.dataset.origHtml) {
    card.innerHTML = card.dataset.origHtml;
  }
};

window.saveSiteReviewEdit = async function(reviewId) {
  const ratingEl = document.getElementById(`edit-site-rating-${reviewId}`);
  const commentEl = document.getElementById(`edit-site-comment-${reviewId}`);
  const nameEl = document.getElementById(`edit-site-name-${reviewId}`);
  if (!commentEl || !commentEl.value.trim()) {
    alert("Review comment cannot be empty.");
    return;
  }

  const newRating = parseInt(ratingEl.value);
  const newComment = commentEl.value.trim();
  const newName = nameEl && nameEl.value.trim() ? nameEl.value.trim() : undefined;

  try {
    const res = await fetch(`/api/site-reviews/${reviewId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating: newRating,
        comment: newComment,
        reviewerName: newName,
        claimedByBrowser: isClaimedInBrowser(reviewId, 'site')
      })
    });
    const data = await res.json();
    if (res.ok) {
      rememberMyReview('site', reviewId);
      alert("✅ Your review was updated successfully!");
      loadSiteReviews();
    } else {
      alert(data.error || "Failed to update review.");
    }
  } catch (err) {
    console.error("Save site review error:", err);
    alert("Network error updating review.");
  }
};

function initSiteReviewForm() {
  const form = document.getElementById("siteReviewForm");
  if (!form) return;

  ensureStarPickerForInput("reviewRating", 5);

  // Auto-fill reviewer name if logged in
  if (window.currentUser && window.currentUser.name) {
    const nameInput = document.getElementById("reviewerName");
    if (nameInput && !nameInput.value) nameInput.value = window.currentUser.name;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("reviewerName").value;
    const rating = document.getElementById("reviewRating").value;
    const comment = document.getElementById("reviewComment").value;

    try {
      if (editingSiteReviewId) {
        const res = await fetch(`/api/site-reviews/${editingSiteReviewId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewerName: name,
            rating: parseInt(rating),
            comment: comment,
            claimedByBrowser: isClaimedInBrowser(editingSiteReviewId, 'site')
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          rememberMyReview('site', editingSiteReviewId);
          alert("✅ Your review was updated successfully!");
          resetSiteReviewFormMode();
          loadSiteReviews();
        } else {
          alert(data.error || "Failed to update review.");
        }
        return;
      }

      const response = await fetch('/api/site-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerName: name, rating: parseInt(rating), comment: comment })
      });
      if (response.ok) {
        const created = await response.json();
        if (created && created.id) {
          rememberMyReview('site', created.id);
        }
        alert("Thank you for your review!");
        form.reset();
        window.setStarRating("reviewRating", 5);
        if (window.currentUser) {
          const siteNameInput = document.getElementById("reviewerName");
          if (siteNameInput) siteNameInput.value = window.currentUser.name;
        }
        loadSiteReviews();
      } else {
        alert("Failed to submit review.");
      }
    } catch (err) {
      console.error("Failed to post review:", err);
    }
  });
}

// =====================
// 5.9 DYNAMIC PRODUCT REVIEWS
// =====================
let currentProductReviews = [];
let editingProductReviewId = null;

async function loadProductReviews(productId) {
  const reviewGrid = document.getElementById("dynamic-product-reviews");
  if (!reviewGrid) return;

  await getCurrentUser();

  try {
    const response = await fetch(`/api/products/${productId}/reviews`);
    if (!response.ok) throw new Error("Failed to fetch product reviews");
    const reviews = await response.json();
    reviewGrid.innerHTML = "";

    currentProductReviews = Array.isArray(reviews) ? reviews : [];
    populateProductPastReviewSelector(productId);

    if (currentProductReviews.length === 0) {
      reviewGrid.innerHTML = "<p style='color: var(--text-muted);'>No reviews yet. Be the first to review this tee!</p>";
      return;
    }

    const sortedReviews = [...currentProductReviews].sort((a, b) => b.rating - a.rating);

    const renderProductReviews = (reviewsToRender) => {
      reviewsToRender.forEach(review => {
        const isMine = isMyReview(review, 'product');
        const stars = "⭐".repeat(review.rating);
        const article = document.createElement("article");
        article.className = "detailed-review-row";
        article.id = `prod-review-${review.id}`;
        article.innerHTML = `
          <div class="reviewer-profile" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div class="avatar">👤</div>
              <span class="reviewer-name">${escapeHtml(review.reviewerName)}</span>
              ${isMine ? `<span style="font-size: 0.8em; color: var(--accent); font-weight: bold; margin-left: 4px;">(Your Review)</span>` : ''}
            </div>
            ${isMine ? `<button type="button" class="btn-edit-prod-review" onclick="openProductReviewEdit(${review.id}, ${productId})" style="width: auto !important; margin: 0 !important; background: transparent; color: var(--accent); border: 1px solid var(--accent); padding: 4px 10px; font-size: 11px; font-family: 'Syncopate', sans-serif; font-weight: 700; text-transform: uppercase; cursor: pointer; border-radius: 2px; transition: 0.2s; white-space: nowrap;">✏️ Edit</button>` : ''}
          </div>
          <div class="review-rating-row">
            <span class="review-stars">${stars}</span>
            <span class="verified-purchase">Verified Purchase</span>
          </div>
          <p class="review-text">"${escapeHtml(review.comment)}"</p>
          ${getAdminAuthorBadgeHtml(review)}
        `;
        reviewGrid.appendChild(article);
      });
    };

    // Show Top 3 reviews initially
    const initialReviews = sortedReviews.slice(0, 3);
    renderProductReviews(initialReviews);

    // "See All Reviews" button when there are more than 3 reviews
    if (sortedReviews.length > 3) {
      const btnWrapper = document.createElement("div");
      btnWrapper.style.textAlign = "center";
      btnWrapper.style.marginTop = "20px";

      const showAllBtn = document.createElement("button");
      showAllBtn.type = "button";
      showAllBtn.innerText = "See All Reviews";
      showAllBtn.style.padding = "12px 28px";
      showAllBtn.style.background = "transparent";
      showAllBtn.style.color = "var(--accent)";
      showAllBtn.style.border = "2px solid var(--accent)";
      showAllBtn.style.cursor = "pointer";
      showAllBtn.style.borderRadius = "0";
      showAllBtn.style.fontFamily = "'Syncopate', sans-serif";
      showAllBtn.style.textTransform = "uppercase";
      showAllBtn.style.fontWeight = "700";
      showAllBtn.style.fontSize = "12px";
      showAllBtn.style.width = "auto";
      showAllBtn.style.margin = "0 auto";

      showAllBtn.onclick = () => {
        const remainingReviews = sortedReviews.slice(3);
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

function populateProductPastReviewSelector(productId) {
  const form = document.getElementById("productReviewForm");
  if (!form) return;

  let selectorBox = document.getElementById("prodPastReviewSelectorBox");
  if (!selectorBox) {
    selectorBox = document.createElement("div");
    selectorBox.id = "prodPastReviewSelectorBox";
    selectorBox.style.cssText = "margin-bottom: 15px; padding: 12px; background: var(--bg-deep); border: 1px solid var(--border-subtle); border-radius: 4px; text-align: left;";
    form.parentNode.insertBefore(selectorBox, form);
  }

  const myReviews = (currentProductReviews || []).filter(r => isMyReview(r, 'product'));
  if (myReviews.length === 0) {
    selectorBox.style.display = "none";
    return;
  }

  selectorBox.style.display = "block";
  const optionsHtml = myReviews.map(r => {
    const snippet = r.comment.length > 30 ? r.comment.slice(0, 30) + '...' : r.comment;
    return `<option value="${r.id}" ${editingProductReviewId === r.id ? 'selected' : ''}>${escapeHtml(r.reviewerName)} - ${"⭐".repeat(r.rating)} "${escapeHtml(snippet)}"</option>`;
  }).join('');

  selectorBox.innerHTML = `
    <label for="prodPastReviewSelect" style="display: block; font-family: 'Syncopate', sans-serif; font-size: 11px; color: var(--accent); text-transform: uppercase; margin-bottom: 8px; font-weight: 700;">
      ✏️ Edit Your Past Review:
    </label>
    <select id="prodPastReviewSelect" style="width: 100%; padding: 10px; background: var(--bg-hover); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 15px;">
      <option value="">-- Write a New Review --</option>
      ${optionsHtml}
    </select>
  `;

  const selectEl = document.getElementById("prodPastReviewSelect");
  selectEl.addEventListener("change", () => {
    const val = parseInt(selectEl.value);
    if (!val) {
      resetProductReviewFormMode();
    } else {
      startProductReviewFormEdit(val);
    }
  });
}

function startProductReviewFormEdit(reviewId) {
  const review = currentProductReviews.find(r => r.id === reviewId);
  if (!review || !isMyReview(review, 'product')) return;
  editingProductReviewId = review.id;

  const nameInput = document.getElementById("prodReviewerName");
  const commentInput = document.getElementById("prodReviewComment");
  const form = document.getElementById("productReviewForm");

  if (nameInput) nameInput.value = review.reviewerName;
  window.setStarRating("prodReviewRating", review.rating);
  if (commentInput) commentInput.value = review.comment;

  const pastSelect = document.getElementById("prodPastReviewSelect");
  if (pastSelect) pastSelect.value = String(review.id);

  if (form) {
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "Update My Review";

    let cancelBtn = document.getElementById("cancelProdFormEditBtn");
    if (!cancelBtn) {
      cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.id = "cancelProdFormEditBtn";
      cancelBtn.textContent = "Cancel Edit";
      cancelBtn.style.cssText = "padding: 12px; background: transparent; color: var(--text-muted); border: 1px solid var(--border-subtle); font-family: 'Syncopate', sans-serif; font-size: 12px; font-weight: 700; text-transform: uppercase; cursor: pointer; margin-top: 0;";
      cancelBtn.onclick = resetProductReviewFormMode;
      form.appendChild(cancelBtn);
    }
  }
}

function resetProductReviewFormMode() {
  editingProductReviewId = null;
  const form = document.getElementById("productReviewForm");
  if (form) {
    form.reset();
    window.setStarRating("prodReviewRating", 5);
    if (window.currentUser && window.currentUser.name) {
      const nameInput = document.getElementById("prodReviewerName");
      if (nameInput) nameInput.value = window.currentUser.name;
    }
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = "Write a customer review";
  }
  const cancelBtn = document.getElementById("cancelProdFormEditBtn");
  if (cancelBtn) cancelBtn.remove();
  const pastSelect = document.getElementById("prodPastReviewSelect");
  if (pastSelect) pastSelect.value = "";
}

window.openProductReviewEdit = function(reviewId, productId) {
  const review = currentProductReviews.find(r => r.id === reviewId);
  if (!review || !isMyReview(review, 'product')) return;
  const row = document.getElementById(`prod-review-${reviewId}`);
  if (!row) return;

  row.dataset.origHtml = row.innerHTML;
  const ratingInputId = `edit-prod-rating-${reviewId}`;

  row.innerHTML = `
    <div class="review-edit-box" style="display: flex; flex-direction: column; gap: 12px; width: 100%; background: var(--bg-hover); padding: 20px; border-radius: 4px; border: 1px solid var(--border-subtle); margin-top: 10px;">
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <span style="font-family: 'Syncopate', sans-serif; font-size: 12px; font-weight: bold; color: var(--accent); text-transform: uppercase;">Edit Your Product Review</span>
        <div class="star-buttons" id="stars-for-${ratingInputId}" style="display: flex; gap: 6px; align-items: center;"></div>
        <input type="hidden" id="${ratingInputId}" value="${review.rating}" />
      </div>
      <input type="text" id="edit-prod-name-${reviewId}" value="${escapeHtml(review.reviewerName)}" placeholder="Your Name" style="width: 100%; padding: 10px 12px; background: var(--bg-deep); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 15px;" required />
      <textarea id="edit-prod-comment-${reviewId}" rows="4" style="width: 100%; padding: 12px; background: var(--bg-deep); color: var(--text-main); border: 1px solid var(--border-subtle); border-radius: 4px; font-family: 'Rajdhani', sans-serif; font-size: 16px; resize: vertical;" required>${escapeHtml(review.comment)}</textarea>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button type="button" onclick="cancelProductReviewEdit(${reviewId})" style="width: auto !important; margin: 0 !important; background: transparent; color: var(--text-muted); border: 1px solid var(--border-subtle); padding: 8px 16px; font-size: 11px; font-family: 'Syncopate', sans-serif; font-weight: 700; text-transform: uppercase; cursor: pointer; border-radius: 2px;">Cancel</button>
        <button type="button" onclick="saveProductReviewEdit(${reviewId}, ${productId})" style="width: auto !important; margin: 0 !important; background: var(--accent); color: var(--bg-deep); border: 1px solid var(--accent); padding: 8px 16px; font-size: 11px; font-family: 'Syncopate', sans-serif; font-weight: 700; text-transform: uppercase; cursor: pointer; border-radius: 2px;">Save Changes</button>
      </div>
    </div>
  `;
  window.setStarRating(ratingInputId, review.rating);
};

window.cancelProductReviewEdit = function(reviewId) {
  const row = document.getElementById(`prod-review-${reviewId}`);
  if (row && row.dataset.origHtml) {
    row.innerHTML = row.dataset.origHtml;
  }
};

window.saveProductReviewEdit = async function(reviewId, productId) {
  const ratingEl = document.getElementById(`edit-prod-rating-${reviewId}`);
  const commentEl = document.getElementById(`edit-prod-comment-${reviewId}`);
  const nameEl = document.getElementById(`edit-prod-name-${reviewId}`);
  if (!commentEl || !commentEl.value.trim()) {
    alert("Review comment cannot be empty.");
    return;
  }

  const newRating = parseInt(ratingEl.value);
  const newComment = commentEl.value.trim();
  const newName = nameEl && nameEl.value.trim() ? nameEl.value.trim() : undefined;

  try {
    const res = await fetch(`/api/products/${productId}/reviews/${reviewId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating: newRating,
        comment: newComment,
        reviewerName: newName,
        claimedByBrowser: isClaimedInBrowser(reviewId, 'product')
      })
    });
    const data = await res.json();
    if (res.ok) {
      rememberMyReview('product', reviewId);
      alert("✅ Your review was updated successfully!");
      loadProductReviews(productId);
    } else {
      alert(data.error || "Failed to update review.");
    }
  } catch (err) {
    console.error("Save product review error:", err);
    alert("Network error updating product review.");
  }
};

function initProductReviewForm(productId) {
  const form = document.getElementById("productReviewForm");
  if (!form) return;

  ensureStarPickerForInput("prodReviewRating", 5);

  // Auto-fill reviewer name if logged in
  if (window.currentUser && window.currentUser.name) {
    const nameInput = document.getElementById("prodReviewerName");
    if (nameInput && !nameInput.value) nameInput.value = window.currentUser.name;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("prodReviewerName").value;
    const rating = document.getElementById("prodReviewRating").value;
    const comment = document.getElementById("prodReviewComment").value;

    try {
      if (editingProductReviewId) {
        const res = await fetch(`/api/products/${productId}/reviews/${editingProductReviewId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reviewerName: name,
            rating: parseInt(rating),
            comment: comment,
            claimedByBrowser: isClaimedInBrowser(editingProductReviewId, 'product')
          })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          rememberMyReview('product', editingProductReviewId);
          alert("✅ Your review was updated successfully!");
          resetProductReviewFormMode();
          loadProductReviews(productId);
        } else {
          alert(data.error || "Failed to update product review.");
        }
        return;
      }

      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerName: name, rating: parseInt(rating), comment: comment })
      });
      if (response.ok) {
        const created = await response.json();
        if (created && created.id) {
          rememberMyReview('product', created.id);
        }
        alert("Thanks for your review!");
        form.reset();
        window.setStarRating("prodReviewRating", 5);
        if (window.currentUser) {
          const prodNameInput = document.getElementById("prodReviewerName");
          if (prodNameInput) prodNameInput.value = window.currentUser.name;
        }
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
  initThemeToggle(); // Initializes the Dark/Light Mode Engine
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
        if (window.resetAuthModalToLogin) window.resetAuthModalToLogin();
        authModal.style.display = "none";
    }
});

// ==========================================
// ACCOUNT SETTINGS LOGIC
// ==========================================
const settingsForm = document.getElementById('accountSettingsForm');
if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('updateEmail').value;
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;

        try {
            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, currentPassword, newPassword })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                alert("Account updated securely!");
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
            } else {
                alert(data.message || "Failed to update account.");
            }
        } catch (err) {
            alert("Network error.");
        }
    });
}