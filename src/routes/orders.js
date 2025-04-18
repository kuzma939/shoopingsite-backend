import express from 'express';
import Order from '../models/Order.js';
import CartItem from '../models/CartItem.js'; 
import { sendClientConfirmation, sendAdminNotification } from '../utils/mailer.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const order = req.body;
    console.log('📦 Отримано замовлення:', order);

    const savedOrder = await Order.create(order);
    console.log('✅ Замовлення збережено:', savedOrder);

    // ⬇️ Надіслати листи
    await sendClientConfirmation(order);
    await sendAdminNotification(order);

    // 🧹 Очистити корзину після замовлення
    if (order.sessionId) {
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
{/*
import express from 'express';
import Order from '../models/Order.js';
import CartItem from '../models/CartItem.js';
import { sendClientConfirmation, sendAdminNotification } from '../utils/mailer.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const order = req.body;
    console.log('📦 Отримано замовлення:', order);

    const savedOrder = await Order.create(order);
    console.log('✅ Замовлення збережено:', savedOrder);

    // ⬇️ Надіслати листи
    await sendClientConfirmation(order);
    await sendAdminNotification(order);

    res.status(201).json(savedOrder);
  } catch (error) {
    console.error('❌ Помилка збереження замовлення:', error);
    res.status(500).json({ error: 'Помилка при збереженні замовлення' });
  }
});

export default router;
*/}