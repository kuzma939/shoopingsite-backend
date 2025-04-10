const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: { type: String, unique: true },
  price: Number,
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

  // 🆕 translations — як об'єкт з мовами
  translations: {
    type: Object,
    default: {}
  }

}, {
  collection: 'products', // 🛑 ОБОВ’ЯЗКОВО вкажи явно, щоб не було плутанини з іменами
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);
