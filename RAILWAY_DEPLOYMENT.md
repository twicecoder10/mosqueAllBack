# Railway Deployment Guide

This guide will help you deploy the Islamic Event Backend to Railway.

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI**: Install the Railway CLI
   ```bash
   npm install -g @railway/cli
   ```
3. **Git Repository**: Ensure your code is in a Git repository

## Step 1: Login to Railway

```bash
railway login
```

## Step 2: Initialize Railway Project

```bash
# Navigate to your project directory
cd islamic-event-backend

# Initialize Railway project
railway init
```

## Step 3: Add PostgreSQL Database

1. Go to your Railway dashboard
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. In the project dashboard, click "New" → "Database" → "PostgreSQL"
5. Copy the PostgreSQL connection URL

## Step 4: Add Redis (Optional but Recommended)

1. In your Railway project dashboard
2. Click "New" → "Database" → "Redis"
3. Copy the Redis connection URL

## Step 5: Configure Environment Variables

In your Railway project dashboard:

1. Go to the "Variables" tab
2. Add the following environment variables:

### Required Variables:
```
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your-super-secret-jwt-key-here
OTP_SECRET=your-otp-secret-key
NODE_ENV=production
PORT=3000
```

### Optional Variables (configure based on your needs):
```
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@islamicassociation.com

# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# Redis Configuration
REDIS_URL=your_redis_connection_string

# CORS Configuration
CORS_ORIGIN=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Security
BCRYPT_ROUNDS=12

# QR Code Configuration
QR_SECRET=your-super-secret-qr-key-here
FRONTEND_URL=https://your-frontend-domain.com
```

## Step 6: Deploy

### Option 1: Using the deployment script
```bash
./scripts/deploy.sh
```

### Option 2: Manual deployment
```bash
# Build the project
npm run build

# Generate Prisma client
npx prisma generate

# Deploy to Railway
railway up
```

## Step 7: Run Database Migrations

After deployment, run the database migrations:

```bash
# Connect to your Railway project
railway link

# Run migrations
railway run npm run db:deploy
```

## Step 8: Seed the Database (Optional)

If you want to seed the database with initial data:

```bash
railway run npm run db:seed
```

## Step 9: Verify Deployment

1. Check your Railway dashboard for the deployment status
2. Visit your app URL (provided by Railway)
3. Test the health endpoint: `https://your-app.railway.app/health`

## Environment-Specific Configurations

### Development vs Production

- **Development**: Uses SQLite database (`prisma/dev.db`)
- **Production**: Uses PostgreSQL database (Railway PostgreSQL)

### Database Migrations

- **Development**: `npm run db:migrate` (creates new migrations)
- **Production**: `npm run db:deploy` (applies existing migrations)

## Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check if all dependencies are in `package.json`
   - Ensure TypeScript compilation passes locally

2. **Database Connection Issues**:
   - Verify `DATABASE_URL` is correctly set
   - Ensure PostgreSQL service is running in Railway

3. **Environment Variables**:
   - Double-check all required variables are set
   - Ensure no typos in variable names

4. **Port Issues**:
   - Railway automatically sets the `PORT` environment variable
   - Your app should use `process.env.PORT || 3000`

### Logs and Debugging:

```bash
# View Railway logs
railway logs

# View specific service logs
railway logs --service your-service-name
```

## Monitoring and Maintenance

1. **Health Checks**: Railway automatically monitors `/health` endpoint
2. **Logs**: Monitor logs through Railway dashboard
3. **Scaling**: Adjust resources in Railway dashboard as needed
4. **Backups**: Railway PostgreSQL includes automatic backups

## Security Considerations

1. **Environment Variables**: Never commit sensitive data to Git
2. **CORS**: Configure `CORS_ORIGIN` to match your frontend domain
3. **Rate Limiting**: Adjust rate limits based on your needs
4. **JWT Secrets**: Use strong, unique secrets for JWT tokens

## Support

- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Project Issues: Create an issue in your repository
