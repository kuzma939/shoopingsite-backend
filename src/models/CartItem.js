import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  productId: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },

  discountPrice: { type: Number },
  
  color: String,
  size: String,
  quantity: { type: Number, default: 1 },
}, { timestamps: true });

const CartItem = mongoose.model('CartItem', cartItemSchema);

export default CartItem;
