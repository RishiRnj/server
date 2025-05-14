//EmailConfig.js 
 
const nodemailer = require("nodemailer");
const { getVerificationTemplate, getWelcomeTemplate, ResetPasswordEmailTemplate, getConfirmationTemplate, getEmailToAdminTemplate} = require("../libs/emailTemplate");
const {User} = require("../models/User");


// Configure the transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Function to send a verification code
const sendVerificationCode = async (email, veificationCode) => {
  try {
    if (!email) {
      throw new Error("Recipient email is not provided");
    }
    
    const fName = "User"; // Replace with the first name of the user


    const mailOptions = {
      from: `"BSREM" <${process.env.SMTP_email}>`, // Sender email
      to: email, // Recipient email
      subject: "Verify Your Email", // Subject
      text: "Verify Your Email", // Plain text body
      html: getVerificationTemplate(email, fName, veificationCode), // HTML body
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log("Verification code sent successfully. Message ID:", info.messageId);
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info)); // For testing
  } catch (error) {
    console.error("Failed to send verification code:", error);
  }
};


// Function to send Welcome Message
const sendWelcomeMsg = async (email, surveyLink) => {
  try {
    if (!email) {
      throw new Error("Recipient email is not provided");
    }
    const user = await User.findOne({ email });    
    //const fullName = user.username || user.displayName;
    const fullName = user ? user.displayName || user.username : "Sanatani";
    surveyLink = `${process.env.BASE_URL_FE}/open-survey` // Update this link later    
    

    const mailOptions = {
      from: `"BSREM" <${process.env.SMTP_email}>`, // Sender email
      to: email, // Recipient email
      subject: "Welcome Email", // Subject
      text: "Welcome Email", // Plain text body
      html: getWelcomeTemplate(fullName, surveyLink), // Correct parameters
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log("welcome Msg sent successfully. Message ID:", info.messageId);
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info)); // For testing
  } catch (error) {
    console.error("Failed to send welcome Msg:", error);
  }
};

const sendResetLink = async (email, fullName, resetPasswordLink, surveyLink) =>{
  try {
    if (!email) {
      throw new Error("Recipient email is not provided");
    }
    // const user = await Registration.findOne({ email });    
    // const fullName = `${user.fName} ${user.lName}`;  
    // const resetPasswordLink = ""; // Update this link later
    // const surveyLink = ""; // Update this link later

    const mailOptions = {
      from: `"BSREM" <${process.env.SMTP_email}>`, // Sender email
      to: email, // Recipient email
      subject: "Password Reset Link", // Subject
      text: "Password Reset Link", // Plain text body
      html: ResetPasswordEmailTemplate(fullName, resetPasswordLink, surveyLink), // Correct parameters
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("welcome Msg sent successfully. Message ID:", info.messageId);
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info)); // For testing  
    

} catch (error) {

}
};

const sendContactConfermation = async (email, name) => {
  try {
    const mailOptions = {
      from: `"BSREM" <${process.env.SMTP_email}>`, // Sender email
      to: email, // Recipient email
      subject: "We Received Your Contact Request", // Subject
      text: "Thank you for reaching out.", // Plain text body
      html: getConfirmationTemplate(name), // HTML body
    };
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log("Verification code sent successfully. Message ID:", info.messageId);
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info)); // For testing
    
  } catch (error) {
    console.log(error);    
  }
}

const saveInfoEmailAdmin = async ({name, email, phone, altPhone, formSelect, address, city, district,
  state, PIN, country, formMsg, keepInfoSecret}) => {
  try {
    const mailOptions = {
      from: `"BSREM Quick Contact" <${email}>`,  // Sender email or who try to contact with us
      to: process.env.SMTP_email,  // in this case we are Recipient
      subject: `Quick Contact Request from ${name}`, // Subject
      text: "Quick contact details", // Plain text body
      html: getEmailToAdminTemplate({name, email, phone, altPhone, formSelect, address, city, district,
        state, PIN, country, formMsg, keepInfoSecret}), // HTML body
    };
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log("Verification code sent successfully. Message ID:", info.messageId);
    console.log("Preview URL:", nodemailer.getTestMessageUrl(info)); // For testing
    
  } catch (error) {
    console.log(error);    
  }

}

module.exports = { sendVerificationCode, sendWelcomeMsg, sendResetLink, sendContactConfermation, saveInfoEmailAdmin };
