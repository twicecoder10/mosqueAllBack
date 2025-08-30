import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Mock Redis for tests
jest.mock('@/config/redis', () => ({
  connectRedis: jest.fn(),
  default: {
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
  },
}));

// Mock Twilio for tests
jest.mock('twilio', () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'test-sid' }),
    },
  }));
});

// Mock Nodemailer for tests
jest.mock('nodemailer', () => ({
  createTransporter: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
  }),
}));

// Global test timeout
jest.setTimeout(10000);
