const express = require('express');
const router = express.Router();
const prisma = require('../prisma'); // 🔥 Імпортуємо готовий екземпляр

router.post('/', async (req, res) => {
  const products = req.body;

  try {
    for (const product of products) {
      await prisma.product.upsert({
        where: { id: product.id },
        update: {
          price: product.price,
          isTop: product.isTop,
          sku: product.sku,
          size: product.size,
          category: product.category,
          image: product.image,
          // ❌ вкладені поля краще не оновлювати напряму — можна додати окрему логіку
        },
        create: {
          id: product.id,
          price: product.price,
          isTop: product.isTop,
          sku: product.sku,
          size: product.size,
          category: product.category,
          image: product.image,

          images: {
            create: product.images?.map(img => ({
              url: img.url,
            })) || [],
          },
          sizes: {
            create: product.sizes?.map(size => ({
              value: size.value,
            })) || [],
          },
          translations: {
            create: product.translations?.map(t => ({
              locale: t.locale,
              name: t.name,
              description: t.description,
              category: t.category,
              colors: t.colors,
            })) || [],
          },
        },
      });
    }

    res.status(200).json({ message: 'Products successfully seeded!' });
  } catch (error) {
    console.error('❌ Seeding error:', error);
    res.status(500).json({ error: 'Failed to seed products' });
  }
});

module.exports = router;
