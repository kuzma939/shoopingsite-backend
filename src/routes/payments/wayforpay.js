{/*}
import express from 'express';
import crypto from 'crypto';
import TempOrder from '../../models/TempOrder.js';
import CartItem from '../../models/CartItem.js';

const router = express.Router();

function generateSignature(secretKey, values) {
  const dataString = values.join(';');
  return crypto.createHmac('md5', secretKey).update(dataString).digest('hex');
}

router.post('/', async (req, res) => {
  try {
    const { amount, order, resultUrl, serverUrl } = req.body;
    console.log('🧾 ORDER from frontend:', order);

    const merchantAccount = process.env.WAYFORPAY_MERCHANT;
    const merchantDomainName = 'latore.shop';
    const secretKey = process.env.WAYFORPAY_SECRET;
    const orderReference = crypto.randomUUID();
    const orderDate = Math.floor(Date.now() / 1000);

    if (!order.sessionId) return res.status(400).send('Missing sessionId');

    const cartItems = await CartItem.find({ sessionId: order.sessionId });
    if (!cartItems.length) return res.status(400).send('Cart is empty');

    const cleanAmount = typeof amount === 'string'
      ? amount.replace(/\s/g, '').replace(/[^\d.]/g, '')
      : amount;
    const formattedAmount = Number(cleanAmount).toFixed(2);
    const cleanText = (text) =>
      String(text || '')
        .replace(/['"«»]/g, '')       // лапки
        .replace(/грн|₴|\$|\s+грн/gi, '') // валюта + пробіл перед нею
        .replace(/[\(\)]/g, '')       // дужки
        .trim();
        const productNames = cartItems.map(i => cleanText(i.name));
    
    const productCounts = cartItems.map(i => String(i.quantity));
    const productPrices = cartItems.map(i => Number(i.price).toFixed(2));

    if (
      !productNames.length ||
      productNames.some(n => !n) ||
      productNames.length !== productCounts.length ||
      productNames.length !== productPrices.length
    ) {
      console.error('❌ Дані невалідні:', {
        productNames,
        productCounts,
        productPrices
      });
      return res.status(400).send('Invalid cart data');
    }

    const signatureSource = [
      merchantAccount,
      merchantDomainName,
      orderReference,
      String(orderDate),
      formattedAmount,
      'UAH',
      ...productNames,
      ...productCounts,
      ...productPrices,
    ];

    console.log('🔍 DEBUG signatureSource elements:');
    signatureSource.forEach((v, i) => {
      console.log(`${i + 1}.`, JSON.stringify(v));
    });

    const signature = generateSignature(secretKey, signatureSource);
    console.log('📐 Стрічка підпису:', signatureSource.join(';'));
    console.log('✅ Підпис:', signature);

    await TempOrder.create({ orderId: orderReference, orderData: order });

    const html = `
      <form method="POST" action="https://secure.wayforpay.com/pay">
        <input type="hidden" name="merchantAccount" value="${merchantAccount}" />
        <input type="hidden" name="merchantDomainName" value="${merchantDomainName}" />
        <input type="hidden" name="orderReference" value="${orderReference}" />
        <input type="hidden" name="orderDate" value="${orderDate}" />
        <input type="hidden" name="amount" value="${formattedAmount}" />
        <input type="hidden" name="currency" value="UAH" />

        ${productNames.map(p => `<input type="hidden" name="productName" value="${p}" />`).join('')}
        ${productCounts.map(c => `<input type="hidden" name="productCount" value="${c}" />`).join('')}
        ${productPrices.map(p => `<input type="hidden" name="productPrice" value="${p}" />`).join('')}
        
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

export default router;
import express from 'express';
import crypto from 'crypto';
import TempOrder from '../../models/TempOrder.js';
import CartItem from '../../models/CartItem.js';

const router = express.Router();

function generateSignature(secretKey, values) {
  const dataString = values.join(';');
  console.log('📐 Стрічка підпису (фіксована):', dataString);
  return crypto.createHmac('md5', secretKey).update(dataString).digest('hex');
}

router.post('/', async (req, res) => {
  try {
    const { amount, order, resultUrl, serverUrl } = req.body;

    const merchantAccount = process.env.WAYFORPAY_MERCHANT;
    const merchantDomainName = 'latore.shop';
    const secretKey = process.env.WAYFORPAY_SECRET;
    const orderReference = crypto.randomUUID();
    const orderDate = Math.floor(Date.now() / 1000);
    const currency = 'UAH';

    if (!order.sessionId) {
      return res.status(400).send('Missing sessionId');
    }

    const cartItems = await CartItem.find({ sessionId: order.sessionId });
    if (!cartItems.length) {
      return res.status(400).send('Cart is empty');
    }

    // 🧼 Очищення суми від пробілів, ₴, грн, коми
    const cleanAmount = typeof amount === 'string'
      ? amount.replace(/[^\d.,]/g, '').replace(/\s/g, '').replace(',', '.')
      : amount;

    const formattedAmount = Number(cleanAmount).toFixed(2);

    // 🧹 Назви, ціни, кількості
    const productNamesArray = cartItems.map(i =>
      String(i.name || i.назва || '')
        .replace(/(грн|₴|uah)/gi, '')
        .replace(/[^\p{L}\p{N} _.,-]/gu, '')
        .replace(/\s+/g, ' ')
        .trim()
    );

    const productCountsArray = cartItems.map(i => String(i.quantity));

    const productPricesArray = cartItems.map(i =>
      Number(
        String(i.price || i.ціна || '')
          .replace(/(грн|₴|uah)/gi, '')
          .replace(/[^\d.]/g, '')
      ).toFixed(2)
    );

    // 🔗 Для підпису — рядки через ;
    const productNames = productNamesArray.join(';');
    const productCounts = productCountsArray.join(';');
    const productPrices = productPricesArray.join(';');

    const signatureSource = [
      merchantAccount,
      merchantDomainName,
      orderReference,
      String(orderDate),
      formattedAmount,
      currency,
      productNames,
      productCounts,
      productPrices
    ];

    // 🕵️‍♀️ Логи для діагностики
    console.log('🔍 Елементи підпису DEBUG:');
    signatureSource.forEach((val, i) => {
      console.log(`${i + 1}.`, JSON.stringify(val));
      if (/грн|uah|₴/i.test(val)) {
        console.warn('❗️⚠️ УВАГА! У підпис просочився символ валюти:', val);
      }
    });

    const signature = generateSignature(secretKey, signatureSource);
    console.log('✅ Підпис HMAC MD5:', signature);

    // 💾 Зберігаємо тимчасове замовлення
    await TempOrder.create({ orderId: orderReference, orderData: order });

    // 🧾 HTML форма WayForPay
    const html = `
      <form method="POST" action="https://secure.wayforpay.com/pay">
        <input type="hidden" name="merchantAccount" value="${merchantAccount}" />
        <input type="hidden" name="merchantDomainName" value="${merchantDomainName}" />
        <input type="hidden" name="orderReference" value="${orderReference}" />
        <input type="hidden" name="orderDate" value="${orderDate}" />
        <input type="hidden" name="amount" value="${formattedAmount}" />
        <input type="hidden" name="currency" value="${currency}" />
        <input type="hidden" name="productName" value="${productNames}" />
        <input type="hidden" name="productCount" value="${productCounts}" />
        <input type="hidden" name="productPrice" value="${productPrices}" />
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
    console.error('❌ Внутрішня помилка WayForPay:', err);
    res.status(500).send('WayForPay error');
  }
});

export default router;
   */}import express from 'express';
