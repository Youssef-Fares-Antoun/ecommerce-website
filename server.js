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
// CRITICAL: This allows your server to read JSON data sent from Postman
app.use(express.json()); 
app.use(cookieParser()); // For parsing cookies
// Serves your frontend files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'docs')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'home.html'));
});

// --- ZONE 2: DATABASE CONNECTION ---
// Updated with your specific password: 'password'
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

// A User can have many saved Addresses
User.hasMany(Address);
Address.belongsTo(User);

const SiteReview = sequelize.define('SiteReview', {
  reviewerName: { type: DataTypes.STRING, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: false }, // 1 to 5 stars
  comment: { type: DataTypes.TEXT, allowNull: false }
});

const ProductReview = sequelize.define('ProductReview', {
  reviewerName: { type: DataTypes.STRING, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: false }, 
  comment: { type: DataTypes.TEXT, allowNull: false }
});

// ... existing ProductReview models ...
Product.hasMany(ProductReview);
ProductReview.belongsTo(Product);

// --- NEW: ORDER & ORDER ITEM MODELS ---
const Order = sequelize.define('Order', {
  totalAmount: { type: DataTypes.FLOAT, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'Processing' }
});

const OrderItem = sequelize.define('OrderItem', {
  name: { type: DataTypes.STRING, allowNull: false },
  size: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false }
});

// Link Orders to Users (A user can have many orders)
User.hasMany(Order);
Order.belongsTo(User);

// Link Items to Orders (An order can have many items)
Order.hasMany(OrderItem);
OrderItem.belongsTo(Order);

// --- ZONE 4: DB INITIALIZATION ---
async function initDb() {
  try {
    // force: true resets the database every time you restart
    await sequelize.sync({ alter: true }); 
    console.log("✅ Database Synced (Persistence Mode On)");

    // Check if we already have products before seeding
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

// 1. GET ALL PRODUCTS (For your Website)
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

// 2. ADD NEW PRODUCT (For Postman Testing)
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
    const [updated] = await Product.update(req.body, {
      where: { id: id }
    });

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
    const id = req.params.id; // Grabs the ID from the URL (e.g., /api/products/4)
    const deletedCount = await Product.destroy({ where: { id: id } });

    if (deletedCount === 0) {
      return res.status(404).json({ error: "Product not found. Maybe it already hit the scrap yard?" });
    }

    res.json({ message: `Success! Product #${id} has been removed from the fleet.` });
  } catch (err) {
    res.status(500).json({ error: "Server error during deletion." });
  }
});

//3. REGISTER NEW USER
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExits = await User.findOne({ where: { email: email } });
    if (userExits) {
      return res.status(400).json({ message: "This email is already registered. Try logging in or use a different email." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name,
      email: email,
      password: hashedPassword
    });

    res.status(201).json({ 
      message: "Registration successful! Welcome to the REVVO family.", 
      user: { id: newUser.id, name: newUser.name, email: newUser.email } 
    });
  } catch (err) {
    console.error("Registration Error:", err.message);
    res.status(500).send("Server Error");
  }
});

//4. LOGIN USER
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email: email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password. Please try again." });
    }

    // Cleaned up user.rows[0].password -> user.password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid email or password. Please try again." });
    }

    // Creating security token (json web token)
    const token = jwt.sign(
      { id: user.id, email: user.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    //putting the key inside an http-only cookie so that hackers can't access it via JavaScript
    res.cookie('token', token, {
      httpOnly: true,  
      secure: process.env.NODE_ENV === 'production', // True if hosted online with HTTPS
      maxAge: 24 * 60 * 60 * 1000 // Lasts 24 hours
    });

    res.json({
      message: "Login successful! Welcome back to the REVVO family.",
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).send("Server Error");
  }
});

//4.1 Check current user 
app.get('/api/users/me', async (req, res) => {
  try {
    // Check if the browser sent the secure cookie
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });

    // Verify the cookie hasn't been tampered with
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch the user data (excluding password)
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
  // Destroys the cookie
  res.clearCookie('token');
  res.json({ message: "Logged out successfully" });
});

//5. GET ALL USERS
app.get('/api/users', async (req, res) =>{
  try{
    const allUsers = await User.findAll({
      attributes: { exclude: ['password'] }
    });

    if(allUsers.length === 0){
      return res.json({ message: "The database is connected, but there are no registered users yet."});
    }

    res.json(allUsers);
  } catch(err) {
    console.error("Diagnostic Error:", err.message);
    res.status(500).json({ error: "Failed to fetch users from the database." });
  }
});

