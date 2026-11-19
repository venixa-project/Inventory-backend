import { queryPostgres, getPostgresPool } from '../models/postgres.js';
async function check() {
    try {
        const tenants = await queryPostgres('SELECT id, business_name, email FROM client_tenants');
        console.log('--- Client Tenants in PostgreSQL ---');
        console.log(JSON.stringify(tenants, null, 2));
        const users = await queryPostgres('SELECT id, email, role, tenant_id FROM users');
        console.log('--- Users in PostgreSQL ---');
        console.log(JSON.stringify(users, null, 2));
        const items = await queryPostgres('SELECT tenant_id, count(*) FROM items GROUP BY tenant_id');
        console.log('--- Item count by tenant in PostgreSQL ---');
        console.log(JSON.stringify(items, null, 2));
        const poojaItems = await queryPostgres('SELECT id, name, tenant_id, stock, selling_price FROM items WHERE tenant_id = \'TENANT-POOJA-02\'');
        console.log('--- Items for TENANT-POOJA-02 (Ram Store) ---');
        console.log(JSON.stringify(poojaItems, null, 2));
    }
    catch (err) {
        console.error('Check failed:', err);
    }
    finally {
        const p = getPostgresPool();
        await p.end();
    }
}
check();
