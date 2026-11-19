import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;
import { getPostgresPool } from './postgres.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class MigrationEngine {
    static migrationsDir = path.resolve(__dirname, './migrations');
    static schemaSqlPath = path.resolve(__dirname, './schema.sql');
    /**
     * Initializes the version tracking table in PostgreSQL
     */
    static async initTrackingTable(client) {
        await client.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        checksum VARCHAR(64),
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        execution_time_ms INT
      );
      CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON _schema_migrations(version);
    `);
    }
    /**
     * Runs the master declarative schema (schema.sql) idempotently.
     * This guarantees that any new tables or ALTER TABLE statements added to schema.sql
     * are immediately applied to the database.
     */
    static async syncMasterSchema(client) {
        if (!fs.existsSync(this.schemaSqlPath)) {
            console.warn(`[MigrationEngine] Warning: schema.sql not found at ${this.schemaSqlPath}`);
            return false;
        }
        const sql = fs.readFileSync(this.schemaSqlPath, 'utf-8');
        const startTime = Date.now();
        console.log('[MigrationEngine] 🔄 Synchronizing declarative master schema (schema.sql)...');
        await client.query('BEGIN');
        try {
            await client.query(sql);
            await client.query('COMMIT');
            const elapsed = Date.now() - startTime;
            console.log(`[MigrationEngine] ✅ Master schema synchronized successfully (${elapsed}ms).`);
            return true;
        }
        catch (err) {
            await client.query('ROLLBACK');
            console.error('[MigrationEngine] ❌ Master schema sync failed:', err.message);
            throw err;
        }
    }
    /**
     * Scans src/models/migrations/ for versioned migration files (*.sql and *.ts),
     * compares them against _schema_migrations, and executes unapplied migrations in order.
     */
    static async runIncrementalMigrations(client) {
        if (!fs.existsSync(this.migrationsDir)) {
            fs.mkdirSync(this.migrationsDir, { recursive: true });
        }
        // Get all migration files sorted alphabetically
        const files = fs
            .readdirSync(this.migrationsDir)
            .filter((f) => f.endsWith('.sql') || f.endsWith('.ts'))
            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        // Fetch already applied migrations
        const res = await client.query('SELECT version FROM _schema_migrations');
        const appliedVersions = new Set(res.rows.map((r) => r.version));
        const applied = [];
        const skipped = [];
        for (const file of files) {
            const version = path.parse(file).name;
            if (appliedVersions.has(version)) {
                skipped.push(file);
                continue;
            }
            console.log(`[MigrationEngine] 🚀 Running pending migration: ${file}...`);
            const filePath = path.resolve(this.migrationsDir, file);
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            const checksum = crypto.createHash('md5').update(fileContent).digest('hex');
            const startTime = Date.now();
            await client.query('BEGIN');
            try {
                if (file.endsWith('.sql')) {
                    await client.query(fileContent);
                }
                else if (file.endsWith('.ts') || file.endsWith('.js')) {
                    const mod = await import(filePath);
                    if (typeof mod.up === 'function') {
                        await mod.up(client);
                    }
                    else if (typeof mod.default === 'function') {
                        await mod.default(client);
                    }
                    else {
                        throw new Error(`Migration ${file} does not export an 'up' or default function`);
                    }
                }
                const elapsed = Date.now() - startTime;
                // Record in _schema_migrations
                await client.query(`INSERT INTO _schema_migrations (version, name, checksum, execution_time_ms)
           VALUES ($1, $2, $3, $4)`, [version, file, checksum, elapsed]);
                await client.query('COMMIT');
                console.log(`[MigrationEngine] ✅ Migration ${file} applied successfully in ${elapsed}ms.`);
                applied.push(file);
            }
            catch (err) {
                await client.query('ROLLBACK');
                console.error(`[MigrationEngine] ❌ Migration ${file} failed:`, err.message);
                throw err;
            }
        }
        return { applied, skipped };
    }
    /**
     * Main entrypoint: runs master schema synchronization and all pending incremental migrations.
     */
    static async autoMigrate() {
        const pool = getPostgresPool();
        const client = await pool.connect();
        try {
            // 1. Ensure tracking table exists
            await this.initTrackingTable(client);
            // 2. Synchronize master schema (CREATE TABLE IF NOT EXISTS / ALTER TABLE)
            const masterSchemaSynced = await this.syncMasterSchema(client);
            // 3. Run incremental versioned migrations
            const { applied, skipped } = await this.runIncrementalMigrations(client);
            return {
                success: true,
                masterSchemaSynced,
                appliedMigrations: applied,
                skippedMigrations: skipped,
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Returns current migration status for observability & diagnostics
     */
    static async getStatus() {
        const pool = getPostgresPool();
        const client = await pool.connect();
        try {
            await this.initTrackingTable(client);
            const res = await client.query('SELECT * FROM _schema_migrations ORDER BY id ASC');
            const applied = res.rows;
            const appliedSet = new Set(applied.map((a) => a.version));
            const files = fs.existsSync(this.migrationsDir)
                ? fs.readdirSync(this.migrationsDir).filter((f) => f.endsWith('.sql') || f.endsWith('.ts'))
                : [];
            const pending = files.filter((f) => !appliedSet.has(path.parse(f).name));
            return { applied, pending };
        }
        finally {
            client.release();
        }
    }
    /**
     * Creates a new timestamped migration file
     */
    static createMigrationFile(name, isTypeScript = false) {
        if (!fs.existsSync(this.migrationsDir)) {
            fs.mkdirSync(this.migrationsDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
        const sanitizedName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const ext = isTypeScript ? 'ts' : 'sql';
        const filename = `${timestamp}_${sanitizedName}.${ext}`;
        const filePath = path.resolve(this.migrationsDir, filename);
        if (isTypeScript) {
            fs.writeFileSync(filePath, `import type { PoolClient } from 'pg';

export async function up(client: PoolClient): Promise<void> {
  // Write your migration query here:
  // await client.query('CREATE TABLE ...');
}

export async function down(client: PoolClient): Promise<void> {
  // Write your rollback query here:
}
`, 'utf-8');
        }
        else {
            fs.writeFileSync(filePath, `-- Migration: ${sanitizedName}
-- Created at: ${new Date().toISOString()}

-- Write your SQL DDL statements below:
-- Example:
-- CREATE TABLE IF NOT EXISTS sample_table (
--   id VARCHAR(50) PRIMARY KEY,
--   name VARCHAR(255) NOT NULL
-- );
`, 'utf-8');
        }
        return filePath;
    }
}
