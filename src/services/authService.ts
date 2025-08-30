import prisma from '../config/database';
import { hashPassword, comparePassword, generateToken } from '../utils/auth';
import { generateOTP, storeOTP, verifyOTP, generateInvitationToken, hashOTP, generateEmailVerificationToken, storeEmailVerificationToken, verifyEmailVerificationToken } from '../utils/otp';
import { sendEmail, sendVerificationEmail } from './emailService';
import { sendSMS } from './smsService';
import { CreateUserDto, LoginDto, PhoneLoginDto, SendOtpDto, CreateInvitationDto, AcceptInvitationDto, SendVerificationEmailDto, VerifyEmailDto } from '../types';
import { createError } from '../middleware/errorHandler';

export class AuthService {
  // Unified Registration - Email/Password OR Phone/OTP
  static async register(userData: CreateUserDto) {
    // Filter out extra fields that don't exist in the database schema
    const { email, phone, password, gender, confirmPassword, acceptTerms, ...otherData } = userData;

    // Validate that at least one contact method is provided
    if (!email && !phone) {
      throw createError('At least one contact method (email or phone) is required', 400, 'INVALID_CONTACT_METHOD');
    }

    // Determine authentication method
    const isEmailAuth = email && password;
    const isPhoneAuth = phone && !email;

    // Validate authentication method
    if (isEmailAuth && !password) {
      throw createError('Password is required for email registration', 400, 'PASSWORD_REQUIRED');
    }

    if (isPhoneAuth && password) {
      throw createError('Password should not be provided for phone-only registration', 400, 'PASSWORD_NOT_ALLOWED');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existingUser) {
      throw createError('User with this email or phone already exists', 409, 'USER_EXISTS');
    }

    // Hash password if provided (email auth)
    const hashedPassword = isEmailAuth && password ? await hashPassword(password) : null;

    // Set verification status based on auth method
    const isVerified = false; // Both email and phone users need verification

    const user = await prisma.user.create({
      data: {
        email: email || null,
        phone: phone || null,
        password: hashedPassword || null,
        gender,
        ...otherData,
        isVerified
      }
    });

    // For phone-only users, send OTP immediately
    if (isPhoneAuth) {
      const otp = generateOTP();
      const hashedOTP = hashOTP(otp);
      await storeOTP(phone, hashedOTP);
      
      // Send OTP via SMS
      await sendSMS(phone, `Your OTP is: ${otp}. Valid for 7 days.`);
    }

    // For email users, send verification email immediately
    if (isEmailAuth && email) {
      const verificationToken = generateEmailVerificationToken();
      await storeEmailVerificationToken(email, verificationToken);
      
      // Send verification email
      await sendVerificationEmail(email, verificationToken);
    }

    // Generate token only for email users (phone users get token after OTP verification)
    const token = isEmailAuth ? generateToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role
    }) : null;

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      ...(token && { token }), // Only include token if it exists
      authMethod: isEmailAuth ? 'email' : 'phone',
      message: isPhoneAuth 
        ? 'Account created. Please check your phone for OTP to complete login.' 
        : 'Account created. Please check your email for verification link to complete registration.'
    };
  }

  // Email/Password Login (supports users with both email and phone)
  static async login(credentials: LoginDto) {
    const { email, phone, password } = credentials;

    // Validate that at least one contact method is provided
    if (!email && !phone) {
      throw createError('At least one contact method (email or phone) is required', 400, 'INVALID_CONTACT_METHOD');
    }

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (!user || !user.password) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // For users with both email and phone, allow login even if not email-verified
    // (they can use OTP login instead)
    if (!user.isVerified && !user.phone) {
      throw createError('Account not verified', 403, 'ACCOUNT_NOT_VERIFIED');
    }

    const token = generateToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      token
    };
  }

  // Send OTP
  static async sendOTP(data: SendOtpDto) {
    const { phone } = data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { phone }
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    const otp = generateOTP();
    const hashedOTP = hashOTP(otp);
    await storeOTP(phone, hashedOTP);

    // Send OTP via SMS
    await sendSMS(phone, `Your OTP is: ${otp}. Valid for 5 minutes.`);

    return { message: 'OTP sent successfully' };
  }

  // Phone/OTP Login (supports users with both email and phone)
  static async phoneLogin(credentials: PhoneLoginDto) {
    const { phone, otp } = credentials;

    const user = await prisma.user.findUnique({
      where: { phone }
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    const isOTPValid = await verifyOTP(phone, otp);
    if (!isOTPValid) {
      throw createError('Invalid OTP', 401, 'INVALID_OTP');
    }

    // Auto-verify user on successful OTP login (for all users)
    if (!user.isVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isVerified: true }
      });
      user.isVerified = true;
    }

    const token = generateToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      token
    };
  }

  // Create Invitation
  static async createInvitation(data: CreateInvitationDto, invitedBy: string) {
    const { email, phone, role } = data;

    // Validate that at least one contact method is provided
    if (!email && !phone) {
      throw createError('At least one contact method (email or phone) is required', 400, 'INVALID_CONTACT_METHOD');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ]
      }
    });

    if (existingUser) {
      throw createError('User already exists', 409, 'USER_EXISTS');
    }

    // Check if invitation already exists
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ],
        isAccepted: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (existingInvitation) {
      throw createError('Invitation already sent', 409, 'INVITATION_EXISTS');
    }

    const token = generateInvitationToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.invitation.create({
      data: {
        email: email || null,
        phone: phone || null,
        role,
        token,
        invitedBy,
        expiresAt
      }
    });

    // Send invitation
    try {
      if (email) {
        const inviteUrl = `${process.env.FRONTEND_URL}/invite?token=${token}`;
        await sendEmail(email, 'Invitation to Join Islamic Association', `
          You have been invited to join the Islamic Association Event Management Platform.
          Click the following link to accept the invitation: ${inviteUrl}
          This invitation expires in 7 days.
        `);
      }
      if (phone) {
        const otp = generateOTP();
        await sendSMS(phone, `You have been invited to join Islamic Association. Your invitation code is: ${otp}. Valid for 7 days.`);
        // Store OTP in invitation for verification
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { token: otp } // Override token with OTP for phone invitations
        });
      }
    } catch (error) {
      // Delete invitation if sending fails
      await prisma.invitation.delete({
        where: { id: invitation.id }
      });
      throw createError('Failed to send invitation', 500, 'INVITATION_SEND_FAILED');
    }

    return { message: 'Invitation sent successfully' };
  }

  // Accept Invitation
  static async acceptInvitation(data: AcceptInvitationDto) {
    const { token, firstName, lastName, gender, password, email, phone } = data;

    // Validate that at least one contact method is provided
    if (!email && !phone) {
      throw createError('At least one contact method (email or phone) is required', 400, 'INVALID_CONTACT_METHOD');
    }

    const invitation = await prisma.invitation.findUnique({
      where: { token }
    });

    if (!invitation) {
      throw createError('Invalid invitation token', 400, 'INVALID_TOKEN');
    }

    if (invitation.isAccepted) {
      throw createError('Invitation already accepted', 400, 'INVITATION_ALREADY_ACCEPTED');
    }

    if (invitation.expiresAt < new Date()) {
      throw createError('Invitation has expired', 400, 'INVITATION_EXPIRED');
    }

    // Hash password if provided
    const hashedPassword = password ? await hashPassword(password) : null;

    // Auto-verify if phone-only user (OTP-based)
    const isVerified = phone && !email ? true : false;

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email || invitation.email,
        phone: phone || invitation.phone,
        firstName,
        lastName,
        gender,
        role: invitation.role,
        password: hashedPassword,
        isVerified
      }
    });

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        isAccepted: true,
        acceptedAt: new Date()
      }
    });

    const jwtToken = generateToken({
      userId: user.id,
      email: user.email || undefined,
      phone: user.phone || undefined,
      role: user.role
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isVerified: user.isVerified
      },
      token: jwtToken
    };
  }

  // Send verification email
  static async sendVerificationEmail(data: SendVerificationEmailDto) {
    const { email } = data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    if (user.isVerified) {
      throw createError('User is already verified', 400, 'ALREADY_VERIFIED');
    }

    // Generate verification token
    const token = generateEmailVerificationToken();
    await storeEmailVerificationToken(email, token);

    // Send verification email
    await sendVerificationEmail(email, token);

    // In development mode, return the token for testing
    if (process.env.NODE_ENV === 'development') {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
      return {
        message: 'Verification email sent successfully',
        token: token, // Only in development for testing
        verificationUrl: `${frontendUrl}/verify-email?token=${token}`
      };
    }

    return {
      message: 'Verification email sent successfully'
    };
  }

  // Verify email
  static async verifyEmail(data: VerifyEmailDto) {
    const { token } = data;

    // Find user by verification token
    const users = await prisma.user.findMany({
      where: {
        email: { not: null },
        isVerified: false
      }
    });

    let verifiedUser = null;
    for (const user of users) {
      if (user.email && await verifyEmailVerificationToken(user.email, token)) {
        verifiedUser = user;
        break;
      }
    }

    if (!verifiedUser) {
      throw createError('Invalid or expired verification token', 400, 'INVALID_TOKEN');
    }

    // Update user as verified
    const updatedUser = await prisma.user.update({
      where: { id: verifiedUser.id },
      data: { isVerified: true }
    });

    // Generate token for automatic login
    const authToken = generateToken({
      userId: updatedUser.id,
      email: updatedUser.email || undefined,
      phone: updatedUser.phone || undefined,
      role: updatedUser.role
    });

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        phone: updatedUser.phone,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
        isVerified: updatedUser.isVerified,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      },
      token: authToken,
      message: 'Email verified successfully'
    };
  }

  // Get current user
  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        gender: true,
        role: true,
        isVerified: true,
        profileImage: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  }
}
