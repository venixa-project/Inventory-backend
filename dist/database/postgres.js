import pkg from 'pg';
const { Pool } = pkg;
import { ENV } from '../config/env.js';
let pool = null;
let isConnected = false;
export const getPostgresPool = () => {
    if (!pool) {
        pool = new Pool({
            connectionString: ENV.DATABASE_URL,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
        pool.on('error', (err) => {
            console.warn('[PostgresPool] Unexpected client idle error:', err.message);
            isConnected = false;
        });
    }
    return pool;
};
export const queryPostgres = async (text, params) => {
    const p = getPostgresPool();
    const client = await p.connect();
    try {
        const res = await client.query(text, params);
        return res.rows;
    }
    finally {
        client.release();
    }
};
export const testPostgresConnection = async () => {
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
    }
    catch (err) {
        console.log('ℹ️ PostgreSQL not reachable or disabled (' + err.message + '). Operating in resilient local ACID storage engine mode.');
        isConnected = false;
        return false;
    }
};
export const isPostgresActive = () => isConnected;
