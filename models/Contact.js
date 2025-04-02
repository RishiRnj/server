const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  altPhone: { type: String },
  formSelect: { type: String },
  address: { type: String },
  city: { type: String },
  district: { type: String },
  state: { type: String },
  PIN: { type: String },
  country: { type: String },
  formMsg: { type: String },
  isQuickContact: { type: Boolean, default: false },
  keepInfoSecret: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