import crypto from 'crypto';
import TempOrder from '../../models/TempOrder.js';
import CartItem from '../../models/CartItem.js';

const router = express.Router();

function generateSignature(secretKey, values) {
  return crypto.createHmac('md5', secretKey).update(values.join(';')).digest('hex');
}

router.post('/', async (req, res) => {
  try {
    const { amount, order, resultUrl, serverUrl } = req.body;
    console.log('🧾 ORDER from frontend:', order);

    const merchantAccount = process.env.WAYFORPAY_MERCHANT;
    const merchantDomainName = 'latore.shop';
    const secretKey = process.env.WAYFORPAY_SECRET;
    const orderReference = crypto.randomUUID();
    const orderDate = Math.floor(Date.now() / 1000);
    const currency = 'UAH'; // ВАЖЛИВО: тільки UAH
    if (currency !== 'UAH') {
        console.error('❌ currency не валідна:', currency);
      }
      
    if (!order.sessionId) return res.status(400).send('Missing sessionId');
    const cartItems = await CartItem.find({ sessionId: order.sessionId }).populate('productId');

    if (!cartItems.length) return res.status(400).send('Cart is empty');
    console.log('🧾 CART ITEMS:', cartItems.map(item => item.name || item.productName || item));

    // 🔹 Очищення та форматування
    const cleanAmount = typeof amount === 'string'
  ? amount.replace(/[^\d.]/g, '') // прибирає все крім цифр і крапки
  : amount;

const formattedAmount = Number(cleanAmount).toFixed(2);

    const productNames = cartItems.map(i =>
        String(i.name)
          .replace(/грн/gi, '')
          .replace(/'/g, "’")   // ← заміна одинарних лапок
          .replace(/"/g, "")  
          .replace(/['"]/g, '')  // ← прибрати подвійні лапки, якщо є
          .trim()
      );
     
    const productCounts = cartItems.map(i =>
      String(i.quantity)
    );
    const productPrices = cartItems.map(i =>
      Number(i.price).toFixed(2)
    );

    // 🔐 Формування підпису
    const signatureSource = [
      merchantAccount,
      merchantDomainName,
      orderReference,
      orderDate.toString(),
      formattedAmount,
      currency,
      ...productNames,
      ...productCounts,
      ...productPrices
    ].map(v => String(v).trim());

    console.log('📐 Стрічка підпису:', signatureSource.join(';'));
    const signature = generateSignature(secretKey, signatureSource);
    console.log('✅ Підпис:', signature);

    // ⏳ Зберегти тимчасове замовлення
    await TempOrder.create({ orderId: orderReference, orderData: order });

    // 🧾 Генерація HTML-форми
    const html = `
      <form method="POST" action="https://secure.wayforpay.com/pay">
        <input type="hidden" name="merchantAccount" value="${merchantAccount}" />
        <input type="hidden" name="merchantDomainName" value="${merchantDomainName}" />
        <input type="hidden" name="orderReference" value="${orderReference}" />
        <input type="hidden" name="orderDate" value="${orderDate}" />
        <input type="hidden" name="amount" value="${formattedAmount}" />
        <input type="hidden" name="currency" value="${currency}" />
        ${productNames.map(p => `<input type="hidden" name="productName" value="${p}" />`).join('')}
        ${productCounts.map(c => `<input type="hidden" name="productCount" value="${c}" />`).join('')}
        ${productPrices.map(p => `<input type="hidden" name="productPrice" value="${p}" />`).join('')}
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
        merchantAccount,
        orderReference,
        amount,
        currency,
        authCode,
        cardPan,
        transactionStatus,
        reason,
        reasonCode,
        fee,
        paymentSystem,
        time,
        merchantSignature,
      } = req.body;
  
      // ⚠️ Створюємо правильну сигнатуру (всі значення мають бути в тому ж порядку, що й на сайті WayForPay)
      const signatureSource = [
        merchantAccount,
        orderReference,
        amount,
        currency,
        authCode,
        cardPan,
        transactionStatus,
        reason,
        reasonCode,
        fee,
        paymentSystem,
        time,
      ];
  
      const expectedSignature = crypto
        .createHmac('md5', secretKey)
        .update(signatureSource.join(';'))
        .digest('hex');
  
      // ✅ Перевірка підпису
      if (merchantSignature !== expectedSignature) {
        console.warn('❌ Invalid signature in callback');
        return res.status(403).send('Invalid signature');
      }
  
      // ✅ Якщо платіж успішний — зберігаємо замовлення
      if (transactionStatus === 'Approved') {
        const temp = await TempOrder.findOne({ orderId: orderReference });
        if (!temp) return res.status(404).send('Temp order not found');
  
        const savedOrder = await Order.create({
          ...temp.orderData,
          isPaid: true,
          paymentId: orderReference,
        });
  
        await TempOrder.deleteOne({ orderId: orderReference });
  
        // ⏩ Надіслати пошту
        await sendClientConfirmation(savedOrder);
        await sendAdminNotification(savedOrder);
  
        // ⛔️ Очистити корзину
        if (savedOrder.sessionId) {
          await CartItem.deleteMany({ sessionId: savedOrder.sessionId });
        }
  
        return res.status(200).send('OK');
      }
  
      // Якщо не Approved — просто ігноруємо
      res.status(200).send('Ignored');
    } catch (err) {
      console.error('❌ WayForPay callback error:', err);
      res.status(500).send('Callback error');
    }
  });

export default router;
