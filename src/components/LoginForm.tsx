import React from 'react';
import { Button } from 'react-bootstrap';

interface LoginFormProps {
  loginLoading: boolean;
  handleLogin: (provider: 'google' | 'github') => void;
}

const LoginForm: React.FC<LoginFormProps> = ({
  loginLoading,
  handleLogin,
}) => (
  <>
    <div className="d-grid gap-3">
      <Button
        variant="danger"
        size="lg"
        onClick={() => handleLogin('google')}
        disabled={loginLoading}
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
        disabled={loginLoading}
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
  </>
);

export default LoginForm; 