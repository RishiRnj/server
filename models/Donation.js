const mongoose = require('mongoose');
const { bool } = require('sharp');

const donationSchema = new mongoose.Schema({
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    donorName: { type: String },
    donorEmail: { type: String },
    donorPhone: { type: String },
    donorAddress: { type: String },
    donorBloodGrp: { type: String },
    donorhaveAnySugarBP: { type: String },
    donorAge: { type: String },
    isBloodDonor: { type: Boolean, default: false },
    //mentoring
    isMentor: { type: Boolean, default: false },
  mentorshipSub: { type: String },            
  provideVia: { type: String },  
    donorPAN: { type: String },
    donorPassport: { type: String },
    contributorType: { type: String },
    contributionType: { type: String },
    country: { type: String },
    currency: { type: String },
    beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    donationType: { type: String, enum: ['monetarySupport', 'communityServices' , 'essentialServices' , 'healthCare', 'empowerSkillAndKnowledge'], required: true },

    type: { type: String, enum: ['Books', 'Learning Material', 'Learning Gadgets', 'Mentorship' , 
      'Medications', 'Hospital Assistance', 'Blood', 'Clothes for Underprivileged', 'Food for the Hungry', "Quality Education", "Shelter", "Employment", 'Volunteering', 'Fundraising'], required: true },

    bloodUnitsDonated: { type: Number, default: 0 }, // Number of blood units donated
    amount: { type: Number, default: null }, // For monetary donations
    description: { type: String, default: null }, // Details about the donation
    donateVia: { type: String, default: null }, // Details about the donation
    date: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'in-progress', 'start received' , 'fulfilled'], default: 'pending' }, // Track fulfillment
  });
  
  const Donation = mongoose.model('Donation', donationSchema);
  module.exports = Donation;
  