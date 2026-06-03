const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { getDb } = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

router.use(authenticateToken);
router.use(requireAdmin);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = require('path').extname(file.originalname).toLowerCase();
    if (['.xlsx', '.xls'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new AppError('Only Excel files allowed', 400, 'INVALID_FILE_TYPE'));
    }
  }
});

// Parse escala file
router.post('/parse', upload.single('file'), asyncHandler(async (req, res) => {
  const { file } = req;

  if (!file) {
    throw new AppError('No file uploaded', 400, 'NO_FILE');
  }

  const filename = file.originalname;
  const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '', raw: false });

  // Parse escala data
  const parsed = {};
  let currentTurno = null;

  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || row.every(c => !c)) continue;
    const cells = row.map(c => String(c).trim());

    // Detect week header
    const isWeekHeader = cells.some(c => /^(SEG|TER|QUA|QUI|SEX|SÁB|DOM|SAB)\s+\d{2}\/\d{2}/.test(c));
    if (isWeekHeader) continue;

    // Detect turno row
    const firstNE = cells.find(c => c);
    if (firstNE && /^\d{2}:\d{2}~\d{2}:\d{2}$/.test(firstNE)) {
      currentTurno = firstNE;
      for (let ci = 2; ci < cells.length; ci++) {
        const name = cleanName(cells[ci]);
        if (name && name.length > 2) {
          const { h, noturno } = calcHours(firstNE);
          addHours(parsed, name, h, noturno);
        }
      }
    }

    // Continuation rows
    if (currentTurno) {
      for (let ci = 0; ci < cells.length; ci++) {
        const c = cells[ci];
        if (!c || /^\d{2}:\d{2}/.test(c)) continue;
        if (/^(SEG|TER|QUA|QUI|SEX|SÁB|DOM|SAB)/.test(c)) continue;
        const name = cleanName(c);
        if (name && name.length > 2) {
          const { h, noturno } = calcHours(currentTurno);
          addHours(parsed, name, h, noturno);
        }
      }
    }
  }

  res.json({
    filename,
    count: Object.keys(parsed).length,
    data: parsed
  });
}));

// Save escala hours
router.post('/save', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const { escalaData, mappings, mes } = req.body;
  const db = getDb();

  if (!escalaData || !mappings || !mes) {
    throw new AppError('Missing required data', 400, 'MISSING_DATA');
  }

  // Calculate hours per vet
  const vetHours = {};
  for (const [name, data] of Object.entries(escalaData)) {
    const vet = mappings[name];
    if (!vet) continue;
    if (!vetHours[vet]) vetHours[vet] = { normal: 0, noturna: 0 };
    vetHours[vet].normal += data.normal || 0;
    vetHours[vet].noturna += data.noturna || 0;
  }

  // Update base data
  for (const [vet, hours] of Object.entries(vetHours)) {
    const weekNorm = Math.round((hours.normal / 4) * 10) / 10;
    const weekNot = Math.round((hours.noturna / 4) * 10) / 10;
    db.run(
      'UPDATE data_base SET hNorm = ?, hNot = ?, horas = ? WHERE tenant_id = ? AND mes = ? AND vet = ?',
      [weekNorm, weekNot, weekNorm + weekNot, tenantId, mes, vet],
      (err) => {
        if (err) console.error('Error updating horas:', err);
      }
    );
  }

  res.json({
    success: true,
    message: `Updated hours for ${Object.keys(vetHours).length} veterinarians`,
    vets: Object.keys(vetHours)
  });
}));

// Get saved mappings
router.get('/mappings', asyncHandler(async (req, res) => {
  const { tenantId } = req.user;
  const db = getDb();

  const rows = await new Promise((resolve, reject) => {
    db.all(
      'SELECT escala_name, vet_login FROM escala_mappings WHERE tenant_id = ?',
      [tenantId],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      }
    );
  });

  const mappingObj = {};
  rows.forEach(m => { mappingObj[m.escala_name] = m.vet_login; });
  res.json(mappingObj);
}));

function cleanName(n) {
  return String(n)
    .replace(/\(CO\)/g, '').replace(/\(FU\)/g, '').replace(/\(FJ\)/g, '')
    .replace(/\(FN\)/g, '').replace(/\(FR\)/g, '').trim();
}

function calcHours(turno) {
  const m = turno.match(/(\d{2}):(\d{2})~(\d{2}):(\d{2})/);
  if (!m) return { h: 0, noturno: false };
  let s = parseInt(m[1]) * 60 + parseInt(m[2]);
  let e = parseInt(m[3]) * 60 + parseInt(m[4]);
  if (e <= s) e += 24 * 60;
  const h = (e - s) / 60;
  const noturno = parseInt(m[1]) >= 20 || (e > 22 * 60 && e <= 33 * 60);
  return { h, noturno };
}

function addHours(parsed, name, h, noturno) {
  if (!parsed[name]) parsed[name] = { normal: 0, noturna: 0 };
  if (noturno) parsed[name].noturna += h;
  else parsed[name].normal += h;
}

module.exports = router;
