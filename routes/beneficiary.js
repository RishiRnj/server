
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
router.post("/create", attachUserId, upload.array("images", 5), async (req, res) => {
  try {
    // Check if formData is sent as a string
    let formData = req.body.formData ? JSON.parse(req.body.formData) : {};
    console.log("Form Data:", formData);
    console.log("Received files:", req.files);  // Log to check if the data is properly parsed

    const user_id = req.user_id;
    console.log("User ID:", user_id);

    req.user = await User.findById(user_id);
    if (!req.user) {
      return res.status(404).json({ error: "User not found" });
    }

    req.user.isBeneficiary = true;
    await req.user.save();

    const userId = req.user._id;

    // Extract the form data
    const {
      applyingForWhom, whoIam, fathersName, organisation, familyIncome, familyMembersNumber,
      // if beneficiary
      beneficiaryName, benaficiaryFathersName, benaficiaryDOB, benaficiaryAGE, benaficiaryGender, benaficiaryOccupation,
      beneficiaryAddress, beneficiaryDistrict, beneficiaryPIN, beneficiaryState, selectedOthersState, beneficiaryMobile,
      applyFor,
      // Books
      bookType, bookName, bookLanguage, bookOption,
      // Learning Material
      learningMaterialType, learningMaterialQuantity,
      // Learning Gadgets
      gadgetType, gadgetQuantity,
      // Mentor type
      mentorType, mentorArena, numberOfMentee,
      // Medication
      medicineName,
      // Blood group
      bloodGroupNeed, bloodGroupUnitNeed, bloodNeedDate,
      // Cloth
      clothFor, clothUnit,
      // Food
      headCountForFood, anyChildHungry, childCountForFood,
      //essentials       
      qualification,
      qualificationDetails,
      expectedSalary,
      expectedJobRole,
      expectedJobRoleR,
      // Fundraising
      fundraising, areParrentsReceiveGovtAssistance, expectedAmountOfMoney, fundRaised,
      agreedBenificialTerms, descriptionOfNeed,
    } = formData;

    
    // Validate required fields
    if (!applyingForWhom || !applyFor || !familyIncome || !familyMembersNumber || !agreedBenificialTerms) {
      return res.status(400).json({ error: "All required fields must be filled." });
    }

    let requiredLabels = ["Aadhaar Card", "Voter ID Card", "Income Certificate"];

    // Dynamically adjust the requiredLabels array based on conditions
    if (applyingForWhom === "For me") {
      // For user applying for themselves, no extra image is needed
      requiredLabels = ["Aadhaar Card", "Voter ID Card", "Income Certificate"];
    } else {
      // If the user is applying for someone else, include "Beneficiary's Image"
      requiredLabels.push("Beneficiary's Image");
    }

    if (applyFor === "Medications") {
      // If the user is applying for medication, we need "Doctor's prescription" as well
      requiredLabels.push("Doctor's prescription");
    }

    // Initialize the object to store image URLs
    let imageUrls = {};

    // Handle file uploads if present
    if (req.files && req.files.length > 0) {
      const uploadPromises = req.files.map(async (file, index) => {
        if (requiredLabels[index]) {
          // Assuming 'processImage' handles the image processing and returns the URL
          const uploadedImage = await processImage(file);
          return { label: requiredLabels[index], url: uploadedImage };
        }
      });

      const uploadedResults = await Promise.all(uploadPromises);

      // Store the image URLs in the object, using the label as the key
      uploadedResults.forEach(({ label, url }) => {
        if (label) imageUrls[label] = url;
      });
    }

    // Check if all required images are uploaded
    const missingImages = requiredLabels.filter(label => !imageUrls[label]);

    if (missingImages.length > 0) {
      return res.status(400).json({
        error: `The following required images are missing: ${missingImages.join(", ")}`
      });
    }

    // Continue with further logic...
    // Prepare the updatedData object for beneficiary creation
    let updatedData = {
      applyingForWhom, whoIam, fathersName, organisation, familyIncome, familyMembersNumber,
      applyFor,
      bookType, bookName, bookLanguage, bookOption,
      learningMaterialType, learningMaterialQuantity,
      gadgetType, gadgetQuantity,
      mentorType, mentorArena, numberOfMentee,
      medicineName,
      bloodGroupNeed, bloodGroupUnitNeed, bloodNeedDate,
      clothFor, clothUnit,
      headCountForFood, anyChildHungry, childCountForFood,
      qualification, qualificationDetails, expectedSalary, expectedJobRole, expectedJobRoleR,
      fundraising, areParrentsReceiveGovtAssistance, expectedAmountOfMoney, fundRaised,
      agreedBenificialTerms, descriptionOfNeed,
      aadhaar: imageUrls["Aadhaar Card"] || null,
      voterID: imageUrls["Voter ID Card"] || null,
      incomeCertificate: imageUrls["Income Certificate"] || null,
      prescription: imageUrls["Doctor's prescription"] || null,
      userImage: imageUrls["Beneficiary's Image"] || null,
      user: userId, // Associate with user
      isBeneficiary: true,
      verificationStatus: 'pending',
      donationStatus: 'Not-Started',
    };

    // Handling two different scenarios: user applying for themselves or on behalf of someone else
    if (applyingForWhom === "For me") {
      updatedData = {
        ...updatedData, ...{
          email: req.user.email,
          updateFullName: req.user.updateFullName || req.user.username || req.user.displayName,
          mobile: req.user.mobile,
          dob: req.user.dob,
          age: req.user.age,
          gender: req.user.gender,
          bloodGroup: req.user.bloodGroup,
          occupation: req.user.occupation,
          address: req.user.address,
          origin: req.user.origin,
          city: req.user.city,
          PIN: req.user.PIN,
          district: req.user.district,
          state: req.user.state,
          userImage: req.user.userImage,
        }
      };
    } else {
      updatedData = {
        ...updatedData, ...{
          email: req.user.email,
          updateFullName: beneficiaryName,
          fathersName: benaficiaryFathersName,
          dob: benaficiaryDOB,
          age: benaficiaryAGE,
          gender: benaficiaryGender,
          occupation: benaficiaryOccupation,
          address: beneficiaryAddress,
          district: beneficiaryDistrict,
          PIN: beneficiaryPIN,
          state: beneficiaryState,
          selectedOthersState,
          mobile: beneficiaryMobile,
        }
      };
    }

    // Save or create a new beneficiary
    const updatedUser = await Beneficiary.create(updatedData);

    if (!updatedUser) {
      return res.status(500).json({ error: "Failed to create beneficiary record." });
    }

    // Send response after successful creation
    res.status(201).json({ message: "Application submitted successfully", updatedUser });

  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// router.post("/create", attachUserId, upload.array("images", 5), async (req, res) => {
//   try {
//     // Check if formData is sent as a string
//     let formData = req.body.formData ? JSON.parse(req.body.formData) : {};
//     console.log("Form Data:", formData);
//     console.log("Received files:", req.files);  // Log to check if the data is properly parsed

//     const user_id = req.user_id;
//     console.log("User ID:", user_id);

//     req.user = await User.findById(user_id);
//     if (!req.user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     req.user.isBeneficiary = true;
//     await req.user.save();

//     const userId = req.user._id;

//     // Extract the form data
//     const {
//       applyingForWhom, whoIam, fathersName, organisation, familyIncome, familyMembersNumber,
//       // if beneficiary
//       beneficiaryName, benaficiaryFathersName, benaficiaryDOB, benaficiaryAGE, benaficiaryGender, benaficiaryOccupation,
//       beneficiaryAddress, beneficiaryDistrict, beneficiaryPIN, beneficiaryState, selectedOthersState, beneficiaryMobile,
//       applyFor,
//       // Books
//       bookType, bookName, bookLanguage, bookOption,
//       // Learning Material
//       learningMaterialType, learningMaterialQuantity,
//       // Learning Gadgets
//       gadgetType, gadgetQuantity,
//       // Mentor type
//       mentorType, mentorArena, numberOfMentee,
//       // Medication
//       medicineName,
//       // Blood group
//       bloodGroupNeed, bloodGroupUnitNeed, bloodNeedDate,
//       // Cloth
//       clothFor, clothUnit,
//       // Food
//       headCountForFood, anyChildHungry, childCountForFood,
//       // Essentials
//       qualification,
//       qualificationDetails,
//       // Fundraising
//       fundraising, areParrentsReceiveGovtAssistance, expectedAmountOfMoney, fundRaised,
//       agreedBenificialTerms, descriptionOfNeed,
//     } = formData;

//     // Validate required fields
//     if (!applyingForWhom || !applyFor || !familyIncome || !familyMembersNumber || !agreedBenificialTerms) {
//       return res.status(400).json({ error: "All required fields must be filled." });
//     }

//     if (applyingForWhom === "For me") {
//       const requiredLabels = ["Aadhaar Card", "Voter ID Card", "Income Certificate", ]

//     } else {
//       const requiredLabels = ["Aadhaar Card", "Voter ID Card", "Income Certificate", "Beneficiary's Image"];
//     }

//     if (applyFor === "Medications") {
//       const requiredLabels = ["Aadhaar Card", "Voter ID Card", "Income Certificate", "Doctor's prescription", "Beneficiary's Image"];

//     }


//     let imageUrls = {};

//     // Handle file uploads if present
//     if (req.files && req.files.length > 0) {
//       const uploadPromises = req.files.map(async (file, index) => {
//         if (requiredLabels[index]) {
//           const uploadedImage = await processImage(file); // Assuming 'processImage' handles image processing
//           return { label: requiredLabels[index], url: uploadedImage };
//         }
//       });

//       const uploadedResults = await Promise.all(uploadPromises);
//       uploadedResults.forEach(({ label, url }) => {
//         if (label) imageUrls[label] = url;
//       });
//     }

//     // Prepare the updatedData object for beneficiary creation
//     let updatedData = {
//       applyingForWhom, whoIam, fathersName, organisation, familyIncome, familyMembersNumber, 
//       applyFor,
//       bookType, bookName, bookLanguage, bookOption,
//       learningMaterialType, learningMaterialQuantity,
//       gadgetType, gadgetQuantity,
//       mentorType, mentorArena, numberOfMentee,
//       medicineName,
//       bloodGroupNeed, bloodGroupUnitNeed, bloodNeedDate,
//       clothFor, clothUnit,
//       headCountForFood, anyChildHungry, childCountForFood,
//       qualification, qualificationDetails,
//       fundraising, areParrentsReceiveGovtAssistance, expectedAmountOfMoney, fundRaised,
//       agreedBenificialTerms, descriptionOfNeed,
//       aadhaar: imageUrls["Aadhaar Card"] || null,
//       voterID: imageUrls["Voter ID Card"] || null,
//       incomeCertificate: imageUrls["Income Certificate"] || null,
//       prescription: imageUrls["Doctor's prescription"] || null,
//       userImage: imageUrls["Beneficiary's Image"] || null,
//       user: userId, // Associate with user
//       isBeneficiary: true,
//       verificationStatus: 'pending',
//       donationStatus: 'Not-Started',
//     };

//     // Handling two different scenarios: user applying for themselves or on behalf of someone else
//     if (applyingForWhom === "For me") {
//       updatedData = { ...updatedData, ...{
//         email: req.user.email,        
//         updateFullName: req.user.updateFullName || req.user.username || req.user.displayName,
//         mobile: req.user.mobile, 
//         dob: req.user.dob, 
//         age: req.user.age, 
//         gender: req.user.gender, 
//         bloodGroup: req.user.bloodGroup,
//         occupation: req.user.occupation, 
//         address: req.user.address, 
//         origin: req.user.origin, 
//         city: req.user.city, 
//         PIN: req.user.PIN, 
//         district: req.user.district,
//         state: req.user.state, 
//         userImage: req.user.userImage,
//       }};
//     } else {
//       updatedData = { ...updatedData, ...{
//         email: req.user.email,
//         updateFullName: beneficiaryName,
//         fathersName: benaficiaryFathersName,
//         dob: benaficiaryDOB,
//         age: benaficiaryAGE,
//         gender: benaficiaryGender,
//         occupation: benaficiaryOccupation,
//         address: beneficiaryAddress,
//         district: beneficiaryDistrict,
//         PIN: beneficiaryPIN,
//         state: beneficiaryState,
//         selectedOthersState,
//         mobile: beneficiaryMobile,
//       }};
//     }

//     // Save or create a new beneficiary
//     const updatedUser = await Beneficiary.create(updatedData);

//     if (!updatedUser) {
//       return res.status(500).json({ error: "Failed to create beneficiary record." });
//     }

//     // Send response after successful creation
//     res.status(201).json({ message: "Application submitted successfully", updatedUser });

//   } catch (error) {
//     console.error("Error updating user:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });





// router.post("/create", attachUserId, upload.array("images", 5), async (req, res) => {
//   try {
//     // Check if formData is sent as a string
//     let formData = req.body.formData ? JSON.parse(req.body.formData) : {};

//     console.log("Form Data:", formData);  // Log to check if the data is properly parsed
//     console.log("Received files:", req.files);  // Log to check if the data is properly parsed

//     const user_id = req.user_id;
//     console.log("User ID:", user_id);

//     req.user = await User.findById(user_id);
//     if (!req.user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     req.user.isBeneficiary = true;
//     await req.user.save();

//     const userId = req.user._id;

//     // Extract the form data
//     const {
//       applyingForWhom, whoIam, fathersName, organisation, familyIncome, familyMembersNumber, 
//       // if beneficiary
//       beneficiaryName, benaficiaryFathersName, benaficiaryDOB, benaficiaryAGE, benaficiaryGender, beneficiaryAddress, beneficiaryDistrict, beneficiaryPIN, beneficiaryState, selectedOthersState, beneficiaryMobile,
//       applyFor,
//       //Books
//       bookType, bookName, bookLanguage, bookOption,
//       //Learning Meterial
//       learningMaterialType, learningMaterialQuantity,
//       // Learning Gadgets
//       gadgetType, gadgetQuantity,
//       //mentor type
//       mentorType, mentorArena, numberOfMentee,
//       //medication
//       medicineName,
//       //blood grp
//       bloodGroupNeed, bloodGroupUnitNeed, bloodNeedDate,
//       //cloth
//       clothFor, clothUnit,
//       //food
//       headCountForFood, anyChildHungry, childCountForFood,
//       //essentials
//       qualification,
//       qualificationDetails,
//       //fundraising
//       fundraising, areParrentsReceiveGovtAssistance, expectedAmountOfMoney, fundRaised,
//       agreedBenificialTerms, descriptionOfNeed,
//     } = formData;

//     // Validate required fields
//     if (!applyingForWhom || !whoIam || !applyFor || !familyIncome || !familyMembersNumber || !agreedBenificialTerms) {
//       return res.status(400).json({ error: "All required fields must be filled." });
//     }

//     const requiredLabels = ["Aadhaar Card", "Voter ID Card", "Income Certificate", "Doctor's prescription", "Beneficiary's Image"];
//     let imageUrls = {};

//     if (req.files && req.files.length > 0) {
//       const uploadPromises = req.files.map(async (file, index) => {
//         if (requiredLabels[index]) {
//           const uploadedImage = await processImage(file);
//           return { label: requiredLabels[index], url: uploadedImage };
//         }
//       });

//       const uploadedResults = await Promise.all(uploadPromises);
//       uploadedResults.forEach(({ label, url }) => {
//         if (label) imageUrls[label] = url;
//       });
//     }


//     const updatedData = {
//       applyingForWhom, whoIam, fathersName, organisation, familyIncome, familyMembersNumber, 
//       // if beneficiary
//       beneficiaryName, benaficiaryFathersName, benaficiaryDOB, benaficiaryAGE, benaficiaryGender, beneficiaryAddress, beneficiaryDistrict, beneficiaryPIN, beneficiaryState, selectedOthersState, beneficiaryMobile,
//       applyFor,
//       //Books
//       bookType, bookName, bookLanguage, bookOption,
//       //Learning Meterial
//       learningMaterialType, learningMaterialQuantity,
//       // Learning Gadgets
//       gadgetType, gadgetQuantity,
//       //mentor type
//       mentorType, mentorArena, numberOfMentee,
//       //medication
//       medicineName,
//       //blood grp
//       bloodGroupNeed, bloodGroupUnitNeed, bloodNeedDate,
//       //cloth
//       clothFor, clothUnit,
//       //food
//       headCountForFood, anyChildHungry, childCountForFood,
//       //essentials
//       qualification,
//       qualificationDetails,
//       //fundraising
//       fundraising, areParrentsReceiveGovtAssistance, expectedAmountOfMoney, fundRaised,
//       agreedBenificialTerms, descriptionOfNeed,
//       aadhaar: imageUrls["Aadhaar Card"] || null,
//       voterID: imageUrls["Voter ID Card"] || null,
//       incomeCertificate: imageUrls["Income Certificate"] || null,
//       prescription: imageUrls["Doctor's prescription"] || null,
//       beneFiciaryImage: imageUrls["Beneficiary's Image"] || null,
//       user: userId, // Associate with user
//       isBeneficiary: true,
//       verificationStatus: 'pending',
//       donationStatus: 'Not-Started',
//     };

//     const updatedUser = await Beneficiary.create(updatedData);

//     if (!updatedUser) {
//       return res.status(500).json({ error: "Failed to create beneficiary record." });
//     }

//     res.status(201).json({ message: "Application submitted successfully", updatedUser });

//   } catch (error) {
//     console.error("Error updating user:", error);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });






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



// Get a specific beneficiary
router.get("/:id", async (req, res) => {
  console.log('Id', req.params.id);

  try {
    const beneficiary = await Beneficiary.find({ user: req.params.id });  // Use findOne instead of find
    if (!beneficiary) {
      return res.status(404).json({ message: 'Beneficiary not found' });
    }
    res.json({ beneficiary });  // Return the beneficiary in an object, not an array
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});




// Get specific beneficiary's profile status in terms of token decoded user iD
router.get("/profile-status/selected_user/:id", async (req, res) => {
  
  try {
    const urlID = req.params.id;
    if (!urlID) {
      return res.status(400).json({ message: 'Unauthorized access' });
    }

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const id = decoded.id;
    console.log('Decoded Token for profile status:', decoded);
        

    // Check if the requesting user has permission to view this status
    if (decoded.role !== 'user') {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Find all beneficiary records for this user
    const beneficiaryRecords = await Beneficiary.find({ user: id });
      

    if (!beneficiaryRecords || beneficiaryRecords.length === 0) {
      return res.status(404).json({ message: 'No beneficiary records found' });
    }

    // Check donation status across all beneficiary records
    let overallStatus = 'OK';
    let inProgressRecords = [];

    beneficiaryRecords.forEach(record => {
      if (record.donationStatus === 'in-progress') {
        overallStatus = 'in-progress';
        inProgressRecords.push({
          id: record._id,
          applyingForWhom: record.applyingForWhom,
          applyFor: record.applyFor,
          donationStatus: record.donationStatus,
          createdAt: record.createdAt
        });
      }
    });

    res.status(200).json({ 
      status: overallStatus,
      message: overallStatus === 'in-progress' 
        ? `In your ${inProgressRecords.length} beneficiary application record(s) the Donation status has In-progress. So you cannot submit another application now.` 
        : 'No donations in progress',
      inProgressRecords: overallStatus === 'in-progress' ? inProgressRecords : [],
      totalRecords: beneficiaryRecords.length
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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

