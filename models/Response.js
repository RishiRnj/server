//Response.js
const mongoose = require('mongoose');


const answerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  answer: { type: String, enum: ['Yes', 'No'], required: true },
  updatedAt: { type: Date, default: Date.now },
});

// Add a compound index to prevent duplicate answers for the same user and question
answerSchema.index({ userId: 1, questionId: 1 }, { unique: true });

module.exports = mongoose.model('Answer', answerSchema);
