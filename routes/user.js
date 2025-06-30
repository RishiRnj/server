//user route
const express = require('express');
const router = express.Router();
const { validationResult } = require('express-validator');
const {User} = require('../models/User'); // Assuming you have a User model
const jwt = require('jsonwebtoken'); // For token verification
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
exports.cloudinary = cloudinary;
const stream = require('stream'); // Add this import for stream
const { protect } = require('../middlewares/authMiddleware');
const { broadcast } = require('../utils/websocketUtils');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const Beneficiary = require('../models/Beneficiary');
const Donation = require('../models/Donation');
const OtherInterest = require('../models/OtherInterest');
const Post = require('../models/Post')
const Conference = require('../models/Conference.JS');
const Survey = require('../models/Survey')





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
        .webp({ quality: 40 }) // Adjust quality as needed
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

            let updatedUser;

            
              // Prepare updates for Christian user
              const updates = {
                ...formData,
                userImage: imageUrl,
                isProfileCompleted: true,
              };
            
              updatedUser = await User.findOneAndUpdate(
                { email },
                { $set: updates },
                { new: true, runValidators: true }
              );
            
              if (!updatedUser) {
                return res.status(404).json({ message: 'User not found.' });
              } 
            
            // ✅ Christian user gets full access
            res.status(200).json({ message: 'Profile updated successfully.', updatedUser });
            
  } catch (err) {
    console.error('Error updating profile:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.put('/update-profile', protect, async (req, res) =>{
  const formData = req.body;
  const userId = req.user.id;
    console.log("data ", formData, userId);

    try {    
    // Fetch user by email
    const user = await User.findById(req.user.id); // Use the ID from the URL parameter
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // temporarily commented out the mobile number check
    if (formData.mobile) {
      const existingUser = await User.findOne({ mobile: formData.mobile });
      if (existingUser) {
        return res.status(400).json({ message: 'Mobile number is already in use by another user.' });
      }
    }    

    // Update user profile fields
    user.username = formData.username;
    user.mobile = formData.mobile;
    user.religion = formData.religion;

    await user.save();

    res.status(200).json({ message: 'pertial Profile update successfull', user });

    
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ message: 'Server error', error: err.message });
  }

})


// user profile data Route
// GET: Fetch user by toten for showing in profile page
// router.get('/profile/data',  async (req, res) => {
//   try {
//     const token = req.headers.authorization?.split(' ')[1];
//     if (!token) {
//       return res.status(401).json({ message: 'No token provided' });
//     }

//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const email = decoded.email;
//     console.log('Decoded Token:', decoded);

//     // Fetch user by email
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     // Define partial fields and full fields
//     const partialFields = [
//       { label: "Name time of Login", value: user.displayName || user.username },
//       { label: "Email", value: user.email },
//       { label: "Login type", value: user.authProvider },
//     ];

//     const fullFields = [
      
//       { label: "Name time of Login", value: user.displayName || user.username },
//       { label: "Email", value: user.email },
//       { label: "Login type", value: user.authProvider },
//       { label: "Full Name as update", value: user.updateFullName || "You not Update yet" },
//       { label: "Mobile No.", value: user.mobile || "You not Update yet" },
//       { label: "Date of Birth", value: user.dob || "You not Update yet" },
    
//       // Conditionally include address fields
//       ...(user.origin === "Indain_Hindu"
//         ? [
//             { label: "Local Address", value: user.address || "You not Update yet" },
//             { label: "City or Town", value: user.city || "You not Update yet" },
//             { label: "District", value: user.district || "You not Update yet" },
//             { label: "State", value: user.state || "You not Update yet" },
//             { label: "PIN", value: user.PIN || "You not Update yet" },
//           ]
//         : user.origin === "Gobal_Hindu"
//         ? [
//             { label: "Local Address", value: user.address || "You not Update yet" },
//             { label: "City or Town", value: user.city || "You not Update yet" },
//             { label: "Country", value: user.country || "You not Update yet" },
//           ]
//         : []),
    
