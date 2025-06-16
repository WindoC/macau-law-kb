import { NextResponse } from 'next/server';
import { checkEnvironment, canConnectToDatabase, canUseAuthentication, getDevelopmentStatus } from '@/lib/env-check';

/**
 * Get environment configuration status
 * GET /api/env-status - Returns environment validation results
 */
export async function GET() {
  try {
    const envCheck = checkEnvironment();
    const canDb = canConnectToDatabase();
    const canAuth = canUseAuthentication();
    const status = getDevelopmentStatus();
    
    return NextResponse.json({
      isValid: envCheck.isValid,
      missingVars: envCheck.missingVars,
      errors: envCheck.errors,
      canConnectToDatabase: canDb,
      canUseAuthentication: canAuth,
      developmentStatus: status,
      isDevelopmentMode: process.env.NODE_ENV === 'development' && !envCheck.isValid
    });
  } catch (error) {
    console.error('Environment status check failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check environment status',
        isDevelopmentMode: true,
        developmentStatus: 'Environment check failed'
      },
      { status: 500 }
    );
  }
}