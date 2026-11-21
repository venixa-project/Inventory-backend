const { Pool } = require('pg');
require('dotenv').config({ path: __dirname + '/../.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    console.log('Connecting to:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':***@'));
    const tRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    console.log('Tables:', tRes.rows.map(r => r.table_name));

    const tenants = await pool.query('SELECT * FROM tenants');
    console.log('\n--- Tenants ---');
    console.log(tenants.rows);

    const users = await pool.query('SELECT id, email, name, role, tenant_id FROM users');
    console.log('\n--- Users ---');
    console.log(users.rows);

    const items = await pool.query('SELECT tenant_id, count(*) as count FROM items GROUP BY tenant_id');
    console.log('\n--- Items Count by Tenant ---');
    console.log(items.rows);

    const sales = await pool.query('SELECT tenant_id, count(*) as count FROM sales_orders GROUP BY tenant_id');
    console.log('\n--- Sales Orders Count by Tenant ---');
    console.log(sales.rows);

    const customers = await pool.query('SELECT tenant_id, count(*) as count FROM customers GROUP BY tenant_id');
    console.log('\n--- Customers Count by Tenant ---');
    console.log(customers.rows);

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
