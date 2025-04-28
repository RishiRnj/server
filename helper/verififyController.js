const {User} = require('../models/User');
const EmailVerification = require('../models/EmailVerification');
const Contact = require('../models/Contact');
const { sendVerificationCode, sendWelcomeMsg, sendContactConfermation, saveInfoEmailAdmin } = require('./EmailConfig');

const sendCode = async (req, res) => {
  const { email } = req.body;

  // Validate email format
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email address.' });
  }

  try {
    // Check if the email already exists
    const userInDB = await User.findOne({ email });

    if (userInDB) {
      // Case 1: User exists and is already verified
      if (userInDB.isVerified) {
        return res.status(409).json({ message: 'Email is already verified.' });
      }

      // Case 2: User exists but is not verified
      const verificationCode = Math.floor(1000 + Math.random() * 9000);
      const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10-minute expiry

      // Save or update verification code in EmailVerification collection
      await EmailVerification.findOneAndUpdate(
        { email },
        { code: verificationCode, expiresAt: expirationTime },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Send OTP email
      try {
        await sendVerificationCode(email, verificationCode);
        console.log('Verification code sent to:', email, verificationCode);
        return res.status(201).json({
          message: 'OTP sent successfully. Please verify your account.',
          success: true,
        });
      } catch (emailError) {
        console.error('Error sending verification email:', emailError.message);
        return res.status(500).json({
          message: 'Failed to send OTP. Please try again later.',
        });
      }
    }

    // Case 3: New user (email does not exist in the User collection)
    const verificationCode = Math.floor(1000 + Math.random() * 9000);
    const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 10-minute expiry

    // Save OTP to EmailVerification collection
    await EmailVerification.findOneAndUpdate(
      { email },
      { code: verificationCode, expiresAt: expirationTime },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send OTP email
    try {
      await sendVerificationCode(email, verificationCode);
      console.log('Verification code sent to:', email, verificationCode);
      return res.status(201).json({
        message: 'OTP sent successfully.',
        success: true,
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError.message);
      return res.status(500).json({
        message: 'Failed to send OTP. Please try again later.',
      });
    }
  } catch (error) {
    console.error('Error in sendCode function:', error.message);
    return res
      .status(500)
      .json({ message: 'Internal server error. Please try again later.' });
  }
};


const verifyEmail = async (req, res) => {
  const { email, otp } = req.body;

  console.log("Received request:", { email, otp });

  try {
    const user = await EmailVerification.findOne({ email: email.trim().toLowerCase() });

    console.log("Retrieved user from database:", user);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Expiry check
    const currentTime = new Date();
    if (currentTime > user.expiresAt) {
      return res.status(400).json({ msg: "Verification code has expired." });
    }

    // Check OTP match
    if (String(user.code) === String(otp)) {
      console.log("OTP match successful:", { email, otp });

      // Update User collection
      const users = await User.findOne({ email: email.trim().toLowerCase() });
      if (users) {
        if (!users.isVerified) {
          users.isVerified = true;
          await users.save();
          console.log("User verification status updated in User collection:", users);
        }
      } else {
        console.log("No user found in User collection for email:", email);

      }

      // Determine the full name for the welcome message
      const fullName = users ? users.displayName || users.username : "Sanatani";
      await sendWelcomeMsg(email, fullName);

      // Optionally delete the verification record
      await EmailVerification.deleteOne({ email });

      return res.status(200).json({ msg: "Account verified successfully" });
    } else {
      console.log("OTP mismatch:", { expected: user.code, received: code });
      return res.status(400).json({ msg: "Invalid verification code" });
    }
  } catch (error) {
    console.error("Error during verification:", error);
    return res.status(500).json({ msg: "An error occurred during verification." });
  }
};

const saveContactInfo = async (req, res) => {
  const {
    name, email, phone, altPhone, formSelect, address, city, district, state,
    PIN, country, formMsg, isQuickContact, keepInfoSecret, } = req.body;

  try {
    // Save contact information to the database
    const contact = new Contact({
      name, email, phone, altPhone, formSelect, address, city, district,
      state, PIN, country, formMsg, isQuickContact, keepInfoSecret,
    });
    await contact.save();
    await sendContactConfermation(email, name)
    console.log('Info saved & Confermation email sent successfully');
    res.status(200).json({ message: 'Contact information saved successfully.' });
  } catch (error) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

const saveInfoMailToAdim = async (req, res) => {
  const {
    name, email, phone, altPhone, formSelect, address, city, district, state,
    PIN, country, formMsg, isQuickContact, keepInfoSecret, } = req.body;

  // Validate required fields
  if (!name || !email || !formMsg) {
    return res.status(400).json({ message: 'Name, Email, and Message are required.' });
  }

  try {

    // Save contact information to the database
    const contact = new Contact({
      name, email, phone, altPhone, formSelect, address, city, district,
      state, PIN, country, formMsg, isQuickContact: true, keepInfoSecret,
    });
    await contact.save();
    console.log('Contact information saved successfully.');

    // Send admin email
    await saveInfoEmailAdmin({
      name, email, phone, altPhone, formSelect, address, city, district,
      state, PIN, country, formMsg, isQuickContact, keepInfoSecret,
    });
    console.log('Admin email sent successfully.');

    // Send confirmation email
    await sendContactConfermation(email, name);
    console.log('Confirmation email sent successfully.');

    res.status(200).json({ message: 'Quick Contact processed successfully.' });

  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Internal server error' });

  }
}



module.exports = { sendCode, verifyEmail, saveContactInfo, saveInfoMailToAdim };
