import { db } from '../models/db.js';
import { isPostgresActive, getPostgresPool } from '../models/postgres.js';
import { PostgresSync } from '../models/postgresSync.js';
import { SEED_ROLES } from '../models/initialSeed.js';
/**
 * Helper to extract tenant ID from request headers or auth
 */
const getTenantId = (req) => {
    return (req.headers['x-tenant-id'] ||
        req.user?.tenantId ||
        'CLI-1001');
};
export const getRoles = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const search = (req.query.search || '').toLowerCase().trim();
        let roles = [];
        if (isPostgresActive()) {
            const pool = getPostgresPool();
            // Check if roles exist in PostgreSQL for this tenant
            const checkRes = await pool.query('SELECT * FROM roles WHERE tenant_id = $1 ORDER BY created_at ASC', [tenantId]);
            // If tenant has no roles seeded yet, seed initial default roles once
            if (checkRes.rows.length === 0) {
                console.log(`[RoleController] Seeding default roles into PostgreSQL for tenant ${tenantId}...`);
                for (const sr of SEED_ROLES) {
                    await PostgresSync.syncRole(sr, tenantId);
                }
                const recheckRes = await pool.query('SELECT * FROM roles WHERE tenant_id = $1 ORDER BY created_at ASC', [tenantId]);
                roles = recheckRes.rows.map((r) => ({
                    id: r.id,
                    name: r.name,
                    description: r.description || '',
                    permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || {}),
                    userCount: 0,
                    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
                }));
            }
            else {
                roles = checkRes.rows.map((r) => ({
                    id: r.id,
                    name: r.name,
                    description: r.description || '',
                    permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || {}),
                    userCount: 0,
                    createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                    updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
                }));
            }
            // Compute dynamic user counts for each role from users in PostgreSQL
            try {
                const usersCountRes = await pool.query(`SELECT role, COUNT(*) as cnt FROM users WHERE tenant_id = $1 GROUP BY role`, [tenantId]);
                const countMap = {};
                for (const row of usersCountRes.rows) {
                    countMap[row.role] = parseInt(row.cnt, 10) || 0;
                }
                roles = roles.map((r) => {
                    let cnt = 0;
                    if (r.id === 'role-owner' || r.name.toLowerCase().includes('owner')) {
                        cnt = countMap['owner'] || 0;
                    }
                    else if (countMap[r.id] !== undefined) {
                        cnt = countMap[r.id];
                    }
                    else if (countMap[r.name] !== undefined) {
                        cnt = countMap[r.name];
                    }
                    return { ...r, userCount: cnt };
                });
            }
            catch (cntErr) {
                console.warn('[RoleController] Failed to calculate dynamic user count from Postgres:', cntErr);
            }
        }
        else {
            // Fallback: Local database storage
            roles = (db.get('roles') || []).map((r) => ({ ...r }));
            const users = db.get('users') || [];
            const roleCountMap = {};
            users.forEach((u) => {
                const rId = u.roleId || (u.role === 'owner' ? 'role-owner' : 'role-sales-purchases');
                roleCountMap[rId] = (roleCountMap[rId] || 0) + 1;
            });
            roles = roles.map((r) => ({
                ...r,
                userCount: roleCountMap[r.id] !== undefined ? roleCountMap[r.id] : (r.userCount || 0),
            }));
        }
        if (search) {
            roles = roles.filter((r) => r.name.toLowerCase().includes(search) ||
                (r.description && r.description.toLowerCase().includes(search)));
        }
        res.json({
            success: true,
            data: roles,
            totalCount: roles.length,
        });
    }
    catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve roles' });
    }
};
export const getRoleById = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getTenantId(req);
        if (isPostgresActive()) {
            const pool = getPostgresPool();
            const roleRes = await pool.query('SELECT * FROM roles WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
            if (roleRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Role not found' });
            }
            const r = roleRes.rows[0];
            const role = {
                id: r.id,
                name: r.name,
                description: r.description || '',
                permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || {}),
                userCount: r.user_count || 0,
                createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
            };
            return res.json({ success: true, data: role });
        }
        const roles = db.get('roles') || [];
        const role = roles.find((r) => r.id === id);
        if (!role) {
            return res.status(404).json({ success: false, message: 'Role not found' });
        }
        res.json({ success: true, data: role });
    }
    catch (error) {
        console.error('Error fetching role:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve role' });
    }
};
export const createRole = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { id, name, description, permissions } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Role name is required' });
        }
        const roleId = id && typeof id === 'string' && id.trim()
            ? id.trim()
            : `role-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const newRole = {
            id: roleId,
            name: name.trim(),
            description: description?.trim() || '',
            userCount: 0,
            permissions: permissions || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        if (isPostgresActive()) {
            const pool = getPostgresPool();
            // Check duplicate name for this tenant
            const existing = await pool.query('SELECT id FROM roles WHERE LOWER(name) = LOWER($1) AND tenant_id = $2', [name.trim(), tenantId]);
            if (existing.rows.length > 0) {
                return res.status(409).json({ success: false, message: 'Role with this name already exists' });
            }
            await pool.query(`INSERT INTO roles (id, tenant_id, name, description, permissions, user_count, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 0, NOW(), NOW())`, [roleId, tenantId, newRole.name, newRole.description, JSON.stringify(newRole.permissions)]);
        }
        // Keep memory db in sync
        const roles = db.get('roles') || [];
        roles.push(newRole);
        db.set('roles', roles);
        res.status(201).json({
            success: true,
            message: 'Role created successfully',
            data: newRole,
        });
    }
    catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ success: false, message: 'Failed to create role' });
    }
};
export const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getTenantId(req);
        const { name, description, permissions } = req.body;
        let updatedRole = null;
        if (isPostgresActive()) {
            const pool = getPostgresPool();
            const existing = await pool.query('SELECT * FROM roles WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
            if (existing.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Role not found' });
            }
            const current = existing.rows[0];
            const newName = name !== undefined ? name.trim() : current.name;
            const newDesc = description !== undefined ? description.trim() : current.description;
            const newPerms = permissions !== undefined ? JSON.stringify(permissions) : current.permissions;
            const updateRes = await pool.query(`UPDATE roles SET name = $1, description = $2, permissions = $3, updated_at = NOW()
         WHERE id = $4 AND tenant_id = $5 RETURNING *`, [newName, newDesc, newPerms, id, tenantId]);
            const r = updateRes.rows[0];
            updatedRole = {
                id: r.id,
                name: r.name,
                description: r.description || '',
                permissions: typeof r.permissions === 'string' ? JSON.parse(r.permissions) : (r.permissions || {}),
                userCount: r.user_count || 0,
                createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
            };
        }
        // Also update in local memory db
        const roles = db.get('roles') || [];
        const idx = roles.findIndex((r) => r.id === id);
        if (idx !== -1) {
            roles[idx] = {
                ...roles[idx],
                name: name !== undefined ? name.trim() : roles[idx].name,
                description: description !== undefined ? description.trim() : roles[idx].description,
                permissions: permissions !== undefined ? permissions : roles[idx].permissions,
                updatedAt: new Date().toISOString(),
            };
            db.set('roles', roles);
            if (!updatedRole)
                updatedRole = roles[idx];
        }
        if (!updatedRole) {
            return res.status(404).json({ success: false, message: 'Role not found' });
        }
        res.json({
            success: true,
            message: 'Role updated successfully',
            data: updatedRole,
        });
    }
    catch (error) {
        console.error('Error updating role:', error);
        res.status(500).json({ success: false, message: 'Failed to update role' });
    }
};
export const updateRolePermissions = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getTenantId(req);
        const { permissions } = req.body;
        if (!permissions || typeof permissions !== 'object') {
            return res.status(400).json({ success: false, message: 'Invalid permissions payload' });
        }
        let updatedRole = null;
        if (isPostgresActive()) {
            const pool = getPostgresPool();
            const existing = await pool.query('SELECT * FROM roles WHERE id = $1 AND tenant_id = $2', [id, tenantId]);
            if (existing.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Role not found' });
            }
            const currentPerms = typeof existing.rows[0].permissions === 'string'
                ? JSON.parse(existing.rows[0].permissions)
                : (existing.rows[0].permissions || {});
            const mergedPerms = { ...currentPerms, ...permissions };
            const updateRes = await pool.query(`UPDATE roles SET permissions = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3 RETURNING *`, [JSON.stringify(mergedPerms), id, tenantId]);
            const r = updateRes.rows[0];
            updatedRole = {
                id: r.id,
                name: r.name,
                description: r.description || '',
                permissions: mergedPerms,
                userCount: r.user_count || 0,
                createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
            };
        }
        const roles = db.get('roles') || [];
        const idx = roles.findIndex((r) => r.id === id);
        if (idx !== -1) {
            roles[idx].permissions = {
                ...roles[idx].permissions,
                ...permissions,
            };
            roles[idx].updatedAt = new Date().toISOString();
            db.set('roles', roles);
            if (!updatedRole)
                updatedRole = roles[idx];
        }
        if (!updatedRole) {
            return res.status(404).json({ success: false, message: 'Role not found' });
        }
        res.json({
            success: true,
            message: 'Role permissions saved successfully',
            data: updatedRole,
        });
    }
    catch (error) {
        console.error('Error saving role permissions:', error);
        res.status(500).json({ success: false, message: 'Failed to update role permissions' });
    }
};
export const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = getTenantId(req);
        if (id === 'role-owner') {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete default Store Owner role',
            });
        }
        if (isPostgresActive()) {
            const pool = getPostgresPool();
            // Check if users are assigned to this role in PostgreSQL
            const usersCheck = await pool.query(`SELECT COUNT(*) as count FROM users WHERE (role = $1 OR tenant_id = $2) AND role = $1`, [id, tenantId]);
            if (parseInt(usersCheck.rows[0]?.count || '0', 10) > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete role because it is currently assigned to active users',
                });
            }
            const delRes = await pool.query('DELETE FROM roles WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, tenantId]);
            if (delRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Role not found in database' });
            }
        }
        // Also remove from local db
        const roles = db.get('roles') || [];
        const filtered = roles.filter((r) => r.id !== id);
        db.set('roles', filtered);
        res.json({
            success: true,
            message: 'Role deleted successfully from database',
        });
    }
    catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ success: false, message: 'Failed to delete role' });
    }
};
