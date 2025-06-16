import * as openidClient from 'openid-client';

export interface OIDCProvider {
  name: string;
  client: openidClient.Client;
  authUrl: (state: string, nonce: string) => string;
}

class OIDCManager {
  private providers: Map<string, OIDCProvider> = new Map();
  private initialized = false;
  
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Google OIDC Setup
      const googleIssuer = await openidClient.Issuer.discover('https://accounts.google.com');
      const googleClient = new googleIssuer.Client({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uris: [process.env.GOOGLE_REDIRECT_URI!],
        response_types: ['code'],
      });
      
      this.providers.set('google', {
        name: 'google',
        client: googleClient,
        authUrl: (state: string, nonce: string) => googleClient.authorizationUrl({
          scope: 'openid email profile',
          state,
          nonce,
        }),
      });
      
      // GitHub OAuth Setup (GitHub doesn't support OIDC, using OAuth2)
      const githubClient = new openidClient.Issuer({
        issuer: 'https://github.com',
        authorization_endpoint: 'https://github.com/login/oauth/authorize',
        token_endpoint: 'https://github.com/login/oauth/access_token',
        userinfo_endpoint: 'https://api.github.com/user',
      }).Client;
      
      const githubOAuthClient = new githubClient({
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        redirect_uris: [process.env.GITHUB_REDIRECT_URI!],
        response_types: ['code'],
      });
      
      this.providers.set('github', {
        name: 'github',
        client: githubOAuthClient,
        authUrl: (state: string) => githubOAuthClient.authorizationUrl({
          scope: 'user:email',
          state,
        }),
      });
      
      this.initialized = true;
      console.log('OIDC providers initialized successfully');
    } catch (error) {
      console.error('Failed to initialize OIDC providers:', error);
      throw error;
    }
  }
  
  getProvider(name: string): OIDCProvider | undefined {
    return this.providers.get(name);
  }
  
  getAllProviders(): OIDCProvider[] {
    return Array.from(this.providers.values());
  }
  
  isInitialized(): boolean {
    return this.initialized;
  }
}

export const oidcManager = new OIDCManager();