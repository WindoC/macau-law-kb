import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/profile
 * Get user profile information including credits and usage statistics
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: '未授權訪問' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user profile from database
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
      return new Response(
        JSON.stringify({ error: '獲取用戶資料失敗' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // If no profile exists, create default profile
    if (!profile) {
      const defaultProfile = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'Unknown User',
        role: 'free',
        monthly_tokens: 1000,
        used_tokens: 0,
        avatar_url: user.user_metadata?.avatar_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert(defaultProfile)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating user profile:', insertError);
        // Return fallback data
        return new Response(
          JSON.stringify({
            profile: {
              id: user.id,
              email: user.email || 'unknown@example.com',
              name: user.user_metadata?.full_name || user.user_metadata?.name || 'Unknown User',
              role: 'free',
              avatar_url: user.user_metadata?.avatar_url,
              created_at: user.created_at || new Date().toISOString(),
            },
            credits: {
              total_tokens: 1000,
              used_tokens: 0,
              remaining_tokens: 1000,
              monthly_limit: 1000,
              reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            }
          }),
          { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          profile: {
            id: newProfile.id,
            email: newProfile.email,
            name: newProfile.name,
            role: newProfile.role,
            avatar_url: newProfile.avatar_url,
            created_at: newProfile.created_at,
          },
          credits: {
            total_tokens: newProfile.monthly_tokens,
            used_tokens: newProfile.used_tokens,
            remaining_tokens: newProfile.monthly_tokens - newProfile.used_tokens,
            monthly_limit: newProfile.monthly_tokens,
            reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }
        }),
        { 
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Return existing profile
    return new Response(
      JSON.stringify({
        profile: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
        },
        credits: {
          total_tokens: profile.monthly_tokens,
          used_tokens: profile.used_tokens,
          remaining_tokens: profile.monthly_tokens - profile.used_tokens,
          monthly_limit: profile.monthly_tokens,
          reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        }
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Profile API error:', error);
    return new Response(
      JSON.stringify({ error: '服務器錯誤' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
