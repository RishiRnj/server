
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const cloudinary = require("cloudinary").v2;
exports.cloudinary = cloudinary;
const fs = require("fs");
const path = require('path');
const router = express.Router();
const Beneficiary = require('../models/Beneficiary');
const Donation = require('../models/Donation');

const { User } = require('../models/User');
const jwt = require('jsonwebtoken'); // For token verification



// Cloudinary configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//attach in upload file
const attachUserId = (req, res, next) => {
  try {
    // Check if the Authorization header is present
    if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    // Extract token from the Authorization header
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    // Verify the token and extract the userId
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user_id = decoded.id; // Attach userId to the request object
    console.log("id for inmg:", decoded.id);

    next();
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};




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

    // Use userId from the request object
    const user_id = req.user_id;
    if (!user_id) {
      return cb(new Error("User ID not found in request"));
    }

    // Generate filename using user_id and original file name
    const filename = `${user_id}-${Date.now()}-${file.originalname}`;
    cb(null, filename);


    // const uniqueSuffix = `${Date.now()}-${file.originalname}`;
    // cb(null, uniqueSuffix);
  },

});

const upload = multer({ storage });

// Helper function to compress and upload an image
async function processImage(file) {
  const filePath = file.path;

  try {
    // Read the file as a buffer to avoid file locks
    const buffer = await fs.promises.readFile(filePath);

    // Process the image using sharp from buffer (not file path)
    const optimizedBuffer = await sharp(buffer)
      .webp({ quality: 40 }) // Compress image
      .toBuffer();

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: "Beneficiary-Uploads-img",
          format: "webp",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(optimizedBuffer); // Send processed buffer to Cloudinary
    });

    return result.secure_url; // Return Cloudinary image URL
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw error;
  } finally {
    // Ensure file is deleted after processing
    try {
      await fs.promises.unlink(filePath);
      console.log("Temporary file deleted:", filePath);
    } catch (err) {
      console.error("Error deleting file:", err);
    }
  }
}


