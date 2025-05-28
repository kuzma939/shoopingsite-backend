import express from 'express';
import crypto from 'crypto';
import TempOrder from '../../models/TempOrder.js';
import Order from '../../models/Order.js';
import CartItem from '../../models/CartItem.js';
import { sendClientConfirmation, sendAdminNotification } from '../../utils/mailer.js';

const router = express.Router();

// Функція для генерації підпису Fondy
function generateFondySignature(secretKey, params) {
  const filtered = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([_, v]) => v);

  const signatureString = [secretKey, ...filtered, secretKey].join('|');
  return crypto.createHash('sha1').update(signatureString).digest('hex');
}

// === POST /api/payments/fondy ===
router.post('/', async (req, res) => {
  try {
    const { amount, resultUrl, serverUrl, order } = req.body;

    const tempId = crypto.randomUUID();
    await TempOrder.create({ orderId: tempId, orderData: order });

    const request = {
      merchant_id: process.env.FONDY_MERCHANT_ID,
      order_id: tempId,
      amount: amount * 100, // копійки
      currency: 'UAH',
      order_desc: 'Оплата товару на latore.shop',
      response_url: resultUrl,
      server_callback_url: serverUrl,
    };

    const data = Buffer.from(JSON.stringify({ request })).toString('base64');
    const signature = generateFondySignature(process.env.FONDY_SECRET_KEY, request);

    const html = `
      <form method="POST" action="https://pay.fondy.eu/api/checkout/redirect/">
        <input type="hidden" name="data" value="${data}" />
        <input type="hidden" name="signature" value="${signature}" />
        <script>document.forms[0].submit();</script>
      </form>
    `;

    res.send(html);
  } catch (err) {
    console.error('❌ Fondy:', err);
    res.status(500).send('Помилка створення форми');
  }
});

// === POST /api/payments/fondy/callback ===
router.post('/callback', async (req, res) => {
  try {
    const { data, signature } = req.body;
    const response = JSON.parse(Buffer.from(data, 'base64').toString('utf-8')).response;

    const expectedSignature = generateFondySignature(process.env.FONDY_SECRET_KEY, response);
    if (signature !== expectedSignature) return res.status(403).send('Invalid signature');

    if (response.order_status === 'approved') {
      const temp = await TempOrder.findOne({ orderId: response.order_id });
      if (!temp) return res.status(404).send('Temp order not found');

      const order = await Order.create({
        ...temp.orderData,
        isPaid: true,
        paymentId: response.payment_id,
      });

      await TempOrder.deleteOne({ orderId: response.order_id });

      await sendClientConfirmation(order);
      await sendAdminNotification(order);

      if (order.sessionId) {
        await CartItem.deleteMany({ sessionId: order.sessionId });
      }

      return res.status(200).send('OK');
    }

    res.status(200).send('Ignored');
  } catch (err) {
    console.error('❌ Fondy callback error:', err);
    res.status(500).send('Callback error');
  }
});

export default router;
