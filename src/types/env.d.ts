declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // PostgreSQL Direct Connection
      DATABASE_URL: string;
      DB_HOST: string;
      DB_PORT: string;
      DB_NAME: string;
      DB_USER: string;
      DB_PASSWORD: string;
      DB_SSL: string;

      // JWT Configuration
      JWT_SECRET: string;
      JWT_EXPIRES_IN: string;
      REFRESH_TOKEN_EXPIRES_IN: string;

      // Google OIDC
      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;
      GOOGLE_REDIRECT_URI: string;

      // GitHub OIDC
      GITHUB_CLIENT_ID: string;
      GITHUB_CLIENT_SECRET: string;
      GITHUB_REDIRECT_URI: string;

      // Google AI API
      GEMINI_API_KEY: string;

      // Application Settings
      NEXTAUTH_URL: string;
      NEXTAUTH_SECRET: string;
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
}

export {};
