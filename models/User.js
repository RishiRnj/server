//UserSchema.js
const mongoose = require('mongoose');


const surveyDataSchema = new mongoose.Schema({
  title: String,
  orgName: String,
  noOfQ: Number,
  totalRespondent: Number,
  startDate: Date,
  endDate: Date,
}, { _id: false });

const UserSchema = new mongoose.Schema({
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  username: {
    type: String,
    required: function () {
      return !this.googleId; // Required for local users
    },
  },

  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: function () {
      return this.authProvider === 'local'; // Required for local users
    },
  },
  agreed: {
    type: Boolean,
  },

  googleId: { type: String, unique: true, sparse: true },
  displayName: String,
  image: String,

  religion: { type: String, },
  verificationCode: String,
  isVerified: { type: Boolean, default: false },
  isVolunteer: { type: Boolean, default: false },
  isBeneficiary: { type: Boolean, default: false },
  gotBenefited: { type: Number, default: 0 },

  isProfileCompleted: { type: Boolean, default: false },

  realTimeAddress: { type: String },
  realTimeLocation: {
    lat: Number,
    lon: Number,

  },

  isBloodDonor: { type: Boolean, default: false },
  contributorType: { type: String },
  donorhaveAnySugarBP: { type: String },
  isMentor: { type: Boolean, default: false },
  mentorshipSub: { type: String },
  provideVia: { type: String },
  resetPasswordToken: { type: String },
  resetPasswordExpire: { type: Date },
  createdAt: { type: Date, default: Date.now },

  // For users Update Profile
  updateFullName: { type: String },
  mobile: { type: String, unique: true, sparse: true,  required: function () {
    return !this.googleId; // Required for local users
  }},
  dob: { type: String },
  age: { type: String },
  hobby: { type: String },
  gender: { type: String },
  bloodGroup: { type: String },
  occupation: { type: String },
  occupationCategory: { type: String },
  moreAboutOccupation: { type: String },
  origin: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  district: { type: String },
  PIN: { type: String },
  country: { type: String },
  agreedTerms: { type: Boolean },

  joiningFor: { type: String, },
  qualification: { type: String, },
  giveAterJoin: { type: String, },
  fathersName: { type: String },
  maritalStatus: { type: String },
  spouseName: { type: String },
  partnerName: { type: String },
  haveAnyChild: { type: String },
  numberOfChildren: { type: String },
  agreedVolunteerTerms: { type: Boolean },
  isOpenSurveyParticipated: { type: Boolean, default: false },
  isUserSurveyCompleted: { type: Boolean, default: false },
  isVolunteerProfileCompleted: { type: Boolean, default: false },

  userImage: { type: String, default: null }, // New field for file/image
  isAdminVerified: { type: Boolean, default: false },
  role: {
    type: String,
    enum: ['admin', 'user', 'moderator', 'campaigner'], // Define valid roles
    default: 'user', // Default role
  },
  
  completedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users following this user
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users this user follows

  // campaignerApplication: {
  //   status: { type: String, enum: ['pending', 'approved', 'rejected'], default: null },
  //   orgName: String,
  //   orgMission: String,
  //   appliedAt: Date,
  //   reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  //   reviewedAt: Date,
  //   rejectionReason: String
  // },

  surveyData: [surveyDataSchema],
  isTrialUsed: { type: Boolean, default: false },
  isCampaigner: { type: Boolean, default: false },
  isCampaignerRequested: { type: Boolean, default: false },
  isCampaignerProfileCompleted: { type: Boolean, default: false },
  isPaymentDone: { type: Boolean, default: false },
  campaignPaymentStatus: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  paymentSlip: { type: String, default: null },
  campaignerIDImage: { type: String, default: null },
  campaignAmount: { type: Number, default: 0 },
  campaignDuration: { type: Number, default: 0 },
  agreedCampaignerTerms: { type: Boolean, default: false },
  campaignUseFor: { type: String, default: null },
  campaignFor: { type: String, enum: ['education', 'health care', 'social service', 'business'], default: null },
  Mission: String,
  campaignerIDType: String,
  campaignerIDNumber: String,

  //if Campaign not for individual then this field will be used
  orgName: String,
  orgAddress: String,
  orgCity: String,
    

});




// module.exports = mongoose.model('User', UserSchema);
const User = mongoose.model('User', UserSchema);

module.exports = { User }; // Ensure this is correct