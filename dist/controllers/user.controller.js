import { db } from '../models/db.js';
import bcrypt from 'bcryptjs';
import { isPostgresActive, getPostgresPool } from '../models/postgres.js';
import { PostgresSync } from '../models/postgresSync.js';
const getTenantId = (req) => {
    return (req.headers['x-tenant-id'] ||
        req.user?.tenantId ||
        'CLI-1001');
};
export const getUsers = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const search = (req.query.search || '').toLowerCase().trim();
        const status = req.query.status;
        let users = [];
        if (isPostgresActive()) {
            const pool = getPostgresPool();
            const usersRes = await pool.query(`SELECT * FROM users 
         WHERE tenant_id = $1 OR tenant_id IS NULL OR $1 = 'CLI-1001'
         ORDER BY created_at ASC`, [tenantId]);
            users = usersRes.rows.map((r) => ({
                id: r.id,
                username: r.username || (r.name ? r.name.toLowerCase().replace(/\s+/g, '.') : 'user'),
                firstName: r.first_name || '',
                lastName: r.last_name || '',
                name: r.name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.username,
                email: r.email || '',
                phone: r.phone || '',
                role: r.role,
                roleId: r.role_id || (r.role === 'owner' ? 'role-owner' : 'role-sales-purchases'),
                roleName: r.role_name || (r.role === 'owner' ? 'Store Owner' : 'SALES & PURCHASES'),
                tenantId: r.tenant_id || tenantId,
                passwordHash: r.password_hash,
                branches: typeof r.branches === 'string' ? JSON.parse(r.branches) : (r.branches || []),
                branchesAccess: r.branches_access || 'All Branches',
                apps: typeof r.apps === 'string' ? JSON.parse(r.apps) : (r.apps || { pos: true, mobile: false, adminPortal: true, inward: false }),
                isActive: r.is_active ?? true,
                status: r.is_active ? 'active' : 'inactive',
                createdBy: r.created_by || 'System',
                updatedBy: r.updated_by || undefined,
                createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
            }));
            // Keep in-memory cache synchronized
            db.set('users', users);
        }
        else {
            users = (db.get('users') || []).map((u) => ({ ...u }));
        }
        // Dynamic user count calculation per role
        const roleCountMap = {};
        users.forEach((u) => {
            const rId = u.roleId || (u.role === 'owner' ? 'role-owner' : 'role-sales-purchases');
            roleCountMap[rId] = (roleCountMap[rId] || 0) + 1;
        });
        const roles = db.get('roles') || [];
        const updatedRoles = roles.map((r) => ({
            ...r,
            userCount: roleCountMap[r.id] || 0,
        }));
        db.set('roles', updatedRoles);
        let filtered = [...users];
        if (status && status !== 'all') {
            filtered = filtered.filter((u) => (u.status || (u.isActive ? 'active' : 'inactive')) === status);
        }
        if (search) {
            filtered = filtered.filter((u) => {
                const uName = (u.username || '').toLowerCase();
                const fName = (u.firstName || '').toLowerCase();
                const lName = (u.lastName || '').toLowerCase();
                const fullName = (u.name || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                const phone = (u.phone || '').toLowerCase();
                const role = (u.roleName || u.role || '').toLowerCase();
                const branch = (u.branchesAccess || '').toLowerCase();
                return (uName.includes(search) ||
                    fName.includes(search) ||
                    lName.includes(search) ||
                    fullName.includes(search) ||
                    email.includes(search) ||
                    phone.includes(search) ||
                    role.includes(search) ||
                    branch.includes(search));
            });
        }
        const totalActive = users.filter((u) => u.isActive && (u.status === 'active' || !u.status)).length;
        res.json({
            success: true,
            data: filtered,
            totalCount: users.length,
            totalActive,
        });
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve users' });
    }
};
export const getUserById = async (req, res) => {
    try {
        const id = req.params.id;
        const tenantId = getTenantId(req);
        if (isPostgresActive()) {
            const pool = getPostgresPool();
            const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
            if (userRes.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }
            const r = userRes.rows[0];
            const user = {
                id: r.id,
                username: r.username || (r.name ? r.name.toLowerCase().replace(/\s+/g, '.') : 'user'),
                firstName: r.first_name || '',
                lastName: r.last_name || '',
                name: r.name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.username,
                email: r.email || '',
                phone: r.phone || '',
                role: r.role,
                roleId: r.role_id || (r.role === 'owner' ? 'role-owner' : 'role-sales-purchases'),
                roleName: r.role_name || (r.role === 'owner' ? 'Store Owner' : 'SALES & PURCHASES'),
                tenantId: r.tenant_id || tenantId,
                passwordHash: r.password_hash,
                branches: typeof r.branches === 'string' ? JSON.parse(r.branches) : (r.branches || []),
                branchesAccess: r.branches_access || 'All Branches',
                apps: typeof r.apps === 'string' ? JSON.parse(r.apps) : (r.apps || { pos: true, mobile: false, adminPortal: true, inward: false }),
                isActive: r.is_active ?? true,
                status: r.is_active ? 'active' : 'inactive',
                createdBy: r.created_by || 'System',
                updatedBy: r.updated_by || undefined,
                createdAt: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
                updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : new Date().toISOString(),
            };
            return res.json({ success: true, data: user });
        }
        const users = db.get('users') || [];
        const user = users.find((u) => u.id === id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, data: user });
    }
    catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve user' });
    }
};
export const createUser = async (req, res) => {
    try {
        const tenantId = getTenantId(req);
        const { username, firstName, lastName, email, phone, roleId, roleName, branches, branchesAccess, apps, password, status, } = req.body;
        if (!username || !username.trim()) {
            return res.status(400).json({ success: false, message: 'Username is required' });
        }
        const trimmedUsername = username.trim();
        if (isPostgresActive()) {
            const pool = getPostgresPool();
            const existing = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [trimmedUsername]);
            if (existing.rows.length > 0) {
                return res.status(409).json({ success: false, message: 'Username already exists' });
            }
        }
        else {
            const users = db.get('users') || [];
            const existing = users.find((u) => (u.username || '').toLowerCase() === trimmedUsername.toLowerCase());
            if (existing) {
                return res.status(409).json({ success: false, message: 'Username already exists' });
            }
        }
        const passwordHash = password ? bcrypt.hashSync(password, 10) : bcrypt.hashSync('Venixa@1234', 10);
        const newId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const fullName = `${firstName || ''} ${lastName || ''}`.trim() || trimmedUsername;
        const isUserActive = status !== 'inactive';
        // Map roleId to system role enum (owner vs staff)
        const systemRole = (roleId === 'role-owner' || (roleName && roleName.toLowerCase().includes('owner')))
            ? 'owner'
            : 'staff';
        const newUser = {
            id: newId,
            username: trimmedUsername,
            firstName: firstName?.trim() || '',
            lastName: lastName?.trim() || '',
            name: fullName,
            email: email?.trim() || '',
            phone: phone?.trim() || '',
            role: systemRole,
            roleId: roleId || 'role-sales-purchases',
            roleName: roleName || 'SALES & PURCHASES',
            tenantId,
            passwordHash,
            branches: branches || [],
            branchesAccess: branchesAccess || (branches && branches.length > 0 ? `${branches.length} Branches` : 'All Branches'),
            apps: apps || { pos: true, mobile: false, adminPortal: true, inward: false },
            isActive: isUserActive,
            status: isUserActive ? 'active' : 'inactive',
            createdBy: req.user?.username || 'Store Owner',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // 1. Sync to PostgreSQL directly
        if (isPostgresActive()) {
            await PostgresSync.syncUser(newUser);
        }
        // 2. Sync to in-memory db
        const users = db.get('users') || [];
        users.push(newUser);
        db.set('users', users);
        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: newUser,
        });
    }
    catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ success: false, message: 'Failed to create user' });
    }
};
export const updateUser = async (req, res) => {
    try {
        const id = req.params.id;
        const tenantId = getTenantId(req);
        const users = db.get('users') || [];
        const idx = users.findIndex((u) => u.id === id);
        const existingUser = idx !== -1 ? users[idx] : null;
        const { username, firstName, lastName, email, phone, roleId, roleName, branches, branchesAccess, apps, password, status, } = req.body;
        const fullName = `${firstName !== undefined ? firstName : existingUser?.firstName || ''} ${lastName !== undefined ? lastName : existingUser?.lastName || ''}`.trim() || (username || existingUser?.username || existingUser?.name || 'User');
        let passwordHash = existingUser?.passwordHash;
        if (password && password.trim()) {
            passwordHash = bcrypt.hashSync(password.trim(), 10);
        }
        const isUserActive = status !== undefined ? status !== 'inactive' : (existingUser?.isActive ?? true);
        const currentRoleId = roleId !== undefined ? roleId : (existingUser?.roleId || 'role-sales-purchases');
        const systemRole = (currentRoleId === 'role-owner' || (roleName && roleName.toLowerCase().includes('owner')))
            ? 'owner'
            : 'staff';
        const updatedUser = {
            id,
            username: username !== undefined ? username.trim() : (existingUser?.username || 'user'),
            firstName: firstName !== undefined ? firstName.trim() : (existingUser?.firstName || ''),
            lastName: lastName !== undefined ? lastName.trim() : (existingUser?.lastName || ''),
            name: fullName,
            email: email !== undefined ? email.trim() : (existingUser?.email || ''),
            phone: phone !== undefined ? phone.trim() : (existingUser?.phone || ''),
            role: systemRole,
            roleId: currentRoleId,
            roleName: roleName !== undefined ? roleName : (existingUser?.roleName || 'SALES & PURCHASES'),
            tenantId: existingUser?.tenantId || tenantId,
            branches: branches !== undefined ? branches : (existingUser?.branches || []),
            branchesAccess: branchesAccess !== undefined ? branchesAccess : (existingUser?.branchesAccess || 'All Branches'),
            apps: apps !== undefined ? apps : (existingUser?.apps || { pos: true, mobile: false, adminPortal: true, inward: false }),
            passwordHash: passwordHash || existingUser?.passwordHash || '',
            isActive: isUserActive,
            status: isUserActive ? 'active' : 'inactive',
            updatedBy: req.user?.username || 'Store Owner',
            updatedAt: new Date().toISOString(),
            createdAt: existingUser?.createdAt || new Date().toISOString(),
        };
        // 1. Sync to PostgreSQL directly
        if (isPostgresActive()) {
            await PostgresSync.syncUser(updatedUser);
        }
        // 2. Sync to in-memory db
        if (idx !== -1) {
            users[idx] = updatedUser;
        }
        else {
            users.push(updatedUser);
        }
        db.set('users', users);
        res.json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser,
        });
    }
    catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
};
export const toggleUserStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const users = db.get('users') || [];
        const idx = users.findIndex((u) => u.id === id);
        if (idx === -1) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const currentActive = users[idx].isActive;
        const nextActive = !currentActive;
        users[idx].isActive = nextActive;
        users[idx].status = nextActive ? 'active' : 'inactive';
        users[idx].updatedAt = new Date().toISOString();
        users[idx].updatedBy = req.user?.username || 'Store Owner';
        if (isPostgresActive()) {
            await PostgresSync.syncUser(users[idx]);
        }
        db.set('users', users);
        res.json({
            success: true,
            message: `User ${nextActive ? 'activated' : 'deactivated'} successfully`,
            data: users[idx],
        });
    }
    catch (error) {
        console.error('Error toggling user status:', error);
        res.status(500).json({ success: false, message: 'Failed to toggle status' });
    }
};
export const deleteUser = async (req, res) => {
    try {
        const id = req.params.id;
        if (isPostgresActive()) {
            await PostgresSync.deleteUser(id);
        }
        const users = db.get('users') || [];
        const filtered = users.filter((u) => u.id !== id);
        db.set('users', filtered);
        res.json({
            success: true,
            message: 'User deleted successfully',
        });
    }
    catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Failed to delete user' });
    }
};
