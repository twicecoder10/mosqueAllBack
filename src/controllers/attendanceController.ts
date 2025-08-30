import { Request, Response } from 'express';
import { AttendanceService } from '../services/attendanceService';
import { asyncHandler } from '../middleware/errorHandler';
import { CheckInDto, CheckOutDto, AttendanceQuery } from '../types';

export class AttendanceController {
  // GET /api/attendance
  static getAttendance = asyncHandler(async (req: Request, res: Response) => {
    const query: AttendanceQuery = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      eventId: req.query.eventId as string,
      status: req.query.status as any,
      search: req.query.search as string,
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined
    };

    const result = await AttendanceService.getAttendance(query);

    res.status(200).json({
      success: true,
      message: 'Attendance retrieved successfully',
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  });

  // POST /api/attendance/check-in
  static checkIn = asyncHandler(async (req: Request, res: Response) => {
    const data: CheckInDto = req.body;
    const currentUserId = req.user!.userId;
    const currentUserRole = req.user!.role;

    // If no userId provided, use current user
    if (!data.userId) {
      data.userId = currentUserId;
    }

    const result = await AttendanceService.checkIn(data, currentUserRole);

    res.status(200).json({
      success: true,
      message: 'Check-in successful',
      data: result
    });
  });

  // POST /api/attendance/check-out
  static checkOut = asyncHandler(async (req: Request, res: Response) => {
    const data: CheckOutDto = req.body;
    const currentUserId = req.user!.userId;
    const currentUserRole = req.user!.role;

    // If no userId provided, use current user
    if (!data.userId) {
      data.userId = currentUserId;
    }

    const result = await AttendanceService.checkOut(data, currentUserRole);

    res.status(200).json({
      success: true,
      message: 'Check-out successful',
      data: result
    });
  });
}
