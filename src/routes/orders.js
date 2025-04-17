import express from 'express';
import Order from '../models/Order.js';
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
