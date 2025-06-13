declare namespace NodeJS {
  interface ProcessEnv {
    // Supabase Configuration
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;

    // Google Gemini AI Configuration
    GEMINI_API_KEY: string;

    // Cloudflare Turnstile (CAPTCHA)
    NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY: string;
    CLOUDFLARE_TURNSTILE_SECRET_KEY: string;

    // JWT and Security
    JWT_SECRET: string;
    CSRF_SECRET: string;

    // Application Settings
    NEXT_PUBLIC_APP_URL: string;
    NODE_ENV: 'development' | 'production' | 'test';

    // Token Pricing (can be adjusted by admin)
    DEFAULT_FREE_TOKENS: string;
    DEFAULT_TOKEN_PRICE_USD: string;
    PRO_MODEL_MULTIPLIER: string;
  }
}
