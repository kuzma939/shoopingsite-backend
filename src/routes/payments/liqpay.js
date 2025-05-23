import express from 'express';
import crypto from 'crypto';
import Order from '../../models/Order.js';
import CartItem from '../../models/CartItem.js';
import { sendClientConfirmation, sendAdminNotification } from '../../utils/mailer.js';

const router = express.Router();

function base64(data) {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

function createSignature(privateKey, data) {
  return crypto.createHash('sha1').update(privateKey + data + privateKey).digest('base64');
}

const PUBLIC_KEY = process.env.LIQPAY_PUBLIC_KEY;
const PRIVATE_KEY = process.env.LIQPAY_PRIVATE_KEY;

router.post('/', async (req, res) => {
  try {
    const { amount, resultUrl, serverUrl, order } = req.body;
    const tempOrder = await Order.create(order);
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
      <form method="POST" action="https://www.liqpay.ua/api/3/checkout">
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

router.post('/callback', async (req, res) => {
  try {
    const { data, signature } = req.body;
    const expectedSignature = createSignature(PRIVATE_KEY, data);
    if (signature !== expectedSignature) return res.status(403).send('Invalid signature');

    const parsed = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));

    if (parsed.status === 'success' || parsed.status === 'sandbox') {
      const order = await Order.findById(parsed.order_id);
      if (!order) return res.status(404).send('Order not found');

      await sendClientConfirmation(order);
      await sendAdminNotification(order);

      if (order.sessionId) await CartItem.deleteMany({ sessionId: order.sessionId });

      return res.status(200).send('OK');
    }

    return res.status(200).send('Ignored');
  } catch (err) {
    console.error('❌ Callback LiqPay error:', err);
    return res.status(500).send('Error');
  }
});

export default router;

