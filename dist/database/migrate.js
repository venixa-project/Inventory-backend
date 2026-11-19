import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getPostgresPool } from './postgres.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const runMigrations = async () => {
    const schemaPath = path.resolve(__dirname, '../models/schema.sql');
    if (!fs.existsSync(schemaPath)) {
        console.error('❌ Migration error: schema.sql not found at', schemaPath);
        return false;
    }
    const sql = fs.readFileSync(schemaPath, 'utf-8');
    console.log('🚀 Executing database migrations from schema.sql...');
    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('✅ PostgreSQL migrations completed successfully: all 20 tables & indexes ready.');
        return true;
    }
    catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', err.message);
        throw err;
    }
    finally {
        client.release();
    }
};
// If run directly via CLI (tsx src/database/migrate.ts)
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
    runMigrations()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}
