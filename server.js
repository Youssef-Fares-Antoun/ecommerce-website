require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const pg = require('pg');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const multer = require('multer'); 
const nodemailer = require('nodemailer'); 
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

// 🚀 EMAIL TRANSPORTER SETUP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- ZONE 1: MIDDLEWARE ---
app.use(express.json()); 
app.use(cookieParser()); 

app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'admin', 'admin.html'));
});

app.use(express.static(path.join(__dirname, 'docs')));
app.use('/admin', express.static(path.join(__dirname, 'docs', 'admin')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'home.html'));
});

// 🚀 ZONE 2: CLOUDINARY MEDIA STORAGE
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { 
      folder: 'cartees-showroom', 
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp'] 
  }
});
const upload = multer({ storage: storage });

// 🚀 ZONE 3: NEON CLOUD DATABASE CONNECTION
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectModule: pg,
  schema: 'public',
  define: {
    schema: 'public'
  },
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

// --- ZONE 4: DATA MODEL ---
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
  isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false },
  isBanned: { type: DataTypes.BOOLEAN, defaultValue: false } // 🚀 Added ban tracking
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

const PromoCode = sequelize.define('PromoCode', {
  code: { type: DataTypes.STRING, allowNull: false, unique: true },
  discountPercent: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 10 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
});

async function initDb() {
  try {
    await sequelize.sync({ alter: true }); 
    console.log("✅ Database Synced (Persistence Mode On)");
  } catch (error) {
    console.error("❌ DB Error:", error);
  }
}

if (process.env.NODE_ENV !== 'production') {
    initDb();
}

// --- ZONE 5: API ROUTES ---
const verifyAdmin = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(verified.id);
        if (!user || !user.isAdmin) return res.status(403).json({ message: "Access Denied: Admins Only!" });
        req.user = user; 
        next();
    } catch (err) { return res.status(401).json({ message: "Invalid token" }); }
};

app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.findAll();
    res.json(products);
  } catch (err) {
    console.error('PRODUCTS ERROR:', err);
    res.status(500).json({
      error: 'Failed to fetch products'
    });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    product ? res.json(product) : res.status(404).json({ error: "Car not found in the fleet." });
  } catch (err) { res.status(500).json({ error: "Server error" }); }
});

app.post('/api/products', verifyAdmin, upload.single('imageFile'), async (req, res) => {
  try {
    const productData = { ...req.body };
    productData.isFeatured = productData.isFeatured === 'true';
    productData.isBestSeller = productData.isBestSeller === 'true';
    
    if (req.file) productData.image = req.file.path; 
    
    const newProduct = await Product.create(productData);
    res.status(201).json({ message: "Success! New car added.", product: newProduct });
  } catch (err) { res.status(400).json({ error: "Failed to save product." }); }
});

app.put('/api/products/:id', verifyAdmin, upload.single('imageFile'), async (req, res) => {
  try {
    const id = req.params.id;
    const productData = { ...req.body };
    productData.isFeatured = productData.isFeatured === 'true';
    productData.isBestSeller = productData.isBestSeller === 'true';
    
    if (req.file) productData.image = req.file.path; 
    
    const [updated] = await Product.update(productData, { where: { id: id } });
    if (updated) {
      const updatedProduct = await Product.findByPk(id);
      return res.status(200).json({ message: "Product updated successfully!", product: updatedProduct });
    }
    throw new Error('Product not found');
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/products/:id', verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id; 
    const deletedCount = await Product.destroy({ where: { id: id } });
    if (deletedCount === 0) return res.status(404).json({ error: "Product not found." });
    res.json({ message: `Success! Product #${id} has been removed.` });
  } catch (err) { res.status(500).json({ error: "Server error during deletion." }); }
});

app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExits = await User.findOne({ where: { email: email } });
    if (userExits) return res.status(400).json({ message: "This email is already registered." });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({ name, email, password: hashedPassword });
    res.status(201).json({ message: "Registration successful!", user: { id: newUser.id, name: newUser.name, email: newUser.email } });
  } catch (err) { res.status(500).send("Server Error"); }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email: email } });
    if (!user) return res.status(401).json({ message: "Invalid email or password." });
    
    // 🚀 Check if user is banned
    if (user.isBanned) return res.status(403).json({ message: "Access Denied: This account has been banned." });

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

app.put('/api/users/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(verified.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { email, currentPassword, newPassword } = req.body;

    if (email) user.email = email;

    if (currentPassword && newPassword) {
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) return res.status(401).json({ message: "Incorrect current password." });
        
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();
    res.json({ message: "Account updated successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to update account" });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: "Logged out successfully" });
});

