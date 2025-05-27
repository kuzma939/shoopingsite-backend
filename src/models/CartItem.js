import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  productId: { type: String, required: true },
  name: product.translations?.UA?.name || product.name || product.назва,
  price: product.price || product.ціна,
 
  color: String,
  size: String,
  quantity: { type: Number, default: 1 },
}, { timestamps: true });

const CartItem = mongoose.model('CartItem', cartItemSchema);

export default CartItem;
