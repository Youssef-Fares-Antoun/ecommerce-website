require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// --- ZONE 1: MIDDLEWARE ---
app.use(express.json()); 
app.use(cookieParser()); 
app.use(express.static(path.join(__dirname, 'docs')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'home.html'));
});

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
  isAdmin: { type: DataTypes.BOOLEAN, defaultValue: false } // 🚀 NEW: Identifies store owners!
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

// --- UPDATED: ORDER & ORDER ITEM MODELS ---
const Order = sequelize.define('Order', {
  totalAmount: { type: DataTypes.FLOAT, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'Processing' },
  paymentMethod: { type: DataTypes.STRING, defaultValue: 'card' } // 🚀 NEW: Tracks COD, InstaPay, or Card
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
    } else {
      console.log(`📦 Warehouse active: ${count} products found. Skipping seeding.`);
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
    }else {
      console.log(`🏷️ Brands active: ${brandCount} brands found. Skipping seeding.`);
    }

    const siteReviewCount = await SiteReview.count();
    if (siteReviewCount === 0) {
      console.log("⭐ Writing starter site reviews...");
      await SiteReview.bulkCreate([
        { reviewerName: "Ahmed T.", rating: 5, comment: "Amazing quality tees, perfect fit and fast shipping! Will buy again." },
        { reviewerName: "Sarah M.", rating: 5, comment: "As a Porsche fan, I absolutely love the 911 shirt. The fabric is premium." },
        { reviewerName: "Karim R.", rating: 4, comment: "Great designs. Would love to see more brands added in the future!" }
      ]);
    } else {
      console.log(`⭐ Reviews active: ${siteReviewCount} site reviews found.`);
    }

  } catch (error) {
    console.error("❌ DB Error:", error);
  }
}
initDb();

// --- ZONE 5: API ROUTES ---

// 1. GET ALL PRODUCTS
app.get('/api/products', async (req, res) => {
  try {
    const allProducts = await Product.findAll();
    res.json(allProducts);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ error: "Car not found in the fleet." });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// 2. ADD NEW PRODUCT
app.post('/api/products', async (req, res) => {
  try {
    const newProduct = await Product.create(req.body);
    res.status(201).json({ message: "Success! New car added.", product: newProduct });
  } catch (err) {
    res.status(400).json({ error: "Invalid data. Check your JSON format." });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const [updated] = await Product.update(req.body, { where: { id: id } });
    if (updated) {
      const updatedProduct = await Product.findByPk(id);
      return res.status(200).json({ message: "Product updated successfully!", product: updatedProduct });
    }
    throw new Error('Product not found');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const id = req.params.id; 
    const deletedCount = await Product.destroy({ where: { id: id } });
    if (deletedCount === 0) return res.status(404).json({ error: "Product not found." });
    res.json({ message: `Success! Product #${id} has been removed from the fleet.` });
  } catch (err) {
    res.status(500).json({ error: "Server error during deletion." });
  }
});

// 3. REGISTER NEW USER
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const userExits = await User.findOne({ where: { email: email } });
    if (userExits) return res.status(400).json({ message: "This email is already registered." });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({ name, email, password: hashedPassword });
    res.status(201).json({ 
      message: "Registration successful!", 
      user: { id: newUser.id, name: newUser.name, email: newUser.email } 
    });
  } catch (err) {
    console.error("Registration Error:", err.message);
    res.status(500).send("Server Error");
  }
});

// 4. LOGIN USER
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email: email } });
    if (!user) return res.status(401).json({ message: "Invalid email or password." });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ message: "Invalid email or password." });

    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,  
      secure: process.env.NODE_ENV === 'production', 
      maxAge: 24 * 60 * 60 * 1000 
    });

    res.json({
      message: "Login successful!",
      // Pass the isAdmin flag to the frontend!
      user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).send("Server Error");
  }
});

// 4.1 Check current user 
app.get('/api/users/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(verified.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ user });
  } catch (err) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
});

// 4.2 LOGOUT
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: "Logged out successfully" });
});