app.get('/api/users', async (req, res) => {
  try{
    const allUsers = await User.findAll({ attributes: { exclude: ['password'] } });
    res.json(allUsers);
  } catch(err) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

app.get('/api/brands', async (req, res) => {
  try { res.json(await Brand.findAll()); } 
  catch (err) { res.status(500).json({ error: "Failed to fetch brands" }); }
});

app.get('/api/site-reviews', async (req, res) => {
  try { res.json(await SiteReview.findAll({ order: [['createdAt', 'DESC']] })); } 
  catch (err) { res.status(500).json({ error: "Failed to fetch site reviews" }); }
});

app.post('/api/site-reviews', async (req, res) => {
  try { res.status(201).json(await SiteReview.create(req.body)); } 
  catch (err) { res.status(400).json({ error: "Failed to add site review" }); }
});

app.delete('/api/site-reviews/:id', verifyAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const deletedCount = await SiteReview.destroy({ where: { id: id } });
    if (deletedCount === 0) return res.status(404).json({ error: "Review not found." });
    res.json({ message: `Success! Review #${id} has been removed.` });
  } catch (err) { res.status(500).json({ error: "Server error during review deletion." }); }
});

app.get('/api/products/:id/reviews', async (req, res) => {
  try { res.json(await ProductReview.findAll({ where: { ProductId: req.params.id }, order: [['createdAt', 'DESC']] })); } 
  catch (err) { res.status(500).json({ error: "Failed to fetch product reviews" }); }
});

app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const { reviewerName, rating, comment } = req.body;
    res.status(201).json(await ProductReview.create({ ProductId: req.params.id, reviewerName, rating, comment }));
  } catch (err) { res.status(400).json({ error: "Failed to add product review" }); }
});

app.get('/api/orders/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    res.json(await Order.findAll({ where: { UserId: verified.id }, include: [OrderItem], order: [['createdAt', 'DESC']] }));
  } catch (err) { res.status(500).json({ error: "Failed to fetch order history." }); }
});

app.put('/api/orders/me/:id/cancel', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    const order = await Order.findOne({ where: { id: req.params.id, UserId: verified.id } });
    
    if (!order) return res.status(404).json({ message: "Order not found" });
    
    if (order.status !== 'Processing') {
        return res.status(400).json({ message: "Only 'Processing' orders can be cancelled." });
    }

    order.status = 'Cancelled';
    await order.save();
    
    res.json({ message: "Order cancelled successfully", order });
  } catch (err) { 
    res.status(500).json({ error: "Failed to cancel order" }); 
  }
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
    const address = await Address.findOne({ where: { id: req.params.id, UserId: verified.id } });
    if (!address) return res.status(404).json({ message: "Address not found" });
    await Address.update({ isDefault: false }, { where: { UserId: verified.id } });
    address.isDefault = true;
    await address.save();
    res.json({ message: "Default address updated successfully!" });
  } catch (err) { res.status(500).json({ error: "Failed to set default address" }); }
});

