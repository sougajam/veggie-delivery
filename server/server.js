require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const path = require("path");
const jwt = require("jsonwebtoken");
const { JWT } = require("google-auth-library");

const creds = require("../google-credentials.json");
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key";
const SHEET_ID = "18-PTcIatcmv0wIsXGBYkF5zM27LBNnMAnx2FEkOtDIU";

// Initialize express app
const publicApp = express();

publicApp.use(cors());
publicApp.use(express.json());

// Connect to Google Sheets
const serviceAccountAuth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});
const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);

// ==========================================
// 🛡️ SECURITY GUARD (Admin Middleware)
// ==========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Access denied." });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token." });
    req.user = user;
    next();
  });
}

// ==========================================
// 🔐 ADMIN AUTHENTICATION
// ==========================================
publicApp.post("/api/admin-login", (req, res) => {
  const { username, password } = req.body;

  console.log(`[LOGIN ATTEMPT] User: '${username}', Pass: '${password}'`);

  if (username === "admin" && password === "admin123") {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "2h" });
    res.json({ token, message: "Welcome Admin" });
  } else {
    res
      .status(401)
      .json({
        error: `Server saw username: '${username}' and password: '${password}' but they didn't match!`,
      });
  }
});

publicApp.get("/api/check-auth", authenticateToken, (req, res) => {
  res.status(200).json({ message: "Valid session" });
});

// ==========================================
// 🌐 PUBLIC STOREFRONT ROUTES
// ==========================================
publicApp.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Users"];
    const rows = await sheet.getRows();

    const user = rows.find(
      (r) => r.get("username") === username && r.get("password") === password,
    );
    if (user) {
      res.json({ message: "Login successful", username: user.get("username") });
    } else {
      res.status(401).json({ error: "Invalid username or password" });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

publicApp.post("/api/register", async (req, res) => {
  try {
    const { username, password, phone, address, gps } = req.body;
    if (!gps || !address)
      return res
        .status(400)
        .json({ error: "Address and GPS are strictly required." });

    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Users"];
    const rows = await sheet.getRows();

    const userExists = rows.find((r) => r.get("username") === username);
    if (userExists)
      return res.status(400).json({ error: "Username already taken" });

    await sheet.addRow({ username, password, phone, address, gps });
    res.json({ message: "Registration successful!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to register" });
  }
});

publicApp.get("/api/products", async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Products"];
    const rows = await sheet.getRows();

    const products = rows.map((row) => ({
      id: parseInt(row.get("id")),
      name: row.get("name"),
      category: row.get("category"),
      price: parseFloat(row.get("price")),
      image: row.get("image"),
    }));
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: "Failed to read database" });
  }
});

publicApp.post("/api/orders", async (req, res) => {
  try {
    const { customer, items, total } = req.body;
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Orders"];

    const orderId = "ORD-" + Date.now();
    const itemsSummary = items
      .map((i) => `${i.name} (x${i.quantity})`)
      .join(", ");

    await sheet.addRow({
      orderId: orderId,
      customer: customer,
      items: itemsSummary,
      total: total,
      date: new Date().toLocaleDateString(),
      status: "Processing",
      timestamp: Date.now(),
    });

    res.status(201).json({ message: "Order placed successfully!", orderId });
  } catch (err) {
    res.status(500).json({ error: "Failed to place order" });
  }
});

publicApp.get("/api/user-orders/:username", async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Orders"];
    const rows = await sheet.getRows();

    const userOrders = rows
      .filter((r) => r.get("customer") === req.params.username)
      .map((row) => ({
        orderId: row.get("orderId"),
        items: row.get("items"),
        total: row.get("total"),
        date: row.get("date"),
        status: row.get("status") || "Processing",
        timestamp: row.get("timestamp") || Date.now(),
      }));

    res.json(userOrders.reverse());
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

publicApp.get("/api/profile/:username", async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Users"];
    const rows = await sheet.getRows();

    const user = rows.find((r) => r.get("username") === req.params.username);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({
      phone: user.get("phone"),
      address: user.get("address"),
      gps: user.get("gps"),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

publicApp.put("/api/profile/:username", async (req, res) => {
  try {
    const { phone, address, gps } = req.body;
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Users"];
    const rows = await sheet.getRows();

    const user = rows.find((r) => r.get("username") === req.params.username);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.assign({ phone: phone, address: address, gps: gps });
    await user.save();
    res.json({ message: "Profile updated successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ==========================================
// 🛠️ SECURE ADMIN DASHBOARD ROUTES
// ==========================================
publicApp.get("/api/orders", authenticateToken, async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Orders"];
    const rows = await sheet.getRows();

    const orders = rows.map((row) => ({
      orderId: row.get("orderId"),
      customer: row.get("customer"),
      items: row.get("items"),
      total: row.get("total"),
      date: row.get("date"),
    }));

    res.status(200).json(orders.reverse());
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

publicApp.put(
  "/api/orders/:orderId/status",
  authenticateToken,
  async (req, res) => {
    try {
      const { status } = req.body;
      await doc.loadInfo();
      const sheet = doc.sheetsByTitle["Orders"];
      const rows = await sheet.getRows();

      const order = rows.find((r) => r.get("orderId") === req.params.orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });

      order.assign({ status: status });
      await order.save();
      res.json({ message: `Order marked as ${status}` });
    } catch (err) {
      res.status(500).json({ error: "Failed to update order" });
    }
  },
);

publicApp.post("/api/products", authenticateToken, async (req, res) => {
  try {
    const { name, category, price, image } = req.body;
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Products"];
    const rows = await sheet.getRows();

    let newId = 1;
    if (rows.length > 0) {
      newId = parseInt(rows[rows.length - 1].get("id")) + 1;
    }

    await sheet.addRow({ id: newId, name, category, price, image });
    res.status(201).json({ message: "Product added!" });
  } catch (error) {
    res.status(500).json({ error: "Failed to add product" });
  }
});

publicApp.put("/api/products/:id", authenticateToken, async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Products"];
    const rows = await sheet.getRows();

    const rowToUpdate = rows.find(
      (r) => r.get("id").toString() === req.params.id.toString(),
    );
    if (!rowToUpdate)
      return res.status(404).json({ error: "Product not found" });

    const { name, category, price, image } = req.body;
    rowToUpdate.assign({ name, category, price, image });
    await rowToUpdate.save();
    res.status(200).json({ message: "Product updated!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update product." });
  }
});

publicApp.delete("/api/products/:id", authenticateToken, async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle["Products"];
    const rows = await sheet.getRows();

    const rowToDelete = rows.find(
      (r) => r.get("id").toString() === req.params.id.toString(),
    );
    if (!rowToDelete)
      return res.status(404).json({ error: "Product not found" });

    await rowToDelete.delete();
    res.status(200).json({ message: "Product deleted!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete product." });
  }
});

// ==========================================
// 🟢 START SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
publicApp.listen(PORT, () => {
  console.log(`Server running live on port ${PORT}`);
});
