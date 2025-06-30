//AuthRoute.js
const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs'); // For hashing passwords
const {User} = require('../models/User'); // User model
const { sighUp, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword, } = require('../helper/authControler');
const { sendWelcomeMsg } = require('../helper/EmailConfig');
const jwt = require('jsonwebtoken');
const router = express.Router();
exports.router = router;

// Registration route
router.post('/register',sighUp);


// Verify Email Route
router.post("/verifyEmail", verifyEmail);



// Resend Verification Email Route
router.post("/resend-verification-email", resendVerificationEmail);



// Forgot Password Route
router.post("/forgot-password", forgotPassword);

// Reset Password Route
router.post("/reset-password/:token", resetPassword);



// // Manual login ((with jwt))
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      // If user is not authenticated, send the custom message from the strategy
      return res.status(401).json({ success: false, ...info });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, username : user.username, updateFullName: user.updateFullName , role: user.role, isCampaigner: user.isCampaigner, religion: user.religion, mobile: user.mobile, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '2d' }
    );

    res.status(200).json({ token, message: 'Login successful' });
  })(req, res, next);
});

router.post('/mobile-login', (req, res, next) => {
  passport.authenticate('mobile-login', (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.status(401).json({ success: false, ...info });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, username : user.username, updateFullName: user.updateFullName , role: user.role, isCampaigner: user.isCampaigner, religion: user.religion, mobile: user.mobile, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '2d' }
    );

    res.status(200).json({ token, message: 'Mobile login successful' });
  })(req, res, next);
});



// Google login
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));


// Google callback route ((with jwt))
router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    try {
      const user = req.user; // Authenticated user object from Google strategy

      // Update isVerified to true for the user
      const updatedUser = await User.findOneAndUpdate(
        { email: user.email }, // Find user by email
        { $set: { isVerified: true } }, // Set isVerified to true
        { new: true } // Return the updated document
      );

      if (updatedUser) {
        console.log("update user", updatedUser);
        
        console.log(`User ${updatedUser.email} is now verified.`);
      } else {
        console.warn(`User with email ${user.email} not found in the database.`);
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email, displayName: user.displayName, updateFullName: user.updateFullName , role: user.role, isCampaigner: user.isCampaigner, religion: user.religion, mobile: user.mobile, username: user.username },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      // Send a welcome message
      try {
        const fullName = updatedUser?.displayName || "Sanatani";
        await sendWelcomeMsg(user.email, fullName);
        console.log(`Welcome message sent to ${user.email}`);
      } catch (error) {
        console.error(`Failed to send welcome message to ${user.email}:`, error.message);
      }

      // Redirect to the frontend with the token       
      res.redirect(`${process.env.BASE_URL_FE}/auth/-proxy?token=${token}`);
    } catch (err) {
      console.error("Error during Google login callback:", err);
      res.status(500).json({ message: 'Error during Google login' });
    }
  }
);



// Logout
router.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.json({ message: 'Logged out successfully' });
    });
  });
});



module.exports = router;




