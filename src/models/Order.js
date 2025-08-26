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

  paymentMethod: String,       // no-payment, online
  paymentType: String,         // full, half
  isPaid: { type: Boolean, default: false },
  paymentId: String,           // from WayForPay
  orderId: String,             // same as orderReference
  sessionId: String,

  amount: Number,              // повна сума
  amountPaid: Number,          // скільки оплачено

  items: [
    {
      name: String,
      productId: String,
      color: String,
      size: String,
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
