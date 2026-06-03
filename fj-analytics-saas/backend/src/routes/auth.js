const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Validation rules
const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
];

const registerValidation = [
  body('username').trim().notEmpty().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9._-]+$/).withMessage('Username can only contain letters, numbers, dots, underscores and hyphens'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').optional().isEmail().withMessage('Invalid email format')
];

// Login endpoint
router.post('/login', loginValidation, asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }

  const { username, password } = req.body;
  const db = getDb();

  // Find user
  const user = await new Promise((resolve, reject) => {
    db.get(
      'SELECT id, tenant_id, username, email, password, role, is_active FROM users WHERE username = ?',
      [username.toLowerCase()],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (!user) {
    // Log failed attempt
    await logAccess(null, 'LOGIN_FAILED', req, `User not found: ${username}`);
    return res.status(401).json({
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS'
    });
  }

  if (!user.is_active) {
    return res.status(401).json({
      error: 'Account is inactive',
      code: 'ACCOUNT_INACTIVE'
    });
  }

  // Verify password
  const isValidPassword = bcrypt.compareSync(password, user.password);
  if (!isValidPassword) {
    await logAccess(user.id, 'LOGIN_FAILED', req, 'Invalid password');
    return res.status(401).json({
      error: 'Invalid credentials',
      code: 'INVALID_CREDENTIALS'
    });
  }

  // Generate token
  const token = generateToken(user.id, user.tenant_id, user.username, user.role);

  // Update last login
  await new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  // Log successful login
  await logAccess(user.id, 'LOGIN_SUCCESS', req);

  // Send response
  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id
    }
  });
}));

// Register new user (admin only in production)
router.post('/register', registerValidation, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array()
    });
  }

  const { username, password, email, role = 'viewer', tenantId: customTenantId } = req.body;
  const db = getDb();

  // In production, only admins can create users
  // In development, allow self-registration
  let tenantId = customTenantId || 'default';

  // Check if user already exists
  const existingUser = await new Promise((resolve, reject) => {
    db.get(
      'SELECT id FROM users WHERE username = ?',
      [username.toLowerCase()],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });

  if (existingUser) {
    return res.status(409).json({
      error: 'Username already exists',
      code: 'USERNAME_EXISTS'
    });
  }

  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10);
  const userId = uuidv4();

  // Create user
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

  // Generate token for immediate login
  const token = generateToken(userId, tenantId, username.toLowerCase(), role);

  res.status(201).json({
    message: 'User created successfully',
    token,
    user: {
      id: userId,
      username: username.toLowerCase(),
      email: email || null,
      role: role,
      tenantId: tenantId
    }
  });
}));

// Verify token
router.get('/verify', authenticateToken, asyncHandler(async (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      tenantId: req.user.tenantId
    }
  });
}));

// Logout (invalidate token - we could add token to blacklist here)
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // Log logout
  await logAccess(req.user.id, 'LOGOUT', req);
  res.json({ message: 'Logged out successfully' });
}));

// Helper function to log access
async function logAccess(userId, action, req, details = null) {
  const db = getDb();
  const tenantId = req.user?.tenantId || 'default';

  try {
    db.run(
      `INSERT INTO access_logs (tenant_id, user_id, user, action, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        tenantId,
        userId,
        req.body?.username || null,
        action,
        details,
        req.ip || req.connection?.remoteAddress,
        req.headers['user-agent']
      ]
    );
  } catch (err) {
    console.error('Failed to log access:', err);
  }
}

module.exports = router;
