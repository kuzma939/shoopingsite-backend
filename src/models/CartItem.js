const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  productId: { type: String, required: true },
  color: String,
  size: String,
  quantity: { type: Number, default: 1 },
}, { timestamps: true });

module.exports = mongoose.model('CartItem', cartItemSchema);
