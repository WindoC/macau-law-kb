import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { SessionManager } from '@/lib/session';

/**
 * Handle OAuth/OIDC authentication callback
 * GET /api/auth/callback/[provider] - Process OAuth callback and set session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const { provider } = params;
    const { searchParams } = new URL(request.url);
    
    // Validate provider
    if (!['google', 'github'].includes(provider)) {
      return NextResponse.redirect(new URL('/auth/error?error=invalid_provider', request.url));
    }
    
    // Extract OAuth parameters
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    // Handle OAuth errors
    if (error) {
      console.error(`OAuth error from ${provider}:`, error, errorDescription);
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(errorDescription || '')}`, request.url)
      );
    }
    
    // Validate required parameters
    if (!code || !state) {
      console.error('Missing required OAuth parameters:', { code: !!code, state: !!state });
      return NextResponse.redirect(new URL('/auth/error?error=missing_parameters', request.url));
    }
    
    // Retrieve and validate stored state
    const storedState = request.cookies.get('oauth_state')?.value;
    const storedNonce = request.cookies.get('oauth_nonce')?.value;
    
    if (!storedState || state !== storedState) {
      console.error('OAuth state mismatch:', { received: state, stored: storedState });
      return NextResponse.redirect(new URL('/auth/error?error=state_mismatch', request.url));
    }
    
    // Handle OIDC callback and get user tokens
    const tokens = await authService.handleOIDCCallback(
      provider, 
      code, 
      state, 
      provider === 'google' ? storedNonce : undefined
    );
    
    // Create successful redirect response
    const response = NextResponse.redirect(new URL('/', request.url));
    
    // Set authentication cookies
    SessionManager.setAuthCookies(response, tokens);
    
    // Clear OAuth state cookies
    response.cookies.delete('oauth_state');
    if (provider === 'google') {
      response.cookies.delete('oauth_nonce');
    }
    
    console.log(`Successful authentication for user ${tokens.user.email} via ${provider}`);
    
    return response;
  } catch (error) {
    console.error(`Auth callback error for provider ${params.provider}:`, error);
    
    // Determine error type and redirect accordingly
    const errorMessage = (error as Error).message;
    let errorCode = 'authentication_failed';
    
    if (errorMessage.includes('User not found')) {
      errorCode = 'user_not_found';
    } else if (errorMessage.includes('Invalid')) {
      errorCode = 'invalid_request';
    } else if (errorMessage.includes('Token')) {
      errorCode = 'token_error';
    }
    
    return NextResponse.redirect(
      new URL(`/auth/error?error=${errorCode}&provider=${params.provider}`, request.url)
    );
  }
}