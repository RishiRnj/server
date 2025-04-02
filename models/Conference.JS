// const mongoose = require('mongoose');

// const conferenceSchema = new mongoose.Schema({
//     place:{type: String,  unique: true },
//     venue: { type: String, required: true, unique: true }, // e.g., "New York", "LA"
//     date: { type: Date, required: true }, // Conference date
//     time: { type: String, required: true }, // Conference time
//     description: { type: String }, // Optional description
//     createdAt: { type: Date, default: Date.now }, // When the conference was created
//     updatedAt: { type: Date, default: Date.now }, // Last updated timestamp
//   });
  
//   const Conference = mongoose.model('Conference', conferenceSchema);

//   module.exports = Conference;


const mongoose = require('mongoose');

// Define the participant schema
const participantSchema = new mongoose.Schema({
    userImage: { type: String, default: null }, // New field for file/image
    fullName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    dob: { type: String },
    age: { type: String },
    gender: { type: String },
    qualification: { type: String },
    locality: { type: String },
    bloodGroup: { type: String },
    occupation: { type: String },
    category: { type: String },
    religion: { type: String },
    
    createdAt: { type: Date, default: Date.now },
});

// Define the conference schema with embedded participants
const conferenceSchema = new mongoose.Schema({
    place: { type: String, unique: true },
    venue: { type: String, required: true, unique: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    status: { type: String, enum: ["active", "archived"], default: "active" }, // New field
    description: { type: String },
    participants: [participantSchema], // Embedded participants array
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const Conference = mongoose.model('Conference', conferenceSchema);
module.exports = Conference;
