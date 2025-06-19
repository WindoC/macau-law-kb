import React from 'react';
import { Button } from 'react-bootstrap';
import CaptchaWidget from './CaptchaWidget';

interface LoginFormProps {
  loginLoading: boolean;
  captchaToken: string | null;
  handleLogin: (provider: 'google' | 'github') => void;
  handleCaptchaVerify: (token: string) => void;
  handleCaptchaError: () => void;
  handleCaptchaExpire: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  loginLoading,
  captchaToken,
  handleLogin,
  handleCaptchaVerify,
  handleCaptchaError,
  handleCaptchaExpire,
}) => (
  <>
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
  </>
);

export default LoginForm; 