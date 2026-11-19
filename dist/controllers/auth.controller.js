import { AuthService } from '../services/auth.service.js';
export class AuthController {
    static async login(req, res, next) {
        try {
            const { email, mobile, phone, identifier, password } = req.body;
            const targetIdentifier = identifier || email || mobile || phone;
            const result = await AuthService.login(targetIdentifier, password);
            res.json({
                success: true,
                message: 'Authentication successful',
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async register(req, res, next) {
        try {
            const result = await AuthService.register(req.body);
            res.status(201).json({
                success: true,
                message: result.message,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async getProfile(req, res, next) {
        try {
            const result = await AuthService.getProfile(req.user.id);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async updateProfile(req, res, next) {
        try {
            const result = await AuthService.updateProfile(req.user.id, req.body);
            res.json({
                success: true,
                message: 'Profile updated successfully',
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async switchRole(req, res, next) {
        try {
            const { targetRole } = req.body;
            const result = await AuthService.switchRole(req.user.id, targetRole);
            res.json({
                success: true,
                message: `Switched to role '${targetRole}' successfully`,
                data: result,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static getStaff(req, res, next) {
        try {
            const staff = AuthService.getStoreStaff(req.tenantId);
            res.json({
                success: true,
                count: staff.length,
                data: staff,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async createStaff(req, res, next) {
        try {
            const newStaff = await AuthService.createStoreStaff(req.tenantId, req.body);
            res.status(201).json({
                success: true,
                message: 'Counter staff member added successfully',
                data: newStaff,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static async updateStaff(req, res, next) {
        try {
            const staffId = req.params.id;
            const updated = await AuthService.updateStoreStaff(req.tenantId, staffId, req.body);
            res.json({
                success: true,
                message: 'Counter staff updated successfully',
                data: updated,
            });
        }
        catch (err) {
            next(err);
        }
    }
    static deleteStaff(req, res, next) {
        try {
            const staffId = req.params.id;
            const result = AuthService.deleteStoreStaff(req.tenantId, staffId);
            res.json(result);
        }
        catch (err) {
            next(err);
        }
    }
}
