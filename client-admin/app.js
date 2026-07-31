const ADMIN_API = "https://veggie-delivery-hpeo.onrender.com/api";

let adminToken = localStorage.getItem("adminToken");
let allProducts = [];
let editingProductId = null;

document.addEventListener("DOMContentLoaded", () => {
  checkAdminSession();

  // Attach Login Form Event Listener
  const loginForm = document.getElementById("admin-login-form");
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Attach Product Form Event Listener
  const productForm = document.getElementById("product-form");
  if (productForm) {
    productForm.addEventListener("submit", handleProductSave);
  }
});

// ==========================================
// 🔐 AUTHENTICATION
// ==========================================

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById("admin-username").value.trim();
  const password = document.getElementById("admin-pass").value.trim();
  const errorBox = document.getElementById("login-error");

  try {
    const res = await fetch(`${ADMIN_API}/admin-login`, {
      method: "POST", // 👈 THIS WAS MISSING!
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const data = await res.json();
      adminToken = data.token;
      localStorage.setItem("adminToken", adminToken);
      errorBox.style.display = "none";
      showDashboard();
    } else {
      errorBox.innerText = "❌ Incorrect username or password.";
      errorBox.style.display = "block";
    }
  } catch (err) {
    // Updated error message since we are no longer using port 4000
    errorBox.innerText = "⚠️ Server unreachable. Is the Render backend live?";
    errorBox.style.display = "block";
  }
}

async function checkAdminSession() {
  if (!adminToken) {
    showLoginScreen();
    return;
  }

  try {
    const response = await fetch(`${ADMIN_API}/check-auth`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (response.ok) {
      showDashboard();
    } else {
      logoutAdmin();
    }
  } catch {
    showLoginScreen();
  }
}

function logoutAdmin() {
  adminToken = null;
  localStorage.removeItem("adminToken");
  showLoginScreen();
}

function showLoginScreen() {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("dashboard-screen").style.display = "none";
}

function showDashboard() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("dashboard-screen").style.display = "flex";

  // 🛠️ FIXED: Initialize the dashboard by opening the Products tab by default
  switchTab("products");
}

// ==========================================
// 🗂️ SIDEBAR TAB NAVIGATION
// ==========================================

window.switchTab = function (tabName) {
  // 1. Hide both tab content areas
  document.getElementById("products-tab").style.display = "none";
  document.getElementById("orders-tab").style.display = "none";

  // 2. Remove the "active" highlight class from both sidebar links
  document.getElementById("nav-products").classList.remove("active");
  document.getElementById("nav-orders").classList.remove("active");

  // 3. Show the correct tab, highlight its link, and fetch the latest data
  if (tabName === "products") {
    document.getElementById("products-tab").style.display = "block";
    document.getElementById("nav-products").classList.add("active");
    fetchAdminProducts();
  } else if (tabName === "orders") {
    document.getElementById("orders-tab").style.display = "block";
    document.getElementById("nav-orders").classList.add("active");
    fetchAdminOrders();
  }
};

// ==========================================
// 📊 DASHBOARD & DATA MANAGEMENT (PRODUCTS)
// ==========================================

async function fetchAdminProducts() {
  try {
    // Fetch products via public route or dedicated endpoint
    const response = await fetch(
      "https://veggie-delivery-hpeo.onrender.com/api/products",
    );
    allProducts = await response.json();

    renderMetrics();
    renderTable();
  } catch (err) {
    console.error("Failed to fetch products:", err);
  }
}

function renderMetrics() {
  document.getElementById("total-products-count").innerText =
    allProducts.length;

  const categories = new Set(allProducts.map((p) => p.category));
  document.getElementById("total-categories-count").innerText = categories.size;
}

