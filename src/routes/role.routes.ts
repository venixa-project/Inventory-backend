import { Router } from 'express';
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  updateRolePermissions,
  deleteRole,
} from '../controllers/role.controller.js';

const router = Router();

router.get('/', getRoles);
router.get('/:id', getRoleById);
router.post('/', createRole);
router.put('/:id', updateRole);
router.put('/:id/permissions', updateRolePermissions);
router.patch('/:id/permissions', updateRolePermissions);
router.delete('/:id', deleteRole);

export default router;
