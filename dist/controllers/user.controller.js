import { db } from '../models/db.js';
import bcrypt from 'bcryptjs';
export const getUsers = async (req, res) => {
    try {
        const users = db.get('users') || [];
        const roles = db.get('roles') || [];
        const search = (req.query.search || '').toLowerCase().trim();
        const status = req.query.status;
        // Recalculate userCount per role
        const roleCountMap = {};
        users.forEach((u) => {
            const rId = u.roleId || (u.role === 'owner' ? 'role-owner' : 'role-sales-purchases');
            roleCountMap[rId] = (roleCountMap[rId] || 0) + 1;
        });
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
        const { id } = req.params;
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
        const { username, firstName, lastName, email, phone, roleId, roleName, branches, branchesAccess, apps, password, status, tenantId, } = req.body;
        if (!username || !username.trim()) {
            return res.status(400).json({ success: false, message: 'Username is required' });
        }
        const users = db.get('users') || [];
        const existing = users.find((u) => (u.username || '').toLowerCase() === username.trim().toLowerCase());
        if (existing) {
            return res.status(409).json({ success: false, message: 'Username already exists' });
        }
        const passwordHash = password ? bcrypt.hashSync(password, 10) : bcrypt.hashSync('Venixa@1234', 10);
        const newId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const fullName = `${firstName || ''} ${lastName || ''}`.trim() || username;
        const isUserActive = status !== 'inactive';
        const newUser = {
            id: newId,
            username: username.trim(),
            firstName: firstName?.trim() || '',
            lastName: lastName?.trim() || '',
            name: fullName,
            email: email?.trim() || '',
            phone: phone?.trim() || '',
            role: 'staff',
            roleId: roleId || 'role-sales-purchases',
            roleName: roleName || 'SALES & PURCHASES',
            tenantId: tenantId || 'CLI-1001',
            passwordHash,
            branches: branches || [],
            branchesAccess: branchesAccess || (branches && branches.length > 0 ? `${branches.length} Branches` : 'None'),
            apps: apps || { pos: true, mobile: false, adminPortal: true, inward: false },
            isActive: isUserActive,
            status: isUserActive ? 'active' : 'inactive',
            createdBy: req.user?.username || 'Store Owner',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
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
        const { id } = req.params;
        const users = db.get('users') || [];
        const idx = users.findIndex((u) => u.id === id);
        if (idx === -1) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        const existingUser = users[idx];
        const { username, firstName, lastName, email, phone, roleId, roleName, branches, branchesAccess, apps, password, status, } = req.body;
        const fullName = `${firstName !== undefined ? firstName : existingUser.firstName || ''} ${lastName !== undefined ? lastName : existingUser.lastName || ''}`.trim() || (username || existingUser.username || existingUser.name);
        let passwordHash = existingUser.passwordHash;
        if (password && password.trim()) {
            passwordHash = bcrypt.hashSync(password.trim(), 10);
        }
        const isUserActive = status !== undefined ? status !== 'inactive' : existingUser.isActive;
        const updatedUser = {
            ...existingUser,
            username: username !== undefined ? username.trim() : existingUser.username,
            firstName: firstName !== undefined ? firstName.trim() : existingUser.firstName,
            lastName: lastName !== undefined ? lastName.trim() : existingUser.lastName,
            name: fullName,
            email: email !== undefined ? email.trim() : existingUser.email,
            phone: phone !== undefined ? phone.trim() : existingUser.phone,
            roleId: roleId !== undefined ? roleId : existingUser.roleId,
            roleName: roleName !== undefined ? roleName : existingUser.roleName,
            branches: branches !== undefined ? branches : existingUser.branches,
            branchesAccess: branchesAccess !== undefined ? branchesAccess : existingUser.branchesAccess,
            apps: apps !== undefined ? apps : existingUser.apps,
            passwordHash,
            isActive: isUserActive,
            status: isUserActive ? 'active' : 'inactive',
            updatedBy: req.user?.username || 'Store Owner',
            updatedAt: new Date().toISOString(),
        };
        users[idx] = updatedUser;
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
        const { id } = req.params;
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
        const { id } = req.params;
        const users = db.get('users') || [];
        const filtered = users.filter((u) => u.id !== id);
        if (filtered.length === users.length) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
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
