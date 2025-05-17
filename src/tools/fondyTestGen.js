import crypto from 'crypto';

function generateFondySignature(secretKey, params) {
  const filtered = Object.entries(params)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([_, v]) => v);

  const signatureString = [secretKey, ...filtered, secretKey].join('|');
  return crypto.createHash('sha1').update(signatureString).digest('hex');
}

// 👇 ВСТАВ СВІЙ ORDER_ID з відповіді /fondy
const payload = {
  order_id: '8839b92665fc8188037cc956a956154c7a89087d',
  order_status: 'approved',
  amount: 9900,
  payment_id: 'test-payment-id'
};

// Підпис
const data = Buffer.from(JSON.stringify(payload)).toString('base64');
const signature = generateFondySignature('9w8YRyCgAo6qFiFjXoLzkZKLlGHVkiNE', payload);

console.log('\n📦 POSTMAN PAYLOAD:\n');
console.log(JSON.stringify({ data, signature }, null, 2));
