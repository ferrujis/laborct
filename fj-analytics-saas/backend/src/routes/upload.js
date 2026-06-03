const express = require('express');
const multer = require('multer');
const path = require('path');
const XLSX = require('xlsx');
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE_MB || '50') * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError('Only Excel files (.xlsx, .xls) are allowed', 400, 'INVALID_FILE_TYPE'));
    }
  }
});

// Apply authentication and admin check to all upload routes
router.use(authenticateToken);
router.use(requireAdmin);

// Upload base data file
router.post('/base', upload.single('file'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const db = getDb();
  const { file } = req;

  if (!file) {
    throw new AppError('No file uploaded', 400, 'NO_FILE');
  }

  const filename = req.body.filename || file.originalname;

  // Parse Excel file
  const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
  const sheetName = workbook.SheetNames.find(name =>
    name.toLowerCase().includes('base') || name.toLowerCase().includes('dados')
  );

  if (!sheetName) {
    throw new AppError('Could not find "Base de dados" sheet', 400, 'SHEET_NOT_FOUND');
  }

  const worksheet = workbook.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: true });

  // Find header row
  let headerIndex = -1;
  const colMap = { vet: -1, prod: -1, vFixo: -1, sem: -1, data: -1, hN: -1, hNt: -1 };

  for (let i = 0; i < rawData.length; i++) {
    if (!rawData[i]) continue;
    for (let j = 0; j < rawData[i].length; j++) {
      const cellRaw = String(rawData[i][j] || '').trim().toLowerCase();
      if (cellRaw === 'veterinarios') { headerIndex = i; colMap.vet = j; }
      else if (cellRaw === 'producao') colMap.prod = j;
      else if (cellRaw === 'valores fixos') colMap.vFixo = j;
      else if (cellRaw === 'semana') colMap.sem = j;
      else if (cellRaw === 'data') colMap.data = j;
      else if (cellRaw === 'horas normais') colMap.hN = j;
      else if (cellRaw === 'horas noturnas') colMap.hNt = j;
    }
    if (headerIndex >= 0) break;
  }

  if (headerIndex < 0) {
    throw new AppError('Could not find header row with "Veterinarios"', 400, 'HEADER_NOT_FOUND');
  }

  const rows = [];
  for (let i = headerIndex + 1; i < rawData.length; i++) {
    const r = rawData[i];
    if (!r || !r[colMap.vet]) continue;

    const vet = String(r[colMap.vet]).trim();
    const prod = parseFloat(r[colMap.prod]) || 0;
    const vFixo = parseFloat(r[colMap.vFixo]) || 0;
    const hN = parseFloat(r[colMap.hN]) || 0;
    const hNt = parseFloat(r[colMap.hNt]) || 0;
    const sem = String(r[colMap.sem] || '').trim();

    // Parse date
    let ds = '';
    const dc = r[colMap.data];
    if (dc instanceof Date) {
      ds = dc.toISOString().slice(0, 10);
    } else if (typeof dc === 'number') {
      const d = XLSX.SSF.parse_date_code(dc);
      if (d) ds = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    } else if (dc) {
      ds = String(dc).slice(0, 10);
    }

    const mes = getMes(ds);

    rows.push({
      tenant_id: tenantId,
      vet,
      prod,
      rawProd: prod,
      valFixo: vFixo,
      valVar: 0,
      valTotal: 0,
      sem,
      data: ds,
      mes,
      horas: hN + hNt,
      hNorm: hN,
      hNot: hNt
    });
  }

  if (rows.length === 0) {
    throw new AppError('No valid data rows found in file', 400, 'NO_DATA');
  }

  // Clear existing base data and insert new
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM data_base WHERE tenant_id = ?', [tenantId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  // Insert new data
  const stmt = db.prepare(`
    INSERT INTO data_base (tenant_id, vet, prod, rawProd, valFixo, valVar, valTotal, sem, data, mes, horas, hNorm, hNot)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const row of rows) {
    stmt.run([row.tenant_id, row.vet, row.prod, row.rawProd, row.valFixo, row.valVar, row.valTotal, row.sem, row.data, row.mes, row.horas, row.hNorm, row.hNot]);
  }
  stmt.finalize();

  // Update meta
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO meta (tenant_id, key, value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(tenant_id, key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
      [tenantId, 'base', `${filename} (${rows.length} linhas)`, `${filename} (${rows.length} linhas)`],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO meta (tenant_id, key, value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(tenant_id, key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
      [tenantId, 'lastUpdated', new Date().toLocaleString('pt-BR'), new Date().toLocaleString('pt-BR')],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  res.json({
    success: true,
    message: `Base de dados sincronizada: ${rows.length} linhas`,
    filename,
    count: rows.length
  });
}));

// Upload anal file
router.post('/anal', upload.single('file'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const db = getDb();
  const { file } = req;

  if (!file) {
    throw new AppError('No file uploaded', 400, 'NO_FILE');
  }

  const filename = req.body.filename || file.originalname;

  const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
  const categories = {
    INTER: 'INTER',
    CIRURGICO: 'C_CIRURGICO',
    CLINICA: 'CLINICA',
    LAB: 'LAB'
  };

  let totalCount = 0;

  for (const sheetName of workbook.SheetNames) {
    const norm = sheetName.toLowerCase();
    let categoryKey = null;

    if (norm.includes('inter')) categoryKey = 'INTER';
    else if (norm.includes('cirurgico')) categoryKey = 'C_CIRURGICO';
    else if (norm.includes('clinica')) categoryKey = 'CLINICA';
    else if (norm.includes('lab')) categoryKey = 'LAB';

    if (!categoryKey) continue;

    const worksheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: true });

    for (let i = 1; i < raw.length; i++) {
      const r = raw[i];
      if (!r || (!r[0] && !r[3])) continue;

      let ds = '';
      const dc = r[0];
      if /dc instanceof Date) ds = dc.toISOString().slice(0, 10);
      else if (typeof dc === 'number') {
        const d = XLSX.SSF.parse_date_code(dc);
        if (d) ds = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
      } else if (dc) ds = String(dc).slice(0, 10);

      const vet = String(r[3] || '').trim();
      const proc = String(r[2] || '').trim();
      const pet = String(r[5] || '').trim();
      const valL = parseFloat(r[6]) || 0;
      const valT = parseFloat(r[7]) || 0;
      const mes = getMes(ds);

      if (!vet && !proc) continue;

      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO data_anal (tenant_id, category, vet, proc, pet, valL, valT, data, mes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [tenantId, categories[categoryKey], vet, proc, pet, valL, valT, ds, mes],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      totalCount++;
    }
  }

  // Update meta
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO meta (tenant_id, key, value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(tenant_id, key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
      [tenantId, 'anal', `${filename} (${totalCount} linhas)`, `${filename} (${totalCount} linhas)`],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  res.json({
    success: true,
    message: `Análises sincronizadas: ${totalCount} registros`,
    filename,
    count: totalCount
  });
}));

// Upload cogs file
router.post('/cogs', upload.single('file'), asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const db = getDb();
  const { file } = req;

  if (!file) {
    throw new AppError('No file uploaded', 400, 'NO_FILE');
  }

  const filename = req.body.filename || file.originalname;

  const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: null, raw: true });

  let headerIndex = -1;
  const colMap = { data: -1, cat: -1, forn: -1, val: -1 };

  for (let i = 0; i < raw.length; i++) {
    if (!raw[i] || !Array.isArray(raw[i])) continue;
    for (let j = 0; j < raw[i].length; j++) {
      if (!raw[i][j]) continue;
      const norm = String(raw[i][j]).toLowerCase();
      if (norm.includes('data')) { colMap.data = j; headerIndex = i; }
      else if (norm.includes('categoria')) colMap.cat = j;
      else if (norm.includes('fornecedor') || norm.includes('item')) colMap.forn = j;
      else if (norm.includes('valor')) colMap.val = j;
    }
    if (headerIndex >= 0 && colMap.val >= 0) break;
  }

  if (headerIndex < 0 || colMap.val < 0) {
    throw new AppError('Could not find required columns (Data, Valor)', 400, 'HEADER_NOT_FOUND');
  }

  // Clear existing cogs data
  await new Promise((resolve, reject) => {
    db.run('DELETE FROM data_cogs WHERE tenant_id = ?', [tenantId], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  let count = 0;
  for (let i = headerIndex + 1; i < raw.length; i++) {
    const r = raw[i];
    if (!r || r[colMap.val] == null) continue;

    let ds = '';
    const dc = r[colMap.data];
    if (dc instanceof Date) ds = dc.toISOString().slice(0, 10);
    else if (typeof dc === 'number') {
      const d = XLSX.SSF.parse_date_code(dc);
      if (d) ds = `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    } else if (dc) ds = String(dc).slice(0, 10);

    const mes = getMes(ds);
    const cat = String(r[colMap.cat] || 'Geral').trim();
    const forn = String(r[colMap.forn] || '').trim();

    let valStr = String(r[colMap.val] || '0');
    valStr = valStr.replace(/R\$/gi, '');
    if (valStr.includes(',') && valStr.includes(' ') && valStr.includes('.')) {
      valStr = valStr.replace(/\./g, '').replace(',', '.');
    } else if (valStr.includes(',')) {
      valStr = valStr.replace(',', '.');
    }
    const val = parseFloat(valStr) || 0;

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO data_cogs (tenant_id, data, mes, cat, forn, val) VALUES (?, ?, ?, ?, ?, ?)`,
        [tenantId, ds, mes, cat, forn, val],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    count++;
  }

  // Update meta
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO meta (tenant_id, key, value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(tenant_id, key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP`,
      [tenantId, 'cogs', `${filename} (${count} linhas)`, `${filename} (${count} linhas)`],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });

  res.json({
    success: true,
    message: `Custos sincronizados: ${count} lançamentos`,
    filename,
    count
  });
}));

// Helper function to extract month from date string
function getMes(ds) {
  if (!ds || ds.length < 7) return '';
  const monthNum = parseInt(ds.substring(5, 7));
  const meses = ['', 'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  return months[monthNum] || '';
}

module.exports = router;
