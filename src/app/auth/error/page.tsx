'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Container, Row, Col, Card, Button, Alert, Modal } from 'react-bootstrap';
import Link from 'next/link';

/**
 * Authentication Error Page
 * Displays authentication errors with appropriate messages and actions
 */
function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const description = searchParams.get('description');
  const provider = searchParams.get('provider');
  const [showContactModal, setShowContactModal] = useState(false);

  /**
   * Get error message and details based on error code
   */
  const getErrorInfo = (errorCode: string | null) => {
    switch (errorCode) {
      case 'invalid_provider':
        return {
          title: '不支援的登入方式',
          message: '您選擇的登入方式目前不受支援。',
          suggestion: '請使用 Google 或 GitHub 登入。',
          variant: 'warning' as const,
        };
      case 'missing_parameters':
        return {
          title: '登入參數錯誤',
          message: '登入過程中缺少必要的參數。',
          suggestion: '請重新嘗試登入。',
          variant: 'warning' as const,
        };
      case 'state_mismatch':
        return {
          title: '安全驗證失敗',
          message: '登入過程中的安全驗證失敗。',
          suggestion: '這可能是由於網路問題或安全設定造成的，請重新嘗試登入。',
          variant: 'danger' as const,
        };
      case 'authentication_failed':
        return {
          title: '登入失敗',
          message: '無法完成登入程序。',
          suggestion: '請檢查您的帳戶狀態或稍後再試。',
          variant: 'danger' as const,
        };
      case 'user_not_found':
        return {
          title: '用戶不存在',
          message: '找不到對應的用戶帳戶。',
          suggestion: '請確認您使用的是正確的帳戶，或聯繫客服協助。',
          variant: 'warning' as const,
        };
      case 'invalid_request':
        return {
          title: '請求無效',
          message: '登入請求格式不正確。',
          suggestion: '請重新嘗試登入，如果問題持續發生請聯繫客服。',
          variant: 'warning' as const,
        };
      case 'token_error':
        return {
          title: '認證令牌錯誤',
          message: '登入認證過程中發生錯誤。',
          suggestion: '請清除瀏覽器快取後重新嘗試登入。',
          variant: 'danger' as const,
        };
      default:
        return {
          title: '登入錯誤',
          message: '登入過程中發生未知錯誤。',
          suggestion: '請稍後再試，如果問題持續發生請聯繫客服。',
          variant: 'danger' as const,
        };
    }
  };

  const errorInfo = getErrorInfo(error);

  return (
    <Container fluid className="min-vh-100 bg-light d-flex align-items-center">
      <Container>
        <Row className="justify-content-center">
          <Col md={8} lg={6} xl={5}>
            <Card className="shadow-lg border-0">
              <Card.Header className="bg-danger text-white text-center py-4">
                <h2 className="mb-0">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  登入失敗
                </h2>
              </Card.Header>
              
              <Card.Body className="p-4">
                <Alert variant={errorInfo.variant} className="mb-4">
                  <Alert.Heading className="h5">
                    <i className="fas fa-info-circle me-2"></i>
                    {errorInfo.title}
                  </Alert.Heading>
                  <p className="mb-2">{errorInfo.message}</p>
                  <p className="mb-0 small">{errorInfo.suggestion}</p>
                </Alert>

                {/* Error Details */}
                {(description || provider) && (
                  <Card className="bg-light mb-4">
                    <Card.Body className="py-3">
                      <h6 className="text-muted mb-2">錯誤詳情</h6>
                      {provider && (
                        <div className="small mb-1">
                          <strong>登入方式：</strong> {provider}
                        </div>
                      )}
                      {description && (
                        <div className="small mb-1">
                          <strong>詳細說明：</strong> {decodeURIComponent(description)}
                        </div>
                      )}
                      {error && (
                        <div className="small text-muted">
                          <strong>錯誤代碼：</strong> {error}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="d-grid gap-2">
                  <Link href="/auth/login" className="btn btn-primary btn-lg">
                    <i className="fas fa-redo me-2"></i>
                    重新登入
                  </Link>
                  
                  <Link href="/" className="btn btn-outline-secondary">
                    <i className="fas fa-home me-2"></i>
                    返回首頁
                  </Link>
                </div>

                {/* Help Section */}
                <div className="text-center mt-4 pt-3 border-top">
                  <h6 className="text-muted mb-2">需要協助？</h6>
                  <div className="small">
                    <p className="mb-2">如果您持續遇到登入問題，請嘗試以下解決方案：</p>
                    <ul className="list-unstyled text-start">
                      <li className="mb-1">
                        <i className="fas fa-check text-success me-2"></i>
                        清除瀏覽器快取和 Cookie
                      </li>
                      <li className="mb-1">
                        <i className="fas fa-check text-success me-2"></i>
                        確認您的網路連線正常
                      </li>
                      <li className="mb-1">
                        <i className="fas fa-check text-success me-2"></i>
                        嘗試使用不同的瀏覽器
                      </li>
                      <li className="mb-1">
                        <i className="fas fa-check text-success me-2"></i>
                        檢查是否有廣告攔截器干擾
                      </li>
                    </ul>
                  </div>
                  
                  <div className="mt-3">
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
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </Container>
  );
}

// 主页面组件
export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <Container fluid className="min-vh-100 bg-light d-flex align-items-center">
        <Container>
          <Row className="justify-content-center">
            <Col md={8} lg={6} xl={5}>
              <Card className="shadow-lg border-0">
                <Card.Body className="p-4 text-center">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">載入中...</span>
                  </div>
                  <p className="mt-3">正在載入錯誤信息...</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </Container>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}