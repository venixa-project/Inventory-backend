import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { AppError } from './error.middleware.js';
export const authenticateToken = (req, _res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : req.query.token || null;
    // Also support dev header x-user-role if token is omitted for quick testing/demo
    if (!token) {
        const devRole = req.headers['x-user-role'];
        const devTenant = req.headers['x-tenant-id'] || req.query.tenantId || 'CLI-1001';
        if (devRole && ['product_admin', 'owner', 'staff'].includes(devRole)) {
            req.user = {
                id: `dev-${devRole}`,
                email: `${devRole}@venixa.cloud`,
                role: devRole,
                tenantId: devRole === 'product_admin' ? 'ALL' : devTenant,
                name: `Dev ${devRole.toUpperCase()}`,
            };
            req.tenantId = req.user.tenantId;
            return next();
        }
        // Graceful view mode for printable documents opened via browser window.open
        const isDocPreview = req.path.endsWith('/document') || req.path.endsWith('/pdf') || req.path.endsWith('/slip');
        if (isDocPreview) {
            req.user = {
                id: 'doc-viewer',
                email: 'viewer@venixa.cloud',
                role: 'owner',
                tenantId: devTenant,
                name: 'Document Viewer',
            };
            req.tenantId = devTenant;
            return next();
        }
        return next(new AppError('Authentication required. Missing Bearer token.', 401));
    }
    try {
        const decoded = jwt.verify(token, ENV.JWT_SECRET);
        req.user = decoded;
        // Support seamless role switching across client sessions
        const activeHeaderRole = req.headers['x-user-role'];
        if (activeHeaderRole && ['product_admin', 'owner', 'staff'].includes(activeHeaderRole)) {
            req.user.role = activeHeaderRole;
        }
        req.tenantId = req.user.role === 'product_admin' ? 'ALL' : (decoded.tenantId || req.headers['x-tenant-id'] || 'CLI-1001');
        next();
    }
    catch (err) {
        return next(new AppError('Invalid or expired authentication token.', 401));
    }
};
export const requireRoles = (...allowedRoles) => {
    return (req, _res, next) => {
        if (!req.user) {
            return next(new AppError('Unauthorized: User not authenticated.', 401));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(new AppError(`Forbidden: Role '${req.user.role}' does not have permission to access this resource. Required: ${allowedRoles.join(', ')}`, 403));
        }
        next();
    };
};
