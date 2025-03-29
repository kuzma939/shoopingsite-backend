const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 3001;

// ✅ Налаштування CORS — дозволяє запити з localhost і Vercel
app.use(cors({
  origin: [
    'http://localhost:3000',           // локальний фронтенд
    'https://www.latore.shop' // твій фронтенд-домен на Vercel
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 🧩 Маршрути
const cartRoutes = require('./routes/cart');
app.use('/api/cart', cartRoutes);

const seedProducts = require('./routes/seedProducts');
app.use('/api/seed-products', seedProducts);

const migrate = require('./routes/migrate');
app.use('/apply-migrations', migrate);

// 🔍 Маршрут для перегляду всіх продуктів
app.get('/api/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// ✅ Запуск сервера
app.listen(PORT, () => {
    console.log(`🔧 Server is running on http://localhost:${PORT}`);

});