const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

let connStr = process.env.DATABASE_URL;
// If needed, replace hostname with resolved IP
console.log('Original connection string host:', connStr);

const pool = new Pool({
  connectionString: connStr,
  connectionTimeoutMillis: 5000,
});

async function main() {
  try {
    console.log('Testing connection...');
    const tRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('SUCCESS! Tables found:', tRes.rows.map(r => r.table_name));

    if (tRes.rows.some(r => r.table_name === 'tenants')) {
      const tenants = await pool.query('SELECT * FROM tenants');
      console.log('\n--- Tenants ---');
      console.log(tenants.rows);
    }

    if (tRes.rows.some(r => r.table_name === 'users')) {
      const users = await pool.query('SELECT id, email, name, role, tenant_id FROM users');
      console.log('\n--- Users ---');
      console.log(users.rows);
    }

    if (tRes.rows.some(r => r.table_name === 'items')) {
      const items = await pool.query('SELECT tenant_id, count(*) as count FROM items GROUP BY tenant_id');
      console.log('\n--- Items Count by Tenant ---');
      console.log(items.rows);
    }

    if (tRes.rows.some(r => r.table_name === 'sales_orders')) {
      const sales = await pool.query('SELECT tenant_id, count(*) as count FROM sales_orders GROUP BY tenant_id');
      console.log('\n--- Sales Orders Count by Tenant ---');
      console.log(sales.rows);
    }

    if (tRes.rows.some(r => r.table_name === 'customers')) {
      const customers = await pool.query('SELECT tenant_id, count(*) as count FROM customers GROUP BY tenant_id');
      console.log('\n--- Customers Count by Tenant ---');
      console.log(customers.rows);
    }

  } catch (err) {
    console.error('Connection error:', err);
    
    // Try with IP
    console.log('\nTrying with direct IP 66.33.22.219...');
    const ipPool = new Pool({
      connectionString: connStr.replace('iriguchi.proxy.rlwy.net', '66.33.22.219'),
      connectionTimeoutMillis: 5000,
    });
    try {
      const tRes2 = await ipPool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
      console.log('SUCCESS with IP! Tables found:', tRes2.rows.map(r => r.table_name));
      
      const tenants = await ipPool.query('SELECT * FROM tenants');
      console.log('\n--- Tenants ---');
      console.log(tenants.rows);

      const users = await ipPool.query('SELECT id, email, name, role, tenant_id FROM users');
      console.log('\n--- Users ---');
      console.log(users.rows);
    } catch (e2) {
      console.error('IP connection also failed:', e2.message);
    } finally {
      await ipPool.end();
    }
  } finally {
    await pool.end();
  }
}

main();
