import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

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
         discountPrice: rawProduct.discountPrice ?? null, 
        isTop: rawProduct.isTop ?? false,
        isSpecialOffer: rawProduct.isSpecialOffer ?? false,
        sku: rawProduct.sku,
        size: rawProduct.size,
        category: rawProduct.category,
        image: rawProduct.image,
        images: cleanedImages,
        sizes: cleanedSizes,
        translations: rawProduct.translations ?? {},
      };

      // ⬆️ Якщо продукт існує — оновити, інакше — створити
      await Product.findOneAndUpdate(
        { id: product.id },
        product,
        { upsert: true, new: true }
      );
    }

    res.status(200).json({ message: '✅ Products successfully seeded to MongoDB!' });
  } catch (error) {
    console.error('❌ MongoDB seeding error:', error);
    res.status(500).json({ error: 'Failed to seed products' });
  }
});

export default router;
