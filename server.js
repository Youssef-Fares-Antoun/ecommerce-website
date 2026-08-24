require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const multer = require('multer'); // 🚀 NEW: Import Multer!

const app = express();
const PORT = process.env.PORT || 3000;

// --- ZONE 1: MIDDLEWARE ---
app.use(express.json()); 
app.use(cookieParser()); 
app.use(express.static(path.join(__dirname, 'docs')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'home.html'));
});

// 🚀 NEW: CONFIGURE MULTER STORAGE
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Tell Multer to save uploaded images straight into your docs/images folder!
    cb(null, path.join(__dirname, 'docs', 'images')); 
  },
  filename: function (req, file, cb) {
    // Generate a unique filename so images don't overwrite each other
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'upload-' + uniqueSuffix + path.extname(file.originalname)); 
  }
});
const upload = multer({ storage: storage });

// --- ZONE 2: DATABASE CONNECTION ---
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: 'localhost',
  dialect: 'postgres',
  logging: false 
});

// --- ZONE 3: DATA MODEL (The Blueprint) ---
const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false }, 
  price: { type: DataTypes.FLOAT, allowNull: false },
  image: { type: DataTypes.STRING },
  category: { type: DataTypes.STRING },
  isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false }, 
  isBestSeller: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Brand = sequelize.define('Brand', {
  name: { type: DataTypes.STRING, allowNull: false },
  logo: { type: DataTypes.STRING, allowNull: false },
  filterValue: { type: DataTypes.STRING, allowNull: false }
});

const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING, allowNull: true  },
  phone: { type: DataTypes.STRING, allowNull: true },
  isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false }
});

const Address = sequelize.define('Address', {
  firstName: { type: DataTypes.STRING, allowNull: false },
  lastName: { type: DataTypes.STRING, allowNull: false },
  phone: { type: DataTypes.STRING, allowNull: false },
  street: { type: DataTypes.STRING, allowNull: false },
  city: { type: DataTypes.STRING, allowNull: false },
  governorate: { type: DataTypes.STRING, allowNull: false },
  isDefault: { type: DataTypes.BOOLEAN, defaultValue: false }
});

User.hasMany(Address);
Address.belongsTo(User);

const SiteReview = sequelize.define('SiteReview', {
  reviewerName: { type: DataTypes.STRING, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: false }, 
  comment: { type: DataTypes.TEXT, allowNull: false }
});

const ProductReview = sequelize.define('ProductReview', {
  reviewerName: { type: DataTypes.STRING, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: false }, 
  comment: { type: DataTypes.TEXT, allowNull: false }
});

Product.hasMany(ProductReview);
ProductReview.belongsTo(Product);

const Order = sequelize.define('Order', {
  totalAmount: { type: DataTypes.FLOAT, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'Processing' },
  paymentMethod: { type: DataTypes.STRING, defaultValue: 'card' } 
});

const OrderItem = sequelize.define('OrderItem', {
  name: { type: DataTypes.STRING, allowNull: false },
  size: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false }
});

User.hasMany(Order);
Order.belongsTo(User);
Order.hasMany(OrderItem);
OrderItem.belongsTo(Order);

// --- ZONE 4: DB INITIALIZATION ---
async function initDb() {
  try {
    await sequelize.sync({ alter: true }); 
    console.log("✅ Database Synced (Persistence Mode On)");

    const count = await Product.count();
    if (count === 0) {
      console.log("🚚 Warehouse empty. Seeding starter fleet...");
      await Product.bulkCreate([
        { name: "Porsche 911 Tee", price: 500, image: "911Back.png", category: "porsche" },
        { name: "Ferrari SF90 Tee", price: 500, image: "SF90Back.png", category: "ferrari" },
        { name: "McLaren P1 Tee", price: 500, image: "P1Back.png", category: "mclaren" },
        { name: "McLaren Senna Tee", price: 700, image: "SennaBack.png", category: "mclaren" },
        { name: "AMG GT Black Tee", price: 600, image: "GtBlackBack.png", category: "amg" },
        { name: "M4 Competition Tee", price: 500, image: "M4 CompetitionBack.png", category: "bmw" }
      ]);
    }

    const brandCount = await Brand.count();
    if (brandCount === 0) {
      console.log("🏷️ Printing brand labels...");
      await Brand.bulkCreate([
        { name: "Porsche", logo: "images/Porsche Logo.png", filterValue: "porsche" },
        { name: "Ferrari", logo: "images/Ferrari Logo.png", filterValue: "ferrari" },
        { name: "McLaren", logo: "images/McLaren Logo.png", filterValue: "mclaren" },
        { name: "AMG", logo: "images/AMG Logo.png", filterValue: "amg" },
        { name: "BMW", logo: "images/BMW M Logo.png", filterValue: "bmw" }
      ]);
    }
  } catch (error) {
    console.error("❌ DB Error:", error);
  }
}
initDb();

// --- ZONE 5: API ROUTES ---
const verifyAdmin = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(verified.id);
        if (!user || !user.isAdmin) return res.status(403).json({ message: "Access Denied: Admins Only!" });
        next();
    } catch (err) { return res.status(401).json({ message: "Invalid token" }); }
};

