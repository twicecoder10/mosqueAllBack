import prisma from '../config/database';
import { UpdateUserDto, UserQuery, PaginatedResponse, User, InviteUserDto, BulkInviteUserDto, BulkInviteResult } from '../types';
import { createError } from '../middleware/errorHandler';
import { generateOTP, storeOTP, generateInvitationToken } from '../utils/otp';
import { sendInvitationEmail } from './emailService';
import { sendSMS } from './smsService';

export class UserService {
  // Get all users with pagination and filters
  static async getUsers(query: UserQuery): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 10, role, isVerified, search } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (role) {
      where.role = role;
    }
    
    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }
    
    if (search) {
      // SQLite doesn't support case-insensitive search with 'mode', so we'll use contains only
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
          password: true,
          createdAt: true,
          updatedAt: true
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);

    return {
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Get user by ID
  static async getUserById(id: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id },
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
        password: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    return user;
  }

  // Update user
  static async updateUser(id: string, updateData: UpdateUserDto, currentUserRole: string, currentUserId: string): Promise<User> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Role-based permissions
    if (currentUserRole === 'USER' && currentUserId !== id) {
      throw createError('You can only update your own profile', 403, 'UNAUTHORIZED');
    }

    if (currentUserRole === 'SUBADMIN') {
      // Subadmin can't update admin users
      if (existingUser.role === 'ADMIN') {
        throw createError('Subadmin cannot update admin users', 403, 'UNAUTHORIZED');
      }
      // Subadmin can't promote users to admin
      if (updateData.role === 'ADMIN') {
        throw createError('Subadmin cannot promote users to admin', 403, 'UNAUTHORIZED');
      }
      // Subadmin can't update other subadmins
      if (existingUser.role === 'SUBADMIN' && currentUserId !== id) {
        throw createError('Subadmin cannot update other subadmins', 403, 'UNAUTHORIZED');
      }
    }

    // Validate that at least one contact method is provided
    if (updateData.email === null && updateData.phone === null) {
      throw createError('At least one contact method (email or phone) is required', 400, 'INVALID_CONTACT_METHOD');
    }

    // Check for unique constraints
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email }
      });
      if (emailExists) {
        throw createError('Email already exists', 409, 'EMAIL_EXISTS');
      }
    }

    if (updateData.phone && updateData.phone !== existingUser.phone) {
      const phoneExists = await prisma.user.findUnique({
        where: { phone: updateData.phone }
      });
      if (phoneExists) {
        throw createError('Phone number already exists', 409, 'PHONE_EXISTS');
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
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
        password: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return updatedUser;
  }

  // Delete user
  static async deleteUser(id: string, currentUserRole: string, currentUserId: string): Promise<void> {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      throw createError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Role-based permissions
    if (currentUserRole === 'USER' && currentUserId !== id) {
      throw createError('You can only delete your own account', 403, 'UNAUTHORIZED');
    }

    if (currentUserRole === 'SUBADMIN') {
      // Subadmin can't delete admin users
      if (existingUser.role === 'ADMIN') {
        throw createError('Subadmin cannot delete admin users', 403, 'UNAUTHORIZED');
      }
      // Subadmin can't delete other subadmins
      if (existingUser.role === 'SUBADMIN' && currentUserId !== id) {
        throw createError('Subadmin cannot delete other subadmins', 403, 'UNAUTHORIZED');
      }
    }

    // Prevent admin from deleting themselves
    if (currentUserId === id && currentUserRole === 'ADMIN') {
      throw createError('Admin cannot delete their own account', 403, 'UNAUTHORIZED');
    }

    await prisma.user.delete({
      where: { id }
    });
  }

  // Invite user
  static async inviteUser(inviteData: InviteUserDto, currentUserRole: string, invitedBy: string): Promise<any> {
    // Role-based permissions - Subadmins can only invite users, not admins
    if (currentUserRole === 'SUBADMIN' && inviteData.role === 'SUBADMIN') {
      throw createError('Subadmin cannot invite other subadmins', 403, 'UNAUTHORIZED');
    }

    // Check if user already exists
    if (inviteData.email) {
      const existingUser = await prisma.user.findUnique({
        where: { email: inviteData.email }
      });
      if (existingUser) {
        throw createError('User with this email already exists', 409, 'USER_EXISTS');
      }
    }

    if (inviteData.phone) {
      const existingUser = await prisma.user.findUnique({
        where: { phone: inviteData.phone }
      });
      if (existingUser) {
        throw createError('User with this phone number already exists', 409, 'USER_EXISTS');
      }
    }

    // Check for existing invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        OR: [
          { email: inviteData.email },
          { phone: inviteData.phone }
        ].filter(Boolean),
        isAccepted: false,
        expiresAt: { gt: new Date() }
      }
    });

    if (existingInvitation) {
      throw createError('Invitation already exists for this contact method', 409, 'INVITATION_EXISTS');
    }

    // Create invitation
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const invitation = await prisma.invitation.create({
      data: {
        email: inviteData.email,
        phone: inviteData.phone,
        role: inviteData.role,
        token,
        invitedBy,
        expiresAt
      },
      include: {
        invitedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Send invitation
    try {
      if (inviteData.email) {
        await sendInvitationEmail(inviteData.email, token, inviteData.role);
      }
      if (inviteData.phone) {
        const otp = generateOTP();
        await storeOTP(inviteData.phone, otp);
        await sendSMS(inviteData.phone, `You have been invited to join Islamic Association as ${inviteData.role === 'SUBADMIN' ? 'Sub-Administrator' : 'Community Member'}. Your invitation code is: ${otp}. Valid for 24 hours.`);
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

    return {
      id: invitation.id,
      email: invitation.email,
      phone: invitation.phone,
      role: invitation.role,
      invitedBy: invitation.invitedByUser,
      invitedAt: invitation.invitedAt,
      expiresAt: invitation.expiresAt,
      isAccepted: invitation.isAccepted
    };
  }

  // Bulk invite users
  static async bulkInviteUsers(data: BulkInviteUserDto, currentUserRole: string, currentUserId: string): Promise<BulkInviteResult> {
    const { invitations } = data;
    const result: BulkInviteResult = { success: [], failed: [] };

    // Role-based permissions
    if (currentUserRole === 'SUBADMIN') {
      // Subadmins can only invite USER and SUBADMIN roles (which is already enforced by the type)
      // No additional checks needed since the type system prevents ADMIN invitations
    }

    // Process each invitation
    for (const invitation of invitations) {
      try {
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [
              ...(invitation.email ? [{ email: invitation.email }] : []),
              ...(invitation.phone ? [{ phone: invitation.phone }] : [])
            ]
          }
        });

        if (existingUser) {
          result.failed.push({
            email: invitation.email,
            phone: invitation.phone,
            role: invitation.role,
            error: 'User already exists'
          });
          continue;
        }

        // Check if invitation already exists
        const existingInvitation = await prisma.invitation.findFirst({
          where: {
            OR: [
              ...(invitation.email ? [{ email: invitation.email }] : []),
              ...(invitation.phone ? [{ phone: invitation.phone }] : [])
            ],
            isAccepted: false,
            expiresAt: { gt: new Date() }
          }
        });

        if (existingInvitation) {
          result.failed.push({
            email: invitation.email,
            phone: invitation.phone,
            role: invitation.role,
            error: 'Invitation already exists'
          });
          continue;
        }

        // Create invitation
        const token = generateInvitationToken();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const newInvitation = await prisma.invitation.create({
          data: {
            email: invitation.email || null,
            phone: invitation.phone || null,
            role: invitation.role,
            token,
            invitedBy: currentUserId,
            expiresAt
          }
        });

        // Send invitation
        try {
          if (invitation.email) {
            await sendInvitationEmail(invitation.email, token, invitation.role);
          }
          if (invitation.phone) {
            const otp = generateOTP();
            await sendSMS(invitation.phone, `You have been invited to join Islamic Association. Your invitation code is: ${otp}. Valid for 7 days.`);
            // Store OTP in invitation for verification
            await prisma.invitation.update({
              where: { id: newInvitation.id },
              data: { token: otp } // Override token with OTP for phone invitations
            });
          }

          result.success.push({
            email: invitation.email,
            phone: invitation.phone,
            role: invitation.role,
            message: 'Invitation sent successfully'
          });
        } catch (error) {
          // Delete invitation if sending fails
          await prisma.invitation.delete({
            where: { id: newInvitation.id }
          });
          
          result.failed.push({
            email: invitation.email,
            phone: invitation.phone,
            role: invitation.role,
            error: 'Failed to send invitation'
          });
        }
      } catch (error) {
        result.failed.push({
          email: invitation.email,
          phone: invitation.phone,
          role: invitation.role,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return result;
  }

  // Get user statistics
  static async getUserStats() {
    const [totalUsers, verifiedUsers, unverifiedUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isVerified: true } }),
      prisma.user.count({ where: { isVerified: false } })
    ]);

    const usersByRole = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    });

    return {
      totalUsers,
      verifiedUsers,
      unverifiedUsers,
      usersByRole: usersByRole.reduce((acc: Record<string, number>, item: any) => {
        acc[item.role] = item._count.role;
        return acc;
      }, {} as Record<string, number>)
    };
  }
}
