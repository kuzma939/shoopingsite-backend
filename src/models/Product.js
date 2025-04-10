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
  images: [String],
  sizes: [String],
});

module.exports = mongoose.model('Product', productSchema);
