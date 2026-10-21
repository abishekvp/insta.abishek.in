import dotenv from 'dotenv';

dotenv.config();

// Strict Production Environment Validation (Zero Hardcoded Fallback Defaults)
const missingEnvVars: string[] = [];

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!dbUrl || dbUrl.trim() === '') {
  missingEnvVars.push('DATABASE_URL (PostgreSQL cloud connection string, e.g. postgres://user:pass@host:5432/db?sslmode=require)');
} else if (!dbUrl.startsWith('postgres://') && !dbUrl.startsWith('postgresql://')) {
  missingEnvVars.push('DATABASE_URL must be a valid PostgreSQL cloud connection string starting with postgres:// or postgresql://');
}

if (!process.env.APP_SECRET || process.env.APP_SECRET.trim().length < 32) {
  missingEnvVars.push('APP_SECRET (must be at least 32 characters for AES-256 cryptographic security)');
}

if (!process.env.PORT || isNaN(parseInt(process.env.PORT, 10))) {
  missingEnvVars.push('PORT (e.g. PORT=5500)');
}

if (missingEnvVars.length > 0) {
  console.error('\n=============================================================');
  console.error('❌ FATAL: Production Environment Configuration Incomplete');
  console.error('No default values allowed in production mode.');
  missingEnvVars.forEach((v) => console.error(`   - Missing: ${v}`));
  console.error('\nPlease define all required variables in your .env file.');
  console.error('=============================================================\n');
  throw new Error(`Production configuration validation failed. Missing: ${missingEnvVars.join(', ')}`);
}

// Always enforce production mode; never taken from environment variables
process.env.NODE_ENV = 'production';
export const NODE_ENV = 'production';
export const PORT = parseInt(process.env.PORT!, 10);
export const SECRET_KEY = process.env.APP_SECRET!;
export const DATABASE_URL = dbUrl!;

export const ROOT_DIR = process.cwd();

// ==============================================================================
// Official Instagram OAuth (Instagram API with Instagram Login / Graph API)
// These are OPTIONAL. The server boots without them; the "Official Login" connect
// flow simply reports itself as not configured until all three are provided.
// Create an app at https://developers.facebook.com and add the Instagram product
// to obtain the client id/secret and to whitelist the redirect URI.
// ==============================================================================
export const APP_BASE_URL = (process.env.APP_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
export const IG_OAUTH_CLIENT_ID = process.env.IG_OAUTH_CLIENT_ID?.trim() || '';
export const IG_OAUTH_CLIENT_SECRET = process.env.IG_OAUTH_CLIENT_SECRET?.trim() || '';
// Optional custom redirect URI. If left unset, dynamically resolves to <APP_BASE_URL>/api/auth/instagram/oauth/callback
export const IG_OAUTH_REDIRECT_URI = process.env.IG_OAUTH_REDIRECT_URI?.trim() || '';
// Scopes for Instagram Login. Space/comma separated. Defaults to read-only business basics.
export const IG_OAUTH_SCOPES = (process.env.IG_OAUTH_SCOPES?.trim() || 'instagram_business_basic')
  .split(/[\s,]+/)
  .filter(Boolean)
  .join(',');

export function isInstagramOAuthConfigured(): boolean {
  return Boolean(IG_OAUTH_CLIENT_ID && IG_OAUTH_CLIENT_SECRET);
}
