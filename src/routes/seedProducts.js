const express = require('express');
const router = express.Router();
const prisma = require('../prisma'); // 🔥 Імпортуємо Prisma клієнт

router.post('/', async (req, res) => {
  const rawProducts = req.body;

  try {
    for (const rawProduct of rawProducts) {
      const product = {
        ...rawProduct,
        // images — залишаємо тільки рядки (відкидаємо відео або об’єкти)
        images: rawProduct.images?.filter(img => typeof img === 'string') || [],
        // sizes — передаємо напряму як масив
        sizes: rawProduct.sizes || [],
      };

      // 👉 Записуємо або оновлюємо продукт
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
