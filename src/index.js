// 📁 src/index.js
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

// ✅ Автоматичне застосування міграцій при старті
exec('npx prisma migrate deploy', (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Migration error:', stderr);
  } else {
    console.log('✅ Migrations applied:', stdout);
  }
});

// ✅ CORS
app.use(cors({
  origin: ['http://localhost:3000', 'https://www.latore.shop'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Маршрути
const cartRoutes = require('./routes/cart');
app.use('/api/cart', cartRoutes);

const seedProducts = require('./routes/seedProducts');
app.use('/api/seed-products', seedProducts);

// ✅ Продукти (GET all)
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
