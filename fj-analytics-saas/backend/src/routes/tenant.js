const express = require('express');
const path = require('path');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

router.use(authenticateToken);

// Get tenant info
router.get('/info', asyncHandler(async (req, res) => {
  const { tenantId, role } = req.user;
  // Return limited tenant info based on role
  res.json({
    tenantId,
    role,
    features: {
      uploadFiles: role === 'admin',
      manageUsers: role === 'admin',
      viewLogs: role === 'admin',
      viewInsights: true
    }
  });
}));

module.exports = router;
