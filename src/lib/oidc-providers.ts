export interface OIDCProvider {
  name: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authUrl: (state: string, nonce?: string) => string;
  discoveryUrl?: string;
}

class OIDCManager {
  private providers: Map<string, OIDCProvider> = new Map();
  private initialized = false;
  
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Google OIDC Setup
      const googleProvider: OIDCProvider = {
        name: 'google',
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectUri: process.env.GOOGLE_REDIRECT_URI!,
        discoveryUrl: 'https://accounts.google.com/.well-known/openid_configuration',
        authUrl: (state: string, nonce?: string) => {
          const params = new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
            response_type: 'code',
            scope: 'openid email profile',
            state,
            ...(nonce && { nonce }),
          });
          return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
        },
      };
      
      this.providers.set('google', googleProvider);
      
      // GitHub OAuth Setup (GitHub doesn't support OIDC, using OAuth2)
      const githubProvider: OIDCProvider = {
        name: 'github',
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
        redirectUri: process.env.GITHUB_REDIRECT_URI!,
        authUrl: (state: string) => {
          const params = new URLSearchParams({
            client_id: process.env.GITHUB_CLIENT_ID!,
            redirect_uri: process.env.GITHUB_REDIRECT_URI!,
            scope: 'user:email',
            state,
          });
          return `https://github.com/login/oauth/authorize?${params.toString()}`;
        },
      };
      
      this.providers.set('github', githubProvider);
      
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

  async getDiscoveryDocument(url: string) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch discovery document: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch discovery document:', error);
      throw error;
    }
  }
}

export const oidcManager = new OIDCManager();