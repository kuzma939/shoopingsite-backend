import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import cartRouter from './routes/cart.js';
import seedProductsRouter from './routes/seedProducts.js';
import seedTriggerRouter from './routes/seedTrigger.js';
import paymentsRouter from './routes/payments.js';
import ordersRouter from './routes/orders.js';
import geoCitiesRouter from './routes/geoCities.js';
import Product from './models/Product.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
//
// dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ✅ MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// ✅ CORS
app.use(cors({
  origin: ['http://localhost:3000','http://localhost:3001','http://localhost:3002', 'https://shoopingsite-my9e.vercel.app', 'https://www.latore.shop'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ API routes
app.use('/api/cart', cartRouter);
app.use('/api/seed-products', seedProductsRouter);
app.use('/api/trigger-seed', seedTriggerRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/geo-cities', geoCitiesRouter);

// ✅ Products
app.get('/api/products', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (error) {
    console.error('❌ Помилка при отриманні продуктів:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

