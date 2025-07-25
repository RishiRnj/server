const mongoose = require('mongoose');
const surveySchema = new mongoose.Schema({
  title: String,
  description: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  orgName: String,
  budget: Number,
  durationDays: Number,
  startDate: Date,
  newStartDate: Date,
  endDate: Date,
  isTrial: Boolean,
  isAdminCreated: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['draft', 'active', 'completed', 'paused'], 
    default: 'draft' 
  },
  questions: [{
    questionText: String,
    questionType: { type: String, enum: ['text', 'multiple', 'single'] },
    options: [String],
    attachment: {
    filename: String,
    path: String,
    mimetype: String,
    type: String, // 'image' or 'video'
    default: null
  },
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true }
  }],
  responses: [{
    respondent: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: false
    },
    respondentName: { 
      type: String,
      required: true,
      default: 'Guest User'
    },
    anonymousId: String,
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    respondedAt: { 
      type: Date, 
      default: Date.now 
    },
    isAnonymous: { 
      type: Boolean, 
      default: false 
    }
  }],
  allowAnonymous: { 
    type: Boolean, 
    default: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Survey', surveySchema);