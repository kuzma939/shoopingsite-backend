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
router.post('/liqpay', (req, res) => {
  
  const { amount, resultUrl, serverUrl, order } = req.body;
  const orderId = 'order_' + Date.now(); 
  const orderData = {
    public_key: PUBLIC_KEY,
    version: '3',
    action: 'pay',
    amount,
    currency: 'UAH',
    description: 'Shop Order',
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
      let order;

      try {
        order = JSON.parse(parsed.order_id);
      } catch (err) {
        console.error('❌ Неможливо розпарсити order_id:', parsed.order_id);
        return res.status(400).send('Invalid order_id format');
      }

      const savedOrder = await Order.create(order);
      console.log('✅ Замовлення збережено через LiqPay callback');

      await sendClientConfirmation(order);
      await sendAdminNotification(order);

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

export default router;
