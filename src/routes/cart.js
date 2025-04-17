import express from 'express';
import CartItem from '../models/CartItem.js';
import Product from '../models/Product.js';

const router = express.Router();

// === GET: Отримати корзину з даними продукту ===
router.get('/', async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ message: 'Не вказано sessionId' });

  try {
    const cartItems = await CartItem.find({ sessionId });
    const productIds = cartItems.map(item => item.productId);
    const products = await Product.find({ id: { $in: productIds } });

    const formatted = cartItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      return {
        id: item._id,
        productId: item.productId,
        quantity: item.quantity,
        color: item.color,
        size: item.size,
        price: product?.price,
        image: product?.image,
        name: product?.translations?.UA?.name || product?.sku,
      };
    });

    res.json({ cart: formatted });
  } catch (error) {
    console.error('❌ Помилка при отриманні корзини:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// === POST: Додати товар ===
router.post('/', async (req, res) => {
  let { sessionId, productId, color, size, quantity = 1 } = req.body;

  try {
    quantity = parseInt(quantity) || 1;

    if (!sessionId || !productId || !color || !size) {
      return res.status(400).json({ message: 'Вкажіть всі поля' });
    }

    const product = await Product.findOne({ id: productId });
    if (!product) {
      return res.status(404).json({ message: 'Продукт не знайдено' });
    }

    const existing = await CartItem.findOne({ sessionId, productId, color, size });

    if (existing) {
      existing.quantity += quantity;
      await existing.save();
    } else {
      await CartItem.create({ sessionId, productId, color, size, quantity });
    }

    res.json({ message: 'Товар додано до корзини' });

  } catch (error) {
    console.error('❌ POST /api/cart помилка:', error);
    res.status(500).json({ message: 'Серверна помилка при додаванні товару' });
  }
});

// === PUT: Оновити кількість ===
router.put('/', async (req, res) => {
  const { cartId, quantity } = req.body;
  if (!cartId || quantity < 1) return res.status(400).json({ message: 'Некоректні дані' });

  try {
    await CartItem.findByIdAndUpdate(cartId, { quantity });
    res.json({ message: 'Кількість оновлено' });
  } catch (error) {
    console.error('❌ PUT /api/cart помилка:', error);
    res.status(500).json({ message: 'Не вдалося оновити кількість' });
  }
});

// === DELETE: Видалити товар ===
router.delete('/', async (req, res) => {
  const { cartId } = req.body;
  if (!cartId) return res.status(400).json({ message: 'Не вказано cartId' });

  try {
    await CartItem.findByIdAndDelete(cartId);
    res.json({ message: 'Товар видалено' });
  } catch (error) {
    console.error('❌ DELETE /api/cart помилка:', error);
    res.status(500).json({ message: 'Не вдалося видалити товар' });
  }
});

export default router;
