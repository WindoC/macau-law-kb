import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session';

// Define protected paths that require authentication
const protectedPaths = [
  '/api/search',
  '/api/consultant',
  '/api/profile',
  '/dashboard',
  '/consultant',
  '/search',
  '/profile'
];

// Define authentication paths that should be accessible without login
const authPaths = [
  '/api/auth',
  '/auth',
  '/login'
];

// Define public paths that don't require authentication
const publicPaths = [
  '/',
  '/about',
  '/contact',
  '/terms',
  '/privacy'
];

/**
 * Middleware to handle authentication and route protection
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files, Next.js internals, and favicon
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next();
  }
  
  // Allow auth paths to proceed without authentication
  if (authPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // Allow public paths to proceed without authentication
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }
  
  // Check if the current path requires authentication
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));
  
  if (isProtectedPath) {
    try {
      // Get session from request
      const session = await SessionManager.getSession(request);
      
      if (!session) {
        // Handle unauthenticated requests
        if (pathname.startsWith('/api/')) {
          // Return 401 for API routes
          return NextResponse.json(
            { 
              error: 'Authentication required',
              message: 'Please log in to access this resource.'
            }, 
            { status: 401 }
          );
        } else {
          // Redirect to login for page routes
          const loginUrl = new URL('/auth/login', request.url);
          loginUrl.searchParams.set('redirect', pathname);
          return NextResponse.redirect(loginUrl);
        }
      }
      
      // For API routes, add session information to headers for easy access
      if (pathname.startsWith('/api/')) {
        const response = NextResponse.next();
        response.headers.set('x-user-id', session.userId);
        response.headers.set('x-user-email', session.email);
        response.headers.set('x-user-role', session.role);
        response.headers.set('x-user-provider', session.provider);
        return response;
      }
      
      // Check role-based access for specific routes
      if (pathname.startsWith('/admin') && session.role !== 'admin') {
        if (pathname.startsWith('/api/admin')) {
          return NextResponse.json(
            { 
              error: 'Insufficient permissions',
              message: 'Admin access required.'
            }, 
            { status: 403 }
          );
        } else {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
      }
      
      // Check VIP access for premium features
      if (pathname.startsWith('/premium') && !['admin', 'vip', 'pay'].includes(session.role)) {
        if (pathname.startsWith('/api/premium')) {
          return NextResponse.json(
            { 
              error: 'Premium access required',
              message: 'Please upgrade to access premium features.'
            }, 
            { status: 402 }
          );
        } else {
          const upgradeUrl = new URL('/upgrade', request.url);
          upgradeUrl.searchParams.set('feature', 'premium');
          return NextResponse.redirect(upgradeUrl);
        }
      }
    } catch (error) {
      console.error('Middleware authentication error:', error);
      
      // Handle middleware errors gracefully
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { 
            error: 'Authentication service error',
            message: 'Please try again later.'
          }, 
          { status: 503 }
        );
      } else {
        return NextResponse.redirect(new URL('/auth/error', request.url));
      }
    }
  }
  
  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
