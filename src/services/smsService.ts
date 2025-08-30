import twilio from 'twilio';

// Only initialize Twilio client if not in development mode
const client = process.env.NODE_ENV !== 'development' ? twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
) : null;

export const sendSMS = async (to: string, message: string) => {
  // In development mode, just log the SMS instead of sending
  if (process.env.NODE_ENV === 'development') {
    console.log('📱 [DEV MODE] SMS would be sent to:', to);
    console.log('📱 [DEV MODE] Message:', message);
    console.log('📱 [DEV MODE] Hardcoded OTP: 123456');
    return { sid: 'dev-mode-sms-id' };
  }

  try {
    const result = await client!.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    // SMS sent successfully
    return result;
  } catch (error) {
    console.error('SMS sending failed:', error);
    throw new Error('Failed to send SMS');
  }
};

export const sendOTPSMS = async (phone: string, otp: string) => {
  const message = `Your Islamic Association verification code is: ${otp}. Valid for 5 minutes.`;
  
  if (process.env.NODE_ENV === 'development') {
    console.log('📱 [DEV MODE] OTP SMS would be sent to:', phone);
    console.log('📱 [DEV MODE] OTP Code: 123456 (hardcoded for development)');
    console.log('📱 [DEV MODE] Full message:', message);
    return { sid: 'dev-mode-otp-sms-id' };
  }
  
  return sendSMS(phone, message);
};
