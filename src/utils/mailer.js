import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  }
});

export const sendClientConfirmation = async (order) => {
  await transporter.sendMail({
    from: `"Магазин 👗" <${process.env.GMAIL_USER}>`,
    to: order.email,
    subject: 'Підтвердження замовлення',
    html: `
      <p>Вітаємо, ${order.firstName}!</p>
      <p>Дякуємо за замовлення на суму <strong>${order.total} UAH</strong>.</p>
      <p>Наш менеджер звʼяжеться з вами найближчим часом.</p>
    `,
  });
};

export const sendAdminNotification = async (order, cartItems) => {
  const productsHtml = cartItems
    .map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.name}</td>
        <td>${item.productId}</td>
        <td>${item.color}</td>
        <td>${item.size}</td>
        <td>${item.quantity}</td>
        <td>${item.price} UAH</td>
      </tr>
    `).join('');

  await transporter.sendMail({
    from: `"Магазин 👗" <${process.env.GMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: 'Нове замовлення з сайту',
    html: `
      <h3>Нове замовлення!</h3>
      <p><strong>Ім’я:</strong> ${order.firstName} ${order.lastName || ''}</p>
      <p><strong>Телефон:</strong> ${order.phone}</p>
      <p><strong>Email:</strong> ${order.email}</p>
      <p><strong>Доставка:</strong> ${order.deliveryMethod}</p>
      <p><strong>Місто:</strong> ${order.city}</p>
      <p><strong>Відділення:</strong> ${order.warehouse || '—'}</p>
      <p><strong>Коментар:</strong> ${order.comment || '—'}</p>

      <h4>Товари:</h4>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead>
          <tr>
            <th>#</th>
            <th>Назва</th>
            <th>ID</th>
            <th>Колір</th>
            <th>Розмір</th>
            <th>Кількість</th>
            <th>Ціна</th>
          </tr>
        </thead>
        <tbody>
          ${productsHtml}
        </tbody>
      </table>

      <p><strong>Сума:</strong> ${String(order.total).replace(/грн|₴|UAH/gi, '').trim()} UAH</p>
    `,
  });
};