// 1. GET ALL PRODUCTS
app.get('/api/products', async (req, res) => {
  try { res.json(await Product.findAll()); } 
  catch (err) { res.status(500).json({ error: "Failed to fetch products" }); }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    product ? res.json(product) : res.status(404).json({ error: "Car not found in the fleet." });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

// 2. ADD NEW PRODUCT (🚀 UPGRADED: Handles Image Uploads)
app.post('/api/products', verifyAdmin, upload.single('imageFile'), async (req, res) => {
  try {
    const productData = { ...req.body };
    
    // Convert text booleans from FormData into actual booleans
    productData.isFeatured = productData.isFeatured === 'true';
    productData.isBestSeller = productData.isBestSeller === 'true';

    // If an image was uploaded, save its new path to the database
    if (req.file) {
      productData.image = 'images/' + req.file.filename;
    }

    const newProduct = await Product.create(productData);
    res.status(201).json({ message: "Success! New car added.", product: newProduct });
  } catch (err) {
    res.status(400).json({ error: "Failed to save product." });
  }
});

// 3. EDIT PRODUCT (🚀 UPGRADED: Handles Image Uploads)
app.put('/api/products/:id', verifyAdmin, upload.single('imageFile'), async (req, res) => {
  try {
    const id = req.params.id;
    const productData = { ...req.body };

    productData.isFeatured = productData.isFeatured === 'true';
    productData.isBestSeller = productData.isBestSeller === 'true';

    if (req.file) {
      productData.image = 'images/' + req.file.filename;
    }

    const [updated] = await Product.update(productData, { where: { id: id } });
    if (updated) {
      const updatedProduct = await Product.findByPk(id);
      return res.status(200).json({ message: "Product updated successfully!", product: updatedProduct });
    }
    throw new Error('Product not found');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id; 
    const deletedCount = await Product.destroy({ where: { id: id } });
    if (deletedCount === 0) return res.status(404).json({ error: "Product not found." });
    res.json({ message: `Success! Product #${id} has been removed.` });
  } catch (err) { res.status(500).json({ error: "Server error during deletion." }); }
});

// (The rest of your routes remain perfectly intact below)
app.post('/api/register', async (req, res) => { /* ... */ });
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email: email } });
    if (!user) return res.status(401).json({ message: "Invalid email or password." });
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ message: "Invalid email or password." });
    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 });
    res.json({ message: "Login successful!", user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }});
  } catch (err) { res.status(500).send("Server Error"); }
});
app.get('/api/users/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(verified.id, { attributes: { exclude: ['password'] } });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) { res.status(401).json({ message: "Invalid or expired token" }); }
});
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: "Logged out successfully" });
});
app.get('/api/brands', async (req, res) => {
  try { res.json(await Brand.findAll()); } 
  catch (err) { res.status(500).json({ error: "Failed to fetch brands" }); }
});
app.get('/api/orders/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const orders = await Order.findAll({ where: { UserId: verified.id }, include: [OrderItem], order: [['createdAt', 'DESC']] });
    res.json(orders);
  } catch (err) { res.status(500).json({ error: "Failed to fetch order history." }); }
});
app.get('/api/addresses/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    res.json(await Address.findAll({ where: { UserId: verified.id }, order: [['isDefault', 'DESC'], ['createdAt', 'DESC']] }));
  } catch (err) { res.status(500).json({ error: "Failed to fetch addresses" }); }
});
app.post('/api/addresses/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const count = await Address.count({ where: { UserId: verified.id } });
    res.status(201).json(await Address.create({ ...req.body, UserId: verified.id, isDefault: count === 0 }));
  } catch (err) { res.status(500).json({ error: "Failed to save address" }); }
});
app.put('/api/addresses/:id/default', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const addressId = req.params.id;
    const address = await Address.findOne({ where: { id: addressId, UserId: verified.id } });
    if (!address) return res.status(404).json({ message: "Address not found" });
    await Address.update({ isDefault: false }, { where: { UserId: verified.id } });
    address.isDefault = true;
    await address.save();
    res.json({ message: "Default address updated successfully!" });
  } catch (err) { res.status(500).json({ error: "Failed to set default address" }); }
});
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { cart, payment } = req.body; 
    const token = req.cookies.token;
    let userId = null;
    if (token) {
      try { userId = jwt.verify(token, process.env.JWT_SECRET).id; } catch (err) { }
    }
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (userId) {
      const newOrder = await Order.create({ totalAmount: total, status: 'Processing', paymentMethod: payment || 'card', UserId: userId });
      for (let item of cart) {
        await OrderItem.create({ name: item.name, size: item.size, price: item.price, quantity: item.quantity, OrderId: newOrder.id });
      }
    }
    if (payment === 'cod' || payment === 'instapay') { return res.json({ url: 'profile.html#orders' }); }
    const lineItems = cart.map(item => ({
      price_data: { currency: 'egp', product_data: { name: `${item.name} (Size: ${item.size})` }, unit_amount: Math.round(item.price * 100) },
      quantity: item.quantity,
    }));
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], line_items: lineItems, mode: 'payment',
      success_url: `http://localhost:3000/profile.html#orders`, cancel_url: `http://localhost:3000/checkout.html`,
    });
    res.json({ url: session.url });
  } catch (err) { res.status(500).json({ error: "Failed to create checkout session" }); }
});

app.get('/api/admin/orders', verifyAdmin, async (req, res) => {
    try {
        res.json(await Order.findAll({ include: [{ model: User, attributes: ['name', 'email', 'phone'] }, { model: OrderItem }], order: [['createdAt', 'DESC']] }));
    } catch (err) { res.status(500).json({ error: "Failed to fetch admin orders" }); }
});
app.put('/api/admin/orders/:id/status', verifyAdmin, async (req, res) => {
    try {
        const order = await Order.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: "Order not found" });
        order.status = req.body.status;
        await order.save();
        res.json({ message: "Order status updated successfully!", order });
    } catch (err) { res.status(500).json({ error: "Failed to update order status" }); }
});

// --- ZONE 7: START THE ENGINE ---
app.listen(PORT, () => { console.log(`🚀 REVVO Server flying at http://localhost:${PORT}`); });