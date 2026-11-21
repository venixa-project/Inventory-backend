const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function test() {
  const { db } = await import('../dist/models/db.js');
  const items = db.get('items');
  console.log('Total items in memory:', items.length);
  const poojaItems = items.filter(i => i.tenantId === 'TENANT-POOJA-02');
  console.log('Items for TENANT-POOJA-02:', poojaItems.length);
  const cliItems = items.filter(i => i.tenantId === 'CLI-1001');
  console.log('Items for CLI-1001:', cliItems.length);
  
  const bills = db.get('bills');
  console.log('Total bills in memory:', bills.length);
  console.log('Bills for TENANT-POOJA-02:', bills.filter(b => b.tenantId === 'TENANT-POOJA-02').length);
  console.log('Bills for CLI-1001:', bills.filter(b => b.tenantId === 'CLI-1001').length);

  const customers = db.get('customers');
  console.log('Customers for TENANT-POOJA-02:', customers.filter(c => c.tenantId === 'TENANT-POOJA-02').length);
}

test().catch(console.error);
