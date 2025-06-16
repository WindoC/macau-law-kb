import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';

/**
 * Handle OAuth/OIDC authentication initiation
 * GET /api/auth/[provider] - Redirects to OAuth provider
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  
  try {
    
    // Validate provider
    if (!['google', 'github'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid provider. Supported providers: google, github' }, 
        { status: 400 }
      );
    }
    
    // Check if auth service is initialized
    if (!authService.isInitialized()) {
      return NextResponse.json(
        { error: 'Authentication service not initialized' }, 
        { status: 503 }
      );
    }
    
    // Generate secure state and nonce for OAuth flow
    const { state, nonce } = authService.generateAuthState();
    
    // Get authorization URL from the provider
    const authUrl = authService.getAuthUrl(provider, state, nonce);
    
    // Create redirect response
    const response = NextResponse.redirect(authUrl);
    
    // Set secure cookies for OAuth state validation
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
    
    // Set nonce cookie (for OIDC providers like Google)
    if (provider === 'google') {
      response.cookies.set('oauth_nonce', nonce, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
      });
    }
    
    return response;
  } catch (error) {
    console.error(`Auth initiation error:`, error);
    
    // Return error response
    return NextResponse.json(
      {
        error: 'Authentication initiation failed',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}