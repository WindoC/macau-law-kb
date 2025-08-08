# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development Server
```bash
npm run dev           # Start development server on http://localhost:3000
```

### Building and Production
```bash
npm run build         # Build for production
npm start             # Start production server
npm run type-check    # TypeScript type checking
```

### Testing
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report (70% threshold)
```

### Linting
```bash
npm run lint          # ESLint code quality check
```

### Database Management
```bash
npm run db:migrate    # Run database migrations
npm run db:seed       # Seed database with test data
npm run db:setup      # Run migrations and seeding
npm run db:health     # Database health check
```

### Environment Setup
```bash
npm run setup:env     # Create .env.local from template
npm run validate:env  # Validate environment variables
npm run setup         # Complete setup (env + db)
```

## High-Level Architecture

### Technology Stack
- **Frontend**: Next.js 15.3.3 with React 19, TypeScript, Bootstrap 5.3.6
- **Backend**: Next.js API Routes (Node.js runtime for JWT/crypto operations)
- **Database**: PostgreSQL with vector extension for AI-powered search
- **Authentication**: OIDC/OAuth2 with Google and GitHub providers
- **AI Service**: Google Gemini API for embeddings and text generation
- **Testing**: Jest with React Testing Library

### Core System Architecture
The application follows a three-tier architecture:

1. **Frontend Layer**: Next.js pages with Bootstrap components for legal search, Q&A, and AI consultation interfaces

2. **API Layer**: Next.js API routes handling:
   - Authentication flows (`/api/auth/[provider]`, `/api/auth/callback/[provider]`)
   - Legal search with vector similarity (`/api/search`)
   - AI-powered Q&A (`/api/qa`)
   - Interactive legal consultation (`/api/consultant`)
   - User profile and credit management (`/api/profile`)

3. **Data Layer**: PostgreSQL database with:
   - Vector search table (`documents`) using pgvector extension
   - User management with role-based access control
   - History tracking for searches, Q&A, and conversations
   - Token/credit system for usage tracking

### Key Directories and Files

#### Core Business Logic
- `src/lib/database-new.ts` - Primary database service with vector search, user management, and conversation handling
- `src/lib/auth-service.ts` - Complete authentication service handling OIDC flows, JWT tokens, and user lifecycle
- `src/lib/gemini.ts` - Google Gemini API integration for embeddings and text generation
- `src/middleware.ts` - Route protection and authentication middleware

#### API Routes Structure
- `src/app/api/auth/[provider]/route.ts` - Dynamic OAuth provider endpoints
- `src/app/api/auth/callback/[provider]/route.ts` - OAuth callback handlers
- `src/app/api/search/route.ts` - Vector-based legal document search
- `src/app/api/qa/route.ts` - AI question-answering with streaming responses
- `src/app/api/consultant/route.ts` - Interactive AI consultation with conversation management

#### Frontend Pages
- `src/app/search/page.tsx` - Legal document search interface
- `src/app/qa/page.tsx` - Legal Q&A submission and results
- `src/app/consultant/page.tsx` - AI consultation chat interface
- `src/app/profile/page.tsx` - User profile and token usage dashboard

### Authentication Flow
1. User initiates OAuth with Google/GitHub via `/api/auth/[provider]` (no CAPTCHA required)
2. Provider redirects to `/api/auth/callback/[provider]` with authorization code
3. Backend exchanges code for user info and creates/updates user in database
4. JWT tokens issued and stored in HTTP-only cookies
5. Middleware validates tokens on protected routes
6. Database-first approach with temporary user fallback for resilience

**Note**: CAPTCHA functionality has been removed for streamlined user experience. Authentication relies solely on OAuth providers.

### AI Integration Pattern
1. User input processed through Gemini for embedding generation
2. Vector similarity search against legal document database
3. Retrieved documents provide context for AI response generation
4. Streaming responses delivered to frontend for real-time interaction
5. All interactions logged with token usage tracking

### Database Schema Key Points
- `documents` table uses vector(3072) embeddings for similarity search
- User roles: admin, vip, pay, free (with different token allocations)
- Row-level security policies enforce data isolation
- Comprehensive audit trail for all user actions

### Development Patterns
- Use TypeScript strict mode throughout
- Database operations via the centralized `database-new.ts` service
- Error handling with fallback patterns for database failures
- Comprehensive test coverage (70% minimum, 80% for critical auth/db files)
- Environment-based configuration with validation

## Important Implementation Notes

### Database Connections
Always use the centralized database service from `src/lib/database-new.ts`. Do not create direct database connections in API routes.

### Authentication Verification
JWT verification must occur in API routes (Node.js runtime), not in middleware (Edge runtime). Use the `authService.verifyToken()` method.

### Vector Search Implementation
Use the `searchDocuments()` function which handles vector similarity queries with the format:
```sql
1 - (embedding <=> $1::vector) AS similarity
ORDER BY embedding <=> $1::vector
```

### Token Management
Always update user token usage after AI operations using `updateTokenUsage()` and check availability with `checkTokenAvailability()`.

### Error Handling
Implement database failure fallbacks, especially for authentication where temporary users can be created if the database is unavailable.

### Testing Requirements
- Unit tests for all utility functions in `src/lib/`
- API route integration tests
- Minimum 70% coverage overall, 80% for critical auth/database files
- Use Jest with React Testing Library for component tests