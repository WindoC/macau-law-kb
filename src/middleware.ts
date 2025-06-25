import { NextRequest, NextResponse } from 'next/server';

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
    // TEMPORARY: Skip authentication in middleware due to Edge Runtime limitations
    // JWT verification requires Node.js crypto module which isn't available in Edge Runtime
    // TODO: Implement Edge-compatible authentication or move to API routes

    const base_url = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    const accessToken = request.cookies.get('access_token')?.value;
    
    if (!accessToken) {
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
        const loginUrl = new URL('/auth/login', base_url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
      }
    }
    
    // If token exists, allow request to proceed
    // Authentication verification will happen in API routes using Node.js runtime
    // console.log('TEMPORARY: Allowing request with token to proceed, verification deferred to API routes');
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
