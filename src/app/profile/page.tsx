'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { getCurrentUser, logout } from '@/lib/auth-client';

interface User {
  id: string
  email: string
  name?: string
  avatar_url?: string
  provider: string
  role: string
  created_at: string
  credits: {
    remaining_tokens: number
    total_tokens: number
    used_tokens: number
  }
}

/**
 * 個人資料頁面組件
 * 顯示用戶信息、使用統計和帳戶管理
 */
export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleLogout = async () => {
    const success = await logout();
    if (success) {
      setUser(null)
      router.push('/auth/login')
    } else {
      console.error('Logout failed')
      alert('登出失敗，請稍後再試')
      router.push('/auth/error')
    }
  }

  const getRoleBadge = (role: string) => {
    const badges = {
      admin: 'badge bg-danger',
      free: 'badge bg-secondary',
      pay: 'badge bg-primary',
      vip: 'badge bg-warning text-dark',
    };
    return badges[role as keyof typeof badges] || 'badge bg-secondary';
  };

  const getRoleDescription = (role: string) => {
    const descriptions = {
      admin: '完全訪問所有功能和管理控制',
      free: '登記免費送 100,000 Token，可使用搜索和問答功能，如要使用諮詢請按頁底的"升級帳戶"',
      pay: '無限制訪問，按使用量付費',
      vip: '高級訪問，包含進階AI模型',
    };
    return descriptions[role as keyof typeof descriptions] || '未知角色';
  };

  if (loading) {
    return (
      <>
        <Navigation />
        <div className="container mt-4">
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">載入中...</span>
            </div>
            <p className="mt-2">載入個人資料...</p>
          </div>
        </div>
      </>
    );
  }

  // Function to handle opening the modal
  const handleOpenUpgradeModal = () => {
    setShowUpgradeModal(true);
  };

  // Function to handle closing the modal
  const handleCloseUpgradeModal = () => {
    setShowUpgradeModal(false);
  };

  return (
    <>
      <Navigation />
      <div className="container mt-4">
        <div className="row">
          <div className="col-12">
            <div className="d-flex align-items-center mb-4">
              <div className="bg-info text-white rounded-circle d-inline-flex align-items-center justify-content-center me-3" style={{width: '50px', height: '50px'}}>
                <i className="fas fa-user fa-lg"></i>
              </div>
              <div>
                <h1 className="mb-1">個人資料</h1>
                <p className="text-muted mb-0">管理您的帳戶信息和使用統計</p>
              </div>
            </div>

            {/* 用戶信息 */}
            <div className="card mb-4">
              <div className="card-header bg-info text-white">
                <h5 className="mb-0">
                  <i className="fas fa-id-card me-2"></i>
                  帳戶信息
                </h5>
              </div>
              <div className="card-body">
                {user && (
                  <div className="row">
                    <div className="col-md">
                      <div className="mb-3">
                        <label className="form-label">電子郵件</label>
                        <input 
                          type="email" 
                          className="form-control" 
                          value={user.email} 
                          readOnly 
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">姓名</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={user.name} 
                          readOnly 
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">帳戶類型</label>
                        <div>
                          <span className={getRoleBadge(user.role)}>
                            {user.role.toUpperCase()}
                          </span>
                          <p className="text-muted mt-1 mb-0">
                            {getRoleDescription(user.role)}
                          </p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">會員開始日期</label>
                        <p className="form-control-plaintext">
                          {new Date(user.created_at).toLocaleDateString('zh-TW')}
                        </p>
                      </div>
                    </div>
                    {/* <div className="col-md-4 text-center">
                      <div className="mb-3">
                        <img
                          src={user.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=0d6efd&color=fff&size=120`}
                          alt="個人頭像"
                          className="rounded-circle border"
                          width="120"
                          height="120"
                          style={{ objectFit: 'cover' }}
                        />
                      </div>
                      <button className="btn btn-outline-info btn-sm">
                        <i className="fas fa-camera me-1"></i>
                        更換頭像
                      </button>
                    </div> */}
                  </div>
                )}
              </div>
            </div>

            {/* 代幣使用情況 */}
            <div className="card mb-4">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">
                  <i className="fas fa-coins me-2"></i>
                  Token 使用情況
                </h5>
              </div>
              <div className="card-body">
                {user && user.credits && (
                  <div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <div className="text-center p-3 bg-primary text-white rounded">
                          <h4>{user.credits.remaining_tokens.toLocaleString()}</h4>
                          <small>剩餘Token</small>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="text-center p-3 bg-warning text-dark rounded">
                          <h4>{user.credits.used_tokens.toLocaleString()}</h4>
                          <small>已使用</small>
                        </div>
                      </div>
                      {/* <div className="col-md-4">
                        <div className="text-center p-3 bg-warning text-dark rounded">
                          <h4>{user.credits.monthly_limit?.toLocaleString()}</h4>
                          <small>免費Token</small>
                        </div>
                      </div> */}
                      {/* <div className="col-md-3">
                        <div className="text-center p-3 bg-warning text-dark rounded">
                          <h4>
                            {user.credits.monthly_limit ? Math.round((user.credits.used_tokens / user.credits.monthly_limit) * 100) : 0}%
                          </h4>
                          <small>使用率</small>
                        </div>
                      </div> */}
                    </div>

                    {/* <div className="mb-3">
                      <label className="form-label">使用進度</label>
                      <div className="progress" style={{ height: '20px' }}>
                        <div
                          className="progress-bar bg-success"
                          role="progressbar"
                          style={{ width: `${user.credits.monthly_limit ? (user.credits.used_tokens / user.credits.monthly_limit) * 100 : 0}%` }}
                          aria-valuenow={user.credits.used_tokens}
                          aria-valuemin={0}
                          aria-valuemax={user.credits.monthly_limit || 0}
                        >
                          {user.credits.monthly_limit ? Math.round((user.credits.used_tokens / user.credits.monthly_limit) * 100) : 0}%
                        </div>
                      </div>
                    </div> */}

                    {/* <div className="alert alert-info">
                      <i className="fas fa-calendar-alt me-2"></i>
                      <strong>下次重置:</strong> {user.credits.reset_date ? new Date(user.credits.reset_date).toLocaleDateString('zh-TW') : ''}
                    </div> */}
                  </div>
                )}
              </div>
            </div>

            {/* 功能訪問權限 */}
            <div className="card mb-4">
              <div className="card-header bg-warning text-dark">
                <h5 className="mb-0">
                  <i className="fas fa-key me-2"></i>
                  功能訪問權限
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4">
                    <div className="card border-success h-100">
                      <div className="card-body text-center">
                        <i className="fas fa-search fa-2x text-success mb-2"></i>
                        <h6 className="card-title">法律搜索</h6>
                        <span className="badge bg-success">可使用</span>
                        <p className="card-text mt-2 small">
                          搜索法律文件
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border-success h-100">
                      <div className="card-body text-center">
                        <i className="fas fa-question-circle fa-2x text-success mb-2"></i>
                        <h6 className="card-title">法律問答</h6>
                        <span className="badge bg-success">可使用</span>
                        <p className="card-text mt-2 small">
                          獲得AI驅動的法律答案
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className={`card h-100 ${user?.role === 'free' ? 'border-secondary' : 'border-success'}`}>
                      <div className="card-body text-center">
                        <i className={`fas fa-comments fa-2x mb-2 ${user?.role === 'free' ? 'text-secondary' : 'text-success'}`}></i>
                        <h6 className="card-title">法律諮詢</h6>
                        <span className={`badge ${user?.role === 'free' ? 'bg-secondary' : 'bg-success'}`}>
                          {user?.role === 'free' ? '需要升級' : '可使用'}
                        </span>
                        <p className="card-text mt-2 small">
                          與AI法律顧問對話
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 帳戶操作 */}
            <div className="card">
              <div className="card-header bg-secondary text-white">
                <h5 className="mb-0">
                  <i className="fas fa-cogs me-2"></i>
                  帳戶操作
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <button
                      className="btn btn-primary w-100 mb-2"
                      onClick={handleOpenUpgradeModal} // Open the modal instead of alert
                    >
                      <i className="fas fa-arrow-up me-1"></i>
                      升級帳戶
                    </button>
                    {/* <button className="btn btn-outline-secondary w-100 mb-2">
                      <i className="fas fa-history me-1"></i>
                      查看使用歷史
                    </button> */}
                  </div>
                  <div className="col-md-6">
                    {/* <button className="btn btn-outline-info w-100 mb-2">
                      <i className="fas fa-download me-1"></i>
                      下載資料
                    </button> */}
                    <button 
                      className="btn btn-outline-danger w-100 mb-2"
                      onClick={handleLogout}
                    >
                      <i className="fas fa-sign-out-alt me-1"></i>
                      登出
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade Account Modal */}
      {showUpgradeModal && (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">升級帳戶</h5>
                <button type="button" className="btn-close" onClick={handleCloseUpgradeModal}></button>
              </div>
              <div className="modal-body">
                <p>請聯絡我們以升級您的帳戶:</p>
                <a href="mailto:windo.ac@gmail.com">windo.ac@gmail.com</a>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseUpgradeModal}>
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
