import express from 'express';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import CartItem from '../models/CartItem.js';
import { sendClientConfirmation, sendAdminNotification } from '../utils/mailer.js';

const router = express.Router();

// GET /api/orders/status?order=<id|paymentId>
router.get('/status', async (req, res) => {
  const { order } = req.query;
  if (!order) return res.status(400).json({ isPaid: false, error: 'Missing order ID' });

  try {
    // 1) пробуємо як _id
    let found = null;
    if (mongoose.Types.ObjectId.isValid(order)) {
      found = await Order.findById(order).lean();
    }
    // 2) якщо не знайшли — як paymentId
    if (!found) {
      found = await Order.findOne({ paymentId: order }).lean();
    }

    // ⚠️ Щоб не ламати фронт, повертаємо 200 завжди, просто isPaid = false якщо не знайдено
    if (!found) return res.json({ isPaid: false });

    return res.json({ isPaid: !!found.isPaid });
  } catch (err) {
    console.error('❌ GET /api/orders/status:', err);
    return res.status(500).json({ isPaid: false });
  }
});

// POST /api/orders — створити замовлення
router.post('/', async (req, res) => {
  try {
    const order = { ...req.body };

    // 🔑 Заздалегідь генеруємо ідентифікатор для єдності з WayForPay
    const paymentId = new mongoose.Types.ObjectId();
    order._id = paymentId;          // робимо його _id документа
    order.paymentId = paymentId;     // дублюємо в окремому полі (зручно)
    order.isPaid = false;

    // ⬇️ Підтягуємо товари з корзини за sessionId
    const cartItems = await CartItem.find({ sessionId: order.sessionId }).lean();

    order.items = cartItems.map(item => ({
      name: item.name,
      productId: item.productId,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      // враховуємо знижку
      price: typeof item.discountPrice === 'number' ? item.discountPrice : item.price,
      originalPrice: item.price,
      discountPrice: item.discountPrice ?? null,
    }));

    // ⬇️ Підсумок по знижках
    const amount = cartItems.reduce((acc, item) => {
      const unit = typeof item.discountPrice === 'number' ? item.discountPrice : item.price;
      return acc + unit * item.quantity;
    }, 0);

    order.amount = Number(amount.toFixed(2));

    // ⬇️ Якщо оплата не онлайн — вважаємо не оплачено
    if (order.paymentMethod === 'no-payment') {
      order.amountPaid = 0;
    }

    const savedOrder = await Order.create(order);
    console.log('✅ Замовлення збережено:', savedOrder._id);

    // ✉️ Листи тільки для no-payment
    if (order.paymentMethod === 'no-payment') {
      await sendClientConfirmation(savedOrder);
      await sendAdminNotification(
        savedOrder,
        Array.isArray(savedOrder.items) && savedOrder.items.length > 0 ? savedOrder.items : cartItems
      );
    }

    // 🧹 Очищення корзини — тільки для no-payment
    if (order.paymentMethod === 'no-payment' && order.sessionId) {
      await CartItem.deleteMany({ sessionId: order.sessionId });
      console.log('🧹 Корзина очищена для sessionId:', order.sessionId);
    }

    // Повертаємо згенерований paymentId/_id — фронт використовує його як ?order=...
    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('❌ Помилка збереження замовлення:', error);
    res.status(500).json({ error: 'Помилка при збереженні замовлення' });
  }
});


{/*}
import express from 'express';
import Order from '../models/Order.js';
import CartItem from '../models/CartItem.js'; 
import { sendClientConfirmation, sendAdminNotification } from '../utils/mailer.js';

const router = express.Router();
// routes/orders.js
router.get('/status', async (req, res) => {
  const { order } = req.query;
  if (!order) return res.status(400).json({ error: 'Missing order ID' });

  const found = await Order.findOne({ paymentId: order });
  if (!found) return res.status(404).json({ isPaid: false });

  res.json({ isPaid: found.isPaid });
});
router.post('/', async (req, res) => {
  try {
    const order = req.body;
    console.log('📦 Отримано замовлення:', order);
    console.log('🧪 sessionId:', order.sessionId);

    // ⬇️ Отримуємо товари з корзини
    const cartItems = await CartItem.find({ sessionId: order.sessionId });

    order.items = cartItems.map(item => ({
      name: item.name,
      productId: item.productId,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
    }));

    // ⬇️ Обчислюємо повну суму замовлення
    const amount = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    order.amount = Number(amount.toFixed(2));

    // ⬇️ Якщо оплата не онлайн, вважаємо що не оплачено
    if (order.paymentMethod === 'no-payment') {
      order.amountPaid = 0;
    }

    const savedOrder = await Order.create(order);
    console.log('✅ Замовлення збережено:', savedOrder);

    // ⬇️ Надсилаємо листи, тільки якщо без онлайн-оплати
    if (order.paymentMethod === 'no-payment') {
      await sendClientConfirmation(savedOrder);
      await sendAdminNotification(
        savedOrder,
        Array.isArray(savedOrder.items) && savedOrder.items.length > 0
          ? savedOrder.items
          : cartItems
      );
    }

    // ⬇️ Очищаємо корзину, якщо без оплати
    if (order.paymentMethod === 'no-payment' && order.sessionId) {
      await CartItem.deleteMany({ sessionId: order.sessionId });
      console.log('🧹 Корзина очищена для sessionId:', order.sessionId);
    }

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('❌ Помилка збереження замовлення:', error);
    res.status(500).json({ error: 'Помилка при збереженні замовлення' });
  }
});
*/}

export default router;
