const nodemailer = require('nodemailer');
const {User} = require('../models/User');

// Email config (use environment variables in production)
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

exports.notifyAdminAboutNewCampaigner = async (campaigner) => {
  try {
    // 1. Get all admin users
    const admins = await User.find({ role: 'admin' }).select('email');
    
    if (admins.length){      
        // 2. Prepare email content
    const mailOptions = {
        from: `"BSREM" <${process.env.SMTP_email}>`,
        to: admins.map(admin => admin.email).join(','),
        subject: 'New Campaigner Application',
        html: `
          <h2>New Campaigner Application Received</h2>
          <p><strong>Name:</strong> ${campaigner.username}</p>
          <p><strong>Email:</strong> ${campaigner.email}</p>
          <p><strong>Mobile:</strong> ${campaigner.mobile}</p>
          <p><strong>Campaign use for:</strong> ${campaigner.campaignUseFor}</p>
          <p><strong>Campaign For:</strong> ${campaigner.campaignFor}</p>
          <p><strong>ID Type:</strong> ${campaigner.campaignerIDType}</p>
          <p><strong>ID Number:</strong> ${campaigner.campaignerIDNumber}</p>
          <p><strong>Amount Paid:</strong> ₹ ${campaigner.campaignAmount}</p>
          <p><strong>Payment Slip:</strong> <a href="${campaigner.paymentSlip}">View Payment Proof</a></p>
          

          <p><strong>Image of ${campaigner.campaignerIDType}:</strong> <a href="${campaigner.campaignerIDImage}">View ID Proof</a></p>
          <br>
          <p>Please review this application in the admin dashboard.</p>
          <a href="${process.env.BASE_URL_FE}/admin">Review Application</a>
        `
      };
  
      // 3. Send email
      await transporter.sendMail(mailOptions);

    }   


  } catch (error) {
    console.error('Error sending admin notification:', error);
    // Don't throw error to avoid breaking main flow
  }

  try {
    // 2. Notify Campaigner (Applicant)
    if (campaigner.email) {
        const applicantMailOptions = {
          from: `"BSREM" <${process.env.SMTP_email}>`,
          to: campaigner.email,
          subject: 'Campaigner Profile Submitted Successfully',
          html: `
            <h2>Thank you for submitting your campaigner application!</h2>
            <p>Dear ${campaigner.username},</p>
            <p>We have received your campaigner profile and payment successfully.</p>
            <p>Our admin team will review your details. Once verified, you'll be notified to start your survey campaign.</p>
            <p>In the meantime, you can explore our platform and connect with other User.</p>
            <p>For perticipate our open survey for all: <a href="${process.env.BASE_URL_FE}/open-survey"> Click here to perticipate</a> </p>
            <br>
            <p>If you have any questions, feel free to reach out at <a href="mailto:${process.env.SMTP_email}"> ${process.env.SMTP_email || "with this email link"}  </a></p>
            <p>Best regards,<br>BSREM Team</p>
          `
        };
        await transporter.sendMail(applicantMailOptions);
      }   

    
  } catch (error) {
    console.error('Failed to notify applicant:', error);
    // Don't throw error to avoid breaking main flow
  }
};


exports.notifyCampaignerApproval = async (campaigner) => {
  try {
    // 1. Email Notification to Campaigner
    if (campaigner.email) {
      const mailOptions = {
        from: `"BSREM" <${process.env.SMTP_EMAIL}>`,
        to: campaigner.email,
        subject: 'Your Campaigner Profile Has Been Approved!',
        html: `
          <h2>Congratulations, ${campaigner.username}!</h2>
          <p>We're excited to inform you that your campaigner application has been approved.</p>
          
          <h3>Next Steps:</h3>
          <ol>
            <li>Login to your account at <a href="${process.env.BASE_URL_FE}/login">BSREM Platform</a></li>
            or
            <li>Go to Campaigner Dashboard by clicking <a href="${process.env.BASE_URL_FE}/campaigner-dashboard">Start Survey Campaign</a> </li>
            <li>Create your first survey campaign</li>
            <li>Start collecting responses from participants</li>
          </ol>
          
          <p><strong>Approved Details:</strong></p>
          <ul>
            <li>Campaign Type: ${campaigner.campaignUseFor === 'organization' ? 'Organization' : 'Individual'}</li>
            <li>Category: ${campaigner.campaignFor}</li>
            <li>Duration: ${campaigner.campaignDuration} days</li>
          </ul>
          
          <p>You can now access all campaigner features in your dashboard.</p>
          
          <p>For any questions, contact us at <a href="mailto:${process.env.SMTP_email}"> ${process.env.SMTP_email || "with this email link"}  </a></p>
          <p>Best regards,<br>The BSREM Team</p>
        `
      };
      await transporter.sendMail(mailOptions);
    }

    // // 2. In-App Notification
    // await Notification.create({
    //   recipient: campaigner._id,
    //   type: 'campaigner_approved',
    //   message: 'Your campaigner application has been approved!',
    //   link: '/campaigner/dashboard',
    //   metadata: {
    //     approvalDate: new Date(),
    //     campaignType: campaigner.campaignUseFor
    //   }
    // });

  } catch (error) {
    console.error('Notification error:', error);
    // Fail silently to not disrupt approval flow
  }
};

