// Test environment variables loading
// Run this with: node test-env.js

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

console.log('=== Environment Variables Test ===');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL || 'MISSING');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'PRESENT' : 'MISSING');

// Check if keys are properly formatted
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (anonKey) {
  console.log('Anon key format:', anonKey.startsWith('eyJ') ? 'VALID JWT' : 'INVALID FORMAT');
  console.log('Anon key length:', anonKey.length);
} else {
  console.log('❌ Anon key is missing');
}

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (serviceKey) {
  console.log('Service key format:', serviceKey.startsWith('eyJ') ? 'VALID JWT' : 'INVALID FORMAT');
  console.log('Service key length:', serviceKey.length);
} else {
  console.log('❌ Service key is missing');
}

// Check other important environment variables
console.log('\n=== Other Environment Variables ===');
console.log('GOOGLE_AI_API_KEY:', process.env.GOOGLE_AI_API_KEY ? 'PRESENT' : 'MISSING');
console.log('NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY:', process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY ? 'PRESENT' : 'MISSING');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'PRESENT' : 'MISSING');
console.log('NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

console.log('\n=== Summary ===');
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GOOGLE_AI_API_KEY'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length === 0) {
  console.log('✅ All required environment variables are present');
} else {
  console.log('❌ Missing required environment variables:', missingVars.join(', '));
}
