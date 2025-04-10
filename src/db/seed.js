const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

const seedProducts = require('./productsData.json'); // або будь-який твій масив продуктів

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await Product.deleteMany(); // очистити колекцію (опціонально)
    await Product.insertMany(seedProducts); // вставити продукти

    console.log('✅ MongoDB: Products seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB seeding error:', error);
    process.exit(1);
  }
};

seed();
