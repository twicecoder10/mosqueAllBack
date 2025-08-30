import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  // In development mode, just log the email instead of sending
  // if (process.env.NODE_ENV === 'development') {
  //   console.log('📧 [DEV MODE] Email would be sent to:', to);
  //   console.log('📧 [DEV MODE] Subject:', subject);
  //   console.log('📧 [DEV MODE] Content:', html);
  //   console.log('📧 [DEV MODE] Verification link would be sent to frontend');
  //   return { messageId: 'dev-mode-email-id' };
  // }

  try {
    const mailOptions = {
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    // Email sent successfully
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw new Error('Failed to send email');
  }
};

export const sendInvitationEmail = async (email: string, token: string, role: string) => {
  const subject = 'Invitation to Join Islamic Association';
  const html = `
    <h2>You've been invited to join the Islamic Association</h2>
    <p>You have been invited to join our community as a ${role.toLowerCase()}.</p>
    <p>Click the link below to accept the invitation and create your account:</p>
    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/accept-invitation?token=${token}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0;">
      Accept Invitation
    </a>
    <p>This invitation will expire in 24 hours.</p>
    <p>If you didn't expect this invitation, please ignore this email.</p>
  `;

  return sendEmail(email, subject, html);
};

export const sendVerificationEmail = async (email: string, token: string) => {
  const subject = 'Verify Your Email Address - Islamic Association';
  const frontendUrl = process.env.FRONTEND_URL;
  
  const html = `
    <h2>Welcome to the Islamic Association!</h2>
    <p>Thank you for registering with us. To complete your registration, please verify your email address by clicking the link below:</p>
    <a href="${frontendUrl}/verify-email?token=${token}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 10px 0;">
      Verify Email Address
    </a>
    <p>This verification link will expire in 1 hour.</p>
    <p>If you didn't create an account with us, please ignore this email.</p>
    <p>If you're having trouble clicking the button, copy and paste this URL into your browser:</p>
    <p>${frontendUrl}/verify-email?token=${token}</p>
  `;

  return sendEmail(email, subject, html);
};

export const sendEventReminderEmail = async (email: string, eventTitle: string, eventDate: Date, location: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2c5530;">Event Reminder</h2>
      <h3>${eventTitle}</h3>
      <p>This is a friendly reminder about the upcoming event:</p>
      <ul>
        <li><strong>Event:</strong> ${eventTitle}</li>
        <li><strong>Date:</strong> ${eventDate.toLocaleDateString()}</li>
        <li><strong>Time:</strong> ${eventDate.toLocaleTimeString()}</li>
        <li><strong>Location:</strong> ${location}</li>
      </ul>
      <p>We look forward to seeing you there!</p>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 12px;">
        This is an automated reminder from the Islamic Association Event Management System.
      </p>
    </div>
  `;

  return sendEmail(email, `Reminder: ${eventTitle}`, html);
};
