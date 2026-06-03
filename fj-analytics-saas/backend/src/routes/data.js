const express = require('express');
const { getDb } = require('../config/database');
const { authenticateToken, requireViewer } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
router.use(requireViewer);

// Get all data (base, anal, cogs, meta)
router.get('/', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const db = getDb();

  // Get base data
  const base = await new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM data_base WHERE tenant_id = ? ORDER BY data DESC',
      [tenantId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  // Get anal data grouped by category
  const anal = {};
  const categories = ['CLINICA', 'INTER', 'C_CIRURGICO', 'LAB'];
  for (const cat of categories) {
    const data = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM data_anal WHERE tenant_id = ? AND category = ? ORDER BY data DESC',
        [tenantId, cat],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
    anal[cat] = data;
  }

  // Get cogs data
  const cogs = await new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM data_cogs WHERE tenant_id = ? ORDER BY data DESC',
      [tenantId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  // Get meta
  const meta = {};
  const metaRows = await new Promise((resolve, reject) => {
    db.all(
      'SELECT key, value FROM meta WHERE tenant_id = ?',
      [tenantId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });
  metaRows.forEach(row => { meta[row.key] = row.value; });

  res.json({
    base,
    anal,
    cogs,
    meta
  });
}));

// Get base data only
router.get('/base', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const db = getDb();

  const { vet, mes, sem } = req.query;
  let query = 'SELECT * FROM data_base WHERE tenant_id = ?';
  const params = [tenantId];

  if (vet) { query += ' AND vet = ?'; params.push(vet); }
  if (mes) { query += ' AND mes = ?'; params.push(mes); }
  if (sem) { query += ' AND sem = ?'; params.push(sem); }

  query += ' ORDER BY data DESC';

  const data = await new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

  res.json(data);
}));

// Get anal data by category
router.get('/anal/:category', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { category } = req.params;
  const db = getDb();

  const validCategories = ['CLINICA', 'INTER', 'C_CIRURGICO', 'LAB'];
  if (!validCategories.includes(category)) {
    return res.status(400).json({ error: 'Invalid category' });
  }

  const data = await new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM data_anal WHERE tenant_id = ? AND category = ? ORDER BY data DESC',
      [tenantId, category],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  res.json(data);
}));

// Get cogs data
router.get('/cogs', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { mes } = req.query;
  const db = getDb();

  let query = 'SELECT * FROM data_cogs WHERE tenant_id = ?';
  const params = [tenantId];

  if (mes) { query += ' AND mes = ?'; params.push(mes); }

  query += ' ORDER BY data DESC';

  const data = await new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

  res.json(data);
}));

// Get meta info
router.get('/meta', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const db = getDb();

  const rows = await new Promise((resolve, reject) => {
    db.all(
      'SELECT key, value FROM meta WHERE tenant_id = ?',
      [tenantId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  const meta = {};
  rows.forEach(row => { meta[row.key] = row.value; });

  res.json(meta);
}));

// Get unique values for filters
router.get('/filters', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const db = getDb();

  // Get unique vets, meses from base
  const vets = await new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT vet FROM data_base WHERE tenant_id = ? ORDER BY vet', [tenantId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.vet).filter(Boolean));
    });
  });

  const mesesBase = await new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT mes FROM data_base WHERE tenant_id = ? ORDER BY mes', [tenantId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.mes).filter(Boolean));
    });
  });

  const semanas = await new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT sem FROM data_base WHERE tenant_id = ? AND sem IS NOT NULL ORDER BY sem', [tenantId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.sem).filter(Boolean));
    });
  });

  const mesesCogs = await new Promise((resolve, reject) => {
    db.all('SELECT DISTINCT mes FROM data_cogs WHERE tenant_id = ? ORDER BY mes', [tenantId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.mes).filter(Boolean));
    });
  });

  res.json({
    vets,
    mesesBase,
    semanas,
    mesesCogs
  });
}));

module.exports = router;
