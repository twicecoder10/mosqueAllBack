import { Router } from 'express';
import { EventController } from '../controllers/eventController';
import { authenticate, requireSubAdmin } from '../middleware/auth';
import { 
  validateEventQuery, 
  validateId, 
  validateCreateEvent, 
  validateUpdateEvent,
  validateEventRegistration,
  validate
} from '../utils/validation';
import { param } from 'express-validator';

const router = Router();

// Public routes (with optional auth for personalized data)
router.get('/', validateEventQuery, EventController.getEvents);

// Public QR Code token validation (no auth required)
router.get('/:id/validate-checkin-token', param('id').isLength({ min: 1, max: 50 }).withMessage('Valid ID is required'), validate, EventController.validateCheckinToken);

// Protected routes
router.use(authenticate);

// Event registration (All authenticated users) - Place specific routes before parameterized routes
router.get('/my-registrations', EventController.getMyRegistrations);

// Event management (Admin/Subadmin only)
router.post('/', requireSubAdmin, validateCreateEvent, EventController.createEvent);

// Parameterized routes (must come after specific routes)
router.get('/:id', validateId, EventController.getEventById);
router.put('/:id', requireSubAdmin, validateId, validateUpdateEvent, EventController.updateEvent);
router.delete('/:id', requireSubAdmin, validateId, EventController.deleteEvent);
router.post('/:id/register', validateEventRegistration, EventController.registerForEvent);
router.delete('/:id/register', validateEventRegistration, EventController.cancelRegistration);
router.post('/:id/attendance', validateId, EventController.markAttendance);

// QR Code routes
router.post('/:id/generate-qr', requireSubAdmin, validateId, EventController.generateQR);
router.post('/:id/checkin-qr', validateId, EventController.checkInQR);
router.delete('/:id/revoke-qr', requireSubAdmin, validateId, EventController.revokeQR);
router.get('/:id/qr-status', requireSubAdmin, validateId, EventController.getQRStatus);

// Frontend QR Code routes
router.post('/:id/checkin-with-token', validateId, EventController.checkInWithToken);

export default router;
