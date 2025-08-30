import prisma from '../config/database';
import { 
  CreateEventDto, 
  UpdateEventDto, 
  EventQuery, 
  PaginatedResponse, 
  Event, 
  EventWithDetails,
  RegisterForEventDto,
  CheckInDto,
  CheckOutDto
} from '../types';
import { createError } from '../middleware/errorHandler';

export class EventService {
  // Get all events with pagination and filters
  static async getEvents(query: EventQuery): Promise<PaginatedResponse<Event>> {
    const { page = 1, limit = 10, category, isActive, search, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (category) {
      where.category = category;
    }
    
    if (isActive !== undefined) {
      where.isActive = isActive;
    }
    
    if (search) {
      // SQLite doesn't support case-insensitive search with 'mode', so we'll use contains only
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { location: { contains: search } }
      ];
    }

    if (startDate || endDate) {
      where.AND = [];
      if (startDate) {
        where.AND.push({ startDate: { gte: new Date(startDate) } });
      }
      if (endDate) {
        where.AND.push({ endDate: { lte: new Date(endDate) } });
      }
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
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
        skip,
        take: limit,
        orderBy: { startDate: 'asc' }
      }),
      prisma.event.count({ where })
    ]);

    // Convert null values to undefined for type compatibility
    const eventsWithDetails = events.map(event => ({
      ...event,
      createdBy: {
        ...event.createdBy,
        email: event.createdBy.email || undefined
      }
    }));

    return {
      data: eventsWithDetails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  // Get event by ID with details
  static async getEventById(id: string): Promise<EventWithDetails> {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        registrations: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        attendances: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    });

    if (!event) {
      throw createError('Event not found', 404);
    }

    // Convert null values to undefined for type compatibility
    const eventWithDetails: EventWithDetails = {
      ...event,
      createdBy: {
        ...event.createdBy,
        email: event.createdBy.email || undefined
      },
      registrations: event.registrations.map(reg => ({
        ...reg,
        user: {
          ...reg.user,
          email: reg.user.email || undefined
        }
      })),
      attendances: event.attendances.map(att => ({
        ...att,
        user: {
          ...att.user,
          email: att.user.email || undefined
        }
      }))
    };

    return eventWithDetails;
  }

  // Create event
  static async createEvent(eventData: CreateEventDto, createdById: string): Promise<Event> {
    const event = await prisma.event.create({
      data: {
        ...eventData,
        createdById
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
      }
    });

    // Convert null values to undefined for type compatibility
    const eventWithDetails = {
      ...event,
      createdBy: {
        ...event.createdBy,
        email: event.createdBy.email || undefined
      }
    };

    return eventWithDetails as Event;
  }

  // Update event
  static async updateEvent(id: string, updateData: UpdateEventDto, currentUserId: string, currentUserRole: string): Promise<Event> {
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: { createdBy: true }
    });

    if (!existingEvent) {
      throw createError('Event not found', 404);
    }

    // Check permissions
    if (currentUserRole === 'USER' && existingEvent.createdById !== currentUserId) {
      throw createError('You can only update events you created', 403);
    }

    if (currentUserRole === 'SUBADMIN' && existingEvent.createdBy.role === 'ADMIN') {
      throw createError('Subadmin cannot update admin events', 403);
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Convert null values to undefined for type compatibility
    const eventWithDetails = {
      ...updatedEvent,
      createdBy: {
        ...updatedEvent.createdBy,
        email: updatedEvent.createdBy.email || undefined
      }
    };

    return eventWithDetails as Event;
  }

  // Delete event
  static async deleteEvent(id: string, currentUserId: string, currentUserRole: string): Promise<void> {
    const existingEvent = await prisma.event.findUnique({
      where: { id },
      include: { createdBy: true }
    });

    if (!existingEvent) {
      throw createError('Event not found', 404);
    }

    // Check if event has started
    if (existingEvent.startDate <= new Date()) {
      throw createError('Cannot delete events that have already started', 400);
    }

    // Check permissions
    if (currentUserRole === 'USER' && existingEvent.createdById !== currentUserId) {
      throw createError('You can only delete events you created', 403);
    }

    if (currentUserRole === 'SUBADMIN' && existingEvent.createdBy.role === 'ADMIN') {
      throw createError('Subadmin cannot delete admin events', 403);
    }

    await prisma.event.delete({
      where: { id }
    });
  }

  // Register for event
  static async registerForEvent(eventId: string, userId: string): Promise<void> {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw createError('Event not found', 404);
    }

    if (!event.isActive) {
      throw createError('Event is not active', 400);
    }

    // Check if registration is required for this event
    if (!event.registrationRequired) {
      throw createError('Registration is not required for this event', 400);
    }

    // Check if event has already started
    if (event.startDate <= new Date()) {
      throw createError('Cannot register for events that have already started', 400);
    }

    // Check registration deadline
    if (event.registrationDeadline && event.registrationDeadline <= new Date()) {
      throw createError('Registration deadline has passed', 400);
    }

    // Check if already registered
    const existingRegistration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    });

    if (existingRegistration) {
      throw createError('Already registered for this event', 409);
    }

    // Check capacity - if full, prevent registration entirely
    if (event.maxAttendees && event.currentAttendees >= event.maxAttendees) {
      throw createError('Event is at full capacity. Registration is closed.', 400);
    }

    // Create registration with CONFIRMED status (no waitlist)
    await prisma.$transaction([
      prisma.eventRegistration.create({
        data: {
          eventId,
          userId,
          status: 'CONFIRMED'
        }
      }),
      prisma.event.update({
        where: { id: eventId },
        data: {
          currentAttendees: {
            increment: 1
          }
        }
      })
    ]);
  }

  // Cancel event registration
  static async cancelRegistration(eventId: string, userId: string): Promise<void> {
    const registration = await prisma.eventRegistration.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    });

    if (!registration) {
      throw createError('Registration not found', 404);
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw createError('Event not found', 404);
    }

    if (event.startDate <= new Date()) {
      throw createError('Cannot cancel registration for events that have started', 400);
    }

    await prisma.$transaction([
      prisma.eventRegistration.delete({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        }
      }),
      prisma.event.update({
        where: { id: eventId },
        data: {
          currentAttendees: {
            decrement: 1
          }
        }
      })
    ]);
  }

  // Get user's event registrations
  static async getUserRegistrations(userId: string) {
    const registrations = await prisma.eventRegistration.findMany({
      where: { userId },
      include: {
        event: {
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: { registrationDate: 'desc' }
    });

    return registrations;
  }

  // Check in for event
  static async checkIn(data: CheckInDto): Promise<void> {
    const { eventId, userId, notes } = data;

    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw createError('Event not found', 404);
    }

    if (!event.isActive) {
      throw createError('Event is not active', 400);
    }

    if (event.startDate > new Date()) {
      throw createError('Event has not started yet', 400);
    }

    if (event.endDate < new Date()) {
      throw createError('Event has already ended', 400);
    }

    // Check if user is registered (only if registration is required)
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
        throw createError('User is not registered for this event', 400);
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
      throw createError('User already checked in', 409);
    }

    if (existingAttendance) {
      // Update existing attendance record
      await prisma.attendance.update({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        },
        data: {
          checkInTime: new Date(),
          status: 'CHECKED_IN',
          notes
        }
      });
    } else {
      // Create new attendance record
      await prisma.attendance.create({
        data: {
          eventId,
          userId,
          checkInTime: new Date(),
          status: 'CHECKED_IN',
          notes
        }
      });
    }
  }

  // Check out from event
  static async checkOut(data: CheckOutDto): Promise<void> {
    const { eventId, userId, notes } = data;

    const attendance = await prisma.attendance.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId
        }
      }
    });

    if (!attendance) {
      throw createError('Attendance record not found', 404);
    }

    if (!attendance.checkInTime) {
      throw createError('User has not checked in yet', 400);
    }

    if (attendance.checkOutTime) {
      throw createError('User already checked out', 409);
    }

    await prisma.attendance.update({
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
      }
    });
  }

  // Get event attendance
  static async getEventAttendance(eventId: string) {
    const attendances = await prisma.attendance.findMany({
      where: { eventId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { checkInTime: 'desc' }
    });

    return attendances;
  }

  // Mark attendance for event (alternative endpoint)
  static async markAttendance(eventId: string, userId: string) {
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

    // Check if event is currently ongoing
    const now = new Date();
    if (event.startDate > now) {
      throw createError('Event has not started yet', 400, 'EVENT_NOT_STARTED');
    }

    if (event.endDate < now) {
      throw createError('Event has already ended', 400, 'EVENT_ENDED');
    }

    // Check if user is registered (if registration is required)
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
          status: 'CHECKED_IN'
        }
      });
    } else {
      // Create new attendance record
      attendance = await prisma.attendance.create({
        data: {
          eventId,
          userId,
          checkInTime: new Date(),
          status: 'CHECKED_IN'
        }
      });
    }

    return {
      id: attendance.id,
      eventId: attendance.eventId,
      userId: attendance.userId,
      registrationDate: attendance.createdAt,
      status: attendance.status,
      checkInTime: attendance.checkInTime,
      attendanceDate: attendance.checkInTime
    };
  }
}
