import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { connectRedis } from './config/redis';
import { errorHandler, notFound } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import eventRoutes from './routes/events';
import attendanceRoutes from './routes/attendance';
import invitationRoutes from './routes/invitations';
import dashboardRoutes from './routes/dashboard';
import exportRoutes from './routes/export';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8080' || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

app.use('/api/auth', limiter); // Apply rate limiting to auth routes

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Islamic Association Event Management API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to Redis (optional for health check)
    try {
      await connectRedis();
      console.log('✅ Redis connected successfully');
    } catch (redisError) {
      console.warn('⚠️ Redis connection failed, continuing without Redis:', redisError.message);
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Islamic Association Event Management API running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

startServer();
