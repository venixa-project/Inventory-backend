import { Request, Response } from 'express';
import { db } from '../models/db.js';
import { BranchRecord } from '../types/index.js';
import { isPostgresActive, getPostgresPool } from '../models/postgres.js';
import { PostgresSync } from '../models/postgresSync.js';

const getTenantId = (req: Request): string => {
  return (
    (req.headers['x-tenant-id'] as string) ||
    (req as any).user?.tenantId ||
    'CLI-1001'
  );
};

export const getBranches = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const search = ((req.query.search as string) || '').toLowerCase().trim();

    let result: BranchRecord[] = [];

    if (isPostgresActive()) {
      const pool = getPostgresPool();
      const bRes = await pool.query(
        'SELECT * FROM branches WHERE tenant_id = $1 OR tenant_id IS NULL ORDER BY created_at ASC',
        [tenantId]
      );

      result = bRes.rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        code: r.code || '',
        group: r.group_name || 'General',
        city: r.city || '',
        state: r.state || '',
        address: r.address || '',
        isActive: r.is_active ?? true,
      }));
    } else {
      result = db.get('branches') || [];
    }

    if (search) {
      result = result.filter(
        (b) =>
          b.name.toLowerCase().includes(search) ||
          b.code.toLowerCase().includes(search) ||
          b.group.toLowerCase().includes(search) ||
          b.city.toLowerCase().includes(search)
      );
    }

    res.json({
      success: true,
      data: result,
      totalCount: result.length,
    });
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve branches' });
  }
};

export const createBranch = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { name, code, group, city, state, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Branch name is required' });
    }

    const newBranch: BranchRecord = {
      id: `branch-${Date.now()}`,
      name: name.trim(),
      code: code?.trim() || `BR-${Math.floor(100 + Math.random() * 900)}`,
      group: group?.trim() || 'General Branches',
      city: city?.trim() || 'Hyderabad',
      state: state?.trim() || 'Telangana',
      address: address?.trim() || '',
      isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : true,
    };

    if (isPostgresActive()) {
      await PostgresSync.syncBranch(newBranch, tenantId);
    }

    const branches = db.get('branches') || [];
    branches.push(newBranch);
    db.set('branches', branches);

    res.status(201).json({
      success: true,
      message: 'Branch created successfully',
      data: newBranch,
    });
  } catch (error) {
    console.error('Error creating branch:', error);
    res.status(500).json({ success: false, message: 'Failed to create branch' });
  }
};

export const updateBranch = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const branchId = req.params.id as string;
    const { name, code, group, city, state, address, isActive } = req.body;

    let existingBranch: BranchRecord | undefined;
    const branches = db.get('branches') || [];
    existingBranch = branches.find((b) => b.id === branchId);

    if (isPostgresActive()) {
      const pool = getPostgresPool();
      const check = await pool.query(
        'SELECT * FROM branches WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)',
        [branchId, tenantId]
      );
      if (check.rows.length > 0) {
        const row = check.rows[0];
        existingBranch = {
          id: row.id,
          name: row.name,
          code: row.code || '',
          group: row.group_name || 'General',
          city: row.city || 'Hyderabad',
          state: row.state || 'Telangana',
          address: row.address || '',
          isActive: row.is_active ?? true,
        };
      }
    }

    if (!existingBranch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }

    const updatedBranch: BranchRecord = {
      ...existingBranch,
      name: name !== undefined ? name.trim() : existingBranch.name,
      code: code !== undefined ? code.trim() : existingBranch.code,
      group: group !== undefined ? group.trim() : existingBranch.group,
      city: city !== undefined ? city.trim() : existingBranch.city,
      state: state !== undefined ? state.trim() : existingBranch.state,
      address: address !== undefined ? address.trim() : existingBranch.address,
      isActive: isActive !== undefined ? Boolean(isActive) : existingBranch.isActive,
    };

    if (isPostgresActive()) {
      await PostgresSync.syncBranch(updatedBranch, tenantId);
    }

    const idx = branches.findIndex((b) => b.id === branchId);
    if (idx !== -1) {
      branches[idx] = updatedBranch;
    } else {
      branches.push(updatedBranch);
    }
    db.set('branches', branches);

    res.json({
      success: true,
      message: 'Branch updated successfully',
      data: updatedBranch,
    });
  } catch (error) {
    console.error('Error updating branch:', error);
    res.status(500).json({ success: false, message: 'Failed to update branch' });
  }
};

export const deleteBranch = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const branchId = req.params.id as string;

    if (isPostgresActive()) {
      await PostgresSync.deleteBranch(branchId, tenantId);
    }

    const branches = db.get('branches') || [];
    const filtered = branches.filter((b) => b.id !== branchId);
    db.set('branches', filtered);

    res.json({
      success: true,
      message: 'Branch deleted successfully',
      data: { id: branchId },
    });
  } catch (error) {
    console.error('Error deleting branch:', error);
    res.status(500).json({ success: false, message: 'Failed to delete branch' });
  }
};
