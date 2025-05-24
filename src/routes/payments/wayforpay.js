import express from 'express';
import crypto from 'crypto';
import TempOrder from '../../models/TempOrder.js';
import Order from '../../models/Order.js';
import CartItem from '../../models/CartItem.js';
import { sendClientConfirmation, sendAdminNotification } from '../../utils/mailer.js';

const router = express.Router();

function generateSignature(secretKey, values) {
  return crypto.createHmac('md5', secretKey).update(values.join(';')).digest('hex');
}

router.post('/', async (req, res) => {
  try {
    const { amount, order, resultUrl, serverUrl } = req.body;
    const merchantAccount = process.env.WAYFORPAY_MERCHANT;
    const secretKey = process.env.WAYFORPAY_SECRET;
    const orderReference = crypto.randomUUID();
    const orderDate = Math.floor(Date.now() / 1000);
    const currency = 'UAH';

    if (!order.sessionId) {
      return res.status(400).send('Missing sessionId');
    }

    const cartItems = await CartItem.find({ sessionId: order.sessionId });
    if (cartItems.length === 0) {
      return res.status(400).send('No items in cart');
    }
    const productNames = cartItems.map(i => i.name); 
    //const productNames = cartItems.map(i => i.productId); // або name, якщо зберігаєш назви
    const productCounts = cartItems.map(i => i.quantity);
    const productPrices = cartItems.map(i => i.price); // обов'язково зберігай ціну
    const signatureSource = [
        'latore_shop',            // merchantAccount
        'latore.shop',            // merchantDomainName (точно так само як у формі!)
        orderReference,           // наприклад: crypto.randomUUID()
        orderDate,                // UNIX timestamp (в секундах)
        amount,                   // number
        'UAH',                    // currency
        productNames.join(';'),   // наприклад: "Dress;Skirt"
        productCounts.join(';'),  // "1;2"
        productPrices.join(';'),  // "1000;800"
      ];
      const signature = generateSignature(secretKey, signatureSource);
      
    await TempOrder.create({ orderId: orderReference, orderData: order });
    const html = `
    <form method="POST" action="https://secure.wayforpay.com/pay">
      <input type="hidden" name="merchantAccount" value="latore_shop" />
      <input type="hidden" name="merchantDomainName" value="latore.shop" />
      <input type="hidden" name="orderReference" value="${orderReference}" />
      <input type="hidden" name="orderDate" value="${orderDate}" />
      <input type="hidden" name="amount" value="${amount}" />
      <input type="hidden" name="currency" value="UAH" />
      <input type="hidden" name="productName" value="${productNames.join(';')}" />
      <input type="hidden" name="productCount" value="${productCounts.join(';')}" />
      <input type="hidden" name="productPrice" value="${productPrices.join(';')}" />
      <input type="hidden" name="language" value="UA" />
      <input type="hidden" name="returnUrl" value="${resultUrl}" />
      <input type="hidden" name="serviceUrl" value="${serverUrl}" />
      <input type="hidden" name="merchantSignature" value="${signature}" />
      <script>document.forms[0].submit();</script>
    </form>
  `;
  

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) {
    console.error('❌ WayForPay помилка:', err);
    res.status(500).send('WayForPay error');
  }
});

router.post('/callback', async (req, res) => {
  try {
    const secretKey = process.env.WAYFORPAY_SECRET;
    const {
      merchantAccount, orderReference, amount, currency, authCode, cardPan,
      transactionStatus, reason, reasonCode, fee, paymentSystem, time, merchantSignature
    } = req.body;

    const signatureData = [
      merchantAccount, orderReference, amount, currency, authCode, cardPan,
      transactionStatus, reason, reasonCode, fee, paymentSystem, time,
    ];

    const expectedSignature = crypto
      .createHmac('md5', secretKey)
      .update(signatureData.join(';'))
      .digest('hex');

    if (merchantSignature !== expectedSignature) {
      return res.status(403).send('Invalid signature');
    }

    if (transactionStatus === 'Approved') {
      const temp = await TempOrder.findOne({ orderId: orderReference });
      if (!temp) return res.status(404).send('Temp order not found');

      const order = await Order.create({
        ...temp.orderData,
        isPaid: true,
        paymentId: orderReference,
      });

      await TempOrder.deleteOne({ orderId: orderReference });
      await sendClientConfirmation(order);
      await sendAdminNotification(order);

      if (order.sessionId) {
        await CartItem.deleteMany({ sessionId: order.sessionId });
      }

      return res.status(200).send('OK');
    }

    res.status(200).send('Ignored');
  } catch (err) {
    console.error('❌ WayForPay callback error:', err);
    res.status(500).send('Callback error');
  }
});

export default router;