//       { label: "User Status", value: user.origin || "You not Update yet" },
//       { label: "Blood Group", value: user.bloodGroup || "You not Update yet" },
//       { label: "Gender", value: user.gender || "You not Update yet" },
//       { label: "Occupation", value: user.occupation || "You not Update yet" },
    
//       // Conditionally include more details about occupation
//       ...(["Other", "Professional", "GovernmentJob", "Business", "Artist"].includes(user.occupation)
//         ? [
//             {
//               label: "More details about Occupation",
//               value: user.moreAboutOccupation || "You not Update yet",
//             },
//           ]
//         : []),
    
//       { label: "Joined On", value: user.createdAt },
//     ];
    
    
//     // Respond with structured data
//     res.json({
//       message: 'User data fetched successfully', user,
//       user: {      
//         id: user.id,
//         displayName: user.displayName,
//         userImage: user.userImage, // Image URL  
//         partialFields,
//         fullFields,
//       },
//     });
//   } catch (err) {
//     res.status(500).json({ message: 'Server error', error: err.message });
//   }
// });


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
      isCampaigner: user.isCampaigner,
      isCampaignerProfileCompleted: user.isCampaignerProfileCompleted,
      isCampaignerRequested: user.isCampaignerRequested,
      religion: user.religion,
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

    // Fetch all users with isBloodDonor = true
    const donors = await User.find({ isBloodDonor: true }).lean();
    if (!donors || donors.length === 0) {
      return res.status(404).json({ message: 'No donors found' });
    }
    // Fetch all users with isMentor = true
    const mentors = await User.find({  isMentor: true }).lean();
    if (!mentors || mentors.length === 0) {
      return res.status(404).json({ message: 'No donors found' });
    }
    // Fetch all users with isBloodDonor = true
    const unRegisterDonors = await Donation.find({ isBloodDonor: true }).lean();
    if (!unRegisterDonors || unRegisterDonors.length === 0) {
      return res.status(404).json({ message: 'No unRegisterDonors found' });
    }
    // Fetch all users with isBloodDonor = true
    const unRegisterMentors = await Donation.find({  isMentor: true }).lean();
    if (!unRegisterMentors || unRegisterMentors.length === 0) {
      return res.status(404).json({ message: 'No unRegisterDonors found' });
    }

    // Respond with the list of donors
    // Combine both results into a single response
    res.status(200).json({
      donors,          // List of users who are blood donors
      mentors,          // List of users who are mentors
      unRegisterDonors, // List of unregistered blood donors from the Donation collection
      unRegisterMentors // List of unregistered Mentors from the Donation collection
    });
  } catch (err) {
    console.error('Error fetching donors:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


// all the volunteers 
router.get('/api-volunteers', async (req, res) => {
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

    // Fetch all users with isVolunteer = true
    const volunteers = await User.find({ isVolunteer: true }).lean();
    if (!volunteers || volunteers.length === 0) {
      return res.status(404).json({ message: 'No Volunteer found' });
    }
    

    // Respond with the list of donors
    // Combine both results into a single response
    res.status(200).json({
      volunteers,          // List of users who are Volunteer
      
    });
  } catch (err) {
    console.error('Error fetching donors:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



// // get user by id
router.get('/:id', protect, async (req, res) => {
  try {    
    const userId = req.params.id; // Correct parameter name
    console.log('userId:', req.params.id); // Debugging
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


// Follow or Unfollow and send back to user suggestion
router.get('/userSuggestions/followOpt', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50, search, searchField } = req.query;
    const currentUserId = req.user.id;

    const query = { _id: { $ne: currentUserId } };

    // Smart search logic: only apply filter if both are present
    if (search && searchField) {
      query[searchField] = { $regex: search, $options: 'i' };
    }

    // 1. Paginate + filter users
    const users = await User.find(query)
      .select('username displayName updateFullName userImage state city followers hobby PIN occupation createdAt isProfileCompleted')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // 2. Recent post activity: only within last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentPostCounts = await Post.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      { $group: { _id: "$user", count: { $sum: 1 } } }
    ]);

    const recentPostMap = {};
    for (const { _id, count } of recentPostCounts) {
      recentPostMap[_id.toString()] = count;
    }

    // 3. Mark `isFollowed` and `isActive`
    const usersWithFollowStatus = users.map((user) => {
      const userId = user._id.toString();
      const recentPostCount = recentPostMap[userId] || 0;

      return {
        ...user.toObject(),
        isFollowed: user.followers.includes(currentUserId),
        isActive: recentPostCount >= 2,
      };
    });

    const total = await User.countDocuments(query);

    res.status(200).json({
      users: usersWithFollowStatus,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error('Error in /userSuggestions/followOpt:', error);
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
});



//for forum page
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
      if (currentUser.following.length >= 5) {
        return res.status(200).json({
            redirect: '/forum', // Redirect to the forum page
            message: 'Redirecting to the forum page. Note: You can now edit Post by clicking + symbol. ',
        });
    }

      // Fetch updated user suggestions
      const users = await User.find({ _id: { $ne: currentUserId } })
          .select('username displayName updateFullName userImage city state PIN occupation followers hobby isProfileCompleted')
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



//for dashboard statistics
// Get total users, total beneficiaries, and total beneficiaries with fulfilled donation status, Total blood donor in one request
router.get('/', async (req, res) => {
  try {
    // Fetch total users count
    const totalUsers = await User.countDocuments();

    //total blood doner in user collection
    const bloodDonorCount = await User.aggregate([
      {
        $match: { isBloodDonor: true }
      },
      {
        $count: "totalBloodDonors"
      }
    ]);
    const totalBloodDonors = bloodDonorCount[0]?.totalBloodDonors || 0;
    

    //total blood doner in donation collection of unregister user
    const bloodDonorCountUR = await Donation.aggregate([
      {
        $match: { isBloodDonor: true }
      },
      {
        $count: "totalBloodDonorsUR"
      }
    ]);
    const totalBloodDonorsUR = bloodDonorCountUR[0]?.totalBloodDonorsUR || 0;   

    const totalBLDonors = (totalBloodDonors || 0) + (totalBloodDonorsUR || 0);


    // Fetch total beneficiaries count
    const totalBeneficiaries = await Beneficiary.countDocuments();

    // Fetch total beneficiaries with 'donationStatus' set to "fulfilled"
    const totalSupportReceived = await Beneficiary.countDocuments({ donationStatus: "fulfilled" });

    //total conferences 
    const totalConferences = await Conference.countDocuments();

    //total open survey respondent in number
    const result = await Survey.aggregate([
  {
    $match: {
      isAdminCreated: true,
      status: 'active'
    }
  },
  { $unwind: "$responses" },
  { $count: "totalResponses" }
]);

const totalSurveyRespondents = result[0]?.totalResponses || 0;
console.log("Total Survey Respondents (Admin Created & Active):", totalSurveyRespondents);


    
    
    
    

    // Send all the results together in a single response
    res.json({
      message: 'Statistics fetched successfully',
      totalUsers,
      totalBLDonors,
      totalBeneficiaries,
      totalSupportReceived,
      totalConferences,
      totalSurveyRespondents
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

//for update user profile page
// Make sure this route file is using async handlers for username checking and suggestions
// Check if username is available and suggest alternatives if not
router.post("/check-username", async (req, res) => {
  try {
    const { username } = req.body;

    if (!username || username.length > 10 || !/^[a-zA-Z0-9]+$/.test(username)) {
      return res.status(400).json({ error: "Username must be max 10 alphanumeric characters!" });
    }

    // Check if username exists in the database
    const existingUser = await User.findOne({ username: username});

    if (existingUser) {
      // Suggest similar usernames
      const suggestions = [
        username + Math.floor(Math.random() * 100),
        username + "_01",
        "the" + username,
      ];
      return res.json({ available: false, suggestions });
    } else {
      return res.json({ available: true });
    }
  } catch (err) {
    console.error("Error checking username:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});






module.exports = router;
