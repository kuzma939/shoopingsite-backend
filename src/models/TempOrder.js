import mongoose from 'mongoose';

const tempOrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  orderData: { type: Object, required: true },
}, { timestamps: true });

export default mongoose.model('TempOrder', tempOrderSchema);