function renderTable() {
  const tbody = document.getElementById("admin-product-rows");
  tbody.innerHTML = "";

  if (allProducts.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">No products found in Google Sheets.</td></tr>`;
    return;
  }

  allProducts.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
            <td>#${p.id}</td>
            <td><img src="${p.image}" alt="${p.name}" onerror="this.src='https://via.placeholder.com/40'"></td>
            <td><strong>${p.name}</strong></td>
            <td><span style="background:#e2e8f0; padding:2px 8px; border-radius:4px; font-size:0.8rem;">${p.category}</span></td>
            <td>₹${p.price.toFixed(2)}</td>
            <td>
                <button onclick="editProduct(${p.id})" class="btn btn-sm btn-edit">✏️ Edit</button>
                <button onclick="deleteProduct(${p.id})" class="btn btn-sm btn-delete">🗑️ Delete</button>
            </td>
        `;
    tbody.appendChild(tr);
  });
}

// ==========================================
// 📝 CREATE & EDIT (MODAL)
// ==========================================

function openProductModal() {
  editingProductId = null;
  document.getElementById("product-form").reset();
  document.getElementById("modal-title").innerText = "Add New Product";
  document.getElementById("save-prod-btn").innerText = "Add Product";
  document.getElementById("product-modal").style.display = "flex";
}

function closeProductModal() {
  document.getElementById("product-modal").style.display = "none";
}

window.editProduct = (id) => {
  const product = allProducts.find((p) => p.id === id);
  if (!product) return;

  editingProductId = id;
  document.getElementById("prod-name").value = product.name;
  document.getElementById("prod-category").value = product.category;
  document.getElementById("prod-price").value = product.price;
  document.getElementById("prod-image").value = product.image;

  document.getElementById("modal-title").innerText = `Edit Product #${id}`;
  document.getElementById("save-prod-btn").innerText = "Update Product";
  document.getElementById("product-modal").style.display = "flex";
};

async function handleProductSave(e) {
  e.preventDefault();

  const name = document.getElementById("prod-name").value;
  const category = document.getElementById("prod-category").value;
  const price = parseFloat(document.getElementById("prod-price").value);
  const image = document.getElementById("prod-image").value;

  const isEdit = editingProductId !== null;
  const url = isEdit
    ? `${ADMIN_API}/products/${editingProductId}`
    : `${ADMIN_API}/products`;

  const method = isEdit ? "PUT" : "POST";

  try {
    const res = await fetch(url, {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name, category, price, image }),
    });

    if (res.ok) {
      closeProductModal();
      editingProductId = null; // ✅ Restores clean state
      fetchAdminProducts();
    } else {
      alert("❌ Failed to save product. Session may have expired.");
      logoutAdmin();
    }
  } catch (err) {
    alert("⚠️ Connection error.");
  }
}

// ==========================================
// 🗑️ DELETE
// ==========================================

window.deleteProduct = async (id) => {
  if (!confirm("Are you sure you want to delete this product?")) return;

  try {
    const res = await fetch(`${ADMIN_API}/products/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    if (res.ok) {
      fetchAdminProducts();
    } else {
      alert("❌ Failed to delete product.");
    }
  } catch (err) {
    alert("⚠️ Connection error.");
  }
};

// ==========================================
// 🛒 ORDER MANAGEMENT
// ==========================================

async function fetchAdminOrders() {
  const adminToken = localStorage.getItem("adminToken");
  if (!adminToken) return;

  try {
    const res = await fetch(
      "https://veggie-delivery-hpeo.onrender.com/api/orders",
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      },
    );

    if (res.ok) {
      const orders = await res.json();
      const tbody = document.getElementById("orders-table-body");

      if (!tbody) {
        console.error("Could not find the orders table body in HTML.");
        return;
      }

      tbody.innerHTML = "";

      if (orders.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">No orders found.</td></tr>`;
        return;
      }

      orders.forEach((order) => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${order.orderId}</strong></td>
                <td>${order.date}</td>
                <td>${order.customer}</td>
                <td>${order.items}</td>
                <td style="font-weight: bold; color: green;">₹${order.total}</td>
            </tr>
        `;
      });
    }
  } catch (err) {
    console.error("Failed to load orders", err);
  }
}
