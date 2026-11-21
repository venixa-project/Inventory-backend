const { Client } = require('pg');
require('dotenv').config({ path: '.env' });

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Railway Postgres.');

    // 1. Create roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id VARCHAR(100) PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL DEFAULT 'CLI-1001',
        name VARCHAR(150) NOT NULL,
        description TEXT,
        permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
        user_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_roles_tenant ON roles(tenant_id);
    `);
    console.log('✓ Created roles table in PostgreSQL');

    // 2. Create branches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id VARCHAR(100) PRIMARY KEY,
        tenant_id VARCHAR(50) NOT NULL DEFAULT 'CLI-1001',
        name VARCHAR(255) NOT NULL,
        code VARCHAR(50),
        group_name VARCHAR(100),
        city VARCHAR(100),
        state VARCHAR(100),
        address TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_branches_tenant ON branches(tenant_id);
    `);
    console.log('✓ Created branches table in PostgreSQL');

    // 3. Check existing roles count
    const existingRoles = await client.query('SELECT COUNT(*) FROM roles');
    console.log('Current roles in postgres:', existingRoles.rows[0].count);

    await client.end();
  } catch (err) {
    console.error('Error setting up tables:', err);
  }
}
main();
