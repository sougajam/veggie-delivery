let allProducts = [];
let cart = [];
let currentUser = localStorage.getItem("currentUser");

document.addEventListener("DOMContentLoaded", () => {
  fetchProducts();
  updateNavUser();

  // Search Bar Logic
  document.getElementById("search-input")?.addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase().trim();
    const filtered = allProducts.filter((p) =>
      p.name.toLowerCase().includes(term),
    );
    displayProducts(filtered);
  });

  // Customer Login Logic
  document
    .getElementById("customer-login-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = document.getElementById("login-username").value;
      const password = document.getElementById("login-password").value;

      try {
        const res = await fetch(
          "https://veggie-delivery-hpeo.onrender.com/api/login", // 👈 FIX IS HERE,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          },
        );

        if (res.ok) {
          const data = await res.json();
          currentUser = data.username;
          localStorage.setItem("currentUser", currentUser);
          toggleCustomerLogin();
          updateNavUser();
          alert(`Welcome back, ${currentUser}!`);
        } else {
          alert("Invalid username or password.");
        }
      } catch (err) {
        alert("Server error.");
      }
    });
});

// ==========================================
// FETCH & DISPLAY PRODUCTS
// ==========================================
async function fetchProducts() {
  try {
    console.log("Attempting to fetch products...");
    const res = await fetch(
      "https://veggie-delivery-hpeo.onrender.com/api/products",
    );

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new TypeError("Oops, we haven't got JSON!");
    }

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Unknown server error");
    }

    allProducts = data;
    console.log("Products loaded successfully:", allProducts);
    displayProducts(allProducts);
  } catch (err) {
    console.error("Fetch Error:", err);
    document.getElementById("product-container").innerHTML = `
            <div style="color: red; padding: 20px; font-weight: bold;">
                Error loading products: ${err.message}. 
            </div>
        `;
  }
}

function displayProducts(products) {
  const container = document.getElementById("product-container");
  container.innerHTML = ""; // Clear out old data

  products.forEach((p) => {
    // 1. Failsafe: If the database has no image, use a placeholder
    const safeImage = p.image
      ? p.image
      : "https://via.placeholder.com/200?text=No+Image";

    // 2. Create the card
    const card = document.createElement("div");
    card.className = "product-card";

    // 3. Inject the ACTUAL HTML tags!
    card.innerHTML = `
            <img src="${safeImage}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/200?text=Broken+Link'">
            <h3>${p.name}</h3>
            <p class="price">₹${p.price.toFixed(2)}</p>
            <button class="amazon-btn" onclick="addToCart(${p.id})">Add to Cart</button>
        `;

    container.appendChild(card);
  });
}

