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
    // ⬇️ Отримуємо товари з CartItem
    const cartItems = await CartItem.find({ sessionId: order.sessionId });

    order.items = cartItems.map(item => ({
      name: item.name,
      productId: item.productId,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
    }));

    const savedOrder = await Order.create(order);
    console.log('✅ Замовлення збережено:', savedOrder);

    // ⬇️ Надіслати листи
    if (order.paymentMethod === 'no-payment') {
  await sendClientConfirmation(order);
  await sendAdminNotification(
    order,
    Array.isArray(order.items) && order.items.length > 0 ? order.items : cartItems
  );
}
{/*
    if (order.paymentMethod === 'no-payment') {
      await sendClientConfirmation(order);
      await sendAdminNotification(order, order.items.length ? order.items : cartItems);
await sendAdminNotification(order, cartItems); // ✅ Виправлення тут
    }*/}
// 🧹 Очистити корзину тільки якщо це замовлення без оплати
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

export default router;
