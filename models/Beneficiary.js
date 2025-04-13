const mongoose = require('mongoose');


const beneficiarySchema = new mongoose.Schema({

  email: { type: String },
    updateFullName: { type: String },
    mobile: { type: String},    
    dob: { type: String },
    age: { type: String },
    gender: { type: String },    
    bloodGroup: { type: String },
    occupation: { type: String },    
    address: { type: String },
    origin: { type: String },
    city: { type: String }, 
    PIN: { type: String, },
    district: { type: String }, 
    state: { type: String, },
    userImage: { type: String}, // New field for file/image


  applyingForWhom: { type: String },
  whoIam: { type: String },
  fathersName: { type: String },
  organisation: { type: String },

  familyIncome: { type: String },
  familyMembersNumber: { type: String },





  beneficiaryName: { type: String },
  benaficiaryFathersName: { type: String },
  benaficiaryDOB: { type: String },
  benaficiaryAGE: { type: String },
  benaficiaryGender: { type: String },
  beneficiaryAddress: { type: String },
  beneficiaryDistrict: { type: String },
  beneficiaryPIN: { type: String },
  beneficiaryState: { type: String },
  selectedOthersState: { type: String },
  beneficiaryMobile: { type: String },

  applyFor: { type: String },
  descriptionOfNeed: { type: String },
  noteByVerifier: { type: String },
  needs: { type: String },


  //Books
  bookType: { type: String },
  bookName: { type: String },
  bookLanguage: { type: String },
  bookOption: { type: String },
  //Learning Meterial
  learningMaterialType: { type: String },
  learningMaterialQuantity: { type: String },
  // Learning Gadgets
  gadgetType: { type: String },
  gadgetQuantity: { type: String },
  //mentor type

  mentorType: { type: String },
  mentorArena: { type: String },
  numberOfMentee: { type: String },
  //medication
  medicineName: { type: String },
  //blood grp
  bloodGroupNeed: { type: String },
  bloodGroupUnitNeed: { type: String },
  bloodGroupUnitReceived: { type: Number, default: 0 }, // Units received so far
  //cloth
  clothFor: { type: String },
  clothUnit: { type: String },
  //food
  headCountForFood: { type: String },
  anyChildHungry: { type: String },
  childCountForFood: { type: String },

  //essentials       
  qualification: { type: String },
  qualificationDetails: { type: String },
  expectedSalary: { type: String },
  expectedJobRole: { type: String },
  expectedJobRoleR: { type: String },

  //fundraising
  fundraising: { type: String },
  areParrentsReceiveGovtAssistance: { type: String },
  expectedAmountOfMoney: { type: Number, default: 0 },
  fundRaised: { type: Number, default: 0 },

  agreedBenificialTerms: { type: Boolean },
  aadhaar: { type: String },
  incomeCertificate: { type: String },
  voterID: { type: String },
  prescription: { type: String },
  beneFiciaryImage: { type: String }, // New field for file/image
  isBeneficiary: { type: String },
  isAdminVerified: { type: String, default: null },

  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  

  verificationStatus: {
    type: String,
    enum: ['approved', 'pending', 'rejected'], // Define valid roles
    default: 'pending', // Default role
  },

  donationStatus: {
    type: String,
    enum: ['Not-Started', 'in-progress', 'start received', 'fulfilled'],
    default: 'Not-Started', // Default to 'pending' until donations start
  },

});

const Beneficiary = mongoose.model('Beneficiary', beneficiarySchema);

module.exports = Beneficiary;