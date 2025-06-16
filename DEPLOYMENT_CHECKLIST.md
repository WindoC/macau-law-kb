# Deployment Checklist - Macau Law Knowledge Base v2.0

## Pre-Deployment Setup

### 1. Environment Configuration
- [ ] Copy `.env.example` to `.env.local` (development) or `.env` (production)
- [ ] Generate secure JWT secrets using `npm run setup:env`
- [ ] Configure database connection variables
- [ ] Set up OIDC provider credentials (Google, GitHub)
- [ ] Configure Gemini AI API key
- [ ] Validate environment with `npm run validate:env`

### 2. Database Setup
- [ ] Ensure PostgreSQL database is accessible
- [ ] Run database health check: `npm run db:health`
- [ ] Apply migrations: `npm run db:migrate`
- [ ] Seed test data (development): `npm run db:seed`
- [ ] Verify vector search functionality

### 3. Authentication Setup
- [ ] Configure Google OAuth2 application
  - [ ] Set authorized redirect URIs
  - [ ] Enable Google+ API
- [ ] Configure GitHub OAuth application
  - [ ] Set authorization callback URL
  - [ ] Configure application permissions
- [ ] Test authentication flows

## Development Environment

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] PostgreSQL 14+ with vector extension
- [ ] Git repository access

### Setup Commands
```bash
# Clone and setup
git clone <repository-url>
cd webapp
npm install

# Environment setup
npm run setup:env
# Edit .env.local with your actual values

# Database setup
npm run db:setup

# Start development server
npm run dev
```

### Verification
- [ ] Application starts on http://localhost:3000
- [ ] Database connection successful
- [ ] Authentication providers working
- [ ] AI search functionality operational
- [ ] All tests passing: `npm test`

## Production Deployment

### Environment Variables Checklist
```bash
# Database (Required)
DATABASE_URL=postgresql://user:pass@host:port/db
DB_HOST=your-production-host
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_SSL=true

# JWT Configuration (Required)
JWT_SECRET=your-production-jwt-secret-64-chars-minimum
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Google OIDC (Required)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/callback/google

# GitHub OAuth (Required)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=https://yourdomain.com/api/auth/callback/github

# Application (Required)
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=your-nextauth-secret-64-chars-minimum
NODE_ENV=production

# AI Configuration (Required)
GEMINI_API_KEY=your-gemini-api-key

# Optional: Captcha
TURNSTILE_SECRET_KEY=your-turnstile-secret
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key
```

### Security Checklist
- [ ] All secrets are properly generated (64+ characters)
- [ ] Database uses SSL connections
- [ ] HTTPS enabled for all endpoints
- [ ] CORS properly configured
- [ ] Rate limiting implemented
- [ ] Input validation in place
- [ ] SQL injection protection verified

### Performance Checklist
- [ ] Database connection pooling configured
- [ ] Vector search indexes optimized
- [ ] Static assets properly cached
- [ ] CDN configured for assets
- [ ] Gzip compression enabled
- [ ] Database query optimization verified

### Monitoring Setup
- [ ] Application logging configured
- [ ] Error tracking setup (e.g., Sentry)
- [ ] Performance monitoring enabled
- [ ] Database monitoring active
- [ ] Uptime monitoring configured
- [ ] Alert notifications setup

## Platform-Specific Deployment

### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Configure environment variables in Vercel dashboard
# Set up custom domain
# Configure database connection
```

### Docker Deployment
```dockerfile
# Use provided Dockerfile
docker build -t macau-law-kb .
docker run -p 3000:3000 --env-file .env macau-law-kb
```

### Traditional Server Deployment
```bash
# Build application
npm run build

# Start production server
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start npm --name "macau-law-kb" -- start
```

## Post-Deployment Verification

### Functional Testing
- [ ] Homepage loads correctly
- [ ] User registration/login works
- [ ] Google OAuth authentication functional
- [ ] GitHub OAuth authentication functional
- [ ] Search functionality operational
- [ ] Q&A feature working
- [ ] Consultant feature accessible (for paid users)
- [ ] User profile management working
- [ ] Token usage tracking accurate

### Performance Testing
- [ ] Page load times < 3 seconds
- [ ] API response times < 1 second
- [ ] Database queries optimized
- [ ] Memory usage within limits
- [ ] No memory leaks detected

### Security Testing
- [ ] Authentication bypass attempts fail
- [ ] SQL injection attempts blocked
- [ ] XSS protection working
- [ ] CSRF protection enabled
- [ ] Rate limiting functional
- [ ] Unauthorized API access blocked

## Rollback Plan

### Quick Rollback
1. Revert to previous deployment
2. Restore database backup if needed
3. Update DNS if necessary
4. Verify functionality

### Database Rollback
```bash
# If database migration issues occur
npm run db:rollback  # If implemented
# Or restore from backup
```

## Support and Maintenance

### Regular Maintenance
- [ ] Weekly dependency updates
- [ ] Monthly security patches
- [ ] Quarterly performance reviews
- [ ] Database maintenance and optimization

### Monitoring Alerts
- [ ] High error rates
- [ ] Slow response times
- [ ] Database connection issues
- [ ] High memory/CPU usage
- [ ] Authentication failures

### Backup Strategy
- [ ] Daily database backups
- [ ] Weekly full system backups
- [ ] Monthly backup restoration tests
- [ ] Offsite backup storage

## Troubleshooting

### Common Issues
1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify network connectivity
   - Confirm SSL settings

2. **Authentication Not Working**
   - Verify OIDC provider settings
   - Check redirect URIs
   - Confirm client secrets

3. **AI Features Not Working**
   - Verify GEMINI_API_KEY
   - Check API quotas
   - Confirm vector search setup

### Debug Commands
```bash
# Check environment
npm run validate:env

# Test database
npm run db:health

# Run tests
npm test

# Check logs
npm run logs  # If implemented
```

## Success Criteria

Deployment is successful when:
- [ ] All functional tests pass
- [ ] Performance metrics meet requirements
- [ ] Security scans show no critical issues
- [ ] Monitoring systems are active
- [ ] Backup systems are operational
- [ ] Documentation is updated
- [ ] Team is trained on new system