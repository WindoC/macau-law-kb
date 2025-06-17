'use client';

import React, { useState } from 'react';
import { Container, Row, Col, Card, Button, Alert, Modal } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';
import CaptchaWidget from '@/components/CaptchaWidget';
import { validateCaptchaToken, CAPTCHA_ERRORS } from '@/lib/captcha';
import LegalInformationSection from '@/components/LegalInformationSection';

/**
 * Login Form Component
 * Provides OAuth login options with CAPTCHA verification
 */
export function LoginForm() {
  const { login, loading } = useAuth();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLegalInfo, setShowLegalInfo] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);

  /**
   * Handle OAuth login with provider
   */
  const handleLogin = async (provider: 'google' | 'github') => {
    // Validate CAPTCHA token before login
    if (!validateCaptchaToken(captchaToken)) {
      setCaptchaError(CAPTCHA_ERRORS.MISSING_TOKEN);
      return;
    }

    setLoginLoading(true);
    setCaptchaError(null);

    try {
      // Use auth context login method
      login(provider);
    } catch (error) {
      console.error('Login error:', error);
      setCaptchaToken(null); // Reset CAPTCHA on error
      setLoginLoading(false);
      setCaptchaError('登入失敗，請稍後再試');
    }
  };

  /**
   * Handle CAPTCHA verification success
   */
  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setCaptchaError(null);
  };

  /**
   * Handle CAPTCHA verification error
   */
  const handleCaptchaError = () => {
    setCaptchaToken(null);
    setCaptchaError(CAPTCHA_ERRORS.VERIFICATION_FAILED);
  };

  /**
   * Handle CAPTCHA token expiration
   */
  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
    setCaptchaError(CAPTCHA_ERRORS.EXPIRED_TOKEN);
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">載入中...</span>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="min-vh-100 bg-light d-flex align-items-center">
      <Container>
        <Row className="justify-content-center">
          <Col md={6} lg={5} xl={4}>
            <Card className="shadow-lg border-0">
              <Card.Header className="bg-primary text-white text-center py-4">
                <h2 className="mb-0">登入澳門法律知識庫</h2>
                <p className="mb-0 mt-2 opacity-75">選擇您的登入方式</p>
              </Card.Header>
              
              <Card.Body className="p-4">
                {/* CAPTCHA Error Alert */}
                {captchaError && (
                  <Alert variant="warning" className="mb-3">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {captchaError}
                  </Alert>
                )}

                {/* CAPTCHA Widget */}
                <div className="mb-4">
                  <label className="form-label">人機驗證</label>
                  <CaptchaWidget
                    onVerify={handleCaptchaVerify}
                    onError={handleCaptchaError}
                    onExpire={handleCaptchaExpire}
                    disabled={loginLoading}
                  />
                </div>

                {/* Login Buttons */}
                <div className="d-grid gap-3">
                  <Button
                    variant="danger"
                    size="lg"
                    onClick={() => handleLogin('google')}
                    disabled={loginLoading || !captchaToken}
                    className="d-flex align-items-center justify-content-center"
                  >
                    {loginLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        登入中...
                      </>
                    ) : (
                      <>
                        <i className="fab fa-google me-2"></i>
                        使用 Google 登入
                      </>
                    )}
                  </Button>

                  <Button
                    variant="dark"
                    size="lg"
                    onClick={() => handleLogin('github')}
                    disabled={loginLoading || !captchaToken}
                    className="d-flex align-items-center justify-content-center"
                  >
                    {loginLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        登入中...
                      </>
                    ) : (
                      <>
                        <i className="fab fa-github me-2"></i>
                        使用 GitHub 登入
                      </>
                    )}
                  </Button>
                </div>

                {/* Help Text */}
                <div className="text-center mt-4">
                  <small className="text-muted">
                    登入即表示您同意我們的
                    <Button 
                      variant="link" 
                      className="text-decoration-none p-0 m-0 border-0" 
                      onClick={() => setShowLegalInfo(true)}
                    >
                      服務條款和隱私政策
                    </Button>
                  </small>
                  <div className="mt-2">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowContactModal(true)}
                      className="text-decoration-none"
                    >
                      <i className="fas fa-envelope me-1"></i>
                      聯繫客服
                    </Button>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Legal Information Modal */}
            <Modal 
              show={showLegalInfo} 
              onHide={() => setShowLegalInfo(false)}
              size="lg"
              centered
            >
              <Modal.Header closeButton>
                <Modal.Title>條款與聲明</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <LegalInformationSection />
              </Modal.Body>
            </Modal>

            {/* Contact Modal */}
            <Modal show={showContactModal} onHide={() => setShowContactModal(false)} centered>
              <Modal.Header closeButton>
                <Modal.Title>聯絡我們</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <p>請通過以下電子郵件地址聯繫我們：</p>
                <p className="text-primary">windo.ac@gmail.com</p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={() => setShowContactModal(false)}>
                  關閉
                </Button>
              </Modal.Footer>
            </Modal>

            {/* Features Preview */}
            <Card className="mt-4 border-0 shadow-sm">
              <Card.Body>
                <h5 className="text-center mb-3">登入後您可以使用</h5>
                <Row className="g-3 text-center">
                  <Col>
                    <div className="p-2">
                      <i className="fas fa-search text-primary fa-2x mb-2"></i>
                      <div className="small">法律搜索</div>
                    </div>
                  </Col>
                  <Col>
                    <div className="p-2">
                      <i className="fas fa-question-circle text-success fa-2x mb-2"></i>
                      <div className="small">法律問答</div>
                    </div>
                  </Col>
                  <Col>
                    <div className="p-2">
                      <i className="fas fa-comments text-warning fa-2x mb-2"></i>
                      <div className="small">法律諮詢</div>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Container>
  );
}

