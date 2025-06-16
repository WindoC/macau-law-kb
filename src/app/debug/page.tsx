'use client';

import { useState, useEffect } from 'react';
import Navigation from '@/components/Navigation';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  provider: string;
}

export default function DebugPage() {
  const [user, setUser] = useState<User | null>(null);
  const [debugResult, setDebugResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/profile', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const testDebugAPI = async () => {
    try {
      const response = await fetch('/api/debug-auth', {
        method: 'GET',
        credentials: 'include'
      });

      const result = await response.json();
      setDebugResult(result);
      console.log('Debug API result:', result);
    } catch (error) {
      console.error('Debug API error:', error);
      setDebugResult({ error: 'Failed to call debug API' });
    }
  };

  const signInWithGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  const signInWithGitHub = () => {
    window.location.href = '/api/auth/github';
  };

  const signOut = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        setUser(null);
        setDebugResult(null);
        window.location.href = '/';
      } else {
        console.error('Sign out failed');
      }
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
                <p><strong>Provider:</strong> {user?.provider || 'None'}</p>
                <p><strong>Name:</strong> {user?.name || 'None'}</p>
                
                <div className="mt-3">
                  {!user ? (
                    <div className="d-grid gap-2">
                      <button className="btn btn-primary" onClick={signInWithGoogle}>
                        Sign in with Google
                      </button>
                      <button className="btn btn-dark" onClick={signInWithGitHub}>
                        Sign in with GitHub
                      </button>
                    </div>
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
                  disabled={!user}
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
