
const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const cloudinary = require("cloudinary").v2;
exports.cloudinary = cloudinary;
const fs = require("fs");
const path = require('path');
const router = express.Router();
const JionUsM = require('../models/JoinUs');
const { User } = require('../models/User');
const jwt = require('jsonwebtoken'); // For token verification
const bcrypt = require('bcryptjs'); // For hashing passwords

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


// POST route for form submission
router.post("/", upload.single("userUpload"), async (req, res) => {
  try {
    const formData = JSON.parse(req.body.formData); // Parse JSON form data
    const { email, username, password, ...otherFormData } = formData;

    console.log("Form Data:", formData);
    console.log("Email:", email);

    let userImage = null;

    // Check if the file is an image or video
    if (req.file) {
      console.log("req file", req.file);
      if (req.file.mimetype.startsWith("image/")) {
        userImage = await processImage(req.file);
        console.log("Processed Image URL:", userImage);
      }
    }

    // Check if the user exists in the User collection
    let user = await User.findOne({ email });

    if (!user) {
      // Generate a random password if not provided
      const hashedPassword = password
        ? await bcrypt.hash(password, 10)
        : await bcrypt.hash(email + "12345", 10);

      // Register new user
      user = new User({
        email,
        username,
        password: hashedPassword,
        ...otherFormData,
        userImage,
        isVolunteer: true, // Mark as a volunteer
        isProfileCompleted: true, // Profile is complete
      });

      await user.save();
      console.log("New user registered:", user);
    } else {
      console.log("User already exists. Updating profile...");

      // Only update the `userImage` if a new image is provided
      user.userImage = userImage || user.userImage;

      // Update other fields
      user.username = username;
      user.isVolunteer = true;
      user.isProfileCompleted = true;

      console.log("Before Save - userImage:", user.userImage);
      await user.save();
      console.log("After Save - userImage:", user.userImage);
    }

    // Check if JoinUsM data already exists
    let joinData = await JionUsM.findOne({ email });

    if (!joinData) {
      // If JoinUsM doesn't exist, populate the user image from the user collection
      const populatedUser = await User.findById(user._id).select("userImage");

      joinData = new JionUsM({
        ...formData,
        user: user._id,
        userImage: userImage || populatedUser?.userImage, // Use populated userImage if available, fallback to input userImage
        isProfileCompleted: true,
      });

      await joinData.save();
    } else {
      // Update JoinUsM entry
      const populatedUser = await User.findById(user._id).select("userImage");

      joinData = await JionUsM.findOneAndUpdate(
        { email },
        {
          ...formData,
          userImage: userImage || populatedUser?.userImage || joinData.userImage, // Prioritize provided userImage, fallback to populated or existing image
        },
        { new: true } // Return the updated document
      );
    }

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.status(200).json({
      message: "Profile updated successfully!",
      userId: user._id,
      email: user.email,
      joinData,
      token, // Send token for automatic login
    });
  } catch (error) {
    console.error("Error processing request:", error.message);
    res.status(400).json({ message: error.message || "Invalid request data." });
  }
});



router.get('/volunteer/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;
    console.log('Decoded Token:', decoded);

    // Fetch user by email
    const user = await JionUsM.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      _id: user._id,
      user: user,
      isProfileCompleted: user.isProfileCompleted,
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});






// router.get('/', (req, res) => {
//   res.json({ message: `Welcome to the Join Us!` } );
// });


module.exports = router;

