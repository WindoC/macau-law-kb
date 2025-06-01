import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult.success || !authResult.user) {
      return Response.json({
        success: false,
        error: authResult.error || 'Authentication required'
      }, { status: 401 });
    }

    return Response.json({
      success: true,
      user: authResult.user
    });
  } catch (error) {
    console.error('Profile API error:', error);
    return Response.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
