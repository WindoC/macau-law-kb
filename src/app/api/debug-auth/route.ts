import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session';
import { authService } from '@/lib/auth-service';

/**
 * Debug authentication endpoint for testing JWT token validation
 * GET /api/debug-auth - Validates JWT tokens and returns user information
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Missing authorization header',
        debug: {
          authHeader: authHeader,
          hasBearer: authHeader?.startsWith('Bearer '),
          expectedFormat: 'Bearer <jwt-token>'
        }
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');
    
    try {
      // Verify JWT token using our auth service
      const payload = authService.verifyToken(token);
      console.log('JWT payload:', { 
        userId: payload.userId, 
        email: payload.email,
        role: payload.role,
        provider: payload.provider,
        iss: payload.iss,
        aud: payload.aud,
        exp: payload.exp
      });
      
      // Get full user information
      const user = await authService.getUserById(payload.userId);
      
      if (!user) {
        return NextResponse.json({
          success: false,
          error: 'User not found in database',
          debug: {
            tokenValid: true,
            userId: payload.userId,
            userExists: false
          }
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          provider: user.provider,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        tokenInfo: {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          provider: payload.provider,
          issuer: payload.iss,
          audience: payload.aud,
          expiresAt: new Date(payload.exp * 1000).toISOString()
        },
        debug: {
          tokenValid: true,
          userFound: true,
          authSystem: 'JWT + OIDC',
          tokenType: 'access_token'
        }
      });
      
    } catch (tokenError) {
      console.error('Token verification error:', tokenError);
      
      // Check if it's an expired token
      const isExpired = (tokenError as Error).message.includes('expired');
      const isInvalid = (tokenError as Error).message.includes('invalid');
      
      return NextResponse.json({
        success: false,
        error: 'Token validation failed',
        debug: {
          tokenError: (tokenError as Error).message,
          isExpired,
          isInvalid,
          suggestion: isExpired 
            ? 'Token has expired, please refresh or re-authenticate'
            : 'Token is invalid, please re-authenticate'
        }
      }, { status: 401 });
    }
    
  } catch (error) {
    console.error('Debug auth error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      debug: {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    }, { status: 500 });
  }
}

/**
 * Test session-based authentication (using cookies)
 * POST /api/debug-auth - Tests session authentication from cookies
 */
export async function POST(request: NextRequest) {
  try {
    console.log('Testing session-based authentication...');
    
    // Try to get session from cookies
    const session = await SessionManager.getSession(request);
    
    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'No valid session found',
        debug: {
          hasAccessTokenCookie: !!request.cookies.get('access_token'),
          hasRefreshTokenCookie: !!request.cookies.get('refresh_token'),
          suggestion: 'Please log in through /api/auth/google or /api/auth/github'
        }
      }, { status: 401 });
    }
    
    console.log('Session found:', {
      userId: session.userId,
      email: session.email,
      role: session.role,
      provider: session.provider
    });
    
    // Get full user information
    const user = await authService.getUserById(session.userId);
    
    return NextResponse.json({
      success: true,
      session: {
        userId: session.userId,
        email: session.email,
        role: session.role,
        provider: session.provider
      },
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        provider: user.provider,
        created_at: user.created_at,
        updated_at: user.updated_at
      } : null,
      debug: {
        sessionValid: true,
        userFound: !!user,
        authSystem: 'JWT + OIDC (Cookie-based)',
        cookiesPresent: {
          access_token: !!request.cookies.get('access_token'),
          refresh_token: !!request.cookies.get('refresh_token')
        }
      }
    });
    
  } catch (error) {
    console.error('Session debug error:', error);
    
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json({
        success: false,
        error: 'Authentication required',
        debug: {
          sessionError: error.message,
          suggestion: 'Please log in through /api/auth/google or /api/auth/github'
        }
      }, { status: 401 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Session validation failed',
      debug: {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    }, { status: 500 });
  }
}
