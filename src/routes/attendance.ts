import { Router } from 'express';
import { AttendanceController } from '../controllers/attendanceController';
import { authenticate, requireSubAdmin } from '../middleware/auth';
import { validateCheckIn, validateAttendanceQuery } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Attendance tracking routes
router.get('/', requireSubAdmin, validateAttendanceQuery, AttendanceController.getAttendance);
router.post('/check-in', validateCheckIn, AttendanceController.checkIn);
router.post('/check-out', validateCheckIn, AttendanceController.checkOut);

export default router;
