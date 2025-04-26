import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import Order from '../models/Order.js';
import CartItem from '../models/CartItem.js';
import { sendClientConfirmation, sendAdminNotification } from '../utils/mailer.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY;
const PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY;

// === 🔧 Хелпери
function base64(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

function createSignature(privateKey, data) {
  return crypto
    .createHash('sha1')
    .update(privateKey + data + privateKey)
    .digest('base64');
}

// === 💳 Stripe оплата
router.post('/stripe', async (req, res) => {
  const { amount, successUrl, cancelUrl } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Shop Order',
            },
            unit_amount: Math.round(amount * 100), // сума в центах
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('❌ Stripe помилка:', err);
    res.status(500).json({ error: 'Stripe checkout failed' });
  }
});

// === 📦 LiqPay HTML-форма
router.post('/liqpay', async (req, res) => {
    try {
      const { amount, resultUrl, serverUrl, order } = req.body;
  
      // 1. Зберігаємо замовлення в базу
      const tempOrder = await Order.create(order);
  
      // 2. Передаємо лише ID
      const orderId = tempOrder._id.toString();
  
      const orderData = {
        public_key: PUBLIC_KEY,
        version: '3',
        action: 'pay',
        amount,
        currency: 'UAH',
        description: 'Замовлення в магазині',
        order_id: orderId,
        result_url: resultUrl,
        server_url: serverUrl,
      };
  
      const data = base64(orderData);
      const signature = createSignature(PRIVATE_KEY, data);
  
      const html = `
        <form method="POST" action="https://www.liqpay.ua/api/3/checkout" accept-charset="utf-8">
          <input type="hidden" name="data" value="${data}" />
          <input type="hidden" name="signature" value="${signature}" />
          <input type="submit" value="Pay with LiqPay" />
        </form>
      `;
  
      res.send(html);
    } catch (err) {
      console.error('❌ LiqPay генерація HTML:', err);
      res.status(500).send('Помилка генерації форми LiqPay');
    }
  });
  
// === ✅ LiqPay Callback
router.post('/payment-callback', async (req, res) => {
    try {
      console.log('📨 CALLBACK BODY:', req.body);
  
      const { data, signature } = req.body;
      const expectedSignature = createSignature(PRIVATE_KEY, data);
  
      if (signature !== expectedSignature) {
        console.warn('⚠️ Невірний підпис від LiqPay');
        return res.status(403).send('Invalid signature');
      }
  
      const decoded = Buffer.from(data, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
  
      console.log('📬 Callback від LiqPay:', parsed);
  
      if (parsed.status === 'success' || parsed.status === 'sandbox') {
        const orderId = parsed.order_id;
  
        const order = await Order.findById(orderId);
        if (!order) {
          console.warn('❗️ Замовлення не знайдено в базі:', orderId);
          return res.status(404).send('Order not found');
        }
  
        // 🔔 Надсилаємо email
        await sendClientConfirmation(order);
        await sendAdminNotification(order);
  
        // 🧹 Очищаємо кошик
        if (order.sessionId) {
          await CartItem.deleteMany({ sessionId: order.sessionId });
          console.log('🧹 Корзина очищена:', order.sessionId);
        }
  
        return res.status(200).send('OK');
      } else {
        console.warn('⚠️ Оплата неуспішна:', parsed.status);
        return res.status(200).send('Ignored');
      }
    } catch (err) {
      console.error('❌ Callback LiqPay error:', err);
      return res.status(500).send('Error');
    }
  });
  router.post('/fondy', async (req, res) => {
    try {
      const { amount, resultUrl, serverUrl } = req.body;
      const orderId = crypto.randomUUID();
  
      const fondyData = {
        merchant_id: process.env.FONDY_MERCHANT_ID,
        order_id: orderId,
        amount: amount * 100,
        currency: 'UAH',
        order_desc: 'Тестова покупка',
        response_url: resultUrl,
        server_callback_url: serverUrl,
      };
  
      const queryString = new URLSearchParams(fondyData).toString();
      const data = Buffer.from(queryString).toString('base64');
  
      const signature = crypto
        .createHash('sha1')
        .update(process.env.FONDY_SECRET_KEY + data + process.env.FONDY_SECRET_KEY)
        .digest('base64');
  
      const html = `
        <form method="POST" action="https://pay.fondy.eu/api/checkout/redirect/" accept-charset="utf-8">
          <input type="hidden" name="data" value="${data}" />
          <input type="hidden" name="signature" value="${signature}" />
        </form>
        <script>document.forms[0].submit();</script>
      `;
  
      console.log('✅ Fondy HTML сгенеровано');
      res.send(html);
    } catch (err) {
      console.error('❌ Fondy помилка:', err);
      res.status(500).send('Помилка генерації форми Fondy');
    }
  });
  
// === ✅ Fondy Callback
router.post('/fondy-callback', async (req, res) => {
  try {
    const { data, signature } = req.body;
    const expectedSignature = createSignature(process.env.FONDY_SECRET_KEY, data);

    if (signature !== expectedSignature) {
      console.warn('⚠️ Невірний підпис від Fondy');
      return res.status(403).send('Invalid signature');
    }

    const decoded = Buffer.from(data, 'base64').toString('utf-8');
    const parsed = Object.fromEntries(new URLSearchParams(decoded));

    console.log('📬 Callback від Fondy:', parsed);

    if (parsed.order_status === 'approved') {
      const order = await Order.findById(parsed.order_id);

      if (!order) {
        console.warn('❗️ Замовлення не знайдено:', parsed.order_id);
        return res.status(404).send('Order not found');
      }

      order.isPaid = true;
      order.paymentId = parsed.payment_id;
      await order.save();

      await sendClientConfirmation(order);
      await sendAdminNotification(order);

      if (order.sessionId) {
        await CartItem.deleteMany({ sessionId: order.sessionId });
        console.log('🧹 Кошик очищено:', order.sessionId);
      }

      return res.status(200).send('OK');
    } else {
      console.warn('⚠️ Оплата не пройшла:', parsed.order_status);
      return res.status(200).send('Ignored');
    }
  } catch (err) {
    console.error('❌ Fondy callback помилка:', err);
    return res.status(500).send('Callback error');
  }
});

export default router;
