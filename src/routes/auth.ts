import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { 
  validateCreateUser, 
  validateLogin, 
  validatePhoneLogin, 
  validateSendOtp, 
  validateCreateInvitation, 
  validateAcceptInvitation,
  validateSendVerificationEmail,
  validateVerifyEmail
} from '../utils/validation';

const router = Router();

// Registration and Login
router.post('/register', validateCreateUser, AuthController.register);
router.post('/login', validateLogin, AuthController.login);

// Phone-based authentication
router.post('/send-otp', validateSendOtp, AuthController.sendOTP);
router.post('/login/otp', validatePhoneLogin, AuthController.phoneLogin);

// Email verification
router.post('/send-verification-email', validateSendVerificationEmail, AuthController.sendVerificationEmail);
router.post('/verify-email', validateVerifyEmail, AuthController.verifyEmail);

// User profile
router.get('/me', authenticate, AuthController.getCurrentUser);

// Invitations
router.post('/invitations', validateCreateInvitation, AuthController.createInvitation);
router.post('/invitations/accept', validateAcceptInvitation, AuthController.acceptInvitation);

export default router;