/**
 * Compact Login Form for embedding in other components
 */
export function CompactLoginForm() {
  const { login } = useAuth();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = async (provider: 'google' | 'github') => {
    if (!validateCaptchaToken(captchaToken)) {
      setCaptchaError(CAPTCHA_ERRORS.MISSING_TOKEN);
      return;
    }

    setLoginLoading(true);
    setCaptchaError(null);

    try {
      login(provider);
    } catch (error) {
      console.error('Login error:', error);
      setCaptchaToken(null);
      setLoginLoading(false);
      setCaptchaError('登入失敗，請稍後再試');
    }
  };

  const handleCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
    setCaptchaError(null);
  };

  const handleCaptchaError = () => {
    setCaptchaToken(null);
    setCaptchaError(CAPTCHA_ERRORS.VERIFICATION_FAILED);
  };

  const handleCaptchaExpire = () => {
    setCaptchaToken(null);
    setCaptchaError(CAPTCHA_ERRORS.EXPIRED_TOKEN);
  };

  return (
    <div>
      {captchaError && (
        <Alert variant="warning" className="mb-3">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {captchaError}
        </Alert>
      )}

      <div className="mb-3">
        <CaptchaWidget
          onVerify={handleCaptchaVerify}
          onError={handleCaptchaError}
          onExpire={handleCaptchaExpire}
          disabled={loginLoading}
        />
      </div>

      <div className="d-grid gap-2">
        <Button
          variant="outline-primary"
          onClick={() => handleLogin('google')}
          disabled={loginLoading || !captchaToken}
        >
          {loginLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              登入中...
            </>
          ) : (
            <>
              <i className="fab fa-google me-2"></i>
              Google 登入
            </>
          )}
        </Button>

        <Button
          variant="outline-dark"
          onClick={() => handleLogin('github')}
          disabled={loginLoading || !captchaToken}
        >
          {loginLoading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              登入中...
            </>
          ) : (
            <>
              <i className="fab fa-github me-2"></i>
              GitHub 登入
            </>
          )}
        </Button>
      </div>
    </div>
  );
}