import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * POST /api/auth/logout
 * Log out the current user
 */
export async function POST(request: NextRequest) {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error);
      return new Response(
        JSON.stringify({ error: '登出失敗' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ message: '成功登出' }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Logout API error:', error);
    return new Response(
      JSON.stringify({ error: '服務器錯誤' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
