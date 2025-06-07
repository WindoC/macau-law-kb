/**
 * Cloudflare Turnstile CAPTCHA utilities
 * Provides client-side and server-side CAPTCHA validation functions
 */

/**
 * Verifies a CAPTCHA token on the server side using Cloudflare's API
 * @param token - The CAPTCHA token to verify
 * @returns Promise<boolean> - True if token is valid, false otherwise
 */
export async function verifyCaptchaToken(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  const secretKey = process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.error('CLOUDFLARE_TURNSTILE_SECRET_KEY is not configured');
    return false;
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return false;
  }
}

/**
 * Client-side CAPTCHA validation helper
 * @param token - The CAPTCHA token to validate
 * @returns boolean - True if token exists and is not empty
 */
export function validateCaptchaToken(token: string | null): boolean {
  return Boolean(token && token.trim().length > 0);
}

/**
 * CAPTCHA error messages for user feedback
 */
export const CAPTCHA_ERRORS = {
  MISSING_TOKEN: '請完成人機驗證',
  VERIFICATION_FAILED: '人機驗證失敗，請重試',
  EXPIRED_TOKEN: '人機驗證已過期，請重新驗證',
  NETWORK_ERROR: '網路錯誤，請檢查連線後重試',
} as const;