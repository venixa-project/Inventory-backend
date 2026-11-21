const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function check() {
  try {
    const items = await pool.query("SELECT id, name, category, stock, selling_price, tenant_id FROM items WHERE tenant_id='TENANT-POOJA-02'");
    console.log('Items for TENANT-POOJA-02 (count=' + items.rows.length + '):');
    console.table(items.rows.slice(0, 5));

    const bills = await pool.query("SELECT id, bill_number, total, tenant_id FROM bills WHERE tenant_id='TENANT-POOJA-02'");
    console.log('Bills for TENANT-POOJA-02 (count=' + bills.rows.length + '):');
    console.table(bills.rows);

    const client = await pool.query("SELECT id, business_name FROM client_tenants WHERE id='TENANT-POOJA-02'");
    console.log('Client for TENANT-POOJA-02:');
    console.table(client.rows);

    const shop = await pool.query("SELECT tenant_id, shop_name FROM shop_settings WHERE tenant_id='TENANT-POOJA-02'");
    console.log('Shop for TENANT-POOJA-02:');
    console.table(shop.rows);

    // Also check CLI-1001
    const client1001 = await pool.query("SELECT id, business_name FROM client_tenants WHERE id='CLI-1001'");
    console.log('Client for CLI-1001:');
    console.table(client1001.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
check();