app.post('/api/promo/validate', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Please enter a code." });

    const promo = await PromoCode.findOne({ 
      where: { code: code.trim().toUpperCase(), isActive: true } 
    });

    if (!promo) {
      return res.status(404).json({ message: "Invalid or expired promo code." });
    }

    res.json({ 
      message: "Promo applied successfully!", 
      discountPercent: promo.discountPercent,
      code: promo.code 
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to validate promo code." });
  }
});

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const origin = req.headers.origin || `http://localhost:${PORT}`;
    const { cart, payment, promoCode } = req.body; 
    const token = req.cookies.token;
    let userId = null;
    let user = null;

    if (token) {
      try { 
        userId = jwt.verify(token, process.env.JWT_SECRET).id; 
        user = await User.findByPk(userId);
      } catch (err) { }
    }

    let total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (promoCode) {
      const promo = await PromoCode.findOne({ where: { code: promoCode.toUpperCase(), isActive: true } });
      if (promo) {
        const discountAmount = (total * promo.discountPercent) / 100;
        total = total - discountAmount;
      }
    }

    if (userId && user) {
      const newOrder = await Order.create({ 
          totalAmount: total, 
          status: 'Processing', 
          paymentMethod: payment || 'card', 
          UserId: userId 
      });
      
      let emailItemsHtml = ''; 
      let adminItemsHtml = '';

      for (let item of cart) {
        await OrderItem.create({ name: item.name, size: item.size, price: item.price, quantity: item.quantity, OrderId: newOrder.id });
        
        emailItemsHtml += `
          <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 15px 0; color: #555;"><strong>${item.name}</strong><br><small style="color: #888;">Size: ${item.size}</small></td>
            <td style="padding: 15px 0; color: #555; text-align: center;">${item.quantity}</td>
            <td style="padding: 15px 0; color: #555; text-align: right;">LE ${(item.price * item.quantity).toFixed(2)}</td>
          </tr>
        `;
        adminItemsHtml += `<li>${item.quantity}x ${item.name} (Size: ${item.size})</li>`;
      }

      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        const customerMailOptions = {
          from: `"CarTees Store" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: `Order Confirmed! #${newOrder.id} - CarTees`,
          text: `Hi ${user.name}, your order #${newOrder.id} for LE ${total.toFixed(2)} is confirmed!`,
          html: `
            <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f7f6; padding: 20px;">
              <div style="background-color: #111; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; border-bottom: 4px solid #145214;">
                <h1 style="color: #fff; margin: 0; font-size: 28px; letter-spacing: 1px;">Car<span style="color: #4CAF50;">Tees</span></h1>
              </div>
              <div style="background-color: #fff; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <h2 style="color: #111; margin-top: 0; font-size: 22px;">Order Confirmed! 🏁</h2>
                <p style="color: #555; font-size: 16px;">Hi ${user.name},</p>
                <p style="color: #555; font-size: 16px;">Your order <strong>#${newOrder.id}</strong> is locked in. Our pit crew is getting it ready for the track.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin-top: 25px; margin-bottom: 25px;">
                  <thead>
                    <tr style="border-bottom: 2px solid #111; text-align: left;">
                      <th style="padding: 10px 0; color: #111; text-transform: uppercase; font-size: 0.9em;">Item</th>
                      <th style="padding: 10px 0; color: #111; text-transform: uppercase; font-size: 0.9em; text-align: center;">Qty</th>
                      <th style="padding: 10px 0; color: #111; text-transform: uppercase; font-size: 0.9em; text-align: right;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${emailItemsHtml}
                  </tbody>
                </table>
                
                <div style="text-align: right; font-size: 18px; color: #111; padding-top: 15px; border-top: 2px solid #eee;">
                  <strong>Grand Total: <span style="color: #145214;">LE ${total.toFixed(2)}</span></strong>
                </div>
                <p style="color: #888; font-size: 14px; text-align: right; margin-top: 5px; text-transform: uppercase;">Payment: ${payment || 'Card'}</p>
                ${promoCode ? `<p style="color: #e74c3c; font-size: 14px; text-align: right; margin-top: 5px; font-weight: bold;">Promo Code Applied: ${promoCode.toUpperCase()}</p>` : ''}
                
                <p style="color: #555; font-size: 16px; margin-top: 40px;">See you on the track,<br><strong style="color: #111;">The CarTees Team</strong></p>
              </div>
            </div>
          `
        };

        const adminMailOptions = {
          from: `"CarTees System" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_USER,
          subject: `🚨 NEW ORDER #${newOrder.id} - LE ${total.toFixed(2)}`,
          text: `New order from ${user.name}. Total: LE ${total.toFixed(2)}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; border: 2px solid #e74c3c; border-radius: 8px;">
              <h2 style="color: #e74c3c; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-top:0;">🚨 New Order Received! (#${newOrder.id})</h2>
              <p><strong>Customer:</strong> ${user.name} (${user.email})</p>
              <p><strong>Total:</strong> LE ${total.toFixed(2)}</p>
              <p><strong>Payment Method:</strong> <span style="text-transform: uppercase;">${payment || 'Card'}</span></p>
              ${promoCode ? `<p><strong>Promo Code Used:</strong> <span style="color: #e74c3c;">${promoCode.toUpperCase()}</span></p>` : ''}
              <h3 style="margin-bottom: 5px;">Items Ordered:</h3>
              <ul style="background: #f9f9f9; padding: 15px 30px; border-radius: 4px; border: 1px solid #ddd;">
                ${adminItemsHtml}
              </ul>
              <p style="margin-top: 20px;"><a href="${origin}/admin" style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none; border-radius: 4px; font-weight: bold;">Go to Admin Dashboard</a></p>
            </div>
          `
        };

        transporter.sendMail(customerMailOptions).catch(err => console.error("Customer Email Error:", err));
        transporter.sendMail(adminMailOptions).catch(err => console.error("Admin Email Error:", err));
      }
    }

    if (payment === 'cod') { 
        return res.json({ url: '/profile.html#orders' }); 
    }
    
    let currentDiscountMultiplier = 1;
    if (promoCode) {
        const p = await PromoCode.findOne({ where: { code: promoCode.toUpperCase(), isActive: true } });
        if (p) {
            currentDiscountMultiplier = 1 - (p.discountPercent / 100);
        }
    }

    const lineItems = cart.map(item => ({
      price_data: { 
          currency: 'egp', 
          product_data: { name: `${item.name} (Size: ${item.size})` }, 
          unit_amount: Math.round((item.price * currentDiscountMultiplier) * 100) 
      },
      quantity: item.quantity,
    }));
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], 
      line_items: lineItems, 
      mode: 'payment',
      success_url: `${origin}/profile.html#orders`, 
      cancel_url: `${origin}/checkout.html`,
    });
    
    res.json({ url: session.url });
  } catch (err) { 
      res.status(500).json({ error: "Failed to create checkout session" }); 
  }
});

