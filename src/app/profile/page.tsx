'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { getCurrentUser, getSessionToken } from '@/lib/auth-client';
import { supabase } from '@/lib/supabase'

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'free' | 'pay' | 'vip';
  avatar_url?: string;
  created_at: string;
}

interface UserCredits {
  total_tokens: number;
  used_tokens: number;
  remaining_tokens: number;
  monthly_limit: number;
  reset_date: string;
}

/**
 * 個人資料頁面組件
 * 顯示用戶信息、使用統計和帳戶管理
 */
export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      
      if (!user) {
        router.push('/');
        return;
      }

      // Get session token for API request
      const token = getSessionToken();
      if (!token) {
        throw new Error('No session token found');
      }

      // Load user profile
      const profileResponse = await fetch('/api/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.success && profileData.user) {
          setProfile({
            id: profileData.user.id,
            email: profileData.user.email,
            name: profileData.user.name || 'Unknown User',
            role: profileData.user.role,
            avatar_url: profileData.user.avatar_url,
            created_at: profileData.user.created_at,
          });
          setCredits({
            total_tokens: profileData.user.total_tokens || 1000,
            used_tokens: profileData.user.used_tokens || 0,
            remaining_tokens: profileData.user.remaining_tokens || 1000,
            monthly_limit: profileData.user.total_tokens || 1000,
            reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          });
        }
      } else {
        // Fallback to user data from auth
        setProfile({
          id: user.id,
          email: user.email || 'unknown@example.com',
          name: user.user_metadata?.full_name || user.user_metadata?.name || 'Unknown User',
          role: 'free', // Default role
          avatar_url: user.user_metadata?.avatar_url,
          created_at: user.created_at || new Date().toISOString(),
        });

        // Default credits for new users
        setCredits({
          total_tokens: 1000,
          used_tokens: 0,
          remaining_tokens: 1000,
          monthly_limit: 1000,
          reset_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    } catch (error) {
      console.error('載入用戶資料錯誤:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut()
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
                {profile && (
                  <div className="row">
                    <div className="col-md">
                      <div className="mb-3">
                        <label className="form-label">電子郵件</label>
                        <input 
                          type="email" 
                          className="form-control" 
                          value={profile.email} 
                          readOnly 
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">姓名</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          value={profile.name} 
                          readOnly 
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">帳戶類型</label>
                        <div>
                          <span className={getRoleBadge(profile.role)}>
                            {profile.role.toUpperCase()}
                          </span>
                          <p className="text-muted mt-1 mb-0">
                            {getRoleDescription(profile.role)}
                          </p>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">會員開始日期</label>
                        <p className="form-control-plaintext">
                          {new Date(profile.created_at).toLocaleDateString('zh-TW')}
                        </p>
                      </div>
                    </div>
                    {/* <div className="col-md-4 text-center">
                      <div className="mb-3">
                        <img
                          src={profile.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=0d6efd&color=fff&size=120`}
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
                {credits && (
                  <div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <div className="text-center p-3 bg-primary text-white rounded">
                          <h4>{credits.remaining_tokens.toLocaleString()}</h4>
                          <small>剩餘Token</small>
                        </div>
                      </div>
                      <div className="col-md-6">
                        <div className="text-center p-3 bg-warning text-dark rounded">
                          <h4>{credits.used_tokens.toLocaleString()}</h4>
                          <small>已使用</small>
                        </div>
                      </div>
                      {/* <div className="col-md-4">
                        <div className="text-center p-3 bg-warning text-dark rounded">
                          <h4>{credits.monthly_limit.toLocaleString()}</h4>
                          <small>免費Token</small>
                        </div>
                      </div> */}
                      {/* <div className="col-md-3">
                        <div className="text-center p-3 bg-warning text-dark rounded">
                          <h4>
                            {Math.round((credits.used_tokens / credits.monthly_limit) * 100)}%
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
                          style={{ width: `${(credits.used_tokens / credits.monthly_limit) * 100}%` }}
                          aria-valuenow={credits.used_tokens}
                          aria-valuemin={0}
                          aria-valuemax={credits.monthly_limit}
                        >
                          {Math.round((credits.used_tokens / credits.monthly_limit) * 100)}%
                        </div>
                      </div>
                    </div> */}

                    {/* <div className="alert alert-info">
                      <i className="fas fa-calendar-alt me-2"></i>
                      <strong>下次重置:</strong> {new Date(credits.reset_date).toLocaleDateString('zh-TW')}
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
                    <div className={`card h-100 ${profile?.role === 'free' ? 'border-secondary' : 'border-success'}`}>
                      <div className="card-body text-center">
                        <i className={`fas fa-comments fa-2x mb-2 ${profile?.role === 'free' ? 'text-secondary' : 'text-success'}`}></i>
                        <h6 className="card-title">法律諮詢</h6>
                        <span className={`badge ${profile?.role === 'free' ? 'bg-secondary' : 'bg-success'}`}>
                          {profile?.role === 'free' ? '需要升級' : '可使用'}
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
