# Islamic Association Event Management Backend

A comprehensive backend API for the Assalatur Rahman Islamic Association Event Management App, built with Node.js, Express, TypeScript, and Prisma.

## 🏗️ Architecture

- **Framework**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT-based with role management
- **Caching**: Redis for sessions and OTP
- **Email**: Nodemailer for invitations and notifications
- **SMS**: Twilio for OTP delivery
- **Security**: Helmet, CORS, Rate limiting

## 🚀 Features

### Authentication & Authorization
- Email/password authentication
- Phone/OTP authentication
- JWT-based session management
- Role-based access control (Admin, Subadmin, User)
- User invitation system

### Event Management
- Create, read, update, delete events
- Event categories (Prayer, Lecture, Community, Education, Charity, Social)
- Event registration system
- Capacity management
- Registration deadlines

### Attendance Tracking
- Check-in/check-out functionality
- Attendance status tracking
- Real-time attendance monitoring
- Attendance reports

### User Management
- User profile management
- Role-based permissions
- User verification system
- Bulk user operations

### Dashboard & Analytics
- Real-time statistics
- Event analytics
- User analytics
- Attendance reports

### Export Functionality
- PDF export (planned)
- Excel export (planned)
- Customizable reports

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Redis 6+
- Twilio account (for SMS)
- SMTP server (for emails)

## 🛠️ Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd islamic-event-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   # Database
   DATABASE_URL="postgresql://username:password@localhost:5432/islamic_events_db"
   
   # JWT
   JWT_SECRET="your-super-secret-jwt-key"
   JWT_EXPIRES_IN="7d"
   
   # Redis
   REDIS_URL="redis://localhost:6379"
   
   # Email (Nodemailer)
   SMTP_HOST="smtp.gmail.com"
   SMTP_PORT="587"
   SMTP_USER="your-email@gmail.com"
   SMTP_PASS="your-app-password"
   SMTP_FROM="noreply@islamicassociation.com"
   
   # SMS (Twilio)
   TWILIO_ACCOUNT_SID="your-twilio-account-sid"
   TWILIO_AUTH_TOKEN="your-twilio-auth-token"
   TWILIO_PHONE_NUMBER="+1234567890"
   
   # Server
   PORT="3000"
   NODE_ENV="development"
   CORS_ORIGIN="http://localhost:3000"
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Push schema to database
   npm run db:push
   
   # (Optional) Run migrations
   npm run db:migrate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

### Production Deployment

#### Railway Deployment (Recommended)

For quick and easy deployment to Railway:

1. **Quick Setup**
   ```bash
   # Run the setup script
   ./scripts/setup-railway.sh
   ```

2. **Manual Setup**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   
   # Initialize project
   railway init
   ```

3. **Deploy**
   ```bash
   # Deploy to Railway
   ./scripts/deploy.sh
   ```

For detailed deployment instructions, see [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md).

#### Other Deployment Options

- **Docker**: Use the provided Dockerfile
- **Heroku**: Use the Procfile
- **Vercel**: Configure for Node.js deployment
- **AWS/GCP**: Use container deployment

## 📚 API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "password": "password123",
  "phone": "+1234567890",
  "role": "USER"
}
```

#### POST /api/auth/login
Login with email and password.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST /api/auth/send-otp
Send OTP to phone number.

**Request Body:**
```json
{
  "phone": "+1234567890"
}
```

#### POST /api/auth/login/otp
Login with phone and OTP.

**Request Body:**
```json
{
  "phone": "+1234567890",
  "otp": "123456"
}
```

#### GET /api/auth/me
Get current user information.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

### Event Endpoints

#### GET /api/events
Get all events with pagination and filters.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `category`: Event category filter
- `isActive`: Active status filter
- `search`: Search term
- `startDate`: Start date filter
- `endDate`: End date filter

#### POST /api/events
Create a new event (Admin/Subadmin only).

**Request Body:**
```json
{
  "title": "Friday Prayer",
  "description": "Weekly Friday prayer",
  "startDate": "2024-01-19T13:00:00Z",
  "endDate": "2024-01-19T14:00:00Z",
  "location": "Main Mosque",
  "maxAttendees": 100,
  "category": "PRAYER",
  "registrationRequired": true,
  "registrationDeadline": "2024-01-18T23:59:59Z"
}
```

#### POST /api/events/:id/register
Register for an event.

#### DELETE /api/events/:id/register
Cancel event registration.

### User Management Endpoints

#### GET /api/users
Get all users (Admin/Subadmin only).

#### PUT /api/users/:id
Update user profile.

#### DELETE /api/users/:id
Delete user (Admin/Subadmin only).

### Attendance Endpoints

#### GET /api/attendance
Get attendance records (Admin/Subadmin only).

#### POST /api/attendance/check-in
Check in for an event.

**Request Body:**
```json
{
  "eventId": "event-id",
  "userId": "user-id",
  "notes": "Optional notes"
}
```

#### POST /api/attendance/check-out
Check out from an event.

### Dashboard Endpoints

#### GET /api/dashboard/stats
Get dashboard statistics (Admin/Subadmin only).

### Invitation Endpoints

#### POST /api/invitations
Create user invitation (Admin/Subadmin only).

#### POST /api/invitations/accept
Accept invitation and create account.

## 🔐 Role-Based Access Control

### Admin
- Full access to all features
- Can manage all users (including other admins)
- Can create, update, delete any event
- Can view all statistics and reports

### Subadmin
- Can manage events and users (except admins)
- Cannot delete admin users
- Cannot update admin events
- Full access to attendance tracking

### User
- Can view events
- Can register for events
- Can check in/out for events
- Can update own profile
- Can delete own account

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📦 Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Run migrations
npm run db:studio    # Open Prisma Studio
npm run db:seed      # Seed database

# Testing
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
Make sure to set appropriate environment variables for production:
- `NODE_ENV=production`
- Strong `JWT_SECRET`
- Production database URL
- Production Redis URL
- Valid SMTP and Twilio credentials

### Docker Deployment (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Database Schema

The application uses the following main entities:
- **Users**: User accounts and profiles
- **Events**: Event information and details
- **EventRegistrations**: User event registrations
- **Attendance**: Event attendance records
- **Invitations**: User invitations
- **Sessions**: JWT token management

## 🔧 Configuration

### Rate Limiting
- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables

### File Upload
- Maximum file size: 5MB
- Supported formats: Images (JPG, PNG, GIF)

### Security
- CORS enabled
- Helmet security headers
- Input validation and sanitization
- SQL injection prevention

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions, please contact the development team or create an issue in the repository.

---

**Built with ❤️ for the Islamic Association Community**
