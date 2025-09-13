const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// إرسال إيميل التحقق
async function sendVerificationEmail(to, token, username = 'User') {
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  const currentYear = new Date().getFullYear();

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4a6cf7; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
        .content { padding: 30px; background-color: #ffffff; border: 1px solid #e0e0e0; border-top: none; }
        .button {
          display: inline-block; 
          padding: 12px 30px; 
          margin: 20px 0; 
          background-color: #4a6cf7; 
          color: #ffffff !important; 
          text-decoration: none; 
          border-radius: 25px;
          font-weight: 600;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .footer { 
          text-align: center; 
          padding: 20px; 
          color: #888888; 
          font-size: 12px; 
          background-color: #f9f9f9;
          border-radius: 0 0 8px 8px;
        }
        .code-box {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
          word-break: break-all;
          font-family: monospace;
          color: #333;
        }
        .divider {
          border: none;
          height: 1px;
          background-color: #e0e0e0;
          margin: 25px 0;
        }
      </style>
    </head>
    <body style="background-color: #f5f5f5; padding: 20px 0;">
      <div class="container">
        <div class="header">
          <h1>Welcome to E-commerce Store</h1>
        </div>
        <div class="content">
          <p>Hello ${username},</p>
          <p>Thank you for registering with E-commerce Store! To complete your registration, please verify your email address by clicking the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}" class="button" style="color: #ffffff;">
              Verify Email Address
            </a>
          </div>
          
          <p>If the button doesn't work, please copy and paste the following link into your web browser:</p>
          
          <div class="code-box">
            ${verifyUrl}
          </div>
          
          <p>This verification link will expire in 12 hours for security reasons.</p>
          
          <p>If you didn't create an account with us, please ignore this email or contact our support team if you have any questions.</p>
          
          <hr class="divider">
          
          <p>Best regards,<br>The E-commerce Store Team</p>
        </div>
        <div class="footer">
          &copy; ${currentYear} E-commerce Store. All rights reserved.<br>
          <small>This is an automated message, please do not reply directly to this email.</small>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to,
    subject: "Verify Your Email",
    html: htmlContent,
  });

  return { message: "Verification email sent." };
}

// إرسال إيميل التحقق من المسؤول
async function sendAdminVerificationEmail(to, token) {
  // Use the frontend verification page which will handle the API call
  const verifyUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  const currentYear = new Date().getFullYear();

  const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>طلب التحقق من البريد الإلكتروني</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          line-height: 1.6; 
          color: #333333; 
          margin: 0; 
          padding: 20px;
          background-color: #f5f5f5;
          text-align: right;
          direction: rtl;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header { 
          padding: 15px 0;
          border-bottom: 1px solid #e0e0e0;
          margin-bottom: 20px;
        }
        .header h1 { 
          color: #333333; 
          margin: 0; 
          font-size: 18px;
          text-align: right;
          font-weight: normal;
        }
        .content { 
          padding: 10px 0;
          line-height: 1.8;
          color: #333;
        }
        .button {
          display: inline-block;
          padding: 10px 20px;
          margin: 15px 0;
          background-color: #1a73e8;
          color: white !important;
          text-decoration: none;
          border-radius: 4px;
          font-weight: 500;
        }
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #e0e0e0;
          font-size: 12px;
          color: #666;
          text-align: center;
        }
        .button {
          display: inline-block; 
          padding: 12px 30px; 
          margin: 20px 0; 
          background-color: #4a6cf7; 
          color: #ffffff !important; 
          text-decoration: none; 
          border-radius: 25px;
          font-weight: 600;
          box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .footer { 
          text-align: center; 
          padding: 20px; 
          color: #888888; 
          font-size: 12px; 
          background-color: #f9f9f9;
          border-radius: 0 0 8px 8px;
        }
        .code-box {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin: 15px 0;
          word-break: break-all;
          font-family: monospace;
          color: #333;
        }
        .divider {
          border: none;
          height: 1px;
          background-color: #e0e0e0;
          margin: 25px 0;
        }
        .warning {
          background-color: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 12px;
          margin: 15px 0;
          border-radius: 4px;
        }
      </style>
    </head>
    <body style="background-color: #f5f5f5; padding: 20px 0;">
      <div class="container">
        <div class="header">
          <h1>E-commerce Store &lt;hemaatar636@gmail.com&gt;</h1>
        </div>
        <div class="content">
          <p>Your administrator has just requested that you update your Ecommerce account by performing the following action(s): <strong>Verify Email</strong>. Click on the link below to start this process.</p>
          
          <p>Link to account update</p>
          
          <div style="text-align: left; margin: 20px 0;">
            <a href="${verifyUrl}" style="color: #1a73e8; text-decoration: underline;">
              ${verifyUrl}
            </a>
          </div>
          
          <p>This link will expire within 12 hours.</p>
          
          <p>If you are unaware that your administrator has requested this, just ignore this message and nothing will be changed.</p>
          
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
          
        </div>
        <div class="footer">
          &copy; ${currentYear} جميع الحقوق محفوظة للمتجر الإلكتروني<br>
          <small>هذه رسالة آلية، يرجى عدم الرد على هذا البريد الإلكتروني مباشرة.</small>
        </div>
      </div>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: '"E-commerce Store" <hemaatar636@gmail.com>',
    to,
    subject: "طلب التحقق من البريد الإلكتروني - إجراء مطلوب",
    html: htmlContent,
  });

  return { message: "Admin verification email sent." };
}

module.exports = { sendVerificationEmail, sendAdminVerificationEmail };
