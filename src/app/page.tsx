'use client'

import { useEffect, useState } from 'react'
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

/**
 * Main landing page component
 * Shows different content based on authentication status
 */
export default function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">載入中...</span>
        </div>
      </Container>
    )
  }

  if (!user) {
    return <LandingPage />
  }

  return <DashboardPage user={user} />
}

/**
 * Landing page for unauthenticated users
 */
function LandingPage() {
  const handleLogin = async (provider: 'google' | 'github') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/auth/callback`
        }
      })
      
      if (error) {
        console.error('Login error:', error)
        alert('登入失敗，請稍後再試')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('登入失敗，請稍後再試')
    }
  }

  return (
    <Container fluid className="min-vh-100 bg-light">
      {/* Hero Section */}
      <section className="bg-primary text-white py-5">
        <Container>
          <Row className="align-items-center min-vh-100">
            <Col lg={6}>
              <h1 className="display-4 fw-bold mb-4">
                澳門法律知識庫
              </h1>
              <p className="lead mb-4">
                運用人工智能技術，為您提供專業的澳門法律搜索、問答和諮詢服務
              </p>
              <div className="d-grid gap-2 d-md-flex">
                <Button
                  variant="light"
                  size="lg"
                  onClick={() => handleLogin('google')}
                  className="me-md-2"
                >
                  <i className="fab fa-google me-2"></i>
                  使用 Google 登入
                </Button>
                <Button
                  variant="outline-light"
                  size="lg"
                  onClick={() => handleLogin('github')}
                >
                  <i className="fab fa-github me-2"></i>
                  使用 GitHub 登入
                </Button>
              </div>
            </Col>
            <Col lg={6} className="text-center">
              <div className="bg-white rounded-3 p-4 shadow">
                <h3 className="text-dark mb-3">主要功能</h3>
                <div className="row g-3">
                  <div className="col-12">
                    <div className="border rounded p-3">
                      <h5 className="text-primary">法律搜索</h5>
                      <p className="text-muted small mb-0">
                        智能分析查詢內容，快速找到相關法律條文
                      </p>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="border rounded p-3">
                      <h5 className="text-success">法律問答</h5>
                      <p className="text-muted small mb-0">
                        基於法律文件提供專業、人性化的答案
                      </p>
                    </div>
                  </div>
                  <div className="col-12">
                    <div className="border rounded p-3">
                      <h5 className="text-warning">法律諮詢</h5>
                      <p className="text-muted small mb-0">
                        與AI法律顧問對話，獲得深入的法律建議
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Features Section */}
      <section className="py-5">
        <Container>
          <Row className="text-center mb-5">
            <Col>
              <h2 className="fw-bold">為什麼選擇我們？</h2>
              <p className="text-muted">專業、準確、便捷的澳門法律服務</p>
            </Col>
          </Row>
          <Row className="g-4">
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="text-center">
                  <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '60px', height: '60px'}}>
                    <i className="fas fa-search fa-lg"></i>
                  </div>
                  <h5>智能搜索</h5>
                  <p className="text-muted">
                    運用先進的向量搜索技術，精確匹配相關法律條文
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="text-center">
                  <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '60px', height: '60px'}}>
                    <i className="fas fa-robot fa-lg"></i>
                  </div>
                  <h5>AI 驅動</h5>
                  <p className="text-muted">
                    採用最新的 Gemini AI 模型，提供專業準確的法律分析
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card className="h-100 border-0 shadow-sm">
                <Card.Body className="text-center">
                  <div className="bg-warning text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '60px', height: '60px'}}>
                    <i className="fas fa-shield-alt fa-lg"></i>
                  </div>
                  <h5>安全可靠</h5>
                  <p className="text-muted">
                    嚴格的安全措施保護您的隱私和數據安全
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>
    </Container>
  )
}

/**
 * Dashboard page for authenticated users
 */
function DashboardPage({ user }: { user: User }) {
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Logout error:', error)
        alert('登出失敗，請稍後再試')
      }
    } catch (error) {
      console.error('Logout error:', error)
      alert('登出失敗，請稍後再試')
    }
  }

  return (
    <Container fluid>
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <Container>
          <a className="navbar-brand fw-bold" href="/">
            澳門法律知識庫
          </a>
          <div className="navbar-nav ms-auto">
            <div className="nav-item dropdown">
              <a
                className="nav-link dropdown-toggle"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
              >
                {user.user_metadata?.name || user.email}
              </a>
              <ul className="dropdown-menu">
                <li><a className="dropdown-item" href="/profile">個人資料</a></li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item" onClick={handleLogout}>
                    登出
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </nav>

      {/* Main Content */}
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <h1>歡迎回來，{user.user_metadata?.name || '用戶'}</h1>
            <p className="text-muted">選擇您需要的法律服務</p>
          </Col>
        </Row>

        <Row className="g-4">
          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm hover-shadow">
              <Card.Body className="text-center">
                <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '80px', height: '80px'}}>
                  <i className="fas fa-search fa-2x"></i>
                </div>
                <h4>法律搜索</h4>
                <p className="text-muted mb-4">
                  快速搜索相關法律條文和文件
                </p>
                <Button variant="primary" href="/search" className="w-100">
                  開始搜索
                </Button>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm hover-shadow">
              <Card.Body className="text-center">
                <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '80px', height: '80px'}}>
                  <i className="fas fa-question-circle fa-2x"></i>
                </div>
                <h4>法律問答</h4>
                <p className="text-muted mb-4">
                  獲得基於法律文件的專業答案
                </p>
                <Button variant="success" href="/qa" className="w-100">
                  提出問題
                </Button>
              </Card.Body>
            </Card>
          </Col>

          <Col md={4}>
            <Card className="h-100 border-0 shadow-sm hover-shadow">
              <Card.Body className="text-center">
                <div className="bg-warning text-white rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{width: '80px', height: '80px'}}>
                  <i className="fas fa-comments fa-2x"></i>
                </div>
                <h4>法律諮詢</h4>
                <p className="text-muted mb-4">
                  與AI法律顧問進行深入對話
                </p>
                <Button variant="warning" href="/consultant" className="w-100">
                  開始諮詢
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Recent Activity */}
        <Row className="mt-5">
          <Col>
            <h3>最近活動</h3>
            <Alert variant="info">
              <i className="fas fa-info-circle me-2"></i>
              您的搜索歷史和對話記錄將在這裡顯示
            </Alert>
          </Col>
        </Row>
      </Container>
    </Container>
  )
}