// new beneficiary registration
router.post("/create", attachUserId, upload.array("images", 4), async (req, res) => {
  try {

    const user_id = req.user_id; // Access userId from the request object
    console.log("User ID:", user_id);

    // Fetch user and attach to request
    req.user = await User.findById(user_id);
    if (!req.user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Mark user as a beneficiary
    req.user.isBeneficiary = true;
    await req.user.save();

    const userId = req.user._id; // Define userId
    console.log('BODY', req.body);


    // Extract form data
    const { fathersName, moreAboutOccupationNew, applyFor, familyIncome, familyMembersNumber, agreedBenificialTerms, email, username, updateFullName, mobile, age, gender, occupation, origin, address, city, district, state, PIN, userImage, descriptionOfNeed,
      //Books
      bookType, bookName, bookLanguage, bookOption,
      //Learning Meterial
      learningMaterialType, learningMaterialQuantity,
      // Learning Gadgets
      gadgetType, gadgetQuantity,
      //mentor type
      mentorType,
      //medication
      medicineName,
      //blood grp
      bloodGroupNeed, bloodGroupUnitNeed,
      //cloth
      clothFor, clothUnit,
      //food
      headCountForFood, anyChildHungry, childCountForFood,
      //essentials
      essentials,
      //fundraising
      fundraising, areParrentsReceiveGovtAssistance, expectedAmountOfMoney, fundRaised,
    } = req.body;

    // Validate required fields
    if (!fathersName || !moreAboutOccupationNew || !applyFor || !familyIncome || !familyMembersNumber || !agreedBenificialTerms) {
      return res.status(400).json({ error: "All required fields must be filled." });
    }

    // Define required image labels
    const requiredLabels = ["Aadhaar Card", "Voter ID Card", "Income Certificate", "Doctor's prescription"];
    let imageUrls = {};

    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file, index) => {
        if (requiredLabels[index]) { // Ensure index exists before using
          const uploadedImage = await processImage(file);
          return { label: requiredLabels[index], url: uploadedImage };
        }
      });

      const uploadedResults = await Promise.all(uploadPromises);
      uploadedResults.forEach(({ label, url }) => {
        if (label) imageUrls[label] = url;
      });
    }

    // Construct data to update
    const updatedData = {
      fathersName, moreAboutOccupationNew, applyFor, descriptionOfNeed, familyIncome, familyMembersNumber,
      //Books
      bookType, bookName, bookLanguage, bookOption,
      //Learning Meterial
      learningMaterialType, learningMaterialQuantity,
      // Learning Gadgets
      gadgetType, gadgetQuantity,
      //mentor type
      mentorType,
      //medication
      medicineName,
      //blood grp
      bloodGroupNeed, bloodGroupUnitNeed,
      //cloth
      clothFor, clothUnit,
      //food
      headCountForFood, anyChildHungry, childCountForFood,
      //essentials
      essentials,
      //fundraising
      fundraising, areParrentsReceiveGovtAssistance, expectedAmountOfMoney, fundRaised,
      agreedBenificialTerms,
      email, username, updateFullName, mobile, age, gender, occupation, origin, address, city, district, state, PIN, userImage,

      aadhaar: imageUrls["Aadhaar Card"] || null,
      voterID: imageUrls["Voter ID Card"] || null,
      incomeCertificate: imageUrls["Income Certificate"] || null,
      prescription: imageUrls["Doctor's prescription"] || null,

      user: userId, // Associate with user
      isBeneficiary: true, // Mark as beneficiary
      verificationStatus: 'pending', // Default verification status
      donationStatus: 'Not-Started', // Default donation status
    };

    // Find and update the Beneficiary record, or create a new one if it doesn't exist
    const updatedUser = await Beneficiary.create(
      updatedData
    );

    if (!updatedUser) {
      return res.status(500).json({ error: "Failed to create beneficiary record." });
    }

    res.status(201).json({ message: "Application submitted successfully", updatedUser });

  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// Fetch Pending Beneficiaries:
router.get("/pending-beneficiaries", async (req, res) => {
  try {
    const pendingBeneficiaries = await Beneficiary.find({ verificationStatus: "pending" });
    res.status(200).json({ pendingBeneficiaries });
    console.log(pendingBeneficiaries);

  } catch (error) {
    console.error("Error fetching pending beneficiaries:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});






//Approve/Reject Beneficiary:
router.put("/verify-beneficiary/:id", async (req, res) => {
  try {
    const { verificationStatus } = req.body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(verificationStatus)) {
      return res.status(400).json({ error: "Invalid verification status" });
    }

    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) {
      return res.status(404).json({ error: "Beneficiary not found" });
    }

    beneficiary.verificationStatus = verificationStatus;
    await beneficiary.save();

    res.status(200).json({ message: `Beneficiary ${verificationStatus} successfully`, beneficiary });
  } catch (error) {
    console.error("Error verifying beneficiary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


//Add note and exp amount of money by varifier Beneficiary:
router.put("/addNote/byVerifier/:id", async (req, res) => {
  try {
    const { noteByVerifier, expectedAmountOfMoney } = req.body; // Destructure note and amount from request body

    const beneficiary = await Beneficiary.findById(req.params.id);
    if (!beneficiary) {
      return res.status(404).json({ error: "Beneficiary not found" });
    }

    // If noteByVerifier is provided, update it
    if (noteByVerifier) {
      beneficiary.noteByVerifier = noteByVerifier;
      await beneficiary.save();
      return res.status(200).json({ message: `Beneficiary Verifier Note Added: ${noteByVerifier} successfully`, beneficiary });
    }

    // If expectedAmountOfMoney is provided, update it
    if (expectedAmountOfMoney) {
      beneficiary.expectedAmountOfMoney = expectedAmountOfMoney;
      await beneficiary.save();
      return res.status(200).json({ message: `Beneficiary Expected Amount Added: Rs. ${expectedAmountOfMoney} successfully`, beneficiary });
    }

    // If neither noteByVerifier nor expectedAmountOfMoney is provided, return a validation error
    res.status(400).json({ error: "Either 'noteByVerifier' or 'expectedAmountOfMoney' must be provided" });

  } catch (error) {
    console.error("Error verifying beneficiary:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




// router.put("/addNote/byVerifier/:id", async (req, res) => {
//   try {
//     const { noteByVerifier, expectedAmountOfMoney } = req.body; // 'approved' or 'rejected'


//     const beneficiary = await Beneficiary.findById(req.params.id);
//     if (!beneficiary) {
//       return res.status(404).json({ error: "Beneficiary not found" });
//     }

//     if (req.body == noteByVerifier) {
//       beneficiary.noteByVerifier = noteByVerifier;
//     await beneficiary.save();
//     res.status(200).json({ message: `Beneficiary Verifier Note Added: ${noteByVerifier} successfully`, beneficiary });

//     }else if (req.body == expectedAmountOfMoney) {
//       beneficiary.expectedAmountOfMoney = expectedAmountOfMoney;
//     await beneficiary.save();
//     res.status(200).json({ message: `Beneficiary Epx. Amount Addeed of Rs.: ${expectedAmountOfMoney} successfully`, beneficiary });
//     }

//     // beneficiary.noteByVerifier = noteByVerifier;
//     // await beneficiary.save();

//     // res.status(200).json({ message: `Beneficiary Verifier Note Added: ${noteByVerifier} successfully`, beneficiary });
//   } catch (error) {
//     console.error("Error verifying beneficiary:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });

//Fetch Approved Beneficiaries for Display:
router.get("/approved-beneficiaries", async (req, res) => {
  try {
    const approvedBeneficiaries = await Beneficiary.find({ verificationStatus: "approved" });
    res.status(200).json({ approvedBeneficiaries });
  } catch (error) {
    console.error("Error fetching approved beneficiaries:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// Fetch all Beneficiaries for Display with filtering beneficiary requirment status and donor donation status
router.get("/beneficiaries", async (req, res) => {
  try {
    const beneficiaries = await Beneficiary.find().lean();

    const enrichedBeneficiaries = await Promise.all(
      beneficiaries.map(async (beneficiary) => {
        // If the beneficiary is already fulfilled, return directly
        if (beneficiary.status === "fulfilled") {
          return { ...beneficiary, donationStatus: "fulfilled" };
        }

        // Fetch all donations for this beneficiary
        const donations = await Donation.find({ beneficiary: beneficiary._id });

        let donationStatus = "pending"; // Default

        if (donations.length > 0) {
          donationStatus = "in-progress"; // If any donation exists, set to in-progress
        }

        if (donations.some((donation) => donation.status === "fulfilled")) {
          donationStatus = "fulfilled"; // If any donation is fulfilled, mark as fulfilled
        }

        return { ...beneficiary, donationStatus };
      })
    );

    res.status(200).json(enrichedBeneficiaries);
  } catch (error) {
    console.error("Error fetching beneficiaries' donation status:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// get specific 
// Get a specific beneficiary
router.get("/:id", async (req, res) => {
  console.log('Id', req.params.id);

  try {
    const beneficiary = await Beneficiary.findOne({ user: req.params.id });  // Use findOne instead of find
    if (!beneficiary) {
      return res.status(404).json({ message: 'Beneficiary not found' });
    }
    res.json({ beneficiary });  // Return the beneficiary in an object, not an array
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// for admin page
router.get("/:id/details", async (req, res) => {
  console.log('Id', req.params.id);

  try {
    // Use findOne instead of find since you're looking for a single document
    const beneficiary = await Beneficiary.findOne({ _id: req.params.id }); // Ensure it's an object query

    if (!beneficiary) {
      return res.status(404).json({ message: 'Beneficiary not found' });
    }

    res.json({ beneficiary });  // Return the beneficiary in an object, not an array
    console.log(beneficiary);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

//mark status fulfiled when support is satteled
router.put("/make-fulfill/:id", async (req, res) => {
  console.log('Id for update', req.params.id);
  try {
    // Step 1: Find the Beneficiary by ID
    const beneficiary = await Beneficiary.findOne({ _id: req.params.id });

    if (!beneficiary) {
      return res.status(404).json({ message: "Beneficiary not found" });
    }

    // Step 2: Update the Beneficiary's status to 'fulfilled'
    beneficiary.donationStatus = 'fulfilled'; // Example field, adjust as necessary
    await beneficiary.save();

    // Step 3: Find and update related Donations to 'fulfilled'
    const donations = await Donation.find({ beneficiary: beneficiary._id });

    // Loop over donations and update each donation's status
    for (const donation of donations) {
      donation.status = 'fulfilled'; // Example field, adjust as necessary
      await donation.save();
    }

    // Step 4: Find the User associated with the Beneficiary
    const user = await User.findById(beneficiary.user); // Beneficiary's user field is an ObjectId reference

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Step 5: Update the User's 'IsBeneficiary' flag to 'false'
    user.isBeneficiary = false;

    // Step 6: Increment the 'gotBenefited' counters
    // If user has already received current support, increment the 'current' counter
    user.gotBenefited = user.gotBenefited; // Initialize if not already set

    // Increment current benefit if the user has received current support
    if (beneficiary.donationStatus === 'fulfilled') {
      user.gotBenefited += 1;
    }


    // Save the updated user document
    await user.save();

    // Log the results for debugging purposes
    console.log("Beneficiary updated:", beneficiary);
    console.log("Donations updated:", donations);
    console.log("User updated:", user);

    // Step 7: Respond to the client with success
    res.status(200).json({ message: "Support marked as fulfilled and user updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});



// // Get all Beneficiary in number
// router.get('/', async (req, res) => {
//   try {
//     // Fetch the length of users from the collection
//     const length = await Beneficiary.countDocuments(); // countDocuments() to count all documents in the collection
//     res.json({ message: 'Total Beneficiary in Number', length });
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// });


// router.get('/fulfilled/donation-status', async (req, res) => {
//   try {
//     // Fetch the count of beneficiaries with 'donationStatus' set to "fulfilled"
//     const length = await Beneficiary.countDocuments({ donationStatus: "fulfilled" });
//     res.json({ message: 'Total Beneficiaries who received support from us', length });
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// });














module.exports = router;

