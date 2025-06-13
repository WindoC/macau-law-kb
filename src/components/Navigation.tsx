'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation';

/**
 * Navigation component for authenticated users
 * Provides consistent header across all pages
 */
export default function Navigation() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      router.push('/');
      if (error) {
        console.error('Logout error:', error)
        alert('登出失敗，請稍後再試')
      }
    } catch (error) {
      console.error('Logout error:', error)
      alert('登出失敗，請稍後再試')
    }
  }

  if (loading) {
    return (
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand fw-bold" href="/">
            澳門法律知識庫
          </Link>
          <div className="navbar-nav ms-auto">
            <div className="spinner-border spinner-border-sm text-light" role="status">
              <span className="visually-hidden">載入中...</span>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  if (!user) {
    return (
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <Link className="navbar-brand fw-bold" href="/">
            澳門法律知識庫
          </Link>
          <div className="navbar-nav ms-auto">
            <Link className="nav-link" href="/">登入</Link>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container">
        <Link className="navbar-brand fw-bold" href="/">
          澳門法律知識庫
        </Link>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <a className="nav-link" href="/search">
                <i className="fas fa-search me-1"></i>法律搜索
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/qa">
                <i className="fas fa-question-circle me-1"></i>法律問答
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" href="/consultant">
                <i className="fas fa-comments me-1"></i>法律諮詢
              </a>
            </li>
          </ul>
          
          <div className="navbar-nav">
            <div className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
              >
                <i className="fas fa-user me-1"></i>
                {user.user_metadata?.name || user.email}
              </a>
              <ul className="dropdown-menu">
                <li><a className="dropdown-item" href="/profile">
                  <i className="fas fa-user-cog me-2"></i>個人資料
                </a></li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt me-2"></i>登出
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
