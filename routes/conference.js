const express = require('express');
const Conference = require('../models/Conference.JS');
// const Participant = require('../models/Participant.JS');
const { authenticateAdmin } = require('../middlewares/authMiddleware');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require("multer");
const sharp = require("sharp");
const cloudinary = require("cloudinary").v2;
exports.cloudinary = cloudinary;
const fs = require("fs");
const path = require('path');


// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer setup
// Configure Multer to use disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueSuffix);
  },

});

const upload = multer({ storage });

// Helper function to compress and upload an image
async function processImage(file) {

  const filePath = file.path; // Define the file path at the beginning of the function
  const optimizedBuffer = await sharp(file.path)
    .resize(300, 300, { fit: 'cover' })
    .webp({ quality: 50 }) // Adjust quality as needed
    .toBuffer();

  try {

    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'Volunteer-Uploads-img',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(optimizedBuffer);
    });

    return result.secure_url;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw error;
  } finally {
    // Ensure the file is deleted from the local upload folder
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath); // Delete the file
      console.log('Temporary file deleted:', filePath);
    }
  }
}







// get all the confarences
router.get('/', async (req, res) => {
  try {
    const conferences = await Conference.find(); // Fetch all conferences from the database
    res.status(200).json(conferences); // Send the conferences as a JSON response
  } catch (error) {
    console.error("Error fetching conferences:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




//Create a New Conference (Admin)
router.post("/create-conference", authenticateAdmin, async (req, res) => {
  try {
    const { venue, place, date, time, description } = req.body;

    if (!venue || !date || !time || !place) {
      return res.status(400).json({ error: "Venue, date, and time are required." });
    }

    // Convert the date string to a Date object
    const conferenceDate = new Date(date);
    const currentDate = new Date();

    // Set initial status
    const status = conferenceDate >= currentDate ? "active" : "archived";

    // Create a new conference with an empty participants array
    // const newConference = await Conference.create({
    //     venue,
    //     place,
    //     date,
    //     time,
    //     description,
    //     participants: [], // Initialize with an empty array
    // });

    const newConference = await Conference.create({
      venue,
      place,
      date: conferenceDate,
      time,
      description,
      participants: [],
      status, // Set status based on the date
    });

    res.status(201).json({ message: "Conference created successfully", newConference });
  } catch (error) {
    console.error("Error creating conference:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




// Edit Conference Details (Admin)
// Update Conference Status (Admin)
router.put("/update-conference-status/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Expecting the status to be provided (either 'active' or 'archived')

    // Validate status
    if (!['active', 'archived'].includes(status)) {
      return res.status(400).json({ error: "Invalid status provided. Only 'active' or 'archived' are allowed." });
    }

    // Find and update the conference
    const updatedConference = await Conference.findByIdAndUpdate(
      id,
      { status },
      { new: true } // Return the updated conference document
    );

    if (!updatedConference) {
      return res.status(404).json({ error: "Conference not found." });
    }

    res.status(200).json({ message: "Conference status updated successfully", updatedConference });
  } catch (error) {
    console.error("Error updating conference status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});





//Get All Participants for a Conference (Admin)
router.get("/:conferenceId/participants", async (req, res) => {
  try {
    const { conferenceId } = req.params;
    console.log("confarence id", conferenceId);


    const conference = await Conference.findById(conferenceId);
    if (!conference) {
      return res.status(404).json({ error: "Conference not found." });
    }

    res.status(200).json(conference.participants); // Return list of participants
  } catch (error) {
    console.error("Error fetching participants:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



//Register for a Conference (User)
router.post("/add-participant/:conferenceId", upload.single("userUpload"), async (req, res) => {
  try {
    const { conferenceId } = req.params;
    const { religion, fullName, email, phone, dob, age, gender, qualification, locality, bloodGroup, occupation, category, } = req.body;

    if (!fullName || !email || !phone) {
      return res.status(401).json({ error: "Full name, email, and phone are required." });
    }

    let userImage = null;

    // Check if the file is an image or video
    if (req.file) {
      console.log("req file", req.file);
      if (req.file.mimetype.startsWith("image/")) {
        userImage = await processImage(req.file);
        console.log("Processed Image URL:", userImage);
      }
    } else if (req.body.userImage) {
      // If no file uploaded, check if there's a userImage in the request body (URL or base64 string)
      userImage = req.body.userImage;  // This could be a URL or base64 string
      console.log("Received Image URL or base64:", userImage);
    }

    const conference = await Conference.findById(conferenceId);
    if (!conference) {
      return res.status(404).json({ error: "Conference not found." });
    }

    // Check if the user is already registered
    const existingParticipant = conference.participants.find(p => p.email === email);
    if (existingParticipant) {
      return res.status(400).json({ error: "You have already registered for this conference." });
    }

    // Add participant to the conference document
    conference.participants.push({ userImage, fullName, email, phone, dob, age, qualification, locality, bloodGroup, occupation, category, religion, gender });
    await conference.save();

    res.status(201).json({ message: "Participant added successfully", conference });
  } catch (error) {
    console.error("Error adding participant:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});







//check if a user has already registered.
// router.get('/check-registration/:conferenceId', async (req, res) => {
//   try {
//     const { conferenceId } = req.params;
//     const { email } = req.query;

//     if (!email) {
//       return res.status(400).json({ error: "Email is required." });
//     }

//     const conference = await Conference.findById(conferenceId);
//     if (!conference) {
//       return res.status(404).json({ error: "Conference not found." });
//     }

//     const participant = conference.participants.find(p => p.email === email);
//     if (participant) {
//       return res.json({ isRegistered: true, participant });
//     } else {
//       return res.json({ isRegistered: false });
//     }
//   } catch (error) {
//     console.error("Error checking registration:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

router.get('/check-registration/:conferenceId', async (req, res) => {
  try {
    const { conferenceId } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const conference = await Conference.findById(conferenceId);
    if (!conference) {
      return res.status(404).json({ error: "Conference not found." });
    }

    const participant = conference.participants.find(p => p.email === email);
    if (participant) {
      // Check if the participant's religion is "Hinduism"
      if (participant.religion === "Hinduism") {
        return res.json({ isRegistered: true, participant });
      } else {
        return res.json({ isRegistered: false, message: "Participant is not Hindu." });
      }
    } else {
      return res.json({ isRegistered: false, message: "Participant not found." });
    }
  } catch (error) {
    console.error("Error checking registration:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});









module.exports = router;