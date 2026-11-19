import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware.js';
import { AuthService } from '../services/auth.service.js';

export class AuthController {
  public static async login(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { email, mobile, phone, identifier, password } = req.body;
      const targetIdentifier = identifier || email || mobile || phone;
      const result = await AuthService.login(targetIdentifier, password);
      res.json({
        success: true,
        message: 'Authentication successful',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async getProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.getProfile(req.user!.id);
      res.json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateProfile(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.updateProfile(req.user!.id, req.body);
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async switchRole(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { targetRole } = req.body;
      const result = await AuthService.switchRole(req.user!.id, targetRole);
      res.json({
        success: true,
        message: `Switched to role '${targetRole}' successfully`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  public static getStaff(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const staff = AuthService.getStoreStaff(req.tenantId!);
      res.json({
        success: true,
        count: staff.length,
        data: staff,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async createStaff(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const newStaff = await AuthService.createStoreStaff(req.tenantId!, req.body);
      res.status(201).json({
        success: true,
        message: 'Counter staff member added successfully',
        data: newStaff,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async updateStaff(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const staffId = req.params.id as string;
      const updated = await AuthService.updateStoreStaff(req.tenantId!, staffId, req.body);
      res.json({
        success: true,
        message: 'Counter staff updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  public static deleteStaff(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const staffId = req.params.id as string;
      const result = AuthService.deleteStoreStaff(req.tenantId!, staffId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}
