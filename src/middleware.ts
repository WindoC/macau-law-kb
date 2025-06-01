import { NextRequest, NextResponse } from 'next/server';
import { verifyCSRFToken } from '@/lib/auth';
import jwt from 'jsonwebtoken';

/**
 * Middleware to protect API routes with JWT and CSRF tokens
 * Runs on all API routes except authentication endpoints
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Check for JWT token in Authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);
  
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    
    if (!decoded) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Check CSRF token for state-changing operations
    if (isStateChangingRequest(request)) {
      const csrfToken = request.headers.get('x-csrf-token');
      if (!csrfToken || !verifyCSRFToken(csrfToken)) {
        return NextResponse.json(
          { success: false, error: 'Missing or invalid CSRF token' },
          { status: 403 }
        );
      }
    }

    // Add user info to request headers for API routes
    const response = NextResponse.next();
    response.headers.set('x-user-id', decoded.userId || decoded.sub);
    response.headers.set('x-user-email', decoded.email);
    response.headers.set('x-user-role', decoded.role || 'free');

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Invalid or expired token' },
      { status: 401 }
    );
  }
}

/**
 * Checks if the route is public and doesn't require authentication
 * @param pathname - Request pathname
 * @returns True if route is public
 */
function isPublicRoute(pathname: string): boolean {
  const publicRoutes = [
    '/api/auth/login',
    '/api/auth/callback',
    '/api/auth/logout',
    '/api/auth/csrf',
    '/api/health',
    '/_next',
    '/favicon.ico'
  ];

  return publicRoutes.some(route => pathname.startsWith(route)) || 
         !pathname.startsWith('/api/');
}

/**
 * Checks if the request is a state-changing operation that requires CSRF protection
 * @param request - NextRequest object
 * @returns True if request requires CSRF protection
 */
function isStateChangingRequest(request: NextRequest): boolean {
  const method = request.method;
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
}

/**
 * Configuration for which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