//6. Update User Profile (Saving the shipping address and phone)
app.put('/api/users/:id', async (req, res) => {
  const userId = req.params.id;
  const { name, email, address, phone } = req.body;

  try {
    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (address) user.address = address; 
    if (phone) user.phone = phone;
    
    await user.save();

    res.json({ message: "Profile updated successfully!", 
      user: { id: user.id, name: user.name, email: user.email, address: user.address, phone: user.phone } });
  } catch (err) {
    console.error("Profile Update Error:", err.message);
    res.status(500).json({ error: "Failed to update profile. Please try again later." });
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

//7. GET ALL SITE REVIEWS
app.get('/api/site-reviews', async (req, res) => {
  try {
    const reviews = await SiteReview.findAll({ order: [['createdAt', 'DESC']] });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch site reviews" });
  }
});

//8. POST A NEW SITE REVIEW
app.post('/api/site-reviews', async (req, res) => {
  try {
    const newReview = await SiteReview.create(req.body);
    res.status(201).json(newReview);
  } catch (err) {
    res.status(400).json({ error: "Failed to add site review" });
  }
});

//9. GET REVIEWS FOR A SPECIFIC PRODUCT
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

//10. POST A NEW PRODUCT REVIEW
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

// 11. GET USER'S ORDER HISTORY (For the Garage Dashboard)
app.get('/api/orders/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });

    // Verify who is asking for the orders
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch all orders for this specific user, including the shirts inside them
    const orders = await Order.findAll({
      where: { UserId: verified.id },
      include: [OrderItem],
      order: [['createdAt', 'DESC']] // Newest orders first
    });
    
    res.json(orders);
  } catch (err) {
    console.error("Order Fetch Error:", err);
    res.status(500).json({ error: "Failed to fetch order history." });
  }
});

// 13. ADDRESS BOOK ROUTES
app.get('/api/addresses/me', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ message: "Not logged in" });
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetches all addresses, putting the default one at the top
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
    
    // Check if this is their first address
    const count = await Address.count({ where: { UserId: verified.id } });
    
    const newAddress = await Address.create({
      ...req.body,
      UserId: verified.id,
      isDefault: count === 0 // Automatically make it the default if it's their first
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
    
    // 1. Verify the address actually belongs to this user
    const address = await Address.findOne({ where: { id: addressId, UserId: verified.id } });
    if (!address) return res.status(404).json({ message: "Address not found" });

    // 2. Remove 'default' status from all of this user's addresses
    await Address.update({ isDefault: false }, { where: { UserId: verified.id } });

    // 3. Set the chosen one to default
    address.isDefault = true;
    await address.save();

    res.json({ message: "Default address updated successfully!" });
  } catch (err) {
    res.status(500).json({ error: "Failed to set default address" });
  }
});

// 12. STRIPE CHECKOUT SESSION (UPDATED)
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { cart } = req.body;

    // 1. Check who is buying this by reading their secure cookie
    const token = req.cookies.token;
    let userId = null;
    
    if (token) {
      try {
        const verified = jwt.verify(token, process.env.JWT_SECRET);
        userId = verified.id;
      } catch (err) {
        console.log("Guest checkout or invalid token");
      }
    }

    // 2. Calculate the total price of the cart
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // 3. If they are logged in, save the order to their Garage!
    if (userId) {
      const newOrder = await Order.create({
        totalAmount: total,
        status: 'Processing',
        UserId: userId
      });

      // Save each individual shirt inside the order
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

    // 4. Convert your CarTees cart into the exact format Stripe requires
    const lineItems = cart.map(item => {
      return {
        price_data: {
          currency: 'egp',
          product_data: {
            name: `${item.name} (Size: ${item.size})`,
          },
          unit_amount: Math.round(item.price * 100), 
        },
        quantity: item.quantity,
      };
    });

    // 5. Ask Stripe to create a secure checkout page
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `http://localhost:3000/index.html?payment=success`,
      cancel_url: `http://localhost:3000/checkout.html`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe Error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});


// --- ZONE 6: START THE ENGINE ---
app.listen(PORT, () => {
  console.log(`🚀 REVVO Server flying at http://localhost:${PORT}`);
});