// 5. GET ALL USERS
app.get('/api/users', async (req, res) =>{
  try{
    const allUsers = await User.findAll({ attributes: { exclude: ['password'] } });
    if(allUsers.length === 0) return res.json({ message: "No registered users yet."});
    res.json(allUsers);
  } catch(err) {
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

// 6. Update User Profile
app.put('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  const { name, email, address, phone } = req.body;

  try {
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if (address) user.address = address; 
    if (phone) user.phone = phone;
    await user.save();

    res.json({ message: "Profile updated!", user: { id: user.id, name: user.name, email: user.email, address: user.address, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile." });
  }
});

app.get('/api/brands', async (req, res) => {
  try {
    const brands = await Brand.findAll();
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch brands" });
  }
});

// 7. GET ALL SITE REVIEWS
app.get('/api/site-reviews', async (req, res) => {
  try {
    const reviews = await SiteReview.findAll({ order: [['createdAt', 'DESC']] });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch site reviews" });
  }
});

// 8. POST A NEW SITE REVIEW
app.post('/api/site-reviews', async (req, res) => {
  try {
    const newReview = await SiteReview.create(req.body);
    res.status(201).json(newReview);
  } catch (err) {
    res.status(400).json({ error: "Failed to add site review" });
  }
});

// 9. GET REVIEWS FOR A SPECIFIC PRODUCT
app.get('/api/products/:id/reviews', async (req, res) => {
  try {
    const reviews = await ProductReview.findAll({ 
      where: { ProductId: req.params.id },
      order: [['createdAt', 'DESC']] 
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch product reviews" });
  }
});

// 10. POST A NEW PRODUCT REVIEW
app.post('/api/products/:id/reviews', async (req, res) => {
  try {
    const { reviewerName, rating, comment } = req.body;
    const newReview = await ProductReview.create({
      ProductId: req.params.id,
      reviewerName,
      rating,
      comment
    });
    res.status(201).json(newReview);
  } catch (err) {
    res.status(400).json({ error: "Failed to add product review" });
  }
});

// 11. GET USER'S ORDER HISTORY
app.get('/api/orders/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });

    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    const orders = await Order.findAll({
      where: { UserId: verified.id },
      include: [OrderItem],
      order: [['createdAt', 'DESC']]
    });
    
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch order history." });
  }
});

// 12. ADDRESS BOOK ROUTES
app.get('/api/addresses/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    const addresses = await Address.findAll({ 
        where: { UserId: verified.id },
        order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });
    res.json(addresses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch addresses" });
  }
});

app.post('/api/addresses/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    const count = await Address.count({ where: { UserId: verified.id } });
    
    const newAddress = await Address.create({
      ...req.body,
      UserId: verified.id,
      isDefault: count === 0 
    });
    res.status(201).json(newAddress);
  } catch (err) {
    res.status(500).json({ error: "Failed to save address" });
  }
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
  } catch (err) {
    res.status(500).json({ error: "Failed to set default address" });
  }
});

// 13. STRIPE CHECKOUT SESSION (🚀 UPGRADED FOR COD & INSTAPAY)
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { cart, payment } = req.body; 

    // 1. Check who is buying
    const token = req.cookies.token;
    let userId = null;
    if (token) {
      try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        userId = verified.id;
      } catch (err) {
        console.log("Guest checkout");
      }
    }

    // 2. Calculate the total
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 3. Save Order into Database
    if (userId) {
      const newOrder = await Order.create({
        totalAmount: total,
        status: 'Processing',
        paymentMethod: payment || 'card',
        UserId: userId
      });

      for (let item of cart) {
        await OrderItem.create({
          name: item.name,
          size: item.size,
          price: item.price,
          quantity: item.quantity,
          OrderId: newOrder.id
        });
      }
    }

    // 4. SMART ROUTING: If NOT using card, bypass Stripe and return success URL instantly!
    if (payment === 'cod' || payment === 'instapay') {
        return res.json({ url: 'profile.html#orders' });
    }

    // 5. Card handling (Stripe)
    const lineItems = cart.map(item => {
      return {
        price_data: {
          currency: 'egp',
          product_data: { name: `${item.name} (Size: ${item.size})` },
          unit_amount: Math.round(item.price * 100), 
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `http://localhost:3000/profile.html#orders`, 
      cancel_url: `http://localhost:3000/checkout.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Checkout Error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// ==========================================
// 🚀 ZONE 6: ADMIN SUPERPOWERS
// ==========================================

// Middleware: Bouncer at the door (Checks if user is Admin)
const verifyAdmin = async (req, res, next) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(verified.id);
        
        if (!user || !user.isAdmin) {
            return res.status(403).json({ message: "Access Denied: Admins Only!" });
        }
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

// Admin Route: Get ALL orders from ALL users
app.get('/api/admin/orders', verifyAdmin, async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [
                { model: User, attributes: ['name', 'email', 'phone'] }, 
                { model: OrderItem }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch admin orders" });
    }
});

// Admin Route: Change Order Status (e.g. Processing -> Shipped)
app.put('/api/admin/orders/:id/status', verifyAdmin, async (req, res) => {
    try {
        const orderId = req.params.id;
        const { status } = req.body;
        
        const order = await Order.findByPk(orderId);
        if (!order) return res.status(404).json({ message: "Order not found" });

        order.status = status;
        await order.save();

        res.json({ message: "Order status updated successfully!", order });
    } catch (err) {
        res.status(500).json({ error: "Failed to update order status" });
    }
});


// --- ZONE 7: START THE ENGINE ---
app.listen(PORT, () => {
  console.log(`🚀 REVVO Server flying at http://localhost:${PORT}`);
});