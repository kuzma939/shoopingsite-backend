import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';

import express from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import Order from '../models/Order.js';
import CartItem from '../models/CartItem.js';
import TempOrder from '../models/TempOrder.js';
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
  // === 🔐 Підпис для Fondy
function generateFondySignature(secretKey, params) {
  const filtered = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([_, v]) => v);

  const signatureString = [secretKey, ...filtered, secretKey].join('|');
  return crypto.createHash('sha1').update(signatureString).digest('hex');
}
router.post('/fondy', async (req, res) => {
  try {
    const { amount, resultUrl, serverUrl, order } = req.body;
    const tempId = crypto.randomUUID();

    // 1. Зберігаємо тимчасове замовлення
    await TempOrder.create({ orderId: tempId, orderData: order });

    // 2. Параметри Fondy
    const request = {
      merchant_id: process.env.FONDY_MERCHANT_ID,
      order_id: tempId,
      amount: amount * 100, // у копійках!
      currency: 'UAH',
      order_desc: 'Оплата товару на latore.shop',
      response_url: resultUrl,
      server_callback_url: serverUrl,
    };

    const data = Buffer.from(JSON.stringify({ request })).toString('base64');
    const signature = generateFondySignature(process.env.FONDY_SECRET_KEY, request);

    // 3. Генеруємо HTML-форму
    const html = `
      <form method="POST" action="https://pay.fondy.eu/api/checkout/redirect/" accept-charset="utf-8">
        <input type="hidden" name="data" value="${data}" />
        <input type="hidden" name="signature" value="${signature}" />
        <script>document.forms[0].submit();</script>
      </form>
    `;
    console.log('🧾 Fondy запит:', {
      request,
      data,
      signature,
    });
    
    res.send(html);
  } catch (err) {
    console.error('❌ Створення Fondy-форми:', err.message, err.stack);

    res.status(500).send('Помилка створення форми');
  }
});

// === 📬 Callback від Fondy
router.post('/fondy-callback', async (req, res) => {
  try {
    const { data, signature } = req.body;
    if (!data || !signature) {
      console.warn('❗ Порожній callback або підпис');
      return res.status(400).send('Missing data or signature');
    }

    const decoded = Buffer.from(data, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    const response = parsed.response || parsed;

    const expectedSignature = generateFondySignature(process.env.FONDY_SECRET_KEY, response);
    if (signature !== expectedSignature) {
      console.warn('⚠️ Підпис Fondy невірний!');
      return res.status(403).send('Invalid signature');
    }

    // ✅ Оплата пройшла
    if (response.order_status === 'approved') {
      const temp = await TempOrder.findOne({ orderId: response.order_id });

      if (!temp) {
        return res.status(404).send('Temp order not found');
      }

      const order = await Order.create({
        ...temp.orderData,
        isPaid: true,
        paymentId: response.payment_id,
        orderId: response.order_id,
      });

      await TempOrder.deleteOne({ orderId: response.order_id });

      await sendClientConfirmation(order);
      await sendAdminNotification(order);

      if (order.sessionId) {
        await CartItem.deleteMany({ sessionId: order.sessionId });
        console.log('🧹 Кошик очищено:', order.sessionId);
      }

      return res.status(200).send('OK');
    }

    console.log('🕓 Замовлення не підтверджене (order_status):', response.order_status);
    return res.status(200).send('Ignored');
  } catch (err) {
    
    console.error('❌ Створення Fondy-форми:', err);
   
    res.status(500).send('Callback error');
  }
});

export default router;