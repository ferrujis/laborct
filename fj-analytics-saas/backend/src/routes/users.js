const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Validation rules
const userValidation = [
  body('username').trim().notEmpty().isLength({ min: 3, max: 50 }),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['viewer', 'admin'])
];

// Get all users
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const db = getDb();

  const users = await new Promise((resolve, reject) => {
    db.all(
      'SELECT id, tenant_id, username, email, role, is_active, last_login, created_at FROM users WHERE tenant_id = ?',
      [tenantId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  res.json(users.map(u => ({
    ...u,
    hasPassword: !!u.password
  })));
}));

// Create user
router.post('/', requireAdmin, userValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }

  const { username, password, email, role } = req.body;
  const { tenantId } = req.user;
  const db = getDb();

  // Check if exists
  const existing = await new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM users WHERE tenant_id = ? AND username = ?',
      [tenantId, username.toLowerCase()],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (existing) {
    throw new AppError('Username already exists', 409, 'USERNAME_EXISTS');
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const userId = uuidv4();

  await new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (id, tenant_id, username, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, tenantId, username.toLowerCase(), email || null, hashedPassword, role],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  res.status(201).json({
    id: userId,
    username: username.toLowerCase(),
    email: email || null,
    role
  });
}));

// Update user password
router.patch('/:id/password', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const { tenantId } = req.user;
  const db = getDb();

  if (!password || password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400, 'INVALID_PASSWORD');
  }

  // Verify user belongs to same tenant
  const user = await new Promise((resolve, reject) => {
    db.get(
      'SELECT id, role, tenant_id FROM users WHERE id = ?',
      [id],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (user.tenant_id !== tenantId) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Prevent admins from changing password of other admins (except self)
  if (user.role === 'admin' && user.id !== req.user.id && req.user.role !== 'admin') {
    throw new AppError('Cannot change password of another admin', 403, 'FORBIDDEN');
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  await new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hashedPassword, id],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  res.json({ message: 'Password updated successfully' });
}));

// Delete user (cannot delete self or primary admin)
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req.user;
  const db = getDb();

  // Prevent deleting self
  if (id === req.user.id) {
    throw new AppError('Cannot delete your own account', 400, 'CANNOT_DELETE_SELF');
  }

  // Get user
  const user = await new Promise((resolve, reject) => {
    db.get('SELECT id, role, tenant_id FROM users WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  if (user.tenant_id !== tenantId) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  // Prevent deleting last admin
  if (user.role === 'admin') {
    const adminCount = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM users WHERE tenant_id = ? AND role = ? AND is_active = 1',
        [tenantId, 'admin'],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? row.count : 0);
        }
      );
    });

    if (adminCount <= 1) {
      throw new AppError('Cannot delete the last admin', 400, 'LAST_ADMIN');
    }
  }

  // Soft delete (mark as inactive)
  await new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  res.json({ message: 'User deleted successfully' });
}));

module.exports = router;
