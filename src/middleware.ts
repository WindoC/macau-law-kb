import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to handle routing and basic security
 * Currently simplified to work with Supabase authentication
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // For now, just pass through all requests
  // Authentication is handled in individual API routes
  return NextResponse.next();
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
    '/api/debug-auth',
    '/_next',
    '/favicon.ico'
  ];

  return publicRoutes.some(route => pathname.startsWith(route)) || 
         !pathname.startsWith('/api/');
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
