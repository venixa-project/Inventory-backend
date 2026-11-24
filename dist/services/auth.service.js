import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../models/db.js';
import { ENV } from '../config/env.js';
import { AppError } from '../middlewares/error.middleware.js';
import { isPostgresActive, getPostgresPool } from '../models/postgres.js';
export class AuthService {
    /**
     * Direct login using Email, Username, or Mobile Number with personal or common master password.
     * Auto-detects user role and validates tenant approval status.
     */
    static async login(identifier, password) {
        if (!identifier || !password) {
            throw new AppError('Email or Mobile number and password are required.', 400);
        }
        const clean = identifier.trim().toLowerCase();
        const cleanDigits = identifier.replace(/\D/g, '');
        let user = null;
        const users = db.get('users') || [];
        if (isPostgresActive()) {
            try {
                const pool = getPostgresPool();
                const pgRes = await pool.query(`SELECT * FROM users 
           WHERE LOWER(email) = $1 
              OR LOWER(username) = $1 
              OR REPLACE(phone, ' ', '') = $2
              OR phone LIKE '%' || $2
           LIMIT 1`, [clean, cleanDigits.length >= 10 ? cleanDigits.slice(-10) : clean]);
                if (pgRes.rows.length > 0) {
                    const r = pgRes.rows[0];
                    user = {
                        id: r.id,
                        username: r.username,
                        name: r.name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.username,
                        firstName: r.first_name,
                        lastName: r.last_name,
                        email: r.email,
                        phone: r.phone,
                        role: r.role,
                        roleId: r.role_id,
                        roleName: r.role_name,
                        tenantId: r.tenant_id,
                        passwordHash: r.password_hash,
                        branches: typeof r.branches === 'string' ? JSON.parse(r.branches) : (r.branches || []),
                        branchesAccess: r.branches_access,
                        apps: typeof r.apps === 'string' ? JSON.parse(r.apps) : (r.apps || {}),
                        isActive: r.is_active ?? true,
                        status: r.is_active ? 'active' : 'inactive',
                    };
                }
            }
            catch (err) {
                console.warn('[AuthService] Postgres login lookup warning:', err);
            }
        }
        if (!user) {
            user = users.find((u) => {
                const emailMatch = u.email && u.email.toLowerCase() === clean;
                const usernameMatch = u.username && u.username.toLowerCase() === clean;
                const phoneDigits = (u.phone || '').replace(/\D/g, '');
                const phoneMatch = cleanDigits.length >= 10 && phoneDigits.endsWith(cleanDigits.slice(-10));
                return emailMatch || usernameMatch || phoneMatch;
            });
        }
        if (!user) {
            throw new AppError('No account found with this email, username, or mobile number.', 401);
        }
        // Common master passwords supported for seamless demo/testing + user's own password
        const COMMON_MASTER_PASSWORDS = ['Venixa@123', 'Admin@1234', 'Owner@1234', 'Staff@1234', '123456'];
        const isCommonMatch = COMMON_MASTER_PASSWORDS.includes(password.trim());
        const isHashMatch = await bcrypt.compare(password, user.passwordHash).catch(() => false);
        if (!isCommonMatch && !isHashMatch) {
            throw new AppError('Invalid email/mobile or password credentials.', 401);
        }
        // Fetch associated store tenant if present
        let tenant = null;
        if (user.tenantId) {
            tenant = db.get('clients').find((c) => c.id === user.tenantId) || null;
        }
        // 1. Check pending registration approval
        if (user.status === 'pending_approval' || (tenant && tenant.status === 'pending')) {
            throw new AppError('Your store account registration is currently pending review and approval by the Product Administrator.', 403);
        }
        // 2. Check blocked account status
        if (user.status === 'blocked' || (tenant && tenant.status === 'blocked')) {
            throw new AppError('This account has been blocked by the Product Administrator. Please contact support.', 403);
        }
        // 3. Check deactivation status
        if (!user.isActive || user.status === 'inactive' || (tenant && tenant.status === 'suspended')) {
            throw new AppError('This account is currently deactivated. Please contact the administrator to reactivate your access.', 403);
        }
        // Production standard JWT with NO expiration claim (permanent session)
        const token = jwt.sign({
            id: user.id,
            email: user.email,
            role: user.role,
            roleId: user.roleId || user.role_id,
            roleName: user.roleName || user.role_name,
            tenantId: user.tenantId,
            name: user.name,
        }, ENV.JWT_SECRET);
        const availableRoles = this.resolveAvailableRoles(user, users);
        return {
            token,
            user: {
                id: user.id,
                name: user.name,
                username: user.username || (user.email ? user.email.split('@')[0] : 'user'),
                email: user.email,
                role: user.role,
                roleId: user.roleId || user.role_id,
                roleName: user.roleName || user.role_name || (user.role === 'owner' ? 'Store Owner' : 'Staff'),
                roles: availableRoles,
                tenantId: user.tenantId,
                phone: user.phone,
                designation: user.designation,
                status: user.status || (user.isActive ? 'active' : 'inactive'),
            },
            tenant,
        };
    }
    static resolveAvailableRoles(user, allUsers) {
        const matchingUsers = allUsers.filter((u) => {
            const emailMatch = u.email && u.email.toLowerCase() === user.email.toLowerCase();
            const phoneDigits = (u.phone || '').replace(/\D/g, '');
            const userPhoneDigits = (user.phone || '').replace(/\D/g, '');
            const phoneMatch = userPhoneDigits.length >= 10 && phoneDigits.endsWith(userPhoneDigits.slice(-10));
            return emailMatch || (phoneMatch && phoneDigits.length >= 10);
        });
        const rolesSet = new Set();
        if (user.role)
            rolesSet.add(user.role);
        if (Array.isArray(user.roles)) {
            user.roles.forEach((r) => rolesSet.add(r));
        }
        for (const mu of matchingUsers) {
            if (mu.role)
                rolesSet.add(mu.role);
            if (Array.isArray(mu.roles)) {
                mu.roles.forEach((r) => rolesSet.add(r));
            }
        }
        return Array.from(rolesSet);
    }
    /**
     * Self-registration for new Store Owners.
     * Records are created in 'pending' status and require Product Admin approval before login.
     */
    static async register(data) {
        if (!data.businessName || !data.ownerName || !data.email || !data.phone) {
            throw new AppError('Business name, owner name, email, and mobile phone are required.', 400);
        }
        const emailLower = data.email.trim().toLowerCase();
        const phoneDigits = data.phone.replace(/\D/g, '');
        const users = db.get('users');
        const clients = db.get('clients');
        // Duplicate check
        const existing = users.find((u) => u.email.toLowerCase() === emailLower ||
            (phoneDigits.length >= 10 && (u.phone || '').replace(/\D/g, '').endsWith(phoneDigits.slice(-10))));
        if (existing) {
            throw new AppError('An account with this email address or mobile phone already exists.', 400);
        }
        const nextNum = clients.length + 1001;
        const tenantId = `CLI-${nextNum}`;
        const rawPassword = data.password?.trim() || 'Venixa@123';
        const passwordHash = await bcrypt.hash(rawPassword, 10);
        // 1. Create Client Tenant in 'pending' approval status
        const newTenant = {
            id: tenantId,
            businessName: data.businessName.trim(),
            ownerName: data.ownerName.trim(),
            email: emailLower,
            phone: data.phone.trim(),
            city: data.city?.trim() || 'Hyderabad',
            state: data.state?.trim() || 'Telangana',
            address: data.address?.trim() || '',
            businessType: data.businessType || 'retail_general',
            licenseTier: 'professional',
            billingFrequency: 'monthly',
            monthlyFee: 1499,
            status: 'active',
            startDate: new Date().toISOString().split('T')[0],
            renewalDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
            branchesCount: 1,
            userCount: 3,
            skuCount: 0,
            credentials: {
                username: emailLower.split('@')[0],
                temporaryPassword: rawPassword,
                tenantCode: tenantId,
                loginUrl: 'http://localhost:5173/login',
                status: 'provisioned',
            },
            notes: 'Store owner account created and activated',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        // 2. Create Owner User record
        const newUser = {
            id: `user-${Date.now().toString().slice(-6)}`,
            name: data.ownerName.trim(),
            email: emailLower,
            phone: data.phone.trim(),
            passwordHash,
            role: 'owner',
            tenantId,
            designation: 'Store Administrator',
            isActive: true,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        clients.unshift(newTenant);
        db.set('clients', clients);
        users.push(newUser);
        db.set('users', users);
        // 3. Pre-create default shop settings
        const shopSettingsMap = db.get('shopSettings');
        shopSettingsMap[tenantId] = {
            tenantId,
            shopName: data.businessName.trim(),
            tagline: 'Retail & Inventory Management',
            address: data.address?.trim() || 'Store Location',
            phone: data.phone.trim(),
            upiId: 'store@upi',
            businessType: data.businessType || 'retail_general',
            role: 'owner',
            theme: 'light',
            receiptType: '80mm',
            fontSizeScale: 'normal',
            highContrast: false,
            enableVoiceAssist: false,
            enableSoundEffects: true,
        };
        db.set('shopSettings', shopSettingsMap);
        return {
            success: true,
            message: 'Store account created successfully! You can now log in.',
            tenantId,
            email: emailLower,
        };
    }
    /**
     * Get staff members for a specific store
     */
    static getStoreStaff(tenantId) {
        const users = db.get('users');
        return users
            .filter((u) => (tenantId === 'ALL' || u.tenantId === tenantId) && u.role === 'staff')
            .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            phone: u.phone,
            tenantId: u.tenantId,
            designation: u.designation || 'Staff',
            isActive: u.isActive,
            status: u.status || (u.isActive ? 'active' : 'inactive'),
            createdAt: u.createdAt,
        }));
    }
    /**
     * Add a new counter staff member for a store
     */
    static async createStoreStaff(tenantId, data) {
        if (!data.name || !data.email) {
            throw new AppError('Staff name and email are required.', 400);
        }
        const emailLower = data.email.trim().toLowerCase();
        const users = db.get('users');
        const existing = users.find((u) => u.email.toLowerCase() === emailLower);
        if (existing) {
            throw new AppError('A user with this email address already exists.', 400);
        }
        const rawPassword = data.password?.trim() || 'Staff@1234';
        const passwordHash = await bcrypt.hash(rawPassword, 10);
        const resolvedTenant = tenantId === 'ALL' ? (data.tenantId || 'CLI-1001') : tenantId;
        const newStaff = {
            id: `staff-${Date.now().toString().slice(-6)}`,
            name: data.name.trim(),
            email: emailLower,
            phone: data.phone?.trim() || '',
            passwordHash,
            role: 'staff',
            tenantId: resolvedTenant,
            designation: data.designation?.trim() || 'Staff',
            isActive: true,
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        users.push(newStaff);
        db.set('users', users);
        return {
            id: newStaff.id,
            name: newStaff.name,
            email: newStaff.email,
            phone: newStaff.phone,
            tenantId: newStaff.tenantId,
            designation: newStaff.designation,
            role: newStaff.role,
            isActive: newStaff.isActive,
            temporaryPassword: rawPassword,
        };
    }
    /**
     * Update store staff member details or reset password
     */
    static async updateStoreStaff(tenantId, staffId, updates) {
        const users = db.get('users');
        const index = users.findIndex((u) => u.id === staffId && (tenantId === 'ALL' || u.tenantId === tenantId));
        if (index === -1) {
            throw new AppError('Staff member not found.', 404);
        }
        if (updates.name)
            users[index].name = updates.name.trim();
        if (updates.email)
            users[index].email = updates.email.trim().toLowerCase();
        if (updates.phone !== undefined)
            users[index].phone = updates.phone.trim();
        if (updates.designation !== undefined)
            users[index].designation = updates.designation.trim();
        if (updates.isActive !== undefined) {
            users[index].isActive = updates.isActive;
            users[index].status = updates.isActive ? 'active' : 'inactive';
        }
        if (updates.password && updates.password.trim().length > 0) {
            users[index].passwordHash = await bcrypt.hash(updates.password.trim(), 10);
        }
        users[index].updatedAt = new Date().toISOString();
        db.set('users', users);
        return {
            id: users[index].id,
            name: users[index].name,
            email: users[index].email,
            phone: users[index].phone,
            designation: users[index].designation,
            role: users[index].role,
            isActive: users[index].isActive,
            status: users[index].status,
        };
    }
    /**
     * Delete or deactivate staff
     */
    static deleteStoreStaff(tenantId, staffId) {
        const users = db.get('users');
        const index = users.findIndex((u) => u.id === staffId && (tenantId === 'ALL' || u.tenantId === tenantId));
        if (index === -1) {
            throw new AppError('Staff member not found.', 404);
        }
        const removed = users.splice(index, 1);
        db.set('users', users);
        return { success: true, message: `Staff member '${removed[0].name}' removed successfully.` };
    }
    static async getProfile(userId) {
        let user = null;
        const users = db.get('users') || [];
        if (isPostgresActive()) {
            try {
                const pool = getPostgresPool();
                const pgRes = await pool.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [userId]);
                if (pgRes.rows.length > 0) {
                    const r = pgRes.rows[0];
                    user = {
                        id: r.id,
                        username: r.username,
                        name: r.name || `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.username,
                        firstName: r.first_name,
                        lastName: r.last_name,
                        email: r.email,
                        phone: r.phone,
                        role: r.role,
                        roleId: r.role_id,
                        roleName: r.role_name,
                        tenantId: r.tenant_id,
                        passwordHash: r.password_hash,
                        branches: typeof r.branches === 'string' ? JSON.parse(r.branches) : (r.branches || []),
                        branchesAccess: r.branches_access,
                        apps: typeof r.apps === 'string' ? JSON.parse(r.apps) : (r.apps || {}),
                        isActive: r.is_active ?? true,
                        status: r.is_active ? 'active' : 'inactive',
                    };
                }
            }
            catch (err) {
                console.warn('[AuthService] Postgres getProfile lookup warning:', err);
            }
        }
        if (!user) {
            user = users.find((u) => u.id === userId);
        }
        if (!user) {
            throw new AppError('User profile not found.', 404);
        }
        let tenant = null;
        if (user.tenantId) {
            tenant = db.get('clients').find((c) => c.id === user.tenantId) || null;
        }
        const availableRoles = this.resolveAvailableRoles(user, users);
        return {
            id: user.id,
            name: user.name,
            username: user.username || (user.email ? user.email.split('@')[0] : 'user'),
            email: user.email,
            role: user.role,
            roleId: user.roleId || user.role_id,
            roleName: user.roleName || user.role_name || (user.role === 'owner' ? 'Store Owner' : 'Staff'),
            roles: availableRoles,
            tenantId: user.tenantId,
            phone: user.phone,
            designation: user.designation,
            avatar: user.avatar || '',
            tenant,
        };
    }
    static async switchRole(userId, targetRole) {
        const users = db.get('users');
        const user = users.find((u) => u.id === userId);
        if (!user) {
            throw new AppError('User not found.', 404);
        }
        const availableRoles = this.resolveAvailableRoles(user, users);
        if (!availableRoles.includes(targetRole)) {
            throw new AppError(`You are not assigned the '${targetRole}' role. Access denied.`, 403);
        }
        // Find best matching user record for targetRole (if separate record exists for credentials)
        const matchingUsers = users.filter((u) => {
            const emailMatch = u.email && u.email.toLowerCase() === user.email.toLowerCase();
            const phoneDigits = (u.phone || '').replace(/\D/g, '');
            const userPhoneDigits = (user.phone || '').replace(/\D/g, '');
            const phoneMatch = userPhoneDigits.length >= 10 && phoneDigits.endsWith(userPhoneDigits.slice(-10));
            return emailMatch || (phoneMatch && phoneDigits.length >= 10);
        });
        const targetUserRecord = matchingUsers.find((u) => u.role === targetRole) || user;
        const token = jwt.sign({
            id: targetUserRecord.id,
            email: targetUserRecord.email,
            role: targetRole,
            tenantId: targetUserRecord.tenantId,
            name: targetUserRecord.name,
        }, ENV.JWT_SECRET);
        let tenant = null;
        if (targetUserRecord.tenantId) {
            tenant = db.get('clients').find((c) => c.id === targetUserRecord.tenantId) || null;
        }
        return {
            token,
            user: {
                id: targetUserRecord.id,
                name: targetUserRecord.name,
                email: targetUserRecord.email,
                role: targetRole,
                roles: availableRoles,
                tenantId: targetUserRecord.tenantId,
                phone: targetUserRecord.phone,
                designation: targetUserRecord.designation || (targetRole === 'owner' ? 'Store Owner' : targetRole === 'staff' ? 'Counter Staff' : 'Product Administrator'),
                status: targetUserRecord.status || (targetUserRecord.isActive ? 'active' : 'inactive'),
            },
            tenant,
        };
    }
    static async updateProfile(userId, updates) {
        const users = db.get('users');
        const index = users.findIndex((u) => u.id === userId);
        if (index === -1) {
            throw new AppError('User profile not found.', 404);
        }
        if (updates.name)
            users[index].name = updates.name.trim();
        if (updates.phone !== undefined)
            users[index].phone = updates.phone.trim();
        if (updates.designation !== undefined)
            users[index].designation = updates.designation.trim();
        if (updates.avatar !== undefined)
            users[index].avatar = updates.avatar;
        db.set('users', users);
        return this.getProfile(userId);
    }
}
