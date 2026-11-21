const fs = require('fs');
const p = 'backend/data/db.json';
if (!fs.existsSync(p)) {
  console.log('db.json does not exist');
  process.exit(0);
}
const data = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('Tenants:', data.clients?.map(c => ({ id: c.id, name: c.businessName })));
console.log('Users:', data.users?.map(u => ({ email: u.email, tenantId: u.tenantId })));
console.log('Items by tenant:', data.items?.reduce((acc, i) => { acc[i.tenantId] = (acc[i.tenantId] || 0) + 1; return acc; }, {}));
console.log('Bills by tenant:', data.bills?.reduce((acc, b) => { acc[b.tenantId] = (acc[b.tenantId] || 0) + 1; return acc; }, {}));
console.log('Sales orders by tenant:', data.salesOrders?.reduce((acc, s) => { acc[s.tenantId] = (acc[s.tenantId] || 0) + 1; return acc; }, {}));
console.log('Customers by tenant:', data.customers?.reduce((acc, c) => { acc[c.tenantId] = (acc[c.tenantId] || 0) + 1; return acc; }, {}));
