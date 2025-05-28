import os from 'os';

// Це значення з фронтенду
const raw = '1 234,56 грн';

// Очищення
const numericOnly = raw.replace(/[^\d.,]/g, ''); // залишає цифри, крапку і кому
console.log('🔹 Numeric only (до normalize):', numericOnly);

// Нормалізація
let cleaned = numericOnly.replace(/\s/g, '').replace(',', '.');
console.log('🧼 Cleaned number string:', cleaned);

// Перетворення в число
const finalAmount = Number(cleaned).toFixed(2);
console.log('✅ Final amount for signature:', finalAmount);

// ОС та локаль
console.log('🌍 ОС користувач:', os.userInfo().username);
console.log('🌐 Intl.locale:', Intl.NumberFormat().resolvedOptions().locale);