// ==========================================
// FILTER LOGIC
// ==========================================
function filterCategory(selectedCategory) {
  // 1. Update button colors safely (From Code 2)
  const buttons = document.querySelectorAll(".category-btn");
  buttons.forEach((btn) => {
    if (btn.innerText.trim() === selectedCategory.trim()) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  // 2. Filter the products safely (From Code 2)
  if (selectedCategory === "All") {
    displayProducts(allProducts);
  } else {
    const filteredProducts = allProducts.filter((product) => {
      // Grab the category from the database, make it lowercase, remove spaces
      const dbCategory = (product.category || "").toLowerCase().trim();

      // Do the exact same to the button we clicked
      const buttonCategory = selectedCategory.toLowerCase().trim();

      return dbCategory === buttonCategory;
    });

    // Send the filtered list to the screen
    displayProducts(filteredProducts);
  }
}

// ==========================================
// 1. MODAL TOGGLES & UI UPDATES
// ==========================================

function toggleCustomerLogin() {
  if (currentUser) {
    openProfile(); // 🆕 Opens the profile dashboard instead of the ugly logout prompt
    return;
  }
  const modal = document.getElementById("login-modal");
  modal.style.display = modal.style.display === "none" ? "flex" : "none";
}

function toggleRegister() {
  const modal = document.getElementById("register-modal");
  modal.style.display = modal.style.display === "none" ? "flex" : "none";
}

function switchToRegister() {
  document.getElementById("login-modal").style.display = "none";
  document.getElementById("register-modal").style.display = "flex";
}

function switchToLogin() {
  document.getElementById("register-modal").style.display = "none";
  document.getElementById("login-modal").style.display = "flex";
}

// 🛠️ FIXED: Visual separation for logged-in users
function updateNavUser() {
  const accBtn = document.getElementById("account-btn");
  if (currentUser) {
    accBtn.innerHTML = `<small>Welcome,</small><strong>${currentUser}</strong>`;
    accBtn.style.color = "#febd69"; // Amazon yellow text for active user
  } else {
    accBtn.innerHTML = `<small>Hello, sign in</small>
    <strong>Account & Lists</strong>`;
    accBtn.style.color = "white";
  }
}
// ==========================================
// PROFILE MANAGEMENT
// ==========================================

async function openProfile() {
  const modal = document.getElementById("profile-modal");
  modal.style.display = "flex";

  // Fetch the user's latest data from the server
  try {
    const res = await fetch(
      `https://veggie-delivery-hpeo.onrender.com/api/profile/${currentUser}`,
    );
    if (res.ok) {
      const data = await res.json();
      document.getElementById("prof-phone").value = data.phone || "";
      document.getElementById("prof-address").value = data.address || "";
      document.getElementById("prof-gps").value = data.gps || "";
    }
  } catch (err) {
    console.error("Failed to load profile details", err);
  }
}

function toggleProfile() {
  document.getElementById("profile-modal").style.display = "none";
}

function fetchProfileGPS() {
  const gpsInput = document.getElementById("prof-gps");
  gpsInput.placeholder = "Locating...";

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        gpsInput.value = `${position.coords.latitude}, ${position.coords.longitude}`;
      },
      (error) => {
        alert("⚠️ Location access denied or unavailable.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();
  const phone = document.getElementById("prof-phone").value.trim();
  const address = document.getElementById("prof-address").value.trim();
  const gps = document.getElementById("prof-gps").value.trim();
  const btn = e.target.querySelector("button");
  btn.innerText = "Saving...";

  try {
    const res = await fetch(
      `https://veggie-delivery-hpeo.onrender.com/api/profile/${currentUser}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, address, gps }),
      },
    );

    if (res.ok) {
      alert("✅ Profile updated successfully!");
      toggleProfile();
    } else {
      alert("❌ Failed to update profile.");
    }
  } catch (err) {
    alert("⚠️ Server error.");
  } finally {
    btn.innerText = "Save Changes";
  }
}

function logoutCustomer() {
  if (confirm("Are you sure you want to log out?")) {
    currentUser = null;
    localStorage.removeItem("currentUser");
    cart = [];
    updateCartUI();
    updateNavUser();
    toggleProfile();
  }
}
// ==========================================
// 2. FORM SUBMISSION (LOGIN & REGISTER)
// ==========================================

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const btn = e.target.querySelector("button");
  btn.innerText = "Signing in...";

  try {
    const res = await fetch(
      "https://veggie-delivery-hpeo.onrender.com/api/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      },
    );

    if (res.ok) {
      const data = await res.json();
      currentUser = data.username;
      localStorage.setItem("currentUser", currentUser);

      e.target.reset();

      // 🛠️ FIXED: Directly hide the modal instead of running the toggle logic
      document.getElementById("login-modal").style.display = "none";

      updateNavUser();
    } else {
      alert("❌ Invalid username or password.");
    }
  } catch (err) {
    alert("⚠️ Server error.");
  } finally {
    btn.innerText = "Continue";
  }
}

function fetchGPS() {
  const gpsInput = document.getElementById("reg-gps");
  gpsInput.placeholder = "Locating... (Please click 'Allow' if prompted)";

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        gpsInput.value = `${lat}, ${lng}`;
      },
      (error) => {
        console.error("GPS Error:", error);
        let errorMsg = "Location access denied.";

        // Tell us exactly WHY it failed
        if (error.code === 1) errorMsg = "Permission denied by browser.";
        if (error.code === 2)
          errorMsg = "Position unavailable (Device location is off).";
        if (error.code === 3) errorMsg = "Request timed out.";

        alert("⚠️ " + errorMsg);
        gpsInput.placeholder = errorMsg;
      },
      // Options to make it more reliable
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  } else {
    alert("Geolocation is not supported by your browser.");
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById("reg-username").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const address = document.getElementById("reg-address").value.trim();
  const gps = document.getElementById("reg-gps").value.trim(); // 🆕 Grab GPS
  const password = document.getElementById("reg-password").value.trim();
  const btn = e.target.querySelector("button");

  // Double-check failsafe just in case HTML 'required' is bypassed
  if (!gps) return alert("You must provide your GPS location to register.");

  btn.innerText = "Creating account...";

  try {
    const res = await fetch(
      "https://veggie-delivery-hpeo.onrender.com/api/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, phone, address, gps, password }), // 🆕 Send GPS
      },
    );

    if (res.ok) {
      currentUser = username;
      localStorage.setItem("currentUser", currentUser);

      e.target.reset();
      document.getElementById("register-modal").style.display = "none";
      updateNavUser();
    } else {
      const data = await res.json();
      alert(`❌ ${data.error || "Registration failed."}`);
    }
  } catch (err) {
    alert("⚠️ Server error.");
  } finally {
    btn.innerText = "Create your FreshCart account";
  }
}
// ==========================================
// 3. CART LOGIC
// ==========================================
function toggleCart() {
  const modal = document.getElementById("cart-modal");
  modal.style.display = modal.style.display === "none" ? "flex" : "none";
}

function addToCart(id) {
  if (!currentUser) {
    alert("Please sign in to add items to your cart!");
    toggleCustomerLogin();
    return;
  }

  // 🛠️ FIXED: Forced String conversion so IDs always match perfectly
  const product = allProducts.find((p) => String(p.id) === String(id));
  if (!product) return;

  const item = cart.find((i) => String(i.id) === String(id));

  if (item) item.quantity++;
  else cart.push({ ...product, quantity: 1 });

  updateCartUI();
}

function changeQuantity(id, change) {
  // 🛠️ FIXED: Forced String conversion
  const item = cart.find((i) => String(i.id) === String(id));
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(id);
    } else {
      updateCartUI();
    }
  }
}

function removeFromCart(id) {
  // 🛠️ FIXED: Forced String conversion
  cart = cart.filter((i) => String(i.id) !== String(id));
  updateCartUI();
}

function updateCartUI() {
  document.getElementById("cart-count").innerText = cart.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  const container = document.getElementById("cart-items");
  container.innerHTML = "";
  let total = 0;

  cart.forEach((item) => {
    total += item.price * item.quantity;

    container.innerHTML += `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                <div>
                    <strong>${item.name}</strong><br>
                    <small>₹${item.price.toFixed(2)}</small>
                </div>
                <div style="display:flex; align-items:center; gap: 10px;">
                    <button onclick="changeQuantity(${item.id}, -1)" style="padding: 2px 8px; cursor: pointer;">-</button>
                    <span style="font-weight:bold;">${item.quantity}</span>
                    <button onclick="changeQuantity(${item.id}, 1)" style="padding: 2px 8px; cursor: pointer;">+</button>
                    <button onclick="removeFromCart(${item.id})" style="color: red; background: none; border: none; cursor: pointer; margin-left: 10px; font-size: 1.2rem;">🗑️</button>
                </div>
            </div>
        `;
  });
  document.getElementById("cart-total-price").innerText = total.toFixed(2);
}

// UPGRADED: Connects to the backend order system
async function checkout() {
  if (cart.length === 0) return alert("Your cart is empty!");
  if (!currentUser) return alert("Please sign in first!");

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Disable the button temporarily to prevent double-clicking
  const checkoutBtn = document.querySelector("#cart-modal .amazon-btn");
  checkoutBtn.innerText = "Processing...";
  checkoutBtn.disabled = true;

  try {
    const res = await fetch(
      "https://veggie-delivery-hpeo.onrender.com/api/orders",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: currentUser,
          items: cart,
          total: total,
        }),
      },
    );

    if (res.ok) {
      alert("✅ Order placed successfully! Your groceries are on the way.");
      cart = []; // Empty the cart
      updateCartUI();
      toggleCart(); // Close the modal
    } else {
      alert("❌ Failed to place order. Please try again.");
    }
  } catch (err) {
    alert("⚠️ Server error during checkout.");
  } finally {
    checkoutBtn.innerText = "Proceed to Checkout";
    checkoutBtn.disabled = false;
  }
}
// ==========================================
// MY ORDERS & TRACKING
// ==========================================

function openMyOrders() {
  document.getElementById("profile-modal").style.display = "none";
  document.getElementById("my-orders-modal").style.display = "flex";
  fetchUserOrders();
}

function closeMyOrders() {
  document.getElementById("my-orders-modal").style.display = "none";
}

async function fetchUserOrders() {
  const container = document.getElementById("user-orders-list");
  container.innerHTML =
    "<p style='text-align:center;'>Loading your orders...</p>";

  try {
    const res = await fetch(
      `https://veggie-delivery-hpeo.onrender.com/api/user-orders/${currentUser}`,
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      },
    );
    if (res.ok) {
      const orders = await res.json();
      container.innerHTML = "";

      if (orders.length === 0) {
        container.innerHTML =
          "<p style='text-align:center; color:#777;'>You haven't placed any orders yet.</p>";
        return;
      }

      orders.forEach((order) => {
        // Calculate time difference in minutes
        const orderTime = parseInt(order.timestamp);
        const diffMins = (Date.now() - orderTime) / 60000;

        const isCancelable = diffMins <= 10 && order.status === "Processing";
        const isDeliverable = diffMins > 10 && order.status === "Processing";

        // Determine which button/status to show
        let actionHtml = "";
        if (order.status === "Cancelled") {
          actionHtml = `<span style="color: #d9534f; font-weight: bold;">🚫 Cancelled</span>`;
        } else if (order.status === "Delivered") {
          actionHtml = `<span style="color: #5cb85c; font-weight: bold;">✅ Delivered</span>`;
        } else {
          if (isCancelable) {
            const minsLeft = Math.floor(10 - diffMins);
            actionHtml = `<button onclick="updateOrderStatus('${order.orderId}', 'Cancelled')" class="amazon-btn-secondary" style="border-color: #d9534f; color: #d9534f; padding: 5px 10px;">Cancel Order (${minsLeft}m left)</button>`;
          } else if (isDeliverable) {
            actionHtml = `<button onclick="updateOrderStatus('${order.orderId}', 'Delivered')" class="amazon-btn" style="background: #5cb85c; border-color: #4cae4c; padding: 5px 10px;">Mark as Delivered</button>`;
          }
        }

        container.innerHTML += `
                    <div style="border: 1px solid #ddd; padding: 15px; margin-bottom: 15px; border-radius: 8px; background: #fff;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
                            <strong>Order #${order.orderId}</strong>
                            <span style="color: #777; font-size: 0.9rem;">${order.date}</span>
                        </div>
                        <p style="margin: 5px 0; font-size: 0.95rem;"><strong>Items:</strong> ${order.items}</p>
                        <p style="margin: 5px 0; font-size: 0.95rem;"><strong>Total:</strong> ₹${parseFloat(order.total).toFixed(2)}</p>
                        <div style="margin-top: 15px; display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 0.9rem; color: #555;">Status: <strong>${order.status}</strong></span>
                            <div>${actionHtml}</div>
                        </div>
                    </div>
                `;
      });
    }
  } catch (err) {
    container.innerHTML =
      "<p style='text-align:center; color:red;'>Failed to load orders.</p>";
  }
}

async function updateOrderStatus(orderId, newStatus) {
  if (!confirm(`Are you sure you want to mark this order as ${newStatus}?`))
    return;

  try {
    const res = await fetch(
      `https://veggie-delivery-hpeo.onrender.com/api/orders/${orderId}/status`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      },
    );

    if (res.ok) {
      fetchUserOrders(); // Instantly refresh the UI
    } else {
      alert("❌ Failed to update order status.");
    }
  } catch (err) {
    alert("⚠️ Server connection error.");
  }
}
