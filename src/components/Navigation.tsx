'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation';

interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  provider: string
  credits: {
    remaining_tokens: number
  }
}

interface NavigationProps {
  remainingTokens?: number;
}

/**
 * Navigation component for authenticated users
 * Provides consistent header across all pages
 */
export default function Navigation({ remainingTokens }: NavigationProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus()
  }, [])

  // 当remainingTokens更新时更新user状态
  useEffect(() => {
    if (remainingTokens !== undefined && user) {
      setUser({
        ...user,
        credits: {
          ...user.credits,
          remaining_tokens: remainingTokens
        }
      });
    }
  }, [remainingTokens]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/profile', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Auth check error:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      })
      
      if (response.ok) {
        setUser(null)
        router.push('/')
      } else {
        console.error('Logout failed')
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
                {user.name || user.email} ( 剩餘代幣: {user.credits.remaining_tokens.toLocaleString()} )
              </a>
              <ul className="dropdown-menu dropdown-menu-end">
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
