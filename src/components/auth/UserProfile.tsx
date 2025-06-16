'use client';

import React, { useState } from 'react';
import { Card, Button, Badge, Row, Col, Alert, Modal, Form } from 'react-bootstrap';
import { useAuth } from '@/contexts/AuthContext';

/**
 * User Profile Component
 * Displays user information and account management options
 */
export function UserProfile() {
  const { user, logout, refreshProfile } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  if (!user) {
    return (
      <Alert variant="warning">
        <i className="fas fa-exclamation-triangle me-2"></i>
        請先登入以查看個人資料
      </Alert>
    );
  }

  /**
   * Handle user logout with confirmation
   */
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      alert('登出失敗，請稍後再試');
    }
    setShowLogoutModal(false);
  };

  /**
   * Handle profile update
   */
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);

    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: editName.trim() || null,
        }),
      });

      if (response.ok) {
        await refreshProfile();
        setShowEditModal(false);
        setEditError(null);
      } else {
        const errorData = await response.json();
        setEditError(errorData.error || '更新失敗');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setEditError('更新失敗，請稍後再試');
    } finally {
      setEditLoading(false);
    }
  };

  /**
   * Get role display name and variant
   */
  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'admin':
        return { name: '管理員', variant: 'danger' };
      case 'vip':
        return { name: 'VIP 用戶', variant: 'warning' };
      case 'pay':
        return { name: '付費用戶', variant: 'success' };
      case 'free':
        return { name: '免費用戶', variant: 'secondary' };
      default:
        return { name: role, variant: 'secondary' };
    }
  };

  /**
   * Get provider display info
   */
  const getProviderInfo = (provider: string) => {
    switch (provider) {
      case 'google':
        return { name: 'Google', icon: 'fab fa-google', color: 'text-danger' };
      case 'github':
        return { name: 'GitHub', icon: 'fab fa-github', color: 'text-dark' };
      case 'legacy':
        return { name: '舊版帳戶', icon: 'fas fa-user', color: 'text-muted' };
      default:
        return { name: provider, icon: 'fas fa-user', color: 'text-muted' };
    }
  };

  const roleInfo = getRoleInfo(user.role);
  const providerInfo = getProviderInfo(user.provider);

  return (
    <>
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white">
          <h4 className="mb-0">
            <i className="fas fa-user me-2"></i>
            個人資料
          </h4>
        </Card.Header>
        
        <Card.Body>
          <Row className="align-items-center mb-4">
            <Col md={3} className="text-center">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="用戶頭像"
                  className="rounded-circle"
                  style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                />
              ) : (
                <div
                  className="rounded-circle bg-secondary d-inline-flex align-items-center justify-content-center text-white"
                  style={{ width: '80px', height: '80px' }}
                >
                  <i className="fas fa-user fa-2x"></i>
                </div>
              )}
            </Col>
            <Col md={9}>
              <h5 className="mb-1">{user.name || '未設定姓名'}</h5>
              <p className="text-muted mb-2">{user.email}</p>
              <div className="d-flex gap-2 flex-wrap">
                <Badge bg={roleInfo.variant}>{roleInfo.name}</Badge>
                <Badge bg="light" text="dark">
                  <i className={`${providerInfo.icon} ${providerInfo.color} me-1`}></i>
                  {providerInfo.name}
                </Badge>
              </div>
            </Col>
          </Row>

          {/* Account Information */}
          <Row className="mb-4">
            <Col md={6}>
              <h6 className="text-muted mb-2">帳戶資訊</h6>
              <div className="small">
                <div className="mb-1">
                  <strong>註冊時間：</strong>
                  {new Date(user.created_at).toLocaleDateString('zh-TW')}
                </div>
                <div className="mb-1">
                  <strong>最後更新：</strong>
                  {new Date(user.updated_at).toLocaleDateString('zh-TW')}
                </div>
              </div>
            </Col>
            <Col md={6}>
              <h6 className="text-muted mb-2">代幣使用情況</h6>
              <div className="small">
                <div className="mb-1">
                  <strong>總代幣：</strong>
                  {user.credits.total_tokens.toLocaleString()}
                </div>
                <div className="mb-1">
                  <strong>已使用：</strong>
                  {user.credits.used_tokens.toLocaleString()}
                </div>
                <div className="mb-1">
                  <strong>剩餘：</strong>
                  <span className={user.credits.remaining_tokens < 100 ? 'text-danger' : 'text-success'}>
                    {user.credits.remaining_tokens.toLocaleString()}
                  </span>
                </div>
              </div>
            </Col>
          </Row>

          {/* Token Usage Progress */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="small text-muted">代幣使用進度</span>
              <span className="small text-muted">
                {((user.credits.used_tokens / user.credits.total_tokens) * 100).toFixed(1)}%
              </span>
            </div>
            <div className="progress" style={{ height: '8px' }}>
              <div
                className={`progress-bar ${
                  user.credits.remaining_tokens < 100 ? 'bg-danger' : 
                  user.credits.remaining_tokens < 500 ? 'bg-warning' : 'bg-success'
                }`}
                role="progressbar"
                style={{ width: `${(user.credits.used_tokens / user.credits.total_tokens) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="d-flex gap-2 flex-wrap">
            <Button
              variant="outline-primary"
              onClick={() => {
                setEditName(user.name || '');
                setShowEditModal(true);
              }}
            >
              <i className="fas fa-edit me-2"></i>
              編輯資料
            </Button>
            <Button
              variant="outline-secondary"
              onClick={() => refreshProfile()}
            >
              <i className="fas fa-sync-alt me-2"></i>
              重新整理
            </Button>
            <Button
              variant="outline-danger"
              onClick={() => setShowLogoutModal(true)}
            >
              <i className="fas fa-sign-out-alt me-2"></i>
              登出
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Logout Confirmation Modal */}
      <Modal show={showLogoutModal} onHide={() => setShowLogoutModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>確認登出</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>您確定要登出嗎？</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLogoutModal(false)}>
            取消
          </Button>
          <Button variant="danger" onClick={handleLogout}>
            確認登出
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>編輯個人資料</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateProfile}>
          <Modal.Body>
            {editError && (
              <Alert variant="danger">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {editError}
              </Alert>
            )}
            
            <Form.Group className="mb-3">
              <Form.Label>姓名</Form.Label>
              <Form.Control
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="請輸入您的姓名"
                disabled={editLoading}
              />
              <Form.Text className="text-muted">
                此名稱將顯示在您的個人資料中
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>電子郵件</Form.Label>
              <Form.Control
                type="email"
                value={user.email}
                disabled
                readOnly
              />
              <Form.Text className="text-muted">
                電子郵件無法修改
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => setShowEditModal(false)}
              disabled={editLoading}
            >
              取消
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={editLoading}
            >
              {editLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  更新中...
                </>
              ) : (
                '儲存變更'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}

/**
 * Compact User Info Component for navigation bars
 */
export function UserInfo() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      alert('登出失敗，請稍後再試');
    }
  };

  return (
    <div className="dropdown">
      <button
        className="btn btn-link nav-link dropdown-toggle text-decoration-none"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt="用戶頭像"
            className="rounded-circle me-2"
            style={{ width: '24px', height: '24px', objectFit: 'cover' }}
          />
        ) : (
          <i className="fas fa-user me-2"></i>
        )}
        {user.name || user.email}
      </button>
      <ul className="dropdown-menu dropdown-menu-end">
        <li>
          <a className="dropdown-item" href="/profile">
            <i className="fas fa-user me-2"></i>
            個人資料
          </a>
        </li>
        <li>
          <span className="dropdown-item-text small text-muted">
            剩餘代幣: {user.credits.remaining_tokens.toLocaleString()}
          </span>
        </li>
        <li><hr className="dropdown-divider" /></li>
        <li>
          <button className="dropdown-item" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt me-2"></i>
            登出
          </button>
        </li>
      </ul>
    </div>
  );
}