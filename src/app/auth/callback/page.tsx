'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Container, Alert, Spinner } from 'react-bootstrap'

/**
 * Authentication callback page
 * This page is now handled by API routes, but kept for compatibility
 */
export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if user is already authenticated
        const response = await fetch('/api/profile', {
          credentials: 'include'
        })
        
        if (response.ok) {
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

    // Add a small delay to allow any ongoing authentication to complete
    const timer = setTimeout(handleAuthCallback, 1000)
    return () => clearTimeout(timer)
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
            <Link href="/" className="btn btn-primary">
              返回首頁
            </Link>
          </div>
        </Alert>
      </Container>
    )
  }

  return null
}
