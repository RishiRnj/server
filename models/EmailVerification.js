// const mongoose = require('mongoose');

// const emailVerificationSchema = new mongoose.Schema({
//   email: { type: String, required: true, unique: true },
//   code: { type: String, required: true },
//   isVerified: {type: Boolean, default: false},
//   expiresAt: { type: Date, required: true },
//   createdAt: { type: Date, default: Date.now },
// });

// module.exports = mongoose.model('EmailVerification', emailVerificationSchema);


const mongoose = require('mongoose');

const emailVerificationSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  code: { type: Number, required: true },
  expiresAt: { type: Date, required: true }, // Expiration time for the document
  createdAt: { type: Date, default: Date.now }
});

// Add a TTL index to the 'expiresAt' field
emailVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const EmailVerification = mongoose.model('EmailVerification', emailVerificationSchema);

module.exports = EmailVerification;
