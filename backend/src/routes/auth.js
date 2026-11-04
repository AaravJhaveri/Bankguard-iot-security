const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const { createEvent } = require('../services/eventService');
const AccessAttempt = require('../models/AccessAttempt');
const { openWindow } = require('../services/authorizationWindow');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    if (!employeeId || !password) {
      return res.status(400).json({ error: 'Employee ID and password are required.' });
    }

    const user = await User.findOne({ employeeId: employeeId.trim().toUpperCase() });
    if (!user || !user.isActive) {
      await AccessAttempt.create({
        zone: 'ENTRANCE',
        result: 'DENIED',
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: 'Invalid credentials or inactive account.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      await AccessAttempt.create({
        employeeRef: user._id,
        zone: 'ENTRANCE',
        result: 'WRONG_PIN',
        ipAddress: req.ip,
      });
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // Success: log access attempt and event
    await AccessAttempt.create({
      employeeRef: user._id,
      rfidUid: user.rfidUid || null,
      zone: 'ENTRANCE',
      result: 'GRANTED',
      ipAddress: req.ip,
    });

    await createEvent({
      category: 'ACCESS_ATTEMPT',
      description: `Employee ${user.name} (${user.employeeId}) logged in successfully.`,
      source: 'LOGIN_PORTAL',
      employeeRef: user._id,
      severity: 'INFO',
    });

    // Open an authorized-passage window for entrance passage (e.g. 30 seconds)
    openWindow('ENTRANCE', user.employeeId, user._id);

    const token = jwt.sign(
      {
        id: user._id,
        employeeId: user.employeeId,
        name: user.name,
        role: user.role,
      },
      process.env.JWT_SECRET || 'bankguard_super_secure_jwt_secret_key_2026_xyz',
      { expiresIn: process.env.JWT_EXPIRY || '8h' }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        employeeId: user.employeeId,
        name: user.name,
        role: user.role,
        email: user.email,
        rfidUid: user.rfidUid,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    await createEvent({
      category: 'SYSTEM',
      description: `User ${req.user.name} (${req.user.employeeId}) logged out.`,
      source: 'LOGIN_PORTAL',
      employeeRef: req.user.id,
      severity: 'INFO',
    });
    return res.json({ message: 'Logged out successfully.' });
  } catch (error) {
    return res.status(500).json({ error: 'Error processing logout.' });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.json(user);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
});

module.exports = router;

