require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');

const app = express();
const PORT = process.env.PORT || 3000;

// --- ZONE 1: MIDDLEWARE ---
// CRITICAL: This allows your server to read JSON data sent from Postman
app.use(express.json()); 
// Serves your frontend files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'docs')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs', 'home.html'));
});

// --- ZONE 2: DATABASE CONNECTION ---
// Updated with your specific password: 'passsword'
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
  isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false } // NEW: The featured flag
});

const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false }
});

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

    res.json({
      message: "Login successful! Welcome back to the REVVO family.",
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    console.error("Login Error:", err.message);
    res.status(500).send("Server Error");
  }
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


// --- ZONE 6: START THE ENGINE ---
app.listen(PORT, () => {
  console.log(`🚀 REVVO Server flying at http://localhost:${PORT}`);
});