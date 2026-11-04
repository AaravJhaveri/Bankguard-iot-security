const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AccessAttempt = require('../models/AccessAttempt');
const authMiddleware = require('../middleware/auth');
const { requireManager } = require('../middleware/roleCheck');

// GET /api/users - List all users (Manager only)
router.get('/', authMiddleware, requireManager, async (req, res) => {
  try {
    const { role, isActive } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const users = await User.find(filter).select('-passwordHash').sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// POST /api/users - Create new user (Manager only)
router.post('/', authMiddleware, requireManager, async (req, res) => {
  try {
    const { name, employeeId, email, role, password, rfidUid } = req.body;
    if (!name || !employeeId || !password) {
      return res.status(400).json({ error: 'Name, employee ID, and password are required.' });
    }

    const existing = await User.findOne({ employeeId: employeeId.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ error: 'Employee ID is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      employeeId: employeeId.trim().toUpperCase(),
      email: email ? email.trim() : undefined,
      role: role === 'MANAGER' ? 'MANAGER' : 'EMPLOYEE',
      passwordHash,
      rfidUid: rfidUid ? rfidUid.trim() : null,
    });

    return res.status(201).json({
      id: newUser._id,
      name: newUser.name,
      employeeId: newUser.employeeId,
      role: newUser.role,
      email: newUser.email,
      rfidUid: newUser.rfidUid,
      isActive: newUser.isActive,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to create user.' });
  }
});

// PUT /api/users/:id - Update user (Manager only)
router.put('/:id', authMiddleware, requireManager, async (req, res) => {
  try {
    const { name, email, role, rfidUid, isActive } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (rfidUid !== undefined) updateData.rfidUid = rfidUid;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-passwordHash');
    if (!updated) return res.status(404).json({ error: 'User not found.' });

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update user.' });
  }
});

// PUT /api/users/:id/password - Reset password (Manager only)
router.put('/:id/password', authMiddleware, requireManager, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await User.findByIdAndUpdate(req.params.id, { passwordHash });
    return res.json({ message: 'Password reset successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// DELETE /api/users/:id - Soft-deactivate user (Manager only)
router.delete('/:id', authMiddleware, requireManager, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true }).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    return res.json({ message: 'User deactivated successfully.', user });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to deactivate user.' });
  }
});

// GET /api/users/:id/access-history - Paginated access history
router.get('/:id/access-history', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const attempts = await AccessAttempt.find({ employeeRef: req.params.id })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await AccessAttempt.countDocuments({ employeeRef: req.params.id });

    return res.json({
      data: attempts,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch access history.' });
  }
});

module.exports = router;

