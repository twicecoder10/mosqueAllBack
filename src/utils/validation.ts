import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Validation middleware
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => error.msg)
    });
  }
  next();
};

// Custom validation for at least one contact method
const validateContactMethod = (req: Request, res: Response, next: NextFunction) => {
  const { email, phone } = req.body;
  if (!email && !phone) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: ['At least one contact method (email or phone) is required']
    });
  }
  next();
};

// UK phone number validation function
const validateUKPhoneNumber = (phone: string): boolean => {
  // Remove all spaces, dashes, and parentheses for validation
  const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
  
  // UK phone number patterns:
  // +44XXXXXXXXXX (international format)
  // 44XXXXXXXXXX (without +)
  // 0XXXXXXXXXX (national format)
  // 07XXXXXXXXX (mobile format)
  
  const ukPhoneRegex = /^(\+?44|0)[1-9]\d{8,9}$/;
  return ukPhoneRegex.test(cleanPhone);
};

// User validation rules
export const validateCreateUser = [
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().custom((value) => {
    if (value && value.trim() !== '') {
      // If phone is provided, validate it as UK phone number
      if (!validateUKPhoneNumber(value)) {
        throw new Error('Valid UK phone number is required (e.g., +447123456789, 07123456789, 02012345678)');
      }
    }
    return true;
  }).withMessage('Valid UK phone number is required'),
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('gender').isIn(['MALE', 'FEMALE']).withMessage('Gender is required and must be MALE or FEMALE'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').optional().custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }).withMessage('Passwords do not match'),
  body('acceptTerms').optional().isBoolean().withMessage('Terms acceptance must be boolean'),
  body('role').optional().isIn(['ADMIN', 'SUBADMIN', 'USER']).withMessage('Invalid role'),
  validateContactMethod,
  validate
];

export const validateLogin = [
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().custom((value) => {
    if (value && value.trim() !== '') {
      // If phone is provided, validate it as UK phone number
      if (!validateUKPhoneNumber(value)) {
        throw new Error('Valid UK phone number is required (e.g., +447123456789, 07123456789, 02012345678)');
      }
    }
    return true;
  }).withMessage('Valid UK phone number is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validateContactMethod,
  validate
];

export const validatePhoneLogin = [
  body('phone').custom((value) => {
    if (!value || value.trim() === '') {
      throw new Error('Phone number is required');
    }
    // Validate as UK phone number
    if (!validateUKPhoneNumber(value)) {
      throw new Error('Valid UK phone number is required (e.g., +447123456789, 07123456789, 02012345678)');
    }
    return true;
  }).withMessage('Valid UK phone number is required'),
  body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit OTP is required'),
  validate
];

export const validateSendOtp = [
  body('phone').custom((value) => {
    if (!value || value.trim() === '') {
      throw new Error('Phone number is required');
    }
    // Validate as UK phone number
    if (!validateUKPhoneNumber(value)) {
      throw new Error('Valid UK phone number is required (e.g., +447123456789, 07123456789, 02012345678)');
    }
    return true;
  }).withMessage('Valid UK phone number is required'),
  validate
];

// User management validation
export const validateUpdateUser = [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().custom((value) => {
    if (value && value.trim() !== '') {
      // If phone is provided, validate it as UK phone number
      if (!validateUKPhoneNumber(value)) {
        throw new Error('Valid UK phone number is required (e.g., +447123456789, 07123456789, 02012345678)');
      }
    }
    return true;
  }).withMessage('Valid UK phone number is required'),
  body('gender').optional().isIn(['MALE', 'FEMALE']).withMessage('Gender must be MALE or FEMALE'),
  body('role').optional().isIn(['ADMIN', 'SUBADMIN', 'USER']).withMessage('Invalid role'),
  body('profileImage').optional().isURL().withMessage('Valid profile image URL is required'),
  body('isVerified').optional().isBoolean().withMessage('Is verified must be boolean'),
  validate
];

export const validateInviteUser = [
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().custom((value) => {
    if (value && value.trim() !== '') {
      // If phone is provided, validate it as UK phone number
      if (!validateUKPhoneNumber(value)) {
        throw new Error('Valid UK phone number is required (e.g., +447123456789, 07123456789, 02012345678)');
      }
    }
    return true;
  }).withMessage('Valid UK phone number is required'),
  body('role').isIn(['USER', 'SUBADMIN']).withMessage('Invalid role'),
  validateContactMethod,
  validate
];

// Bulk invitation validation
export const validateBulkInviteUser = [
  body('invitations').isArray({ min: 1, max: 50 }).withMessage('Invitations must be an array with 1-50 items'),
  body('invitations.*.email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('invitations.*.phone').optional().custom((value) => {
    if (value && value.trim() !== '') {
      // If phone is provided, validate it as UK phone number
      if (!validateUKPhoneNumber(value)) {
        throw new Error('Valid UK phone number is required (e.g., +447123456789, 07123456789, 02012345678)');
      }
    }
    return true;
  }).withMessage('Valid UK phone number is required'),
  body('invitations.*.role').isIn(['USER', 'SUBADMIN']).withMessage('Invalid role'),
  body('invitations').custom((invitations) => {
    for (const invitation of invitations) {
      if (!invitation.email && !invitation.phone) {
        throw new Error('Each invitation must have at least one contact method (email or phone)');
      }
    }
    return true;
  }).withMessage('Each invitation must have at least one contact method'),
  validate
];

// Event validation rules
export const validateCreateEvent = [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('location').trim().isLength({ min: 3, max: 200 }).withMessage('Location must be 3-200 characters'),
  body('maxAttendees').optional().isInt({ min: 1 }).withMessage('Max attendees must be a positive integer'),
  body('category').isIn(['PRAYER', 'LECTURE', 'COMMUNITY', 'EDUCATION', 'CHARITY', 'SOCIAL']).withMessage('Invalid category'),
  body('registrationRequired').optional().isBoolean().withMessage('Registration required must be boolean'),
  body('registrationDeadline').optional().isISO8601().withMessage('Valid registration deadline is required'),
  validate
];

export const validateUpdateEvent = [
  body('title').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters'),
  body('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  body('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  body('location').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Location must be 3-200 characters'),
  body('maxAttendees').optional().isInt({ min: 1 }).withMessage('Max attendees must be a positive integer'),
  body('category').optional().isIn(['PRAYER', 'LECTURE', 'COMMUNITY', 'EDUCATION', 'CHARITY', 'SOCIAL']).withMessage('Invalid category'),
  body('registrationRequired').optional().isBoolean().withMessage('Registration required must be boolean'),
  body('registrationDeadline').optional().isISO8601().withMessage('Valid registration deadline is required'),
  body('isActive').optional().isBoolean().withMessage('Is active must be boolean'),
  validate
];

// Registration validation
export const validateEventRegistration = [
  param('id').isLength({ min: 1, max: 50 }).withMessage('Valid event ID is required'),
  validate
];

// Attendance validation
export const validateCheckIn = [
  body('eventId').isLength({ min: 1, max: 50 }).withMessage('Valid event ID is required'),
  body('userId').isLength({ min: 1, max: 50 }).withMessage('Valid user ID is required'),
  body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters'),
  validate
];

// Invitation validation
export const validateCreateInvitation = [
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().custom((value) => {
    if (value && value.trim() !== '') {
      // If phone is provided, validate it as UK phone number
      if (!validateUKPhoneNumber(value)) {
        throw new Error('Valid UK phone number is required (e.g., +447123456789, 07123456789, 02012345678)');
      }
    }
    return true;
  }).withMessage('Valid UK phone number is required'),
  body('role').isIn(['USER', 'SUBADMIN']).withMessage('Invalid role'),
  validateContactMethod,
  validate
];

export const validateAcceptInvitation = [
  body('token').notEmpty().withMessage('Token is required'),
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('gender').isIn(['MALE', 'FEMALE']).withMessage('Gender is required and must be MALE or FEMALE'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('phone').optional().custom((value) => {
    if (value && value.trim() !== '') {
      // If phone is provided, validate it as UK phone number
      if (!validateUKPhoneNumber(value)) {
        throw new Error('Valid UK phone number is required (e.g., +447123456789, 07123456789, 02012345678)');
      }
    }
    return true;
  }).withMessage('Valid UK phone number is required'),
  validateContactMethod,
  validate
];

// Email verification validation
export const validateSendVerificationEmail = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  validate
];

export const validateVerifyEmail = [
  body('token').notEmpty().withMessage('Verification token is required'),
  validate
];

// Query validation
export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
  validate
];

export const validateUserQuery = [
  ...validatePagination,
  query('role').optional().isIn(['ADMIN', 'SUBADMIN', 'USER']).withMessage('Invalid role'),
  query('isVerified').optional().isBoolean().withMessage('Is verified must be boolean'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long'),
  validate
];

export const validateEventQuery = [
  ...validatePagination,
  query('category').optional().isIn(['PRAYER', 'LECTURE', 'COMMUNITY', 'EDUCATION', 'CHARITY', 'SOCIAL']).withMessage('Invalid category'),
  query('isActive').optional().isBoolean().withMessage('Is active must be boolean'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long'),
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  validate
];

export const validateAttendanceQuery = [
  ...validatePagination,
  query('eventId').optional().isLength({ min: 1, max: 50 }).withMessage('Valid event ID is required'),
  query('status').optional().isIn(['REGISTERED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW']).withMessage('Invalid status'),
  query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term too long'),
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required'),
  validate
];

// ID validation
export const validateId = [
  param('id').isLength({ min: 1, max: 50 }).withMessage('Valid ID is required'),
  validate
];
