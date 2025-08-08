'use client';

// import { Turnstile } from '@marsidev/react-turnstile'; // REMOVED: CAPTCHA functionality disabled
import { useState } from 'react';

interface CaptchaWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Reusable Cloudflare Turnstile CAPTCHA widget component
 * Provides consistent CAPTCHA functionality across the application
 */
export default function CaptchaWidget({ 
  onVerify, 
  onError, 
  onExpire, 
  className = '',
  disabled = false 
}: CaptchaWidgetProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const siteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    return (
      <div className={`alert alert-danger ${className}`}>
        <i className="fas fa-exclamation-circle me-2"></i>
        CAPTCHA 配置錯誤，請聯繫管理員
      </div>
    );
  }

  const handleVerify = (token: string) => {
    setIsLoading(false);
    setError(null);
    onVerify(token);
  };

  const handleError = () => {
    setIsLoading(false);
    setError('人機驗證失敗，請重試');
    onError?.();
  };

  const handleExpire = () => {
    setError('人機驗證已過期，請重新驗證');
    onExpire?.();
  };

  const handleBeforeInteractive = () => {
    setIsLoading(true);
    setError(null);
  };

  return (
    <div className={`captcha-widget ${className}`}>
      {error && (
        <div className="alert alert-warning mb-2">
          <i className="fas fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}
      
      <div className="d-flex align-items-center">
        {/* CAPTCHA DISABLED - Turnstile component removed */}
        <div className="alert alert-info">
          <i className="fas fa-info-circle me-2"></i>
          CAPTCHA功能已停用
        </div>
        {/* <Turnstile
          siteKey={siteKey}
          onSuccess={handleVerify}
          onError={handleError}
          onExpire={handleExpire}
          onBeforeInteractive={handleBeforeInteractive}
          options={{
            theme: 'light',
            size: 'normal',
            language: 'zh-TW',
          }}
          style={{
            opacity: disabled ? 0.5 : 1,
            pointerEvents: disabled ? 'none' : 'auto',
          }}
        /> */}
        
        {isLoading && (
          <div className="ms-2">
            <div className="spinner-border spinner-border-sm text-primary" role="status">
              <span className="visually-hidden">載入中...</span>
            </div>
          </div>
        )}
      </div>
      
      <small className="text-muted mt-1 d-block">
        <i className="fas fa-shield-alt me-1"></i>
        此網站受 Cloudflare 保護
      </small>
    </div>
  );
}