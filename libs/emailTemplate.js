// Verification Code Email Template
const getVerificationTemplate = (BSREM, fName, verificationCode) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: #0078d4;
            color: #ffffff;
            text-align: center;
            padding: 20px;
        }
        .header h1 {
            margin: 0;
        }
        .body {
            padding: 20px;
            text-align: center;
        }
        .code {
            font-size: 24px;
            font-weight: bold;
            color: #0078d4;
            margin: 20px 0;
        }
        .footer {
            background: #f9f9f9;
            color: #666;
            text-align: center;
            padding: 10px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>BSREM</h1>
        </div>
        <div class="body">
            <p>Hi <strong>${fName}</strong>,</p>
            <p>Thank you for registering with us! Please verify your email address using the code below:</p>
            <div class="code">${verificationCode}</div>
            <p>If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} BSREM. All rights reserved.
        </div>
    </div>
</body>
</html>
`;

// Welcome Message Email Template
const getWelcomeTemplate = (fullName, surveyLink) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to BSREM</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f9f9f9;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: #ff9800;
            color: #ffffff;
            text-align: center;
            padding: 20px;
        }
        .header h1 {
            margin: 0;
        }
        .body {
            padding: 20px;
            color: #333;
        }
        .cta {
            margin: 20px 0;
            text-align: center;
        }
        .cta a {
            display: inline-block;
            background: #ff9800;
            color: #ffffff;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: bold;
        }
        .footer {
            background: #f1f1f1;
            color: #666;
            text-align: center;
            padding: 10px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to BSREM</h1>
        </div>
        <div class="body">
            <p>Dear <strong>${fullName}</strong>,</p>
            <p>We are delighted to have you join us on this journey to unite and strengthen the Hindu community. Together, we aim to raise awareness about our shared values, culture, and heritage, fostering a sense of belonging and togetherness.</p>
            <p>As part of our mission, we are organizing a community survey to gather insights and ideas from members like you. Your participation would be invaluable in shaping initiatives that benefit the entire community.</p>
            <div class="cta">
                <a href="${surveyLink}" target="_blank">Participate in the Survey</a>
            </div>
            <p>Thank you for being a part of this journey. Together, we can make a difference.</p>
            <p>Warm regards,</p>
            <p><strong>The BSREM Team</strong></p>
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} BSREM. All rights reserved.
        </div>
    </div>
</body>
</html>
`;


const ResetPasswordEmailTemplate = (fullName, resetPasswordLink, surveyLink) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to BSREM</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f9f9f9;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: #ff9800;
            color: #ffffff;
            text-align: center;
            padding: 20px;
        }
        .header h1 {
            margin: 0;
        }
        .body {
            padding: 20px;
            color: #333;
        }
        .cta {
            margin: 20px 0;
            text-align: center;
        }
        .cta a {
            display: inline-block;
            background: #ff9800;
            color: #ffffff;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: bold;
        }
        .footer {
            background: #f1f1f1;
            color: #666;
            text-align: center;
            padding: 10px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to BSREM</h1>
        </div>
        <div class="body">
            <p>Dear <strong>${fullName}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to reset it:</p>
        <div class="cta">
               <a href="${resetPasswordLink}" class="button">Click here to Reset Password</a>		
            </div>    
        
        <p>If you didn't request a password reset, please ignore this email or contact our support for assistance.</p>
		
            <p>As part of our mission, we are organizing a community survey to gather insights and ideas from members like you. Your participation would be invaluable in shaping initiatives that benefit the entire community.</p>
            <div class="cta">
                <a href="${surveyLink}" target="_blank">Participate in the Survey</a>
            </div>
            <p>Thank you for being a part of this journey. Together, we can make a difference.</p>
            <p>Warm regards,</p>
            <p><strong>The BSREM Team</strong></p>
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} BSREM. All rights reserved.
        </div>
    </div>
</body>
</html>
`;

const getEmailToAdminTemplate = ({
    name,
    email,
    phone,
    altPhone,
    formSelect,
    address,
    city,
    state,
    PIN,
    country,
    formMsg,
    keepInfoSecret,
  }) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Contact Request</title>
      <style>
          body {
              font-family: Arial, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
          }
          .container {
              max-width: 600px;
              margin: 20px auto;
              background: #ffffff;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          }
          .header {
              background: #0078d4;
              color: #ffffff;
              text-align: center;
              padding: 20px;
          }
          .header h1 {
              margin: 0;
          }
          .body {
              padding: 20px;
          }
          .footer {
              background: #f9f9f9;
              color: #666;
              text-align: center;
              padding: 10px;
              font-size: 12px;
          }
      </style>
  </head>
  <body>
      <div class="container">
          <div class="header">
              <h1>Quick Contact Request</h1>
          </div>
          <div class="body">
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone}</p>
              <p><strong>Alternate Phone:</strong> ${altPhone}</p>
              <p><strong>Hindus from India or outside India:</strong> ${formSelect}</p>
              <p><strong>Address:</strong> ${address}, ${city}, ${state}, ${PIN}, ${country}</p>
              <p><strong>Message:</strong></p>
              <p>${formMsg}</p>
              <p><strong>This information cannot be made public.</strong> <p>${keepInfoSecret}</p>
          </div>
          <div class="footer">
              &copy; ${new Date().getFullYear()} BSERM. All rights reserved.
          </div>
      </div>
  </body>
  </html>
  `;

  const getConfirmationTemplate = (name) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contact Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: #0078d4;
            color: #ffffff;
            text-align: center;
            padding: 20px;
        }
        .header h1 {
            margin: 0;
        }
        .body {
            padding: 20px;
            text-align: center;
        }
        .footer {
            background: #f9f9f9;
            color: #666;
            text-align: center;
            padding: 10px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Contact Confirmation</h1>
        </div>
        <div class="body">
            <p>Dear ${name},</p>
            <p>Thank you for reaching out to us. We have received your message and will get back to you shortly.</p>
            <p>If you have any urgent concerns, feel free to reply to this email or contact us directly.</p>
        </div>
        <div class="footer">
            &copy; ${new Date().getFullYear()} BSREM. All rights reserved.
        </div>
    </div>
</body>
</html>
`;

  







// Export templates
module.exports = { getVerificationTemplate, getWelcomeTemplate, ResetPasswordEmailTemplate, getEmailToAdminTemplate, getConfirmationTemplate };
