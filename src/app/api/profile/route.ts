import { NextRequest } from 'next/server';
import { 
  authenticateRequest, 
  createErrorResponse, 
  createSuccessResponse,
  validateMethod
} from '@/lib/auth';
import { getUserProfile } from '@/lib/database';
import { supabase } from '@/lib/supabase';

/**
 * User Profile API endpoint
 * Handles user profile retrieval and updates
 */
export async function GET(request: NextRequest) {
  try {
    // Validate request method
    if (!validateMethod(request, ['GET'])) {
      return createErrorResponse('Method not allowed', 405);
    }

    // Authenticate user
    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    try {
      // Get user profile from database
      const profile = await getUserProfile(user.id);

      // Format response
      const response = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        monthly_tokens: profile.monthly_tokens,
        used_tokens: profile.used_tokens,
        remaining_tokens: profile.monthly_tokens - profile.used_tokens,
        created_at: profile.created_at,
        last_login: profile.last_login,
        subscription_status: profile.subscription_status,
        subscription_expires: profile.subscription_expires
      };

      return createSuccessResponse(response);

    } catch (dbError) {
      console.error('Database error:', dbError);
      return createErrorResponse('Failed to retrieve user profile', 500);
    }

  } catch (error) {
    console.error('Profile API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * Update user profile (admin only for role changes)
 */
export async function PUT(request: NextRequest) {
  try {
    // Validate request method
    if (!validateMethod(request, ['PUT'])) {
      return createErrorResponse('Method not allowed', 405);
    }

    // Authenticate user
    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Parse request body
    const body = await request.json();
    const { role, monthly_tokens, used_tokens } = body;

    // Only admin can update user profiles
    if (user.role !== 'admin') {
      return createErrorResponse('Access denied - Admin only', 403);
    }

    // Get target user ID from query parameters
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId') || user.id;

    try {
      // Update user profile
      const updateData: any = {};
      
      if (role && ['admin', 'free', 'pay', 'vip'].includes(role)) {
        updateData.role = role;
      }
      
      if (typeof monthly_tokens === 'number' && monthly_tokens >= 0) {
        updateData.monthly_tokens = monthly_tokens;
      }
      
      if (typeof used_tokens === 'number' && used_tokens >= 0) {
        updateData.used_tokens = used_tokens;
      }

      if (Object.keys(updateData).length === 0) {
        return createErrorResponse('No valid fields to update');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', targetUserId)
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        return createErrorResponse('Failed to update user profile', 500);
      }

      return createSuccessResponse({
        message: 'User profile updated successfully',
        profile: data
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return createErrorResponse('Failed to update user profile', 500);
    }

  } catch (error) {
    console.error('Profile update API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * Get user usage statistics
 */
export async function POST(request: NextRequest) {
  try {
    // Validate request method
    if (!validateMethod(request, ['POST'])) {
      return createErrorResponse('Method not allowed', 405);
    }

    // Authenticate user
    const user = await authenticateRequest(request);
    if (!user) {
      return createErrorResponse('Unauthorized', 401);
    }

    // Parse request body
    const body = await request.json();
    const { action } = body;

    if (action !== 'get_usage_stats') {
      return createErrorResponse('Invalid action');
    }

    try {
      // Get usage statistics from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: usageStats, error } = await supabase
        .from('api_usage_logs')
        .select('action, tokens_used, created_at')
        .eq('user_id', user.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        return createErrorResponse('Failed to fetch usage statistics', 500);
      }

      // Calculate statistics
      const stats = {
        total_tokens_used: usageStats?.reduce((sum, log) => sum + log.tokens_used, 0) || 0,
        search_count: usageStats?.filter(log => log.action === 'search').length || 0,
        qa_count: usageStats?.filter(log => log.action === 'qa').length || 0,
        consultant_count: usageStats?.filter(log => log.action === 'consultant').length || 0,
        daily_usage: {} as Record<string, { tokens: number; requests: number }>
      };

      // Group by day
      usageStats?.forEach(log => {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        if (!stats.daily_usage[date]) {
          stats.daily_usage[date] = { tokens: 0, requests: 0 };
        }
        stats.daily_usage[date].tokens += log.tokens_used;
        stats.daily_usage[date].requests += 1;
      });

      return createSuccessResponse({
        usage_stats: stats,
        current_period: {
          monthly_tokens: user.monthly_tokens,
          used_tokens: user.used_tokens,
          remaining_tokens: user.monthly_tokens - user.used_tokens
        }
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return createErrorResponse('Failed to fetch usage statistics', 500);
    }

  } catch (error) {
    console.error('Usage stats API error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
