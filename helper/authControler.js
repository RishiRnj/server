//AuthController.js
const express = require('express');
const {User} = require ('../models/User')
const bcrypt = require('bcryptjs'); // For hashing passwords
const {sendVerificationCode, sendWelcomeMsg, sendResetLink} = require ('./EmailConfig')
const {Registration} = require("../models/User");
const crypto = require("crypto");



//SignUp
const sighUp = async (req, res) => {
     const { username, email, password, mobile } = req.body;
  // Validate input
  if (!username || !email || !password || !mobile) {
    return res.status(400).json({ message: 'All field are required.' });
  }
  // Validate input
  if (!username) {
    return res.status(400).json({ message: 'Username is required.' });
  }
  // Validate input
  if ( !email) {
    return res.status(400).json({ message: 'Email is required.' });
  }
  // Validate input
  if ( !password) {
    return res.status(400).json({ message: 'Password is required.' });
  }
  // Validate input
  if ( !mobile) {
    return res.status(400).json({ message: 'Mobile  is required.' });
  }
  // Check if email, password, or username is null or undefined
    if (!email || email.trim() === '') {
      return res.status(400).json({ message: 'Email is required' });
    }
  
    if (!password || password.trim() === '') {
      return res.status(400).json({ message: 'Password is required' });
    }
  
    if (!username || username.trim() === '') {
      return res.status(400).json({ message: 'Username is required' });
    }

  try {
    // Check if the email is already registered
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered.' });
    }    
    // Check if the mobile is already registered
    const existingMobile = await User.findOne({ mobile });
    if (existingMobile) {
      return res.status(400).json({ message: 'Mobile is already registered.' });
    }    
    const verificationCode = Math.floor(1000 + Math.random() * 9000);

    // Create a new user
    const newUser = new User({
      username,
      email,
      password: await bcrypt.hash(password, 10), // Store hashed password
      authProvider: 'local', // Indicating local authentication
      mobile,
      verificationCode,
    });

    // Save the user to the database
    await newUser.save();
    
    // Send email with verification code to the user
    // Ensure email and code are passed
    await sendVerificationCode(email, verificationCode); 
    console.log("Email for verification:", email , verificationCode);

    res.status(201).json({ msg: "OTP Send successfully", success: true, email: newUser.email }); //send user email to frontend
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
}

const verifyEmail = async (req, res) => {
  const { email, verificationCode } = req.body;
  const user = await User.findOne({ email });
  console.log("verify", req.body);
  

  if (!user) {
    return res.status(404).json({ msg: "User not found" });
  }

  // Construct the full name
  const fullName = user.username;
  const surveyLink = "https://www.google.com/"; // Update this link later
  const brandName = "BSREM"; // Replace with the brand's name

  // Check verification code
  if (user.verificationCode === verificationCode) {
    user.isVerified = true;
    user.verificationCode = null; // Clear the code after verification
    await user.save();

    // Call sendWelcomeMsg with correct parameters
    await sendWelcomeMsg(email, fullName);

    console.log("Email for verification:", email);
    return res.status(200).json({ msg: "Account verified successfully", user });
  } else {
    return res.status(400).json({ msg: "Invalid verification code" });
  }
};



const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ msg: "Email is required", success: false });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "User not found", success: false });
    }

    if (user.isVerified) {
      return res.status(400).json({ msg: "Email is already verified", success: false });
    }

    // Generate a new verification code
    const OTPCode = Math.floor(1000 + Math.random() * 9000);

    // Save the verification code to the user record
    user.verificationCode = OTPCode; // Ensure the schema has this field
    await user.save();

    // Send verification email
    await sendVerificationCode(user.email, OTPCode);

    res.status(200).json({ msg: "Email Verification code resend successfully", success: true });
  } catch (error) {
    console.error("Error resending verification email:", error.message);
    res.status(500).json({ msg: "Internal Server Error", success: false });
  }
};



const forgotPassword = async (req, res) => {
  const { email } = req.body;  

  if (!email) {
    return res.status(400).json({ msg: "Email is required." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ msg: "User not found." });
    }

    // Generate a password reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Save the hashed token and expiration time to the user's record
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send reset email
    const fullName = user.username;
    const baseUrl = `${process.env.BASE_URL_FE}/reset-password` || "http://localhost:3000/reset-password";
    const resetPasswordLink = `${baseUrl}/${resetToken}`;
    const surveyLink = process.env.SURVEY_LINK; // need to update latter
    
    await sendResetLink(user.email, fullName, resetPasswordLink, surveyLink)
    console.log("Email Sent:", email, resetPasswordLink, surveyLink);
    return res.status(200).json({ msg: "Password reset link sent to your email." });
    // // Generate JWT token
    // const payload = { id: user.id };
    // const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
    // res.json({ msg: "Password reset successful. You can now log in with your new password.", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error." });
  }
};



const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token) {
    return res.status(400).json({ msg: "Token is required." });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ msg: "Password must be at least 6 characters long." });
  }

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user by reset token
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }, // Ensure token is not expired
    });

    if (!user) {
      return res.status(400).json({ msg: "Invalid or expired reset token." });
    }

    // Hash and save the new password
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({ msg: "Password reset successful. You can now log in with your new password." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error." });
  }
};




module.exports = {sighUp, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword, };