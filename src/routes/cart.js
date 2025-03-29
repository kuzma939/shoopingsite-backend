const express = require('express');
const router = express.Router();
const prisma = require('../prisma'); 

// === GET: Отримати корзину ===
router.get('/', async (req, res) => {
  const { sessionId } = req.query;
  if (!sessionId) return res.status(400).json({ message: 'Не вказано sessionId' });

  const cart = await prisma.cartItem.findMany({ where: { sessionId } });
  res.json({ cart });
});

// === POST: Додати товар ===
router.post('/', async (req, res) => {
  const { sessionId, productId, color, size, quantity = 1 } = req.body;
  if (!sessionId || !productId || !color || !size) {
    return res.status(400).json({ message: 'Вкажіть всі поля' });
  }

  const existing = await prisma.cartItem.findFirst({
    where: { sessionId, productId, color, size },
  });

  if (existing) {
    await prisma.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.cartItem.create({
      data: { sessionId, productId, color, size, quantity },
    });
  }

  res.json({ message: 'Товар додано до корзини' });
});

// === PUT: Оновити кількість ===
router.put('/', async (req, res) => {
  const { cartId, quantity } = req.body;
  if (!cartId || quantity < 1) return res.status(400).json({ message: 'Некоректні дані' });

  await prisma.cartItem.update({
    where: { id: cartId },
    data: { quantity },
  });

  res.json({ message: 'Кількість оновлено' });
});

// === DELETE: Видалити товар ===
router.delete('/', async (req, res) => {
  const { cartId } = req.body;
  if (!cartId) return res.status(400).json({ message: 'Не вказано cartId' });

  await prisma.cartItem.delete({
    where: { id: cartId },
  });

  res.json({ message: 'Товар видалено' });
});

module.exports = router;
