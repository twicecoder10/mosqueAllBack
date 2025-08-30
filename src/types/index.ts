import type { User, Event, EventRegistration, Attendance, Invitation, Session } from '@prisma/client';

// Base types from Prisma
export type { User, Event, EventRegistration, Attendance, Invitation, Session };

// User types
export interface CreateUserDto {
  email?: string; // Made optional
  phone?: string; // Made optional
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE'; // Required gender field
  password?: string;
  confirmPassword?: string; // For frontend validation
  acceptTerms?: boolean; // For frontend validation
  role?: 'ADMIN' | 'SUBADMIN' | 'USER';
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string; // Added email update
  phone?: string;
  gender?: 'MALE' | 'FEMALE'; // Optional gender update
  role?: 'ADMIN' | 'SUBADMIN' | 'USER'; // Added role update
  profileImage?: string;
  isVerified?: boolean;
}

export interface LoginDto {
  email?: string; // Made optional
  phone?: string; // Made optional
  password: string;
}

export interface PhoneLoginDto {
  phone: string;
  otp: string;
}

export interface SendOtpDto {
  phone: string;
}

// New user invitation types
export interface InviteUserDto {
  email?: string; // Made optional
  phone?: string; // Made optional
  role: 'USER' | 'SUBADMIN';
}

// Event types
export interface CreateEventDto {
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  location: string;
  maxAttendees?: number;
  category: 'PRAYER' | 'LECTURE' | 'COMMUNITY' | 'EDUCATION' | 'CHARITY' | 'SOCIAL';
  imageUrl?: string;
  registrationRequired?: boolean;
  registrationDeadline?: Date;
}

export interface UpdateEventDto {
  title?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  maxAttendees?: number;
  category?: 'PRAYER' | 'LECTURE' | 'COMMUNITY' | 'EDUCATION' | 'CHARITY' | 'SOCIAL';
  imageUrl?: string;
  registrationRequired?: boolean;
  registrationDeadline?: Date;
  isActive?: boolean;
}

// Registration types
export interface RegisterForEventDto {
  eventId: string;
}

// Attendance types
export interface CheckInDto {
  eventId: string;
  userId: string;
  notes?: string;
}

export interface CheckOutDto {
  eventId: string;
  userId: string;
  notes?: string;
}

// Invitation types
export interface CreateInvitationDto {
  email?: string; // Made optional
  phone?: string; // Made optional
  role: 'USER' | 'SUBADMIN';
}

export interface AcceptInvitationDto {
  token: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE'; // Required gender field
  password?: string; // Made optional for OTP-only users
  email?: string; // Made optional
  phone?: string; // Made optional
}

// Email verification types
export interface SendVerificationEmailDto {
  email: string;
}

export interface VerifyEmailDto {
  token: string;
}

// Bulk invitation types
export interface BulkInviteUserDto {
  invitations: Array<{
    email?: string;
    phone?: string;
    role: 'USER' | 'SUBADMIN';
  }>;
}

export interface BulkInviteResult {
  success: Array<{
    email?: string;
    phone?: string;
    role: string;
    message: string;
  }>;
  failed: Array<{
    email?: string;
    phone?: string;
    role: string;
    error: string;
  }>;
}

// Query types
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface UserQuery extends PaginationQuery {
  role?: string;
  isVerified?: boolean;
  search?: string;
}

export interface EventQuery extends PaginationQuery {
  category?: string;
  isActive?: boolean;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface AttendanceQuery extends PaginationQuery {
  eventId?: string;
  status?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
}

// Response types
export interface ApiResponse<T = any> {
  data: T;
  message: string;
  success: boolean;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  totalAttendance: number;
  thisMonthAttendance: number;
  activeRegistrations: number;
}

// JWT payload
export interface JwtPayload {
  userId: string;
  email?: string; // Made optional
  phone?: string; // Made optional
  role: string;
  iat?: number;
  exp?: number;
}

// Extended types with relations
export type UserWithEvents = User & {
  createdEvents: Event[];
  eventRegistrations: EventRegistration[];
  attendances: Attendance[];
};

export type EventWithDetails = Event & {
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string; // Made optional
  };
  registrations: EventRegistration[];
  attendances: Attendance[];
};

export type EventRegistrationWithDetails = EventRegistration & {
  event: Event;
  user: User;
};

export type AttendanceWithDetails = Attendance & {
  event: {
    id: string;
    title: string;
    startDate: Date;
    endDate: Date;
    location: string;
    category: string;
  };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string; // Made optional
    phone: string | null;
    profileImage: string | null;
  };
};

// Export types
export interface ExportFilters {
  startDate?: Date;
  endDate?: Date;
  category?: string;
  status?: string;
  role?: string;
}

export interface ExportOptions {
  format: 'pdf' | 'excel';
  filters?: ExportFilters;
}
