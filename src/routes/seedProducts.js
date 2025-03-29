const express = require('express');
const router = express.Router();
const prisma = require('../prisma'); // 🔥 Імпорт Prisma клієнта

router.post('/', async (req, res) => {
  const rawProducts = req.body;

  try {
    for (const rawProduct of rawProducts) {
      // 🔹 Фільтруємо лише рядкові зображення (без відео-об'єктів)
      const cleanedImages = rawProduct.images?.filter(item => typeof item === 'string') || [];

      // 🔹 Створюємо продукт з полями, які очікує база
      const product = {
        id: rawProduct.id,
        price: rawProduct.price,
        isTop: rawProduct.isTop,
        sku: rawProduct.sku,
        size: rawProduct.size,
        category: rawProduct.category,
        image: rawProduct.image,
        images: cleanedImages,          // ✅ images як JSON-масив рядків
        sizes: rawProduct.sizes || [],  // ✅ sizes як масив рядків
      };

      console.log('📦 Сейдимо продукт:', product);

      await prisma.product.upsert({
        where: { id: product.id },
        update: {
          price: product.price,
          isTop: product.isTop,
          sku: product.sku,
          size: product.size,
          category: product.category,
          image: product.image,
          images: product.images,
          sizes: product.sizes,
        },
        create: {
          id: product.id,
          price: product.price,
          isTop: product.isTop,
          sku: product.sku,
          size: product.size,
          category: product.category,
          image: product.image,
          images: product.images,
          sizes: product.sizes,
        },
      });
    }

    res.status(200).json({ message: '✅ Products successfully seeded!' });
  } catch (error) {
    console.error('❌ Seeding error:', error);
    res.status(500).json({ error: 'Failed to seed products' });
  }
});

module.exports = router;
