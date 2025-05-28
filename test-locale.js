import os from 'os';

const locale = Intl.NumberFormat().resolvedOptions().locale;
const amount = 1234.56;
const currency = new Intl.NumberFormat(locale, { style: 'currency', currency: 'UAH' }).format(amount);

console.log('🌍 ОС мова:', os.userInfo().username);
console.log('🌐 Intl.locale:', locale);
console.log('💸 Валюта:', currency);

const process = require('process');

// Фіксовані значення, як у підписі
const signatureParts = [
  'latore_shop',
  'latore.shop',
  'test-order-id',
  Math.floor(Date.now() / 1000).toString(),
  '1950.00',
  'UAH', // ← перевіряємо, чи перетвориться це
  'брюки палаццо',
  '1',
  '1950.00'
];

const signatureLine = signatureParts.join(';');

console.log('🧪 Стрічка підпису (join):', signatureLine);
console.log('🌍 LANG з process.env:', process.env.LANG || '⛔ не встановлено');
console.log('🖥️ OS locale (може бути мовчазно EN):', Intl.DateTimeFormat().resolvedOptions().locale);
