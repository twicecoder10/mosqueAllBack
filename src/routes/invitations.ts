import { Router } from 'express';
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requireSubAdmin } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

// GET /api/invitations - Get all invitations (Admin/Subadmin only)
router.get('/', authenticate, requireSubAdmin, asyncHandler(async (req: Request, res: Response) => {
  const invitations = await prisma.invitation.findMany({
    include: {
      invitedByUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: { invitedAt: 'desc' }
  });

  res.status(200).json({
    success: true,
    message: 'Invitations retrieved successfully',
    data: invitations
  });
}));

// DELETE /api/invitations/:id - Revoke invitation (Admin/Subadmin only)
router.delete('/:id', authenticate, requireSubAdmin, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUser = req.user;

  // Find the invitation
  const invitation = await prisma.invitation.findUnique({
    where: { id },
    include: {
      invitedByUser: {
        select: {
          id: true,
          role: true
        }
      }
    }
  });

  if (!invitation) {
    return res.status(404).json({
      success: false,
      message: 'Invitation not found'
    });
  }

  // Check if invitation is already accepted
  if (invitation.isAccepted) {
    return res.status(400).json({
      success: false,
      message: 'Cannot revoke an accepted invitation'
    });
  }

  // Role-based permissions for revocation
  if (currentUser?.role === 'SUBADMIN') {
    // Subadmins can only revoke invitations they created or USER/SUBADMIN invitations
    if (invitation.invitedByUser.role === 'ADMIN' && invitation.invitedBy !== currentUser.userId) {
      return res.status(403).json({
        success: false,
        message: 'Subadmin cannot revoke admin invitations created by other users'
      });
    }
  }

  // Delete the invitation
  await prisma.invitation.delete({
    where: { id }
  });

  res.status(200).json({
    success: true,
    message: 'Invitation revoked successfully'
  });
}));

export default router;
