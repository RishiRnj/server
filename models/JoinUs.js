const mongoose = require('mongoose');


const joinUsSchema = new mongoose.Schema({

    email: { type: String, required: true },
    username: { type: String, required: true },
    updateFullName: { type: String },
    mobile: { type: String, required: true },
    dob: { type: String, required: true },
    age: { type: String, required: true },
    gender: { type: String, required: true },
    joiningFor: { type: String, required: true },
    bloodGroup: { type: String, required: true },
    occupation: { type: String, required: true },
    moreAboutOccupation: { type: String, },
    address: { type: String, required: true },
    origin: { type: String, required: true },
    city: { type: String, required: true },
    district: { type: String, },
    state: { type: String, },
    PIN: { type: String, },
    country: { type: String, },
    qualification: { type: String, required: true },
    giveAterJoin: { type: String, required: true },
    fathersName: { type: String },
    maritalStatus: { type: String },
    spouseName: { type: String },
    partnerName: { type: String },
    haveAnyChild: { type: String },
    numberOfChildren: { type: String },
    agreedTerms: { type: Boolean },
    isProfileCompleted: { type: Boolean, default: false },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    userImage: { type: String, default: null }, // New field for file/image
});

const JionUsM = mongoose.model('JoinUsM', joinUsSchema);

module.exports = JionUsM;
