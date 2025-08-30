import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { asyncHandler } from '../middleware/errorHandler';
import { 
  CreateUserDto, 
  LoginDto, 
  PhoneLoginDto, 
  SendOtpDto, 
  CreateInvitationDto, 
  AcceptInvitationDto,
  SendVerificationEmailDto,
  VerifyEmailDto
} from '../types';

export class AuthController {
  // POST /api/auth/register
  static register = asyncHandler(async (req: Request, res: Response) => {
    const userData: CreateUserDto = req.body;
    const result = await AuthService.register(userData);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result
    });
  });

  // POST /api/auth/login
  static login = asyncHandler(async (req: Request, res: Response) => {
    const credentials: LoginDto = req.body;
    const result = await AuthService.login(credentials);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: result
    });
  });

  // POST /api/auth/send-otp
  static sendOTP = asyncHandler(async (req: Request, res: Response) => {
    const data: SendOtpDto = req.body;
    const result = await AuthService.sendOTP(data);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      data: result
    });
  });

  // POST /api/auth/login/otp
  static phoneLogin = asyncHandler(async (req: Request, res: Response) => {
    const credentials: PhoneLoginDto = req.body;
    const result = await AuthService.phoneLogin(credentials);

    res.status(200).json({
      success: true,
      message: 'Phone login successful',
      data: result
    });
  });

  // POST /api/auth/send-verification-email
  static sendVerificationEmail = asyncHandler(async (req: Request, res: Response) => {
    const data: SendVerificationEmailDto = req.body;
    const result = await AuthService.sendVerificationEmail(data);

    res.status(200).json({
      success: true,
      message: 'Verification email sent successfully',
      data: result
    });
  });

  // POST /api/auth/verify-email
  static verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const data: VerifyEmailDto = req.body;
    const result = await AuthService.verifyEmail(data);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: result
    });
  });

  // GET /api/auth/me
  static getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const user = await AuthService.getCurrentUser(userId);

    res.status(200).json({
      success: true,
      message: 'Current user retrieved successfully',
      data: user
    });
  });

  // POST /api/auth/invitations
  static createInvitation = asyncHandler(async (req: Request, res: Response) => {
    const invitationData: CreateInvitationDto = req.body;
    const currentUserId = req.user!.userId;
    const result = await AuthService.createInvitation(invitationData, currentUserId);

    res.status(201).json({
      success: true,
      message: 'Invitation created successfully',
      data: result
    });
  });

  // POST /api/auth/invitations/accept
  static acceptInvitation = asyncHandler(async (req: Request, res: Response) => {
    const data: AcceptInvitationDto = req.body;
    const result = await AuthService.acceptInvitation(data);

    res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully',
      data: result
    });
  });
}
