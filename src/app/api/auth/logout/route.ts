import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session';

/**
 * Handle user logout
 * POST /api/auth/logout - Clear authentication cookies and session
 */
export async function POST(request: NextRequest) {
  try {
    // Create response
    const response = NextResponse.json(
      { message: 'Logged out successfully' },
      { status: 200 }
    );
    
    // Clear authentication cookies
    SessionManager.clearAuthCookies(response);
    
    console.log('User logged out successfully');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      { 
        error: 'Logout failed',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Handle logout via GET request (for direct navigation)
 * GET /api/auth/logout - Clear cookies and redirect to home
 */
export async function GET(request: NextRequest) {
  const base_url = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  try {
    // Create redirect response to home page
    const response = NextResponse.redirect(new URL('/', base_url));
    
    // Clear authentication cookies
    SessionManager.clearAuthCookies(response);
    
    console.log('User logged out successfully via GET');
    
    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Still redirect to home even if there's an error
    const response = NextResponse.redirect(new URL('/', base_url));
    SessionManager.clearAuthCookies(response);
    
    return response;
  }
}
