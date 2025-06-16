'use client';

import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useAuth, withAuth } from '@/contexts/AuthContext';
import { UserProfile } from '@/components/auth/UserProfile';
import { UserInfo } from '@/components/auth/UserProfile';
import Link from 'next/link';

/**
 * Profile Page Component
 * Protected page that displays user profile information
 */
function ProfilePage() {
  const { user } = useAuth();

  return (
    <Container fluid className="min-vh-100 bg-light">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <Container>
          <Link className="navbar-brand fw-bold" href="/">
            澳門法律知識庫
          </Link>
          <div className="navbar-nav ms-auto">
            <UserInfo />
          </div>
        </Container>
      </nav>

      {/* Main Content */}
      <Container className="py-4">
        <Row>
          <Col>
            <div className="d-flex align-items-center mb-4">
              <Link href="/" className="btn btn-outline-secondary me-3">
                <i className="fas fa-arrow-left me-2"></i>
                返回首頁
              </Link>
              <h1 className="mb-0">個人資料</h1>
            </div>
          </Col>
        </Row>

        <Row>
          <Col lg={8} xl={6}>
            <UserProfile />
          </Col>
          <Col lg={4} xl={6}>
            {/* Additional profile sections can be added here */}
            <div className="mt-4 mt-lg-0">
              {/* Usage Statistics or Recent Activity could go here */}
            </div>
          </Col>
        </Row>
      </Container>
    </Container>
  );
}

// Export the component wrapped with authentication protection
export default withAuth(ProfilePage);
