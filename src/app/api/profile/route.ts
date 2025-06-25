import { NextRequest, NextResponse } from 'next/server';
import { SessionManager } from '@/lib/session';
import { getUserProfile } from '@/lib/database-new';

/**
 * Get user profile information
 * GET /api/profile - Returns user profile with credits and usage data
 */
export async function GET(request: NextRequest) {
  try {
    // Require valid session
    const session = await SessionManager.requireSession(request);
    
    // Get user profile from database
    const profile = await getUserProfile(session);
    
    // Return profile data
    return NextResponse.json({
      id: profile.id,
      email: profile.email,
      name: profile.name,
      avatar_url: profile.avatar_url,
      role: profile.role,
      provider: profile.provider,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      credits: {
        total_tokens: profile.total_tokens || 0,
        used_tokens: profile.used_tokens || 0,
        remaining_tokens: profile.remaining_tokens || 0,
        last_reset: profile.last_reset,
      }
    });
  } catch (error) {
    console.error('Profile API error:', error);
    
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { 
        error: 'Failed to get profile',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Update user profile information
 * PATCH /api/profile - Updates user profile data
 */
export async function PATCH(request: NextRequest) {
  try {
    // Require valid session
    const session = await SessionManager.requireSession(request);
    
    // Parse request body
    const updates = await request.json();
    
    // Validate allowed fields
    const allowedFields = ['name'];
    const filteredUpdates: Record<string, any> = {};
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }
    
    // Check if there are any valid updates
    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }
    
    // Import database connection
    const { db } = await import('@/lib/db');
    
    // Build update query
    const setClause = Object.keys(filteredUpdates)
      .map((field, index) => `${field} = $${index + 2}`)
      .join(', ');
    
    const values = [session.userId, ...Object.values(filteredUpdates)];
    
    // Update user profile
    const [updatedUser] = await db.query(
      `UPDATE users 
       SET ${setClause}, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, name, avatar_url, role, provider, created_at, updated_at`,
      values
    );
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Return updated profile
    return NextResponse.json({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      avatar_url: updatedUser.avatar_url,
      role: updatedUser.role,
      provider: updatedUser.provider,
      created_at: updatedUser.created_at,
      updated_at: updatedUser.updated_at,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Handle other errors
    return NextResponse.json(
      { 
        error: 'Failed to update profile',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}
