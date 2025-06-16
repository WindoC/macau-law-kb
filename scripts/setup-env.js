#!/usr/bin/env node

/**
 * Environment Setup Script for Macau Law Knowledge Base
 * Helps users set up their environment variables and validate configuration
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ENV_FILE = '.env.local';
const ENV_EXAMPLE = '.env.example';

function generateSecretKey(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

function createEnvFile() {
  const envExamplePath = path.join(__dirname, '..', ENV_EXAMPLE);
  const envPath = path.join(__dirname, '..', ENV_FILE);

  if (fs.existsSync(envPath)) {
    console.log('✅ .env.local already exists');
    return;
  }

  if (!fs.existsSync(envExamplePath)) {
    console.error('❌ .env.example not found');
    process.exit(1);
  }

  let envContent = fs.readFileSync(envExamplePath, 'utf8');

  // Generate secure secrets
  const jwtSecret = generateSecretKey(32);
  const nextAuthSecret = generateSecretKey(32);

  // Replace placeholder values with generated secrets
  envContent = envContent.replace(
    'your-super-secret-jwt-key-at-least-32-characters-long',
    jwtSecret
  );
  envContent = envContent.replace(
    'your-nextauth-secret-key-at-least-32-characters-long',
    nextAuthSecret
  );

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env.local with generated secrets');
  console.log('⚠️  Please update the following variables with your actual values:');
  console.log('   - DATABASE_URL');
  console.log('   - DB_HOST, DB_PASSWORD');
  console.log('   - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET');
  console.log('   - GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET');
  console.log('   - GEMINI_API_KEY');
}

function validateEnvironment() {
  const envPath = path.join(__dirname, '..', ENV_FILE);
  
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local not found. Run: npm run setup:env');
    process.exit(1);
  }

  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'NEXTAUTH_SECRET',
    'GEMINI_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET'
  ];

  const envContent = fs.readFileSync(envPath, 'utf8');
  const missingVars = [];

  requiredVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=(.+)$`, 'm');
    const match = envContent.match(regex);
    
    if (!match || match[1].startsWith('your-') || match[1] === '') {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    console.error('❌ Missing or incomplete environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\nPlease update your .env.local file with the correct values.');
    process.exit(1);
  }

  console.log('✅ Environment variables are properly configured');
}

function showHelp() {
  console.log(`
Macau Law Knowledge Base - Environment Setup

Commands:
  create    Create .env.local from .env.example with generated secrets
  validate  Validate that all required environment variables are set
  help      Show this help message

Usage:
  node scripts/setup-env.js create
  node scripts/setup-env.js validate
  npm run setup:env
  npm run validate:env
`);
}

// Main execution
const command = process.argv[2] || 'create';

switch (command) {
  case 'create':
    createEnvFile();
    break;
  case 'validate':
    validateEnvironment();
    break;
  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    showHelp();
    process.exit(1);
}