import pkg from 'pg';
const { Pool } = pkg;
import { ENV } from '../config/env.js';

let pool: pkg.Pool | null = null;
let isConnected = false;

export const getPostgresPool = (): pkg.Pool => {
  if (!pool) {
    const isCloudDb =
      ENV.DATABASE_URL.includes('rlwy.net') ||
      ENV.DATABASE_URL.includes('railway') ||
      ENV.DATABASE_URL.includes('render.com') ||
      ENV.DATABASE_URL.includes('supabase.co') ||
      ENV.DATABASE_URL.includes('neon.tech') ||
      !ENV.DATABASE_URL.includes('localhost');

    pool = new Pool({
      connectionString: ENV.DATABASE_URL,
      ssl: isCloudDb ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.warn('[PostgresPool] Unexpected client idle error:', err.message);
      isConnected = false;
    });
  }
  return pool;
};

export const queryPostgres = async <T = any>(text: string, params?: any[]): Promise<T[]> => {
  const p = getPostgresPool();
  const client = await p.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } finally {
    client.release();
  }
};

export const testPostgresConnection = async (): Promise<boolean> => {
  try {
    const p = getPostgresPool();
    const client = await p.connect();
    const res = await client.query('SELECT 1 as connected');
    client.release();
    isConnected = res.rows[0]?.connected === 1;
    if (isConnected) {
      console.log('✅ PostgreSQL connected successfully to:', ENV.DATABASE_URL.replace(/:[^:]*@/, ':****@'));
    }
    return isConnected;
  } catch (err: any) {
    console.log('ℹ️ PostgreSQL not reachable or disabled (' + err.message + '). Operating in resilient local ACID storage engine mode.');
    isConnected = false;
    return false;
  }
};

export const isPostgresActive = () => isConnected;
