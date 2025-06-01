'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Navigation from '@/components/Navigation';

export default function DebugPage() {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Current user:', user, 'Error:', userError);
      setUser(user);

      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', session, 'Error:', sessionError);
      setSession(session);

      if (session?.access_token) {
        setToken(session.access_token);
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testDebugAPI = async () => {
    if (!token) {
      alert('No token available');
      return;
    }

    try {
      const response = await fetch('/api/debug-auth', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();
      setDebugResult(result);
      console.log('Debug API result:', result);
    } catch (error) {
      console.error('Debug API error:', error);
      setDebugResult({ error: 'Failed to call debug API' });
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/debug`
        }
      });
      if (error) throw error;
    } catch (error) {
      console.error('Sign in error:', error);
      alert('Sign in failed: ' + (error as Error).message);
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      setToken(null);
      setDebugResult(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="container mt-4">
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p>Checking authentication...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="container mt-4">
        <h1>Authentication Debug</h1>
        
        <div className="row">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5>Authentication Status</h5>
              </div>
              <div className="card-body">
                <p><strong>User:</strong> {user ? `${user.email} (${user.id})` : 'Not logged in'}</p>
                <p><strong>Session:</strong> {session ? 'Active' : 'None'}</p>
                <p><strong>Token:</strong> {token ? `${token.substring(0, 20)}...` : 'None'}</p>
                
                <div className="mt-3">
                  {!user ? (
                    <button className="btn btn-primary" onClick={signInWithGoogle}>
                      Sign in with Google
                    </button>
                  ) : (
                    <button className="btn btn-danger" onClick={signOut}>
                      Sign out
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card">
              <div className="card-header">
                <h5>API Test</h5>
              </div>
              <div className="card-body">
                <button 
                  className="btn btn-success" 
                  onClick={testDebugAPI}
                  disabled={!token}
                >
                  Test Debug API
                </button>
                
                {debugResult && (
                  <div className="mt-3">
                    <h6>API Response:</h6>
                    <pre className="bg-light p-2 rounded">
                      {JSON.stringify(debugResult, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="row mt-4">
          <div className="col-12">
            <div className="card">
              <div className="card-header">
                <h5>Raw Data</h5>
              </div>
              <div className="card-body">
                <h6>User Object:</h6>
                <pre className="bg-light p-2 rounded">
                  {JSON.stringify(user, null, 2)}
                </pre>
                
                <h6 className="mt-3">Session Object:</h6>
                <pre className="bg-light p-2 rounded">
                  {JSON.stringify(session, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
