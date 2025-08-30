import QRCode from 'qrcode';
import crypto from 'crypto';
import prisma from '../config/database';
import { createError } from '../middleware/errorHandler';

export interface QRCodeData {
  eventId: string;
  type: 'basic' | 'secure';
  expiresAt: Date;
  createdAt: Date;
  isActive: boolean;
}

export interface GeneratedQRCode {
  qrCode: string; // Base64 image
  qrData: string; // QR code content
  frontendUrl: string; // Frontend URL for QR code
  expiresAt: Date;
  eventId: string;
  type: 'basic' | 'secure';
}

export class QRCodeService {
  // Generate QR code for event
  static async generateEventQR(eventId: string, expirationHours: number = 24): Promise<GeneratedQRCode> {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw createError('Event not found', 404);
    }

    if (!event.isActive) {
      throw createError('Cannot generate QR code for inactive event', 400);
    }

    // Deactivate any existing QR codes for this event
    await prisma.qRCode.updateMany({
      where: { 
        eventId,
        isActive: true 
      },
      data: { 
        isActive: false 
      }
    });

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (expirationHours * 60 * 60 * 1000));

    // Generate secure token for QR code
    const timestamp = Date.now();
    const secureData = `event-checkin:${eventId}:${timestamp}`;
    const hash = crypto.createHmac('sha256', process.env.QR_SECRET || 'default-secret')
                      .update(secureData)
                      .digest('hex');
    const secureToken = `${secureData}:${hash}`;

    // Generate frontend URL for QR code
    const frontendUrl = `${process.env.FRONTEND_URL}/events/${eventId}/checkin?token=${encodeURIComponent(secureToken)}`;

    // Generate QR code image (using frontend URL)
    const qrCode = await QRCode.toDataURL(frontendUrl, {
      errorCorrectionLevel: 'M',
      margin: 1
    });

    // Store QR code data in database
    await prisma.qRCode.create({
      data: {
        eventId,
        qrData: secureToken,
        type: 'secure',
        expiresAt,
        isActive: true
      }
    });

    return {
      qrCode,
      qrData: secureToken,
      frontendUrl,
      expiresAt,
      eventId,
      type: 'secure'
    };
  }

  // Validate QR code and process check-in
  static async validateAndCheckIn(qrData: string, userId: string): Promise<any> {
    // Parse QR data
    const parts = qrData.split(':');
    
    if (parts.length < 2 || parts[0] !== 'event-checkin') {
      throw createError('Invalid QR code format', 400);
    }

    const eventId = parts[1];

    // Check if QR code exists and is active
    const qrCodeRecord = await prisma.qRCode.findFirst({
      where: {
        eventId,
        qrData: qrData,
        isActive: true
      },
      include: {
        event: true
      }
    });

    if (!qrCodeRecord) {
      throw createError('QR code not found or inactive', 404);
    }

    // Check if QR code has expired
    if (new Date() > qrCodeRecord.expiresAt) {
      throw createError('QR code has expired', 400);
    }

    const event = qrCodeRecord.event;

    // Validate event is active and currently running
    if (!event.isActive) {
      throw createError('Event is not active', 400);
    }

    if (event.startDate > new Date()) {
      throw createError('Event has not started yet', 400);
    }

    if (event.endDate < new Date()) {
      throw createError('Event has already ended', 400);
    }

    // Check if user is already checked in
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

    // Handle registration requirements
    if (event.registrationRequired) {
      // Check if user is registered
      const registration = await prisma.eventRegistration.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        }
      });

      if (!registration) {
        // Try to register user automatically if possible
        if (event.registrationDeadline && new Date() > event.registrationDeadline) {
          throw createError('Registration deadline has passed', 400);
        }

        if (event.maxAttendees && event.currentAttendees >= event.maxAttendees) {
          throw createError('Event is at full capacity', 400);
        }

        // Auto-register user
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
    }

    // Process check-in
    if (existingAttendance) {
      // Update existing attendance record
      const updatedAttendance = await prisma.attendance.update({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        },
        data: {
          checkInTime: new Date(),
          status: 'CHECKED_IN'
        },
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
        }
      });

      return updatedAttendance;
    } else {
      // Create new attendance record
      const newAttendance = await prisma.attendance.create({
        data: {
          eventId,
          userId,
          checkInTime: new Date(),
          status: 'CHECKED_IN'
        },
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
        }
      });

      return newAttendance;
    }
  }

  // Revoke QR code
  static async revokeQRCode(eventId: string): Promise<void> {
    const qrCode = await prisma.qRCode.findFirst({
      where: {
        eventId,
        isActive: true
      }
    });

    if (!qrCode) {
      throw createError('No active QR code found for this event', 404);
    }

    await prisma.qRCode.update({
      where: { id: qrCode.id },
      data: { isActive: false }
    });
  }

  // Get active QR code for event
  static async getActiveQRCode(eventId: string): Promise<any> {
    const qrCode = await prisma.qRCode.findFirst({
      where: {
        eventId,
        isActive: true
      },
      include: {
        event: {
          select: {
            title: true,
            startDate: true,
            endDate: true
          }
        }
      }
    });

    if (!qrCode) {
      return null;
    }

    return {
      id: qrCode.id,
      eventId: qrCode.eventId,
      type: qrCode.type,
      expiresAt: qrCode.expiresAt,
      createdAt: qrCode.createdAt,
      event: qrCode.event
    };
  }

  // Validate check-in token (for frontend)
  static async validateCheckinToken(eventId: string, token: string): Promise<any> {
    // Parse token
    const parts = token.split(':');
    
    if (parts.length < 4 || parts[0] !== 'event-checkin') {
      throw createError('Invalid token format', 400);
    }

    const tokenEventId = parts[1];

    if (tokenEventId !== eventId) {
      throw createError('Token does not match event', 400);
    }

    // Check if QR code exists and is active
    const qrCodeRecord = await prisma.qRCode.findFirst({
      where: {
        eventId,
        qrData: token,
        isActive: true
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            startDate: true,
            endDate: true,
            isActive: true,
            registrationRequired: true,
            registrationDeadline: true,
            maxAttendees: true,
            currentAttendees: true
          }
        }
      }
    });

    if (!qrCodeRecord) {
      throw createError('Token not found or inactive', 404);
    }

    // Check if token has expired
    if (new Date() > qrCodeRecord.expiresAt) {
      throw createError('Token has expired', 400);
    }

    const event = qrCodeRecord.event;

    // Validate event is active and currently running
    if (!event.isActive) {
      throw createError('Event is not active', 400);
    }

    if (event.startDate > new Date()) {
      throw createError('Event has not started yet', 400);
    }

    if (event.endDate < new Date()) {
      throw createError('Event has already ended', 400);
    }

    return {
      eventId: event.id,
      eventTitle: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationRequired: event.registrationRequired,
      registrationDeadline: event.registrationDeadline,
      maxAttendees: event.maxAttendees,
      currentAttendees: event.currentAttendees,
      isValid: true,
      expiresAt: qrCodeRecord.expiresAt
    };
  }

  // Check-in with token (for authenticated users)
  static async checkInWithToken(eventId: string, token: string, userId: string): Promise<any> {
    // First validate the token
    await this.validateCheckinToken(eventId, token);

    // Get event details
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      throw createError('Event not found', 404);
    }

    // Check if user is already checked in
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

    // Handle registration requirements
    if (event.registrationRequired) {
      // Check if user is registered
      const registration = await prisma.eventRegistration.findUnique({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        }
      });

      if (!registration) {
        // Try to register user automatically if possible
        if (event.registrationDeadline && new Date() > event.registrationDeadline) {
          throw createError('Registration deadline has passed', 400);
        }

        if (event.maxAttendees && event.currentAttendees >= event.maxAttendees) {
          throw createError('Event is at full capacity', 400);
        }

        // Auto-register user
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
    }

    // Process check-in
    if (existingAttendance) {
      // Update existing attendance record
      const updatedAttendance = await prisma.attendance.update({
        where: {
          eventId_userId: {
            eventId,
            userId
          }
        },
        data: {
          checkInTime: new Date(),
          status: 'CHECKED_IN'
        },
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
        }
      });

      return updatedAttendance;
    } else {
      // Create new attendance record
      const newAttendance = await prisma.attendance.create({
        data: {
          eventId,
          userId,
          checkInTime: new Date(),
          status: 'CHECKED_IN'
        },
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
        }
      });

      return newAttendance;
    }
  }

  // Clean up expired QR codes
  static async cleanupExpiredQRCodes(): Promise<void> {
    await prisma.qRCode.updateMany({
      where: {
        expiresAt: {
          lt: new Date()
        },
        isActive: true
      },
      data: {
        isActive: false
      }
    });
  }
}
