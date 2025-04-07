const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

router.post('/', async (req, res) => {
  const rawProducts = req.body;

  try {
    for (const rawProduct of rawProducts) {
      // 🧼 Очистка images (тільки рядки, без відео-об’єктів)
      const cleanedImages = Array.isArray(rawProduct.images)
        ? rawProduct.images.filter(item => typeof item === 'string')
        : [];

      // 🧼 Очистка sizes (має бути масив рядків)
      const cleanedSizes = Array.isArray(rawProduct.sizes)
        ? rawProduct.sizes.filter(s => typeof s === 'string')
        : [];

      const product = {
        id: rawProduct.id,
        price: rawProduct.price,
        isTop: rawProduct.isTop ?? false,
        isSpecialOffer: rawProduct.isSpecialOffer ?? false, 
        sku: rawProduct.sku,
        size: rawProduct.size,
        category: rawProduct.category,
        image: rawProduct.image,
        images: cleanedImages,
        sizes: cleanedSizes,
      };

      await prisma.product.upsert({
        where: { id: product.id }, // шукає по id
  update: product,           // якщо є — оновлює
  create: product,            // якщо немає — додає
   
      });
    }

    res.status(200).json({ message: '✅ Products successfully seeded!' });
  } catch (error) {
    console.error('❌ Seeding error:', error);
    res.status(500).json({ error: 'Failed to seed products' });
  }
});

module.exports = router;

