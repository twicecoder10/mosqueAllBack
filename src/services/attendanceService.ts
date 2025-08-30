import prisma from '../config/database';
import { 
  CheckInDto, 
  CheckOutDto, 
  AttendanceQuery, 
  PaginatedResponse,
  AttendanceWithDetails
} from '../types';
import { createError } from '../middleware/errorHandler';

export class AttendanceService {
  // Get attendance records with pagination and filters
  static async getAttendance(query: AttendanceQuery): Promise<PaginatedResponse<AttendanceWithDetails>> {
    const { page = 1, limit = 10, eventId, status, search, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (eventId) {
      where.eventId = eventId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        {
          user: {
            firstName: { contains: search }
          }
        },
        {
          user: {
            lastName: { contains: search }
          }
        },
        {
          user: {
            email: { contains: search }
          }
        },
        {
          user: {
            phone: { contains: search }
          }
        }
      ];
    }

    if (startDate || endDate) {
      where.AND = [];
      if (startDate) {
        where.AND.push({ checkInTime: { gte: startDate } });
      }
      if (endDate) {
        where.AND.push({ checkInTime: { lte: endDate } });
      }
    }

    const [attendances, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
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
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              profileImage: true
            }
          }
        },
        skip,
        take: limit,
        orderBy: { checkInTime: 'desc' }
      }),
      prisma.attendance.count({ where })
    ]);

    return {
      data: attendances.map(attendance => ({
        ...attendance,
        user: {
          ...attendance.user,
          email: attendance.user.email || undefined
        }
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Check in user for event
  static async checkIn(data: CheckInDto, currentUserRole: string): Promise<any> {
    const { eventId, userId, notes } = data;

    // Validate event exists and is active
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw createError('Event not found', 404, 'EVENT_NOT_FOUND');
    }

    if (!event.isActive) {
      throw createError('Event is not active', 400, 'EVENT_NOT_ACTIVE');
    }

    // Check if event is currently ongoing (between startDate and endDate)
    const now = new Date();
    if (event.startDate > now) {
      throw createError('Event has not started yet', 400, 'EVENT_NOT_STARTED');
    }

    if (event.endDate < now) {
      throw createError('Event has already ended', 400, 'EVENT_ENDED');
    }

    // Check if user is registered for the event (if registration is required)
    if (event.registrationRequired) {
      const registration = await prisma.eventRegistration.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        }
      });

      if (!registration) {
        throw createError('User is not registered for this event', 400, 'USER_NOT_REGISTERED');
      }

      if (registration.status !== 'CONFIRMED') {
        throw createError('User registration is not confirmed', 400, 'REGISTRATION_NOT_CONFIRMED');
      }
    }

    // Check if already checked in
    const existingAttendance = await prisma.attendance.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    });

    if (existingAttendance && existingAttendance.checkInTime) {
      throw createError('User already checked in', 409, 'ALREADY_CHECKED_IN');
    }

    let attendance;
    if (existingAttendance) {
      // Update existing attendance record
      attendance = await prisma.attendance.update({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        },
        data: {
          checkInTime: new Date(),
          status: 'CHECKED_IN',
          notes: notes || existingAttendance.notes
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              location: true
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        }
      });
    } else {
      // Create new attendance record
      attendance = await prisma.attendance.create({
        data: {
          eventId,
          userId,
          checkInTime: new Date(),
          status: 'CHECKED_IN',
          notes
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startDate: true,
              endDate: true,
              location: true
            }
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          }
        }
      });
    }

    return {
      id: attendance.id,
      eventId: attendance.eventId,
      userId: attendance.userId,
      checkInTime: attendance.checkInTime,
      checkOutTime: attendance.checkOutTime,
      status: attendance.status,
      notes: attendance.notes
    };
  }

  // Check out user from event
  static async checkOut(data: CheckOutDto, currentUserRole: string): Promise<any> {
    const { eventId, userId, notes } = data;

    // Find attendance record
    const attendance = await prisma.attendance.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            location: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!attendance) {
      throw createError('Attendance record not found', 404, 'ATTENDANCE_NOT_FOUND');
    }

    if (!attendance.checkInTime) {
      throw createError('User has not checked in yet', 400, 'NOT_CHECKED_IN');
    }

    if (attendance.checkOutTime) {
      throw createError('User already checked out', 409, 'ALREADY_CHECKED_OUT');
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      },
      data: {
        checkOutTime: new Date(),
        status: 'CHECKED_OUT',
        notes: notes || attendance.notes
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            location: true
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    return {
      id: updatedAttendance.id,
      eventId: updatedAttendance.eventId,
      userId: updatedAttendance.userId,
      checkInTime: updatedAttendance.checkInTime,
      checkOutTime: updatedAttendance.checkOutTime,
      status: updatedAttendance.status,
      notes: updatedAttendance.notes
    };
  }

  // Get attendance for specific event
  static async getEventAttendance(eventId: string): Promise<AttendanceWithDetails[]> {
    const attendances = await prisma.attendance.findMany({
      where: { eventId },
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
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImage: true
          }
        }
      },
      orderBy: { checkInTime: 'desc' }
    });

    return attendances.map(attendance => ({
      ...attendance,
      user: {
        ...attendance.user,
        email: attendance.user.email || undefined
      }
    }));
  }
}