exports.createRenewNotification = async (survey, budget, days, id) => {
  //1. send email to admin
  try {
    // 1. Get all admin users
    const admins = await User.find({ role: 'admin' }).select('email');
    
    if (admins.length){      
        // 2. Prepare email content
    const mailOptions = {
        from: `"BSREM" <${process.env.SMTP_email}>`,
        to: admins.map(admin => admin.email).join(','),
        subject: `Campaign Renew Request: ${survey.title}`,
        html: `
          <p>A campaigner has requested to renew their survey:</p>
        <ul>
          <li><strong>Survey Title:</strong> ${survey.title}</li>
          <li><strong>Duration:</strong> ${days} days</li>
          <li><strong>Budget:</strong> ₹${budget}</li>
          <li><strong>Requested By:</strong> ${survey.createdBy.updateFullName} (${survey.createdBy.email}) (${survey.createdBy.mobile})</li>
        </ul>
          <br>
          <p>Please review this application in the admin dashboard.</p>
          <a href="${process.env.BASE_URL_FE}/admin">Review Application</a>
        `
      };
  
      // 3. Send email
      await transporter.sendMail(mailOptions);
    }
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }

  //1. send email to Campaigner
  try {
    // 2. Notify Campaigner (Applicant)
    if (survey.createdBy.email) {
      const applicantMailOptions = {
        from: `"BSREM" <${process.env.SMTP_email}>`,
        to: survey.createdBy.email,
        subject: `✅ Your Campaign Renew Request Was Received`,
        html: `
          <p>Hi ${survey.createdBy.updateFullName},</p>
        <p>Your request to renew the campaign titled <strong>"${survey.title}"</strong> has been received.</p>
        <p>Our support team has been notified. Once the request is reviewed and approved, the campaign will go live again. You will be notified by email.</p>
        <br/>
        <li>Go to Campaigner Dashboard by clicking <a href="${process.env.BASE_URL_FE}/campaigner-dashboard">Start Survey Campaign</a> </li>

        <br>
          <p>For perticipate our open survey for all: <a href="${process.env.BASE_URL_FE}/open-survey"> Click here to perticipate</a> </p>
          <br>
          <p>If you have any questions, feel free to reach out at <a href="mailto:${process.env.SMTP_email}"> ${process.env.SMTP_email || "with this email link"}  </a></p>
          <p>Best regards,<br>BSREM Team</p>
        `
      };
      await transporter.sendMail(applicantMailOptions);
    }   
    
  } catch (error) {
    console.error('Error sending Campaigner notification:', error);
  }

}


exports.notifyCampaignerStatusChange = async (survey) => {
  try {
    // 1. Email Notification to Campaigner
    if (survey.createdBy.email) {
      const mailOptions = {
        from: `"BSREM" <${process.env.SMTP_email}>`,
        to: survey.createdBy.email,
        subject: `Your Campaign Status Has Been Updated`,
        html: `
          <h2>Campaign Status Update</h2>
          <p>Dear ${survey.createdBy.updateFullName},</p>
          <p>The status of your campaign titled "<strong>${survey.title}</strong>" has been updated.</p>
          <p><strong>New Status:</strong> ${survey.status}</p>
          <p><strong>Campaign new duration:</strong> ${survey.durationDays}</p>
          <p><strong>Campaign live till:</strong> ${survey.endDate}</p>
          <p>You can view the details in your dashboard.</p>
          <br/>
          <li>Go to Campaigner Dashboard by clicking <a href="${process.env.BASE_URL_FE}/campaigner-dashboard">Start Survey Campaign</a> </li>

          <br>
          <p>If you have any questions, feel free to reach out at <a href="mailto:${process.env.SMTP_email}"> ${process.env.SMTP_email || "with this email link"}  </a></p>
          <p>Best regards,<br>The BSREM Team</p>
        `
      };
      await transporter.sendMail(mailOptions);
    }

  } catch (error) {
    console.error('Notification error:', error);
  }
};



exports.notificationCampaignerDeleteSurvey = async (survey, user) => {
  try {
    // 1. Email Notification to Campaigner
    if (user.email) {
      const mailOptions = {
        from: `"BSREM" <${process.env.SMTP_email}>`,
        to: user.email,
        subject: `🗑️ Your Survey "${survey.title}" Was Deleted`,
        html: `
          <h2>Campaign Status Update</h2>
          <p>Hello ${user.updateFullName || 'User'},</p>
      <p>Your survey titled <strong>${survey.title}</strong> has been successfully deleted from the system.</p>
      
      <br>
          <p>You can view the details in your dashboard.</p>          
          <li>Go to Campaigner Dashboard by clicking <a href="${process.env.BASE_URL_FE}/campaigner-dashboard">Start Survey Campaign</a> </li>

          <br>
          <p>If this was a mistake or you need assistance, please contact our support team.</p>
          <p>If you have any questions, feel free to reach out at <a href="mailto:${process.env.SMTP_email}"> ${process.env.SMTP_email || "with this email link"}  </a></p>
          <p>Best regards,<br>The BSREM Team</p>
        `
      };
      await transporter.sendMail(mailOptions);
    }

  } catch (error) {
    console.error('Notification error:', error);
  }
};