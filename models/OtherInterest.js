const mongoose = require('mongoose');

const otherInterestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  email: { type: String, required: true, lowercase: true, trim: true },
  fullName: { type: String,  },
  religion: { type: String, required: true },
  mobile: { type: String }, // optional, in case it's not always provided
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("OtherInterest", otherInterestSchema);
