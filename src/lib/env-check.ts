/**
 * Environment validation utilities
 * Helps prevent runtime errors when environment is not properly configured
 */

export interface EnvironmentStatus {
  isValid: boolean;
  missingVars: string[];
  errors: string[];
}

/**
 * Check if all required environment variables are present
 */
export function checkEnvironment(): EnvironmentStatus {
  const requiredVars = [
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'GEMINI_API_KEY'
  ];

  const optionalVars = [
    'DATABASE_URL',
    'DB_HOST',
    'DB_PASSWORD',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET'
  ];

  const missingVars: string[] = [];
  const errors: string[] = [];

  // Check required variables
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missingVars.push(varName);
    }
  }

  // Check optional but important variables
  for (const varName of optionalVars) {
    const value = process.env[varName];
    if (!value || value.startsWith('your-') || value.trim() === '') {
      errors.push(`${varName} is not configured or uses placeholder value`);
    }
  }

  return {
    isValid: missingVars.length === 0,
    missingVars,
    errors
  };
}

/**
 * Check if database connection is possible
 */
export function canConnectToDatabase(): boolean {
  const dbUrl = process.env.DATABASE_URL;
  const dbHost = process.env.DB_HOST;
  const dbPassword = process.env.DB_PASSWORD;

  return !!(dbUrl && dbHost && dbPassword && 
    !dbUrl.includes('your-') && 
    !dbHost.includes('your-') && 
    !dbPassword.includes('your-'));
}

/**
 * Check if authentication providers are configured
 */
export function canUseAuthentication(): boolean {
  const googleId = process.env.GOOGLE_CLIENT_ID;
  const googleSecret = process.env.GOOGLE_CLIENT_SECRET;
  const githubId = process.env.GITHUB_CLIENT_ID;
  const githubSecret = process.env.GITHUB_CLIENT_SECRET;

  const hasGoogle = googleId && googleSecret && 
    !googleId.includes('your-') && !googleSecret.includes('your-');
  
  const hasGithub = githubId && githubSecret && 
    !githubId.includes('your-') && !githubSecret.includes('your-');

  return !!(hasGoogle || hasGithub);
}

/**
 * Get development mode status message
 */
export function getDevelopmentStatus(): string {
  const env = checkEnvironment();
  const canDb = canConnectToDatabase();
  const canAuth = canUseAuthentication();

  if (env.isValid && canDb && canAuth) {
    return 'All systems ready';
  }

  const issues = [];
  if (!env.isValid) {
    issues.push(`Missing required variables: ${env.missingVars.join(', ')}`);
  }
  if (!canDb) {
    issues.push('Database not configured');
  }
  if (!canAuth) {
    issues.push('Authentication providers not configured');
  }

  return `Development mode: ${issues.join(', ')}`;
}

/**
 * Check if we're in a safe development mode
 */
export function isDevelopmentMode(): boolean {
  return process.env.NODE_ENV === 'development' && !checkEnvironment().isValid;
}