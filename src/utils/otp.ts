import crypto from 'crypto';
import redisClient from '../config/redis';

const OTP_SECRET = process.env.OTP_SECRET || 'fallback-otp-secret';
const OTP_EXPIRES_IN = parseInt(process.env.OTP_EXPIRES_IN || '300'); // 5 minutes

export const generateOTP = (): string => {
  // Hardcoded OTP for development - no Twilio required
  if (process.env.NODE_ENV === 'development') {
    return '123456'; // Hardcoded OTP for development
  }
  return crypto.randomInt(100000, 999999).toString();
};

export const hashOTP = (otp: string): string => {
  return crypto.createHmac('sha256', OTP_SECRET).update(otp).digest('hex');
};

export const storeOTP = async (phone: string, hashedOTP: string): Promise<void> => {
  const key = `otp:${phone}`;
  await redisClient.setEx(key, OTP_EXPIRES_IN, hashedOTP);
};

export const verifyOTP = async (phone: string, otp: string): Promise<boolean> => {
  const key = `otp:${phone}`;
  const storedHashedOTP = await redisClient.get(key);
  
  if (!storedHashedOTP) {
    return false;
  }

  const hashedOTP = hashOTP(otp);
  const isValid = storedHashedOTP === hashedOTP;

  if (isValid) {
    await redisClient.del(key); // Delete OTP after successful verification
  }

  return isValid;
};

export const generateInvitationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Get hardcoded OTP for development testing
export const getHardcodedOTP = (): string => {
  if (process.env.NODE_ENV === 'development') {
    return '123456';
  }
  throw new Error('Hardcoded OTP only available in development mode');
};

// Email verification token utilities
export const generateEmailVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export const storeEmailVerificationToken = async (email: string, token: string): Promise<void> => {
  const key = `email_verification:${email}`;
  await redisClient.setEx(key, 3600, token); // 1 hour expiry
};

export const verifyEmailVerificationToken = async (email: string, token: string): Promise<boolean> => {
  const key = `email_verification:${email}`;
  const storedToken = await redisClient.get(key);
  
  if (!storedToken) {
    return false;
  }

  const isValid = storedToken === token;

  if (isValid) {
    await redisClient.del(key); // Delete token after successful verification
  }

  return isValid;
};
