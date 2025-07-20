import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  price: Number,
   discountPrice: { type: Number, required: false },
  isTop: Boolean,
  isSpecialOffer: Boolean,
  sku: String,
  size: String,
  category: String,
  image: String,
  images: {
    type: [String],
    default: [],
  },
  sizes: [String],
  translations: {
    type: Object,
    default: {},
  }
}, {
  collection: 'products', // 👌 фіксуємо назву колекції
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);

export default Product;
