const express = require('express');
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.use(authenticateToken);

// Get recent logs
router.get('/', requireAdmin, asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { limit = 100, offset = 0 } = req.query;
  const db = getDb();

  const logs = await new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM access_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [tenantId, parseInt(limit), parseInt(offset)],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  const total = await new Promise((resolve, reject) => {
    db.get(
      'SELECT COUNT(*) as count FROM access_logs WHERE tenant_id = ?',
      [tenantId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      }
    );
  });

  res.json({
    logs,
    pagination: {
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
}));

// Get log stats
router.get('/stats', requireAdmin, asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const db = getDb();

  // Get log counts by action
  const actionStats = await new Promise((resolve, reject) => {
    db.all(
      `SELECT action, COUNT(*) as count FROM access_logs WHERE tenant_id = ? GROUP BY action`,
      [tenantId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  // Get log counts by user
  const userStats = await new Promise((resolve, reject) => {
    db.all(
      `SELECT user, COUNT(*) as count FROM access_logs WHERE tenant_id = ? AND user IS NOT NULL GROUP BY user ORDER BY count DESC LIMIT 10`,
      [tenantId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  // Get failed logins
  const failedLogins = await new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as count FROM access_logs WHERE tenant_id = ? AND action = 'LOGIN_FAILED' AND created_at > datetime('now', '-24 hours')`,
      [tenantId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row ? row.count : 0);
      }
    );
  });

  res.json({
    actionStats,
    userStats,
    failedLogins24h: failedLogins
  });
}));

module.exports = router;
