import dotenv from 'dotenv';
dotenv.config();
export const ENV = {
    PORT: parseInt(process.env.PORT || '8080', 10),
    NODE_ENV: process.env.NODE_ENV || 'development',
    JWT_SECRET: process.env.JWT_SECRET || 'venixa-enterprise-secret-key-2026-super-secure',
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || 'never',
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
    DB_STORAGE_PATH: process.env.DB_STORAGE_PATH || './data/db.json',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/venixa_inventory',
    ENABLE_POSTGRES: process.env.ENABLE_POSTGRES === 'true',
    REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'rzp_test_secret_key_venixa_2026',
};
