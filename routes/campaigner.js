const express = require('express');
const { protect, authenticateAdmin, protectBlogPost, optionalAuth } = require('../middlewares/authMiddleware');
const router = express.Router();
const { User } = require('../models/User');
const  Survey  = require('../models/Survey');

const multer = require("multer");
const sharp = require("sharp");
const cloudinary = require("cloudinary").v2;
exports.cloudinary = cloudinary;
const fs = require("fs");
const path = require('path');
const { validationResult } = require('express-validator');
const { 
    notifyAdminAboutNewCampaigner, notifyCampaignerApproval,
    createAdminNotification 
  } = require('../helper/notification');
  








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

    // Use userId from the request object
    const user_id = req.user?.id;
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
          folder: "Campaigner-Uploads-img",
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




// Campaigner profile completion route
router.post('/complete-campaigner-profile',  protect, upload.fields([
    { name: 'paymentSlip', maxCount: 1 },
    { name: 'campaignerIDImage', maxCount: 1 }
  ]), async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      // Check if user already completed profile
      const user = await User.findById(req.user.id);
      if (user.isCampaignerProfileCompleted) {
        return res.status(400).json({ 
          message: 'Campaigner profile already completed' 
        });
      }
  
      // Prepare update data
      const updateData = {
        // username: req.body.username,
        campaignUseFor: req.body.campaignUseFor,
        Mission: req.body.Mission,
        campaignFor: req.body.campaignFor,
        campaignerIDType: req.body.campaignerIDType,
        campaignerIDNumber: req.body.campaignerIDNumber,
        campaignDuration: parseInt(req.body.campaignDuration),
        campaignAmount: parseInt(req.body.campaignAmount),
        agreedCampaignerTerms: req.body.agreedCampaignerTerms === 'true',
        isCampaignerProfileCompleted: true,
        campaignPaymentStatus: 'pending', // Will be verified by admin
        updatedAt: Date.now()
      };
  
      // Add organization fields if applicable
      if (req.body.campaignUseFor === 'organization') {
        updateData.orgName = req.body.orgName;
        updateData.orgAddress = req.body.orgAddress;
        updateData.orgCity = req.body.orgCity;
      }
  
      // Handle file upload
      
      // Check if the file is an image or video
      // if (req.file) {
      //     if (req.file.mimetype.startsWith('image/')) {
      //       updateData.paymentSlip = await processImage(req.file);
      //     } 
      // }
  
      // Process file uploads
      const files = req.files;
  
      if (files?.paymentSlip?.[0]) {
        const processedSlip = await processImage(files.paymentSlip[0]);
        updateData.paymentSlip = processedSlip;
      }
  
      if (files?.campaignerIDImage?.[0]) {
        const processedID = await processImage(files.campaignerIDImage[0]);
        updateData.campaignerIDImage = processedID;
      }
  
      // Update user in database
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select('-password');
  
      // Send notification to admin (you can implement this separately)
      // notifyAdminAboutNewCampaigner(updatedUser);
  
      res.status(200).json({
        message: 'Campaigner profile completed successfully',
        user: updatedUser
      });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        message: 'Server error', 
        error: error.message 
      });
    }
  });


  router.post('/campaigner/request', protect, async (req, res) => {
    try {
      // Check if user already completed profile
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ 
          message: 'User not found' 
        });
      }
      if (user.isCampaigner) {
        return res.status(400).json({ 
          message: 'Invalid request, you are already a campaigner' 
        });
      }

      if (!user.isCampaignerProfileCompleted) {
        return res.status(400).json({ 
          message: 'Please complete your campaigner profile first' 
        });
      }

      user.isCampaignerRequested = true;
      await user.save();

      // Send notification to admin (verify date and make isCmapaigner true) 
      notifyAdminAboutNewCampaigner(user);

      res.status(200).json({
        message: 'Campaigner profile completed and request admin successfully',
        user: user
      });


      
    } catch (error) {
      console.error(error);
      res.status(500).json({ 
        message: 'Server error', 
        error: error.message 
      });
      
    }
  });


// Get all campaigners who have requested admin approval
router.get('/campaigners', authenticateAdmin, async (req, res) => {
  try {
    const campaigners = await User.find({ isCampaignerRequested: true }).select('-password');
    res.status(200).json(campaigners);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});


router.put('/approve/:id', protect, authenticateAdmin, async (req, res) => {
  try {
      const campaigner = await User.findByIdAndUpdate(
          req.params.id,
          { 
              $set: { 
                  isCampaigner: true,
                  campaignPaymentStatus: 'completed',
                  isPaymentDone: true,
                  approvedAt: Date.now(),
                  approvedBy: req.user.id
              }
          },
          { new: true }
      );

      if (!campaigner) {
          return res.status(404).json({ message: 'Campaigner not found' });
      }

      // Send approval notification to campaigner
      await notifyCampaignerApproval(campaigner);

      res.json({ 
          message: 'Campaigner approved successfully',
          campaigner 
      });
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
  }
});
  
  





















// router.get('/',  (req, res) => {
//   res.json({ message: `Welcome to the Campaign, !` });
// });


module.exports = router;