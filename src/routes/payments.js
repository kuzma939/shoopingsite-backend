import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
console.log('🧪 STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY);

const PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY;
const PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY;

// 🔧 Допоміжні функції
function base64(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

function createSignature(privateKey, data) {
  return crypto
    .createHash('sha1')
    .update(privateKey + data + privateKey)
    .digest('base64');
}

// === 📦 LiqPay ===
router.post('/liqpay', (req, res) => {
  const { amount, resultUrl, serverUrl } = req.body;

  const orderData = {
    public_key: PUBLIC_KEY,
    version: '3',
    action: 'pay',
    amount,
    currency: 'UAH',
    description: 'Order from Shopping Site',
    order_id: `order_${Date.now()}`,
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

// === 💳 Stripe ===
router.post('/stripe', async (req, res) => {
  const { amount, successUrl, cancelUrl } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Order from Shopping Site',
          },
          unit_amount: Math.round(amount * 100),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    res.status(500).json({ error: 'Stripe checkout failed' });
  }
});

// === ✅ LiqPay callback (майбутня перевірка) ===
router.post('/payment-callback', (req, res) => {
  console.log('📩 Отримано callback від LiqPay:', req.body);
  // TODO: перевірка підпису, статусу, оновлення замовлення у БД

  res.status(200).send('OK');
});

export default router;
