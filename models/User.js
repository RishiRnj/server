//UserSchema.js
const mongoose = require('mongoose');

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
  verificationCode: String,
  isVerified: { type: Boolean, default: false },
  isVolunteer: { type: Boolean, default: false },
  isBeneficiary: { type: Boolean, default: false },
  gotBenefited:  { type: Number, default: 0 },    
 
  isProfileCompleted: { type: Boolean, default: false },
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
  // mobile: { type: String, unique: true, sparse: true },
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
  joiningFor: { type: String },
  qualification: { type: String },
  giveAterJoin: { type: String },
  fathersName: { type: String },
  maritalStatus: { type: String },
  spouseName: { type: String },
  partnerName: { type: String },
  haveAnyChild: { type: String },
  numberOfChildren: { type: String },
  userImage: { type: String, default: null }, // New field for file/image
  isAdminVerified: { type: Boolean, default: false },
  role: {
    type: String,
    enum: ['admin', 'user', 'moderator'], // Define valid roles
    default: 'user', // Default role
  },
  completedQuestions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users following this user
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Users this user follows

});




// module.exports = mongoose.model('User', UserSchema);
const User = mongoose.model('User', UserSchema);

module.exports = { User }; // Ensure this is correct