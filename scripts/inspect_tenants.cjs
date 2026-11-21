const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  try {
    const shopSettings = await pool.query('SELECT tenant_id, shop_name FROM shop_settings');
    console.log('Postgres shop_settings:');
    console.table(shopSettings.rows);

    const items = await pool.query('SELECT tenant_id, count(*) FROM items GROUP BY tenant_id');
    console.log('Postgres items by tenant:');
    console.table(items.rows);

    const bills = await pool.query('SELECT tenant_id, count(*) FROM bills GROUP BY tenant_id');
    console.log('Postgres bills by tenant:');
    console.table(bills.rows);

    const salesOrders = await pool.query('SELECT tenant_id, count(*) FROM sales_orders GROUP BY tenant_id');
    console.log('Postgres sales_orders by tenant:');
    console.table(salesOrders.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
