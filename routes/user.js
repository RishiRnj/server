//user route
const express = require('express');
const router = express.Router();
const {User} = require('../models/User'); // Assuming you have a User model
const jwt = require('jsonwebtoken'); // For token verification
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
exports.cloudinary = cloudinary;
const stream = require('stream'); // Add this import for stream
const { log } = require('console');
const { protect } = require('../middlewares/authMiddleware');
const { broadcast } = require('../utils/websocketUtils');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Beneficiary = require('../models/Beneficiary');
const Donation = require('../models/Donation');





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
                    folder: 'Profile-img',
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

//user profile update
router.put('/profile', upload.single('userUpload'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const email = decoded.email;

    const formData = JSON.parse(req.body.formData);
    console.log("data ", formData);

    
    const file = req.file;
    console.log("file", file);
    

    if (!file) {
      return res.status(400).json({ message: 'Image file is required.' });
    }


    //this line aaded afetr successfull test of the code if not working remove it
    //06/01/2025 1:41am
    // Check for duplicate mobile number

    // temporarily commented out the mobile number check
    if (formData.mobile) {
      const existingUser = await User.findOne({ mobile: formData.mobile });
      if (existingUser && existingUser.email !== email) {
        return res.status(400).json({ message: 'Mobile number is already in use by another user.' });
      }
    }    

    console.log("req file", req.file);
            
            let imageUrl = null;
            
    
            // Check if the file is an image or video
            if (req.file) {
                if (req.file.mimetype.startsWith('image/')) {
                    imageUrl = await processImage(req.file);
                } 
            }

    
    // Prepare updates object with the Cloudinary URL
    const updates = {
      ...formData,
      userImage: imageUrl,  // Store Cloudinary URL in MongoDB
      isProfileCompleted: true,
    };

    // Update the user's profile in MongoDB
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'Profile updated successfully.', updatedUser });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// Contact Route
// GET: Fetch user by toten for showing in profile page
router.get('/profile/data',  async (req, res) => {
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
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Define partial fields and full fields
    const partialFields = [
      { label: "Name time of Login", value: user.displayName || user.username },
      { label: "Email", value: user.email },
      { label: "Login type", value: user.authProvider },
    ];

    const fullFields = [
      
      { label: "Name time of Login", value: user.displayName || user.username },
      { label: "Email", value: user.email },
      { label: "Login type", value: user.authProvider },
      { label: "Full Name as update", value: user.updateFullName || "You not Update yet" },
      { label: "Mobile No.", value: user.mobile || "You not Update yet" },
      { label: "Date of Birth", value: user.dob || "You not Update yet" },
    
      // Conditionally include address fields
      ...(user.origin === "Indain_Hindu"
        ? [
            { label: "Local Address", value: user.address || "You not Update yet" },
            { label: "City or Town", value: user.city || "You not Update yet" },
            { label: "District", value: user.district || "You not Update yet" },
            { label: "State", value: user.state || "You not Update yet" },
            { label: "PIN", value: user.PIN || "You not Update yet" },
          ]
        : user.origin === "Gobal_Hindu"
        ? [
            { label: "Local Address", value: user.address || "You not Update yet" },
            { label: "City or Town", value: user.city || "You not Update yet" },
            { label: "Country", value: user.country || "You not Update yet" },
          ]
        : []),
    
      { label: "User Status", value: user.origin || "You not Update yet" },
      { label: "Blood Group", value: user.bloodGroup || "You not Update yet" },
      { label: "Gender", value: user.gender || "You not Update yet" },
      { label: "Occupation", value: user.occupation || "You not Update yet" },
    
      // Conditionally include more details about occupation
      ...(["Other", "Professional", "GovernmentJob", "Business", "Artist"].includes(user.occupation)
        ? [
            {
              label: "More details about Occupation",
              value: user.moreAboutOccupation || "You not Update yet",
            },
          ]
        : []),
    
      { label: "Joined On", value: user.createdAt },
    ];
    
    
    // Respond with structured data
    res.json({
      message: 'User data fetched successfully', user,
      user: {      
        id: user.id,
        displayName: user.displayName,
        userImage: user.userImage, // Image URL  
        partialFields,
        fullFields,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


//get selected user profile for checking also isBeneficiary and updating profile
router.get('/profile', async (req, res) => {
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
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // res.status(200).json({user  });
    res.status(200).json({
      _id: user._id,
      email: user.email,
      isProfileCompleted: user.isProfileCompleted,
      isBeneficiary: user.isBeneficiary,
      isVolunteer: user.isVolunteer,
      isBenefited: user.gotBenefited,
      user,
    });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// //put user profile for REupdating (joinus)
router.put('/profile/reUpdate/:id', protect, async (req, res) => {
  try {    
    // Fetch user by email
    const user = await User.findById(req.params.id); // Use the ID from the URL parameter
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.isProfileCompleted = false;

    await user.save(); // Save the updated user

    res.status(200).json({ message: 'Profile ready for Re-updated' });
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }

});

// POST route for form submission (joinus / new volunteer)
router.put("/new/volunteer", protect, async (req, res) => {
  console.log("Request Body:", req.body);
  try {
    // Extract token from headers
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id; // Extract user ID from decoded token
    console.log('Decoded Token:', decoded);

    // Fetch the user based on the ID from the token
    const user = await User.findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Mark the user as a volunteer    
    user.isVolunteer = true;
    user.isVolunteerProfileCompleted = true;
    // Update joinUs data with the request body
    user.joiningFor = req.body.joiningFor;
    user.qualification = req.body.qualification;
    user.giveAterJoin = req.body.giveAterJoin;
    user.fathersName = req.body.fathersName;
    user.maritalStatus = req.body.maritalStatus;
    user.spouseName = req.body.spouseName;
    user.partnerName = req.body.partnerName;
    user.haveAnyChild = req.body.haveAnyChild;
    user.numberOfChildren = req.body.numberOfChildren;
    user.agreedVolunteerTerms = req.body.agreedVolunteerTerms;
    await user.save();

    

    // Send the response with populated data
    res.status(200).json({
      message: "Profile updated successfully!",
      user
    });

  } catch (error) {
    console.error("Error processing request:", error.message);
    res.status(400).json({ message: error.message || "Invalid request data." });
  }
});




// all the registered and unregistered blood Doners 
router.get('/api-donor', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Extract token from Authorization header
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { email, role } = decoded; // Assuming the token has `email` and `role` in the payload
    console.log('Decoded Token:', role);

    // You can add role-based access control here if needed, for example:
    if (role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Fetch all users with isDonor = true
    const donors = await User.find({ isBloodDonor: true }).lean();
    if (!donors || donors.length === 0) {
      return res.status(404).json({ message: 'No donors found' });
    }
    // Fetch all users with isDonor = true
    const unRegisterDonors = await Donation.find({ isBloodDonor: true }).lean();
    if (!unRegisterDonors || unRegisterDonors.length === 0) {
      return res.status(404).json({ message: 'No unRegisterDonors found' });
    }

    // Respond with the list of donors
    // Combine both results into a single response
    res.status(200).json({
      donors,          // List of users who are blood donors
      unRegisterDonors // List of unregistered blood donors from the Donation collection
    });
  } catch (err) {
    console.error('Error fetching donors:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



// // get user by id
router.get('/:id', async (req, res) => {
  try {
    
    const userId = req.params.id; // Correct parameter name
    log('userId:', userId); // Debugging
    const user = await User.findById(userId); // For MongoDB with Mongoose // Adjust based on your data source
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}
);


// Follow or Unfollow a user route
router.post('/:id/follow', protect, async (req, res) => {
  try {
      const currentUserId = req.user.id; // Logged-in user
      const targetUserId = req.params.id; // User to follow/unfollow

      if (currentUserId === targetUserId) {
          return res.status(400).json({ message: "You can't follow yourself." });
      }

      const currentUser = await User.findById(currentUserId);
      const targetUser = await User.findById(targetUserId);

      if (!targetUser) {
          return res.status(404).json({ message: 'User not found.' });
      }

      let action; // Track the action (follow/unfollow)
      if (currentUser.following.includes(targetUserId)) {
          // Unfollow
          currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId);
          targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId);
          action = "unfollow";
      } else {
          // Follow
          currentUser.following.push(targetUserId);
          targetUser.followers.push(currentUserId);
          action = "follow";
      }

      await currentUser.save();
      await targetUser.save();

      const followersCount = targetUser.followers.length;

      // Broadcast the follow/unfollow action via WebSocket
      broadcast(req.wss, {
          targetUserId,
          currentUserId,
          followersCount,
          action,
      }, "followStatus");

       // Broadcast the follow/unfollow action for the suggestion page
       broadcast(req.wss, {
        targetUserId,
        currentUserId,
        followersCount,
        action,
    }, "userSuggestionFollowStatus"); // New event name

      res.status(200).json({
          following: currentUser.following,
          followers: targetUser.followers,
          followersCount,
          targetUserId,
      });
  } catch (error) {
      res.status(500).json({ message: 'Error following/unfollowing user', error: error.message });
  }
});

// GET /user/:id/isFollowing
router.get('/:id/isFollowing', protect, async (req, res) => {
  try {
    const userId = req.user.id; // Current logged-in user
    const targetUserId = req.params.id;

    // Check if the current user is following the target user
    const isFollowing = await User.exists({ _id: targetUserId, followers: userId });

    res.json({ isFollowing: !!isFollowing });
  } catch (error) {
    console.error('Error checking follow status:', error);
    res.status(500).json({ error: 'Failed to check follow status.' });
  }
});


//to Check follow count
router.get('/follow/status', protect, async (req, res) => {
  try {
      const currentUserId = req.user.id; // Assumes `protect` middleware adds `user` to `req`
      const user = await User.findById(currentUserId);

      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      const followedCount = user.following.length; // Use `following` to check users being followed

      res.status(200).json({ followedCount });
  } catch (error) {
      console.error('Error checking follow status:', error);
      res.status(500).json({ message: 'Failed to check follow status.' });
  }
});




router.get('/userSuggestions/followOpt', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, searchField } = req.query;
    const currentUserId = req.user.id;

    // Create a dynamic query based on searchField and search value
    const query = { _id: { $ne: currentUserId } }; // Exclude current user

    if (search && searchField) {
      // Use regex for case-insensitive partial matching
      query[searchField] = { $regex: search, $options: 'i' };
    }

    // Fetch users based on query
    const users = await User.find(query)
      .select('username displayName updateFullName userImage state city followers hobby PIN occupation createdAt postCount')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Add `isActive` to each user
    const usersWithFollowStatus = users.map((user) => {
      const daysSinceFirstPost = (new Date() - new Date(user.createdAt)) / (1000 * 60 * 60 * 24);
      const postFrequency = user.postCount / daysSinceFirstPost;

      return {
        ...user.toObject(),
        isFollowed: user.followers.includes(currentUserId),
        isActive: postFrequency < 1, // Active if posting less than once a day
      };
    });

    const total = await User.countDocuments(query);

    res.status(200).json({
      users: usersWithFollowStatus,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
    console.log("Search Query:", search, "Search Field:", searchField);

  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});



// Follow or Unfollow and send back to user suggestion
router.post('/:id/follow/send-back-userSuggestions', protect, async (req, res) => {
  try {
      const currentUserId = req.user.id;
      const targetUserId = req.params.id;

      const [currentUser, targetUser] = await Promise.all([
          User.findById(currentUserId),
          User.findById(targetUserId),
      ]);

      if (!targetUser) {
          return res.status(404).json({ message: 'User not found.' });
      }

      let action;

      // Toggle follow/unfollow logic
      if (currentUser.following.includes(targetUserId)) {
          currentUser.following = currentUser.following.filter((id) => id.toString() !== targetUserId);
          targetUser.followers = targetUser.followers.filter((id) => id.toString() !== currentUserId);
          action = 'unfollow';
      } else {
          currentUser.following.push(targetUserId);
          targetUser.followers.push(currentUserId);
          action = 'follow';
      }

      await Promise.all([currentUser.save(), targetUser.save()]);

      const followersCount = targetUser.followers.length;

      // Check if the current user is following 5 or more users
      if (currentUser.following.length >= 4) {
        return res.status(200).json({
            redirect: '/forum', // Redirect to the forum page
            message: 'Redirecting to the forum page. Note: You can now edit Post by clicking + symbol. ',
        });
    }

      // Fetch updated user suggestions
      const users = await User.find({ _id: { $ne: currentUserId } })
          .select('username displayName updateFullName userImage city state PIN occupation followers hobby')
          .limit(20);

      const usersWithFollowStatus = users.map((user) => ({
          ...user.toObject(),
          isFollowed: user.followers.includes(currentUserId),
      }));

      broadcast(req.wss, {
          targetUserId,
          currentUserId,
          followersCount,
          action,
      }, 'userSuggestionFollowStatus');

      res.status(200).json({
          message: action === 'follow' ? 'Followed user' : 'Unfollowed user',
          users: usersWithFollowStatus,
      });
  } catch (error) {
      res.status(500).json({ message: 'Error following/unfollowing user', error: error.message });
  }
});
































// Get all user in number
// router.get('/', async (req, res) => {
//   try {
//     // Fetch the length of users from the collection
//     const length = await User.countDocuments(); // countDocuments() to count all documents in the collection
//     res.json({ message: 'Total Users in Number', length });
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// });

// Get total users, total beneficiaries, and total beneficiaries with fulfilled donation status in one request
router.get('/', async (req, res) => {
  try {
    // Fetch total users count
    const totalUsers = await User.countDocuments();

    // Fetch total beneficiaries count
    const totalBeneficiaries = await Beneficiary.countDocuments();

    // Fetch total beneficiaries with 'donationStatus' set to "fulfilled"
    const totalSupportReceived = await Beneficiary.countDocuments({ donationStatus: "fulfilled" });

    // Send all the results together in a single response
    res.json({
      message: 'Statistics fetched successfully',
      totalUsers,
      totalBeneficiaries,
      totalSupportReceived
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});







module.exports = router;
