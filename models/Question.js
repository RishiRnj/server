//questionSchema.js
const mongoose = require('mongoose');


const questionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  order: { type: Number, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Add an index to quickly fetch active questions in order
questionSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('Question', questionSchema);

