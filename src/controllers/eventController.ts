import { Request, Response } from 'express';
import { EventService } from '../services/eventService';
import { QRCodeService } from '../services/qrCodeService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { CreateEventDto, UpdateEventDto, EventQuery } from '../types';

export class EventController {
  // GET /api/events
  static getEvents = asyncHandler(async (req: Request, res: Response) => {
    const query: EventQuery = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      category: req.query.category as any,
      isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
      search: req.query.search as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const result = await EventService.getEvents(query);

    res.status(200).json({
      success: true,
      message: 'Events retrieved successfully',
      data: result
    });
  });

  // GET /api/events/:id
  static getEventById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const event = await EventService.getEventById(id);

    res.status(200).json({
      success: true,
      message: 'Event retrieved successfully',
      data: event
    });
  });

  // POST /api/events
  static createEvent = asyncHandler(async (req: Request, res: Response) => {
    const eventData: CreateEventDto = req.body;
    const createdById = req.user!.userId;

    const event = await EventService.createEvent(eventData, createdById);

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: event
    });
  });

  // PUT /api/events/:id
  static updateEvent = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: UpdateEventDto = req.body;
    const currentUserId = req.user!.userId;
    const currentUserRole = req.user!.role;

    const event = await EventService.updateEvent(id, updateData, currentUserId, currentUserRole);

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      data: event
    });
  });

  // DELETE /api/events/:id
  static deleteEvent = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUserId = req.user!.userId;
    const currentUserRole = req.user!.role;

    await EventService.deleteEvent(id, currentUserId, currentUserRole);

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  });

  // POST /api/events/:id/register
  static registerForEvent = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    await EventService.registerForEvent(id, userId);

    res.status(200).json({
      success: true,
      message: 'Successfully registered for event'
    });
  });

  // DELETE /api/events/:id/register
  static cancelRegistration = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    await EventService.cancelRegistration(id, userId);

    res.status(200).json({
      success: true,
      message: 'Registration cancelled successfully'
    });
  });

  // GET /api/events/my-registrations
  static getMyRegistrations = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    // Fetching registrations for user
    
    const registrations = await EventService.getUserRegistrations(userId);

    res.status(200).json({
      success: true,
      message: 'Registrations retrieved successfully',
      data: registrations
    });
  });

  // POST /api/events/:id/attendance
  static markAttendance = asyncHandler(async (req: Request, res: Response) => {
    const { id: eventId } = req.params;
    const userId = req.user!.userId;

    const result = await EventService.markAttendance(eventId, userId);

    res.status(200).json({
      success: true,
      message: 'Attendance marked successfully',
      data: result
    });
  });

  // POST /api/events/:id/generate-qr
  static generateQR = asyncHandler(async (req: Request, res: Response) => {
    const { id: eventId } = req.params;
    const { expirationHours } = req.body;
    const currentUserId = req.user!.userId;
    const currentUserRole = req.user!.role;

    // Check if user has permission to generate QR codes for this event
    const event = await EventService.getEventById(eventId);
    if (currentUserRole === 'USER' || 
        (currentUserRole === 'SUBADMIN' && event.createdBy.id !== currentUserId)) {
      throw createError('Insufficient permissions to generate QR code for this event', 403);
    }

    const qrCode = await QRCodeService.generateEventQR(eventId, expirationHours || 24);

    res.status(200).json({
      success: true,
      message: 'QR code generated successfully',
      data: qrCode
    });
  });

  // POST /api/events/:id/checkin-qr
  static checkInQR = asyncHandler(async (req: Request, res: Response) => {
    const { id: eventId } = req.params;
    const { qrData } = req.body;
    const userId = req.user!.userId;

    const result = await QRCodeService.validateAndCheckIn(qrData, userId);

    res.status(200).json({
      success: true,
      message: 'Check-in successful via QR code',
      data: result
    });
  });

  // DELETE /api/events/:id/revoke-qr
  static revokeQR = asyncHandler(async (req: Request, res: Response) => {
    const { id: eventId } = req.params;
    const currentUserId = req.user!.userId;
    const currentUserRole = req.user!.role;

    // Check if user has permission to revoke QR codes for this event
    const event = await EventService.getEventById(eventId);
    if (currentUserRole === 'USER' || 
        (currentUserRole === 'SUBADMIN' && event.createdBy.id !== currentUserId)) {
      throw createError('Insufficient permissions to revoke QR code for this event', 403);
    }

    await QRCodeService.revokeQRCode(eventId);

    res.status(200).json({
      success: true,
      message: 'QR code revoked successfully'
    });
  });

  // GET /api/events/:id/qr-status
  static getQRStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id: eventId } = req.params;
    const currentUserId = req.user!.userId;
    const currentUserRole = req.user!.role;

    const event = await EventService.getEventById(eventId);
    if (currentUserRole === 'USER' || 
        (currentUserRole === 'SUBADMIN' && event.createdBy.id !== currentUserId)) {
      throw createError('Insufficient permissions to view QR status for this event', 403);
    }

    const qrStatus = await QRCodeService.getActiveQRCode(eventId);

    res.status(200).json({
      success: true,
      message: 'QR status retrieved successfully',
      data: qrStatus
    });
  });

  // GET /api/events/:id/validate-checkin-token
  static validateCheckinToken = asyncHandler(async (req: Request, res: Response) => {
    const { id: eventId } = req.params;
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      throw createError('Token is required', 400);
    }

    const validationResult = await QRCodeService.validateCheckinToken(eventId, token);

    res.status(200).json({
      success: true,
      message: 'Token validation successful',
      data: validationResult
    });
  });

  // POST /api/events/:id/checkin-with-token
  static checkInWithToken = asyncHandler(async (req: Request, res: Response) => {
    const { id: eventId } = req.params;
    const { token } = req.body;
    const userId = req.user!.userId;

    if (!token) {
      throw createError('Token is required', 400);
    }

    const result = await QRCodeService.checkInWithToken(eventId, token, userId);

    res.status(200).json({
      success: true,
      message: 'Check-in successful via QR code',
      data: result
    });
  });
}
