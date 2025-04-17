import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Product from '../models/Product.js';
import seedProducts from './productsData.json' assert { type: 'json' };

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await Product.deleteMany(); // очистити колекцію
    await Product.insertMany(seedProducts); // вставити продукти

    console.log('✅ MongoDB: Products seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ MongoDB seeding error:', error);
    process.exit(1);
  }
};

seed();
