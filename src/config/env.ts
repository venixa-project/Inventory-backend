import dotenv from 'dotenv';
import path from 'path';

// Support running from either root directory or backend directory
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', 'backend', '.env') });

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'venixa-enterprise-secret-key-2026-super-secure',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || 'never',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/venixa_inventory',
  ENABLE_POSTGRES: process.env.ENABLE_POSTGRES === 'true',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'rzp_test_secret_key_venixa_2026',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  GEMINI_ENABLED: process.env.GEMINI_ENABLED === 'true',
};
