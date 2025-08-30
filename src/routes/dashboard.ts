import { Router } from 'express';
import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, requireSubAdmin } from '../middleware/auth';
import prisma from '../config/database';

const router = Router();

// GET /api/dashboard - Get user dashboard (All authenticated users)
router.get('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  // Get user's upcoming events
  const upcomingEvents = await prisma.event.findMany({
    where: {
      startDate: { gt: new Date() },
      isActive: true
    },
    include: {
      createdBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true
        }
      }
    },
    orderBy: { startDate: 'asc' },
    take: 5
  });

  // Get user's registrations
  const myRegistrations = await prisma.eventRegistration.findMany({
    where: {
      userId: userId,
      status: 'CONFIRMED',
      event: {
        startDate: { gt: new Date() }
      }
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          startDate: true,
          endDate: true,
          location: true,
          category: true
        }
      }
    },
    orderBy: {
      event: {
        startDate: 'asc'
      }
    },
    take: 5
  });

  // Get community member count
  const communityMembers = await prisma.user.count({
    where: {
      isVerified: true
    }
  });

  // Get user's recent activity
  const recentActivity = await prisma.eventRegistration.findMany({
    where: {
      userId: userId
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          startDate: true,
          category: true
        }
      }
    },
    orderBy: { registrationDate: 'desc' },
    take: 3
  });

  const userDashboard = {
    upcomingEvents,
    myRegistrations,
    communityMembers,
    recentActivity,
    quickActions: [
      { name: 'Browse Events', action: 'browse-events', icon: 'calendar' },
      { name: 'Update Profile', action: 'update-profile', icon: 'user' },
      { name: 'View My Registrations', action: 'my-registrations', icon: 'list' }
    ]
  };

  res.status(200).json({
    success: true,
    message: 'User dashboard retrieved successfully',
    data: userDashboard
  });
}));

// GET /api/dashboard/admin - Get admin dashboard (Admin/Subadmin only)
router.get('/admin', authenticate, requireSubAdmin, asyncHandler(async (req: Request, res: Response) => {
  const [
    totalUsers,
    totalEvents,
    upcomingEvents,
    pastEvents,
    totalAttendance,
    thisMonthAttendance,
    activeRegistrations,
    recentRegistrations,
    recentUsers
  ] = await Promise.all([
    // Total users
    prisma.user.count(),
    
    // Total events
    prisma.event.count(),
    
    // Upcoming events
    prisma.event.count({
      where: {
        startDate: { gt: new Date() }
      }
    }),
    
    // Past events
    prisma.event.count({
      where: {
        endDate: { lt: new Date() }
      }
    }),
    
    // Total attendance
    prisma.attendance.count({
      where: {
        checkInTime: { not: null }
      }
    }),
    
    // This month attendance
    prisma.attendance.count({
      where: {
        checkInTime: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }),
    
    // Active registrations
    prisma.eventRegistration.count({
      where: {
        status: 'CONFIRMED',
        event: {
          startDate: { gt: new Date() }
        }
      }
    }),

    // Recent registrations
    prisma.eventRegistration.findMany({
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            category: true
          }
        }
      },
      orderBy: { registrationDate: 'desc' },
      take: 5
    }),

    // Recent users
    prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
  ]);

  const adminDashboard = {
    stats: {
      totalUsers,
      totalEvents,
      upcomingEvents,
      pastEvents,
      totalAttendance,
      thisMonthAttendance,
      activeRegistrations
    },
    recentActivity: {
      recentRegistrations,
      recentUsers
    },
    quickActions: [
      { name: 'Create Event', action: 'create-event', icon: 'plus' },
      { name: 'Manage Users', action: 'manage-users', icon: 'users' },
      { name: 'View Reports', action: 'view-reports', icon: 'chart' },
      { name: 'Send Invitations', action: 'send-invitations', icon: 'mail' }
    ]
  };

  res.status(200).json({
    success: true,
    message: 'Admin dashboard retrieved successfully',
    data: adminDashboard
  });
}));

// GET /api/dashboard/stats - Get dashboard statistics (Admin/Subadmin only) - Legacy endpoint
router.get('/stats', authenticate, requireSubAdmin, asyncHandler(async (req: Request, res: Response) => {
  const [
    totalUsers,
    totalEvents,
    upcomingEvents,
    pastEvents,
    totalAttendance,
    thisMonthAttendance,
    activeRegistrations
  ] = await Promise.all([
    // Total users
    prisma.user.count(),
    
    // Total events
    prisma.event.count(),
    
    // Upcoming events
    prisma.event.count({
      where: {
        startDate: { gt: new Date() }
      }
    }),
    
    // Past events
    prisma.event.count({
      where: {
        endDate: { lt: new Date() }
      }
    }),
    
    // Total attendance
    prisma.attendance.count({
      where: {
        checkInTime: { not: null }
      }
    }),
    
    // This month attendance
    prisma.attendance.count({
      where: {
        checkInTime: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        }
      }
    }),
    
    // Active registrations
    prisma.eventRegistration.count({
      where: {
        status: 'CONFIRMED',
        event: {
          startDate: { gt: new Date() }
        }
      }
    })
  ]);

  const stats = {
    totalUsers,
    totalEvents,
    upcomingEvents,
    pastEvents,
    totalAttendance,
    thisMonthAttendance,
    activeRegistrations
  };

  res.status(200).json({
    success: true,
    message: 'Dashboard statistics retrieved successfully',
    data: stats
  });
}));

export default router;
