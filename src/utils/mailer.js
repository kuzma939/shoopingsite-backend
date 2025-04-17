import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // ⬅️ Додаємо це
  }
});

export const sendClientConfirmation = async (order) => {
  await transporter.sendMail({
    from: `"Магазин 👗" <${process.env.GMAIL_USER}>`,
    to: order.email,
    subject: 'Підтвердження замовлення',
    html: `
      <p>Вітаємо, ${order.firstName}!</p>
      <p>Дякуємо за замовлення на суму <strong>${order.total} грн</strong>.</p>
      <p>Наш менеджер звʼяжеться з вами найближчим часом.</p>
    `,
  });
};

export const sendAdminNotification = async (order) => {
  await transporter.sendMail({
    from: `"Магазин 👗" <${process.env.GMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL,
    subject: 'Нове замовлення з сайту',
    html: `
      <h3>Нове замовлення!</h3>
      <p><strong>Ім’я:</strong> ${order.firstName} ${order.lastName}</p>
      <p><strong>Телефон:</strong> ${order.phone}</p>
      <p><strong>Email:</strong> ${order.email}</p>
      <p><strong>Доставка:</strong> ${order.deliveryMethod}</p>
      <p><strong>Місто:</strong> ${order.city}</p>
      <p><strong>Відділення:</strong> ${order.warehouse || '—'}</p>
      <p><strong>Коментар:</strong> ${order.comment}</p>
      <p><strong>Сума:</strong> ${order.total} грн</p>
    `,
  });
};
