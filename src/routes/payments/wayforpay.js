import express from 'express';
import crypto from 'crypto';
import TempOrder from '../../models/TempOrder.js';
import CartItem from '../../models/CartItem.js';
import Order from '../../models/Order.js';
import { sendClientConfirmation, sendAdminNotification } from '../../utils/mailer.js';

const router = express.Router();

function generateSignature(secretKey, values) {
  const dataString = values.join(';');
  return crypto.createHmac('md5', secretKey).update(dataString).digest('hex');
}

// ✅ Обробка редиректу після оплати
const redirectToSuccess = (req, res) => {
  const orderId = req.query.order || req.body.order;
  if (!orderId) return res.redirect(302, 'https://www.latore.store');
  res.redirect(302, `https://www.latore.shop/payment-success?order=${orderId}`);
};

//router.get('/success', redirectToSuccess);
//router.post('/success', redirectToSuccess);
router.all('/success', (req, res) => {
  console.log('WFP success hit:', req.method, req.url);
  const orderId = req.query.order || req.body?.order || req.body?.orderReference;
  if (!orderId) return res.redirect(302, 'https://www.latore.store');
  return res.redirect(302, `https://www.latore.store/payment-success?order=${orderId}`);
});
// ✅ Ініціалізація платежу
router.post('/', async (req, res) => {
  try {
    const { order, serverUrl } = req.body;
    console.log('🧾 ORDER from frontend:', order);

    const paymentType = order?.paymentType || 'full';
    const merchantAccount = process.env.WAYFORPAY_MERCHANT;
    const merchantDomainName = 'latore.shop';
    const secretKey = process.env.WAYFORPAY_SECRET;
    const orderReference = crypto.randomUUID();
    const orderDate = Math.floor(Date.now() / 1000);

    if (!order.sessionId) return res.status(400).send('Missing sessionId');

    const cartItems = await CartItem.find({ sessionId: order.sessionId });
    if (!cartItems.length) return res.status(400).send('Cart is empty');

    const totalFromCart = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const finalAmount = paymentType === 'half'
      ? (totalFromCart / 2).toFixed(2)
      : totalFromCart.toFixed(2);

    const cleanText = (text) => String(text || '')
      .replace(/['"«»]/g, '')
      .replace(/грн|₴|\$|\s+грн/gi, '')
      .replace(/[()]/g, '')
      .trim();

    const productNames = cartItems.map(i => cleanText(i.name));
    const productCounts = cartItems.map(i => String(i.quantity));
    const productPrices = cartItems.map(i => Number(i.price).toFixed(2));

    if (!productNames.length || productNames.some(n => !n) ||
        productNames.length !== productCounts.length ||
        productNames.length !== productPrices.length) {
      console.error('❌ Invalid cart data:', { productNames, productCounts, productPrices });
      return res.status(400).send('Invalid cart data');
    }

    const signatureSource = [
      merchantAccount,
      merchantDomainName,
      orderReference,
      String(orderDate),
      finalAmount,
      'UAH',
      ...productNames,
      ...productCounts,
      ...productPrices,
    ];

    console.log('🔍 Signature source string:', signatureSource.join(';'));
    const signature = generateSignature(secretKey, signatureSource);
    console.log('✅ Signature:', signature);

    await TempOrder.create({
      orderId: orderReference,
      orderData: {
        ...order,
        paymentType,
        amount: totalFromCart.toFixed(2)
      }
    });

    res.json({
      url: 'https://secure.wayforpay.com/pay',
      params: {
        merchantAccount,
        merchantDomainName,
        orderReference,
        orderDate,
        amount: finalAmount,
        currency: 'UAH',
        productName: productNames,
        productCount: productCounts,
        productPrice: productPrices,
        serviceUrl: serverUrl,
        returnUrl: `https://shoopingsite-backend-1.onrender.com/api/payments/wayforpay/success?order=${orderReference}`,

        merchantSignature: signature,
      }
    });

  } catch (err) {
    console.error('❌ WayForPay error:', err);
    res.status(500).send('WayForPay error');
  }
});

// ✅ Callback після оплати
router.post('/callback', async (req, res) => {
  try {
    const secretKey = process.env.WAYFORPAY_SECRET;
    let parsed = req.body;

    console.log('📩 RAW CALLBACK BODY:', req.body);

    const firstKey = Object.keys(req.body)[0];
    if (firstKey && firstKey.startsWith('{') && firstKey.endsWith('}')) {
      try {
        parsed = JSON.parse(firstKey);
        console.log('✅ Parsed callback:', parsed);
      } catch (e) {
        console.error('❌ Callback JSON parse error:', e);
        return res.status(400).send('Malformed callback JSON');
      }
    }

    const normalizeMap = {
      'схвалено': 'approved',
      'затверджено': 'approved',
      'грн': 'uah',
    };

    const norm = (v) => {
      const str = (v || '').toString().trim().toLowerCase();
      return normalizeMap[str] || str;
    };

    const {
      merchantAccount, orderReference, amount, currency,
      authCode, cardPan, transactionStatus, reason,
      reasonCode, fee, paymentSystem, processingDate,
      merchantSignature
    } = parsed;

    const time = processingDate || parsed.time;

    const signatureSource = [
      norm(merchantAccount), norm(orderReference),
      Number(amount).toFixed(2), norm(currency), norm(authCode),
      norm(cardPan), norm(transactionStatus), norm(reason),
      norm(reasonCode), Number(fee).toFixed(2), norm(paymentSystem), norm(time)
    ];

    const expectedSignature = generateSignature(secretKey, signatureSource);

    console.log('🔐 Signature string:', signatureSource.join(';'));
    console.log('✅ Expected:', expectedSignature);
    console.log('📨 Received:', merchantSignature);

    const isApproved = norm(transactionStatus) === 'approved';
    const isSignatureValid = merchantSignature === expectedSignature;

    if (!isApproved) {
      console.warn('⚠️ Payment not approved — ignored');
      return res.status(200).send('Ignored');
    }

    const temp = await TempOrder.findOne({ orderId: orderReference });
    if (!temp) {
      console.warn('❌ Temp order not found');
      return res.status(404).send('Temp order not found');
    }

    if (!isSignatureValid) {
      console.warn('⚠️ Signature invalid, but payment is approved — continuing...');
    }

    const savedOrder = await Order.create({
      ...temp.orderData,
      isPaid: true,
      paymentId: orderReference,
      amountPaid: parseFloat(amount),
      amount: parseFloat(temp.orderData.amount),
    });

    await TempOrder.deleteOne({ orderId: orderReference });

    const cartItems = await CartItem.find({ sessionId: savedOrder.sessionId });
    if (cartItems.length) {
      await CartItem.deleteMany({ sessionId: savedOrder.sessionId });
    }

    try {
      await sendClientConfirmation(savedOrder);
      await sendAdminNotification(savedOrder, cartItems);
    } catch (e) {
      console.warn('📧 Email error:', e.message);
    }

    const responseTime = Math.floor(Date.now() / 1000);
    const callbackResponse = [orderReference, 'accept', responseTime];
    const responseSignature = generateSignature(secretKey, callbackResponse);

    res.json({
      orderReference,
      status: 'accept',
      time: responseTime,
      signature: responseSignature,
    });

  } catch (err) {
    console.error('❌ WayForPay callback error:', err);
    res.status(500).send('Callback error');
  }
});

export default router;