// --- ZONE 6: ADMIN SUPERPOWERS & STATS ---
app.get('/api/admin/stats', verifyAdmin, async (req, res) => {
    try {
        const totalOrders = await Order.count();
        const totalRevenue = await Order.sum('totalAmount');
        const allItems = await OrderItem.findAll();
        const salesCount = {};
        allItems.forEach(item => { salesCount[item.name] = (salesCount[item.name] || 0) + item.quantity; });
        let topSeller = 'N/A';
        let maxQty = 0;
        for (const [name, qty] of Object.entries(salesCount)) {
            if (qty > maxQty) { maxQty = qty; topSeller = name; }
        }
        res.json({ totalOrders, totalRevenue: totalRevenue || 0, topSeller });
    } catch (err) { res.status(500).json({ error: "Failed to fetch admin stats" }); }
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

app.get('/api/admin/users', verifyAdmin, async (req, res) => {
    try {
        const users = await User.findAll({ 
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

app.delete('/api/admin/users/:id', verifyAdmin, async (req, res) => {
    try {
        const targetUserId = parseInt(req.params.id);

        if (targetUserId === req.user.id) {
            return res.status(400).json({ error: "You cannot delete your own admin account." });
        }

        const deletedCount = await User.destroy({ where: { id: targetUserId } });
        
        if (deletedCount === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        res.json({ message: "User deleted successfully." });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

// 🚀 TOGGLE ADMIN STATUS
app.put('/api/admin/users/:id/toggle-admin', verifyAdmin, async (req, res) => {
    try {
        const targetUserId = parseInt(req.params.id);
        if (targetUserId === req.user.id) {
            return res.status(400).json({ error: "You cannot change your own admin privileges." });
        }
        const user = await User.findByPk(targetUserId);
        if (!user) return res.status(404).json({ error: "User not found." });
        
        user.isAdmin = !user.isAdmin;
        await user.save();
        res.json({ message: "Admin status updated successfully.", user });
    } catch (err) {
        res.status(500).json({ error: "Failed to update admin status." });
    }
});

// 🚀 TOGGLE BAN STATUS
app.put('/api/admin/users/:id/toggle-ban', verifyAdmin, async (req, res) => {
    try {
        const targetUserId = parseInt(req.params.id);
        if (targetUserId === req.user.id) {
            return res.status(400).json({ error: "You cannot ban your own admin account." });
        }
        const user = await User.findByPk(targetUserId);
        if (!user) return res.status(404).json({ error: "User not found." });
        
        user.isBanned = !user.isBanned;
        await user.save();
        res.json({ message: "Ban status updated successfully.", user });
    } catch (err) {
        res.status(500).json({ error: "Failed to update ban status." });
    }
});

app.get('/api/admin/promos', verifyAdmin, async (req, res) => {
    try {
        res.json(await PromoCode.findAll({ order: [['createdAt', 'DESC']] }));
    } catch (err) { res.status(500).json({ error: "Failed to fetch promo codes" }); }
});

app.post('/api/admin/promos', verifyAdmin, async (req, res) => {
    try {
        const { code, discountPercent } = req.body;
        const newPromo = await PromoCode.create({ 
            code: code.trim().toUpperCase(), 
            discountPercent: parseFloat(discountPercent) 
        });
        res.status(201).json(newPromo);
    } catch (err) { res.status(400).json({ error: "Failed to create promo code. It might already exist." }); }
});

app.delete('/api/admin/promos/:id', verifyAdmin, async (req, res) => {
    try {
        await PromoCode.destroy({ where: { id: req.params.id } });
        res.json({ message: "Promo code deleted" });
    } catch (err) { res.status(500).json({ error: "Failed to delete promo code" }); }
});

// --- ZONE 7: START THE ENGINE ---
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => { console.log(`🚀 REVVO Server flying at http://localhost:${PORT}`); });
}

module.exports = app;