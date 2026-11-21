import { Request, Response } from 'express';
import { db } from '../models/db.js';
import { BranchRecord } from '../types/index.js';

export const getBranches = async (req: Request, res: Response) => {
  try {
    const branches = db.get('branches') || [];
    const search = (req.query.search as string || '').toLowerCase().trim();

    let result = [...branches];
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
    const { name, code, group, city, state, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Branch name is required' });
    }

    const branches = db.get('branches') || [];
    const newBranch: BranchRecord = {
      id: `branch-${Date.now()}`,
      name: name.trim(),
      code: code?.trim() || `BR-${Math.floor(100 + Math.random() * 900)}`,
      group: group?.trim() || 'General Branches',
      city: city?.trim() || 'Hyderabad',
      state: state?.trim() || 'Telangana',
      address: address?.trim() || '',
      isActive: true,
    };

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
