import { db } from '../models/db.js';
import { isPostgresActive, getPostgresPool } from '../models/postgres.js';
import { PostgresSync } from '../models/postgresSync.js';
import { SEED_BRANCHES } from '../models/initialSeed.js';
const getTenantId = (req) => {
    return (req.headers['x-tenant-id'] ||
        req.user?.tenantId ||
        'CLI-1001');
};
export const getBranches = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const search = (req.query.search || '').toLowerCase().trim();
        let result = [];
        if (isPostgresActive()) {
            const pool = getPostgresPool();
            const bRes = await pool.query('SELECT * FROM branches WHERE tenant_id = $1 ORDER BY created_at ASC', [tenantId]);
            if (bRes.rows.length === 0) {
                console.log(`[BranchController] Seeding initial branches into PostgreSQL for tenant ${tenantId}...`);
                for (const sb of SEED_BRANCHES) {
                    await PostgresSync.syncBranch(sb, tenantId);
                }
                const recheckRes = await pool.query('SELECT * FROM branches WHERE tenant_id = $1 ORDER BY created_at ASC', [tenantId]);
                result = recheckRes.rows.map((r) => ({
                    id: r.id,
                    name: r.name,
                    code: r.code || '',
                    group: r.group_name || 'General',
                    city: r.city || 'Hyderabad',
                    state: r.state || 'Telangana',
                    address: r.address || '',
                    isActive: r.is_active ?? true,
                }));
            }
            else {
                result = bRes.rows.map((r) => ({
                    id: r.id,
                    name: r.name,
                    code: r.code || '',
                    group: r.group_name || 'General',
                    city: r.city || 'Hyderabad',
                    state: r.state || 'Telangana',
                    address: r.address || '',
                    isActive: r.is_active ?? true,
                }));
            }
        }
        else {
            result = db.get('branches') || [];
        }
        if (search) {
            result = result.filter((b) => b.name.toLowerCase().includes(search) ||
                b.code.toLowerCase().includes(search) ||
                b.group.toLowerCase().includes(search) ||
                b.city.toLowerCase().includes(search));
        }
        res.json({
            success: true,
            data: result,
            totalCount: result.length,
        });
    }
    catch (error) {
        console.error('Error fetching branches:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve branches' });
    }
};
export const createBranch = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { name, code, group, city, state, address } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Branch name is required' });
        }
        const newBranch = {
            id: `branch-${Date.now()}`,
            name: name.trim(),
            code: code?.trim() || `BR-${Math.floor(100 + Math.random() * 900)}`,
            group: group?.trim() || 'General Branches',
            city: city?.trim() || 'Hyderabad',
            state: state?.trim() || 'Telangana',
            address: address?.trim() || '',
            isActive: true,
        };
        if (isPostgresActive()) {
            await PostgresSync.syncBranch(newBranch, tenantId);
        }
        const branches = db.get('branches') || [];
        branches.push(newBranch);
        db.set('branches', branches);
        res.status(201).json({
            success: true,
            message: 'Branch created successfully',
            data: newBranch,
        });
    }
    catch (error) {
        console.error('Error creating branch:', error);
        res.status(500).json({ success: false, message: 'Failed to create branch' });
    }
};
