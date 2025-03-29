const express = require('express');
const router = express.Router();
const prisma = require('../prisma');

router.post('/', async (req, res) => {
  const rawProducts = req.body;

  try {
    for (const rawProduct of rawProducts) {
      const product = {
        ...rawProduct,
        images: rawProduct.images
          ?.filter(img => typeof img === 'string')
          .map(url => ({ url })) || [],
        sizes: rawProduct.sizes?.map(value => ({ value })) || [],
        // 🔻 translations більше не потрібні
      };

      await prisma.product.upsert({
        where: { id: product.id },
        update: {
          price: product.price,
          isTop: product.isTop,
          sku: product.sku,
          size: product.size,
          category: product.category,
          image: product.image,
        },
        create: {
          id: product.id,
          price: product.price,
          isTop: product.isTop,
          sku: product.sku,
          size: product.size,
          category: product.category,
          image: product.image,
          images: { create: product.images },
          sizes: { create: product.sizes },
          // 🔻 translations видалено
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
