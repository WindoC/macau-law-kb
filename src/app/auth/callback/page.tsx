'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Container, Alert, Spinner } from 'react-bootstrap'
import { supabase } from '@/lib/supabase'

/**
 * Authentication callback page
 * Handles OAuth callback from Google/GitHub and redirects user
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Auth callback error:', error)
          setError('認證失敗，請重新嘗試登入')
          setLoading(false)
          return
        }

        if (data.session) {
          // User is authenticated, redirect to dashboard
          router.push('/')
        } else {
          // No session found, redirect to login
          setError('未找到有效的認證會話')
          setLoading(false)
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err)
        setError('發生未預期的錯誤')
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router])

  if (loading) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" variant="primary" className="mb-3" />
        <h4>正在處理認證...</h4>
        <p className="text-muted">請稍候，我們正在驗證您的身份</p>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="d-flex flex-column justify-content-center align-items-center min-vh-100">
        <Alert variant="danger" className="text-center">
          <Alert.Heading>認證失敗</Alert.Heading>
          <p>{error}</p>
          <hr />
          <div className="d-flex justify-content-center">
            <a href="/" className="btn btn-primary">
              返回首頁
            </a>
          </div>
        </Alert>
      </Container>
    )
  }

  return null
}
