import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return Response.json({
        success: false,
        error: 'Missing authorization header',
        debug: {
          authHeader: authHeader,
          hasBearer: authHeader?.startsWith('Bearer ')
        }
      });
    }

    const token = authHeader.substring(7);
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 20) + '...');
    
    // Create a fresh Supabase client for token validation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'your_supabase_url';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your_supabase_anon_key';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test with fresh client
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    console.log('Supabase auth result:', { 
      user: user?.id, 
      error: error?.message,
      errorStatus: error?.status,
      errorName: error?.name
    });
    
    if (error) {
      return Response.json({
        success: false,
        error: 'Supabase auth error',
        debug: {
          supabaseError: error.message,
          errorCode: error.status,
          errorName: error.name,
          supabaseUrl: supabaseUrl,
          hasAnonKey: !!supabaseAnonKey
        }
      });
    }
    
    if (!user) {
      return Response.json({
        success: false,
        error: 'No user found',
        debug: {
          userExists: !!user
        }
      });
    }

    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      },
      debug: {
        tokenValid: true,
        userFound: true,
        supabaseUrl: supabaseUrl
      }
    });
    
  } catch (error) {
    console.error('Debug auth error:', error);
    return Response.json({
      success: false,
      error: 'Unexpected error',
      debug: {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
}
