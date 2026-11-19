import { AppError } from './error.middleware.js';
export const resolveTenant = (req, _res, next) => {
    // If product_admin, allow them to specify target tenant via header/param or query
    if (req.user?.role === 'product_admin') {
        const specifiedTenant = req.headers['x-tenant-id'] ||
            req.query.tenantId ||
            req.params.tenantId;
        req.tenantId = (Array.isArray(specifiedTenant) ? specifiedTenant[0] : specifiedTenant) || 'ALL';
        return next();
    }
    // For store owner and counter staff, enforce their authenticated tenantId
    if (!req.user?.tenantId) {
        return next(new AppError('Tenant ID could not be identified for this user account.', 400));
    }
    req.tenantId = req.user.tenantId;
    next();
};
