// const mongoose = require('mongoose');

// const participantSchema = new mongoose.Schema({
//     fullName: { type: String, required: true },
//     email: { type: String, required: true, unique: true },
//     phone: { type: String, required: true },    
//     age: { type: String  },
//     qualification: { type: String  },
//     locality: { type: String  },
    
    
    
//     createdAt: { type: Date, default: Date.now }, // When the participant registered
//   });

//   const Participant = mongoose.model('Participant', participantSchema);

//   module.exports = Participant;

  
  // Note: This schema will be used to dynamically create collections for each conference.

  // Participant.js
const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  age: { type: String  },
    qualification: { type: String  },
    locality: { type: String  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = participantSchema;