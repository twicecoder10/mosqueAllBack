import twilio from 'twilio';

// Only initialize Twilio client if credentials are properly set
let client: any = null;

if (process.env.NODE_ENV !== 'development' && 
    process.env.TWILIO_ACCOUNT_SID && 
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
}

export const sendSMS = async (to: string, message: string) => {
  // Use hardcoded mode if in development or Twilio client is not available
  if (process.env.NODE_ENV === 'development' || !client) {
    console.log('📱 [HARDCODED MODE] SMS would be sent to:', to);
    console.log('📱 [HARDCODED MODE] Message:', message);
    console.log('📱 [HARDCODED MODE] Hardcoded OTP: 123456');
    return { sid: 'hardcoded-sms-id' };
  }

  try {
    const result = await client.messages.create({
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
  
  if (process.env.NODE_ENV === 'development' || !client) {
    console.log('📱 [HARDCODED MODE] OTP SMS would be sent to:', phone);
    console.log('📱 [HARDCODED MODE] OTP Code: 123456 (hardcoded for production)');
    console.log('📱 [HARDCODED MODE] Full message:', message);
    return { sid: 'hardcoded-otp-sms-id' };
  }
  
  return sendSMS(phone, message);
};
