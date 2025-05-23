import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  patronymic: String,
  email: String,
  phone: String,
  deliveryMethod: String,
  city: String,
  warehouse: String,
  comment: String,
  total: Number,
  prepay: Boolean,
  paymentMethod: String,
  sessionId: String,
  isPaid: {
    type: Boolean,
    default: false,
  },
  paymentId: String,
  orderId: String,
  items: [
    {
      name: String,
      price: Number,
      quantity: Number,
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Order = mongoose.model('Order', orderSchema);

export default Order;

