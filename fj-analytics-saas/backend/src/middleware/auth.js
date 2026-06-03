const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

// Verify JWT token middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const tokenFromHeader = authHeader && authHeader.split(' ')[1];

  // Also check for token in custom header for flexibility
  const token = tokenFromHeader || req.headers['x-access-token'];

  if (!token) {
    return res.status(401).json({
      error: 'No token provided',
      code: 'NO_TOKEN'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user still exists and is active
    const db = getDb();
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, tenant_id, username, role, is_active FROM users WHERE id = ? AND is_active = 1',
        [decoded.userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return res.status(401).json({
        error: 'User not found or inactive',
        code: 'INVALID_USER'
      });
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      userId: user.id,
      tenantId: user.tenant_id,
      username: user.username,
      role: user.role,
      isActive: user.is_active
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    console.error('Auth error:', err);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

// Check if user has required role
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: roles
      });
    }

    next();
  };
};

// Check if user has admin role
const requireAdmin = requireRole('admin');

// Check if user has viewer or higher role
const requireViewer = requireRole('viewer', 'admin');

// Generate JWT token
const generateToken = (userId, tenantId, username, role) => {
  return jwt.sign(
    {
      userId,
      tenantId,
      username,
      role,
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    {
      expiresIn: '24h',
      issuer: 'fj-analytics-saas'
    }
  );
};

// Verify token without middleware (for optional auth)
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireViewer,
  generateToken,
  verifyToken
};
