import { Request, Response } from 'express';
import { db } from '../models/db.js';
import { RoleRecord } from '../types/index.js';

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = db.get('roles') || [];
    const users = db.get('users') || [];
    const search = (req.query.search as string || '').toLowerCase().trim();

    // Dynamically calculate user count for each role
    const roleCountMap: Record<string, number> = {};
    users.forEach((u) => {
      const rId = u.roleId || (u.role === 'owner' ? 'role-owner' : 'role-sales-purchases');
      roleCountMap[rId] = (roleCountMap[rId] || 0) + 1;
    });

    let result = roles.map((r) => ({
      ...r,
      userCount: roleCountMap[r.id] !== undefined ? roleCountMap[r.id] : (r.userCount || 0),
    }));

    if (search) {
      result = result.filter(
        (r) =>
          r.name.toLowerCase().includes(search) ||
          (r.description && r.description.toLowerCase().includes(search))
      );
    }

    res.json({
      success: true,
      data: result,
      totalCount: result.length,
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve roles' });
  }
};

export const getRoleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const roles = db.get('roles') || [];
    const role = roles.find((r) => r.id === id);

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    res.json({ success: true, data: role });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve role' });
  }
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const { name, description, permissions } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const roles = db.get('roles') || [];
    const existing = roles.find((r) => r.name.toLowerCase() === name.trim().toLowerCase());

    if (existing) {
      return res.status(409).json({ success: false, message: 'Role with this name already exists' });
    }

    const newRole: RoleRecord = {
      id: `role-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: name.trim(),
      description: description?.trim() || '',
      userCount: 0,
      permissions: permissions || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    roles.push(newRole);
    db.set('roles', roles);

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: newRole,
    });
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ success: false, message: 'Failed to create role' });
  }
};

export const updateRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const roles = db.get('roles') || [];
    const idx = roles.findIndex((r) => r.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    const { name, description, permissions } = req.body;

    roles[idx] = {
      ...roles[idx],
      name: name !== undefined ? name.trim() : roles[idx].name,
      description: description !== undefined ? description.trim() : roles[idx].description,
      permissions: permissions !== undefined ? permissions : roles[idx].permissions,
      updatedAt: new Date().toISOString(),
    };

    db.set('roles', roles);

    res.json({
      success: true,
      message: 'Role updated successfully',
      data: roles[idx],
    });
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ success: false, message: 'Failed to update role' });
  }
};

export const updateRolePermissions = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid permissions payload' });
    }

    const roles = db.get('roles') || [];
    const idx = roles.findIndex((r) => r.id === id);

    if (idx === -1) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    roles[idx].permissions = {
      ...roles[idx].permissions,
      ...permissions,
    };
    roles[idx].updatedAt = new Date().toISOString();

    db.set('roles', roles);

    res.json({
      success: true,
      message: 'Role permissions saved successfully',
      data: roles[idx],
    });
  } catch (error) {
    console.error('Error saving role permissions:', error);
    res.status(500).json({ success: false, message: 'Failed to update role permissions' });
  }
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const roles = db.get('roles') || [];
    const users = db.get('users') || [];

    const isAssigned = users.some((u) => u.roleId === id);
    if (isAssigned) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete role because it is currently assigned to active users',
      });
    }

    const filtered = roles.filter((r) => r.id !== id);
    if (filtered.length === roles.length) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    db.set('roles', filtered);

    res.json({
      success: true,
      message: 'Role deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ success: false, message: 'Failed to delete role' });
  }
};
