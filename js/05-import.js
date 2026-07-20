function dropF(e,type){
  e.preventDefault();
  e.currentTarget.classList.remove('drag');
  if(S.role !== 'admin') { toast('Acesso negado.','err'); return; }
  const f=e.dataTransfer.files[0];
  if(f)procXlsx(f,type);
}
function loadF(e,type){
  if(S.role !== 'admin') { toast('Acesso negado.','err'); e.target.value=''; return; }
  const f=e.target.files[0];
  if(f)procXlsx(f,type);
  e.target.value='';
}

function procXlsx(file,type){
  toast('Lendo arquivo Excel...', 'inf');
  const rd=new FileReader();
  rd.onload=ev=>{
    try{
      const wb=XLSX.read(ev.target.result,{type:'array',cellDates:true});
      if(type==='base')   parseBase(wb,file.name);
      else if(type==='anal')   parseAnal(wb,file.name);
      else if(type==='cogs')   parseCogs(wb,file.name);
      else if(type==='escala') parseEscala(wb,file.name);
    }catch(err){setFst(type,'Erro: '+err.message,false);toast('Erro ao ler o arquivo.','err')}
  };
  rd.readAsArrayBuffer(file);
}

function parseBase(wb,fname){
  const ws=wb.Sheets['Base de dados'];
  if(!ws){setFst('base','Aba "Base de dados" não encontrada.',false);return}

  const rawN=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
  let hi=-1;
  let col = { vet:1, prod:2, vFixo:4, sem:7, data:8, hN:10, hNt:11 };

  for(let i=0;i<rawN.length;i++){
    if(rawN[i]){
      let achouVet = false;
      for(let j=0; j<rawN[i].length; j++) {
        const cellRaw = String(rawN[i][j]||'').trim();
        const val = cellRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

        if(cellRaw === 'Veterinarios') { hi=i; col.vet=j; achouVet = true; }
        else if(val === 'producao') col.prod=j;
        else if(val === 'valores fixos') col.vFixo=j;
        else if(val === 'semana') col.sem=j;
        else if(val === 'data') col.data=j;
        else if(val === 'horas normais') col.hN=j;
        else if(val === 'horas noturnas') col.hNt=j;
      }
      if(achouVet) break;
    }
  }

  if(hi<0){setFst('base','Cabeçalho "Veterinarios" não encontrado.',false);return}

  const tempRows=[];
  for(let i=hi+1;i<rawN.length;i++){
    const r=rawN[i];
    if(!r||!r[col.vet])continue;

    const vet=String(r[col.vet]).trim();
    const prod=parseFloat(r[col.prod])||0;
    const vFixo=parseFloat(r[col.vFixo])||0;
    const hN=parseFloat(r[col.hN])||0;
    const hNt=parseFloat(r[col.hNt])||0;
    const sem=String(r[col.sem]||'').trim();

    let ds='';
    const dc=r[col.data];
    if(dc instanceof Date){
      ds=dc.toISOString().slice(0,10);
    } else if(typeof dc==='number'){
      const d=XLSX.SSF.parse_date_code(dc);
      if(d) ds=`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    } else if(dc){
      ds=String(dc).trim();
      if(ds.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const p = ds.slice(0,10).split('/');
        ds = `${p[2]}-${p[1]}-${p[0]}`;
      } else {
        ds = ds.slice(0,10);
      }
    }

    const mes=getMes(ds);

    tempRows.push({
      vet, prod, rawProd: prod, valVar: 0, valFixo: vFixo, valTotal: 0,
      sem, data: ds, mes, horas: hN + hNt, hNorm: hN, hNot: hNt, perc: 0
    });
  }

  if(!tempRows.length){setFst('base','Nenhuma linha válida.',false);return}

  toast('Enviando Base de Dados para a nuvem...', 'inf');
  db.ref('laborbi/base').set(tempRows).then(() => {
    db.ref('laborbi/meta/base').set(fname+' ('+tempRows.length+' linhas)');
    db.ref('laborbi/meta/lastUpdated').set(new Date().toLocaleString('pt-BR'));
    toast('Base de dados sincronizada com sucesso! ✓','ok');
  }).catch(err => toast('Erro: ' + err.message, 'err'));
}

function parseAnal(wb,fname){
  const anal={'INTER':[], 'C_CIRURGICO':[], 'CLINICA':[], 'LAB':[]};
  let total=0;

  wb.SheetNames.forEach(sh => {
    const norm = sh.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    let safeKey = null;

    if(norm.includes('inter')) safeKey = 'INTER';
    else if(norm.includes('cirurgico')) safeKey = 'C_CIRURGICO';
    else if(norm.includes('clinica')) safeKey = 'CLINICA';
    else if(norm.includes('lab')) safeKey = 'LAB';

    if(safeKey) {
      const ws = wb.Sheets[sh];
      const raw = XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
      const rows = [];
      for(let i=1;i<raw.length;i++){
        const r=raw[i];if(!r||(!r[0]&&!r[3]))continue;
        let ds='';
        const dc=r[0];
        if(dc instanceof Date)ds=dc.toISOString().slice(0,10);
        else if(typeof dc==='number'){const d=XLSX.SSF.parse_date_code(dc);if(d)ds=`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`}
        else if(dc)ds=String(dc).slice(0,10);
        const vet=String(r[3]||'').trim();
        const proc=String(r[2]||'').trim();
        const pet=String(r[5]||'').trim();
        const valL=parseFloat(r[6])||0;
        const valT=parseFloat(r[7])||0;
        const mes=getMes(ds);
        if(!vet&&!proc)continue;
        rows.push({data:ds,mes,vet,proc,pet,valL,valT});
      }
      anal[safeKey] = rows;
      total += rows.length;
    }
  });

  toast('Enviando Análises para a nuvem...', 'inf');
  db.ref('laborbi/anal').set(anal).then(() => {
    db.ref('laborbi/meta/anal').set(fname+' ('+total+' linhas)');
    db.ref('laborbi/meta/lastUpdated').set(new Date().toLocaleString('pt-BR'));
    toast('Análises sincronizadas com sucesso! ✓','ok');
  }).catch(err => toast('Erro: ' + err.message, 'err'));
}

function parseCogs(wb,fname){
  const ws = wb.Sheets[wb.SheetNames[0]];
  if(!ws){setFst('cogs','Aba de Custos não encontrada.',false);return}

  const raw = XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});

  let hi = -1;
  let col = { data:-1, cat:-1, forn:-1, val:-1, mes:-1, period:-1, year:-1, costCenter:-1, desc:-1 };
  let isRawExport = false;

  for(let i=0; i<raw.length; i++){
    if(raw[i] && Array.isArray(raw[i])){
      let achouData = false;
      let achouAmount = false;
      let achouCostCenter = false;
      let achouEffDate = false;
      let achouDesc = false;
      for(let j=0; j<raw[i].length; j++) {
        if(!raw[i][j]) continue;
        const norm = String(raw[i][j]).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

        // ── Formato bruto (export ERP/Helios) ──
        if(norm.includes('effective date')) { col.data = j; achouEffDate = true; }
        else if(norm === 'period') { col.period = j; }
        else if(norm === 'year') { col.year = j; }
        else if(norm === 'cost center') { col.costCenter = j; achouCostCenter = true; }
        else if(norm.includes('account description')) { col.desc = j; achouDesc = true; }
        else if(norm.includes('entry reference')) { col.forn = j; }
        else if(norm === 'amount' || norm.includes('amount')) { col.val = j; achouAmount = true; }

        // ── Formato manual pt-BR ──
        else if(norm.includes('data')) { col.data = j; achouData = true; }
        else if(norm.includes('categoria')) { col.desc = j; achouDesc = true; } // fallback
        else if(norm.includes('fornecedor') || norm.includes('item')) { col.forn = j; }
        else if(norm.includes('valor')) { col.val = j; achouAmount = true; }
        else if(norm==='mes'||norm==='mês') { col.mes = j; }
      }
      // Se encontramos os campos mínimos, define o cabeçalho
      if((achouEffDate || achouData) && achouAmount) {
        // Prioridade: desc (ACCOUNT DESCRIPTION) > costCenter
        if(achouDesc) {
          col.cat = col.desc;
        } else if(achouCostCenter) {
          col.cat = col.costCenter;
        } else {
          col.cat = -1;
        }
        hi = i;
        isRawExport = achouEffDate;
        break;
      }
    }
  }

  if(hi < 0 || col.val < 0){setFst('cogs','Cabeçalho "Data" ou "Valor" não encontrado.',false);return}

  const rows=[];
  for(let i=hi+1; i<raw.length; i++){
    const r=raw[i];
    if(!r || r[col.val] == null || typeof r[col.val] !== 'number') continue;
    // Ignora linhas de rodapé/filtro
    if(isRawExport && (!r[col.data] || col.cat < 0 || !r[col.cat])) continue;

    let ds='';
    const dc=r[col.data];
    if(dc instanceof Date){
      ds=dc.toISOString().slice(0,10);
    } else if(typeof dc==='number'){
      const d=XLSX.SSF.parse_date_code(dc);
      if(d) ds=`${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
    } else if(dc){
      ds=String(dc).trim();
      if(ds.match(/^\d{2}\/\d{2}\/\d{4}/)) {
        const p = ds.slice(0,10).split('/');
        ds = `${p[2]}-${p[1]}-${p[0]}`;
      } else {
        ds = ds.slice(0,10);
      }
    }

    let mes = '';
    if(isRawExport){
      const periodRaw = col.period >= 0 && r[col.period] ? String(r[col.period]) : '';
      const pm = periodRaw.match(/(\d{1,2})/);
      if(pm) mes = MESES[parseInt(pm[1],10)] || '';
      if(!mes) mes = getMes(ds);
    } else {
      const mesRaw = col.mes >= 0 && r[col.mes] ? String(r[col.mes]).trim().toLowerCase() : '';
      mes = mesRaw || getMes(ds);
    }

    // Categoria: agora usamos col.cat que foi definida como desc ou costCenter
    const cat = col.cat >= 0 ? String(r[col.cat]||'Geral').trim() : 'Geral';
    const forn = col.forn >= 0 ? String(r[col.forn]||'').trim() : '';

    let valRaw = r[col.val];
    let valTotal = 0;
    if (typeof valRaw === 'number') {
        valTotal = valRaw;
    } else if (valRaw) {
        let valStr = String(valRaw).replace(/R\$/gi, '').trim();
        if(valStr.includes(',') && valStr.includes('.')) {
            valStr = valStr.replace(/\./g, '').replace(',', '.');
        } else if (valStr.includes(',')) {
            valStr = valStr.replace(',', '.');
        }
        valTotal = parseFloat(valStr) || 0;
    }

    rows.push({ data: ds, mes, cat, forn, val: valTotal });
  }

  if(!rows.length){setFst('cogs','Nenhuma linha válida no arquivo de custos.',false);return}

  toast('Enviando Custos Operacionais para a nuvem...', 'inf');
  db.ref('laborbi/cogs').set(rows).then(() => {
    db.ref('laborbi/meta/cogs').set(fname+' ('+rows.length+' linhas)');
    db.ref('laborbi/meta/lastUpdated').set(new Date().toLocaleString('pt-BR'));
    toast('Custos sincronizados com sucesso! ✓','ok');
    S.cogs = rows;
    // Auto-atualiza as categorias e re-renderiza se o CogsBI estiver aberto
    if (document.getElementById('cogs-view') && document.getElementById('cogs-view').style.display !== 'none') {
      renderCogs();
    }
  }).catch(err => toast('Erro: ' + err.message, 'err'));
}

function setFst(type,msg,ok){
  const el=document.getElementById('fst-'+type);
  if(!el)return;
  el.textContent=(ok?'✓ ':'⚠ ')+msg;
  el.className='fst '+(ok?'ok':'er');
}


// ════════════════════════════════
//  ESCALA DE HORAS
// ════════════════════════════════

// State for escala parsing
const ES = {
  parsed:    null,   // { name: { normal, noturna, days: [...] } }
  mapping:   {},     // { escalaName: vetLogin }  — persisted in Firebase
  fileName:  '',
  mes:       '',
};

// Load saved mapping from Firebase on init
db.ref('laborbi/escalaMappings').once('value').then(snap => {
  if(snap.exists()) ES.mapping = snap.val() || {};
});

// ── Parse the escala xlsx ─────────────────────────────────────
function parseEscala(wb, fname){
  ES.fileName = fname;
  ES.parsed = {};

  // Read first sheet as raw 2D array
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, {header:1, defval:'', raw:false});

  // Detect month from header (line like "01/05/2026~31/05/2026")
  for(const row of raw){
    for(const cell of row){
      const m = String(cell).match(/(\d{2})\/(\d{2})\/(\d{4})~\d{2}\/\d{2}\/\d{4}/);
      if(m){ ES.mes = MESES[parseInt(m[2])]; break; }
    }
    if(ES.mes) break;
  }

  // Helper: calculate hours from turno string like "08:00~20:00"
  function turnoHours(t){
    const m = t.match(/(\d{2}):(\d{2})~(\d{2}):(\d{2})/);
    if(!m) return {h:0, noturno:false};
    let s = parseInt(m[1])*60 + parseInt(m[2]);
    let e = parseInt(m[3])*60 + parseInt(m[4]);
    if(e <= s) e += 24*60; // overnight
    const h = (e - s) / 60;
    // noturno: turno que começa >= 20h ou termina <= 9h (madrugada)
    const noturno = parseInt(m[1]) >= 20 || (e > 22*60 && e <= 33*60);
    return {h, noturno};
  }

  // Helper: clean a name cell
  function cleanName(n){
    return String(n).replace(/\(CO\)/g,'').replace(/\(FU\)/g,'').replace(/\(FJ\)/g,'').replace(/\(FN\)/g,'').replace(/\(FR\)/g,'').trim();
  }

  function addHours(rawName, h, noturno, date){
    const name = cleanName(rawName);
    if(!name || name.includes('<Sem') || name.length < 3) return;
    if(!ES.parsed[name]) ES.parsed[name] = {normal:0, noturna:0, days:[]};
    if(noturno) ES.parsed[name].noturna += h;
    else        ES.parsed[name].normal  += h;
    ES.parsed[name].days.push(date);
  }

  // Parse week blocks
  // A week-header row has cells like ["","","SEG 04/05","TER 05/05",...]
  const WEEK_RE = /^(SEG|TER|QUA|QUI|SEX|SÁB|DOM|SAB)\s+\d{2}\/\d{2}/;
  const TURNO_RE = /^\d{2}:\d{2}~\d{2}:\d{2}$/;

  let weekDates = [];
  let currentTurno = null;
  let currentTH = {h:0, noturno:false};

  for(let i=0; i<raw.length; i++){
    const row = raw[i];
    if(!row || row.every(c=>!c)) continue;
    const cells = row.map(c=>String(c).trim());

    // Detect week header (has SEG XX/XX)
    const isWeekHeader = cells.some(c => WEEK_RE.test(c));
    if(isWeekHeader){
      weekDates = [];
      for(const c of cells){
        const dm = c.match(/\d{2}\/\d{2}/);
        if(dm) weekDates.push(dm[0]);
      }
      currentTurno = null;
      continue;
    }

    // Detect turno row (first non-empty cell is HH:MM~HH:MM)
    const firstNE = cells.find(c=>c);
    if(firstNE && TURNO_RE.test(firstNE)){
      currentTurno = firstNE;
      currentTH = turnoHours(firstNE);
      // Names start after setor col (index 2+)
      // cells: [turno, setor, day0, day1, ...]
      for(let ci=2; ci<cells.length; ci++){
        const name = cleanName(cells[ci]);
        if(name && !name.includes('<Sem') && name.length>2){
          const date = weekDates[ci-2] || '';
          addHours(name, currentTH.h, currentTH.noturno, date);
        }
      }
      continue;
    }

    // Continuation row (extra names, same turno — like NATASHA on 2nd line)
    if(currentTurno && !isWeekHeader){
      for(let ci=0; ci<cells.length; ci++){
        const c = cells[ci];
        if(!c || TURNO_RE.test(c)) continue;
        if(c.includes('<Sem') || WEEK_RE.test(c)) continue;
        // Skip setor names
        if(['Clinica','Clínica','Internação','Interna\u00e7\u00e3o'].includes(c)) continue;
        const name = cleanName(c);
        if(name && name.length > 2 && /[A-ZÁÉÍÓÚ]/.test(name)){
          addHours(name, currentTH.h, currentTH.noturno, weekDates[ci-2]||'');
        }
      }
    }
  }

  const nNames = Object.keys(ES.parsed).length;
  if(!nNames){
    setFst('escala','Nenhum profissional encontrado. Verifique o formato da planilha.',false);
    return;
  }

  setFst('escala', `✓ ${nNames} profissionais encontrados · Mês: ${ES.mes||'?'} · ${fname}`, true);
  toast(`Escala lida: ${nNames} profissionais · ${ES.mes}`, 'ok');

  // Auto-apply saved mappings
  for(const n of Object.keys(ES.parsed)){
    if(ES.mapping[n]) continue;
    // Try to auto-match by last name against vets in the base data
    const lower = n.toLowerCase();
    const baseVets = [...new Set((S.base||[]).map(r=>r.vet))].filter(Boolean);
    const matchPool = baseVets.length > 0 ? baseVets : globalUsers.map(u=>u.user);
    for(const v of matchPool){
      const parts = v.split('.');
      // check if vet login surname appears in escala name
      if(parts.some(p => lower.includes(p.toLowerCase()) && p.length > 3)){
        ES.mapping[n] = v;
        break;
      }
    }
  }

  renderEscalaMapping();
  renderEscalaPreview();

  document.getElementById('escala-map-wrap').style.display='block';
}

// ── Render mapping UI ─────────────────────────────────────────
function renderEscalaMapping(){
  if(!ES.parsed) return;
  // Use veterinarians from the loaded base data, not system users
  // This way the dropdown matches exactly who is in the production spreadsheet
  const vets = [...new Set((S.base||[]).map(r=>r.vet))].filter(Boolean).sort();
  // If base not loaded yet, fall back to system users
  const vetOptions = vets.length > 0 ? vets : globalUsers.map(u=>u.user).sort();
  const names = Object.keys(ES.parsed).sort();

  document.getElementById('escala-map-table').innerHTML = `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 12px;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);border-bottom:1px solid var(--bd)">Nome na Escala</th>
          <th style="text-align:left;padding:8px 12px;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);border-bottom:1px solid var(--bd)">Veterinário no Sistema</th>
          <th style="text-align:right;padding:8px 12px;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);border-bottom:1px solid var(--bd)">H. Normal</th>
          <th style="text-align:right;padding:8px 12px;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);border-bottom:1px solid var(--bd)">H. Noturna</th>
          <th style="text-align:right;padding:8px 12px;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);border-bottom:1px solid var(--bd)">Total</th>
        </tr>
      </thead>
      <tbody>
        ${names.map((n,ri) => {
          const d = ES.parsed[n];
          const mapped = ES.mapping[n]||'';
          const total = (d.normal+d.noturna).toFixed(1);
          const isMapped = !!mapped;
          return `<tr style="background:${ri%2===0?'rgba(255,255,255,.01)':'transparent'}">
            <td style="padding:10px 12px;border-bottom:1px solid rgba(34,45,69,.4)">
              <span style="font-family:var(--font-mono);font-size:12px;color:var(--tx);font-weight:500">${n}</span>
            </td>
            <td style="padding:8px 12px;border-bottom:1px solid rgba(34,45,69,.4)">
              <select onchange="ES.mapping['${n}']=this.value;renderEscalaPreview()" style="width:100%;min-width:180px;background:${isMapped?'rgba(16,185,129,.08)':'rgba(239,68,68,.06)'};border-color:${isMapped?'rgba(16,185,129,.3)':'rgba(239,68,68,.3)'}">
                <option value="">— Selecionar veterinário —</option>
                ${vetOptions.map(v=>`<option value="${v}" ${v===mapped?'selected':''}>${v}</option>`).join('')}
              </select>
            </td>
            <td style="padding:10px 12px;border-bottom:1px solid rgba(34,45,69,.4);text-align:right;font-family:var(--font-mono);font-size:12px;color:var(--cyan)">${d.normal.toFixed(1)}h</td>
            <td style="padding:10px 12px;border-bottom:1px solid rgba(34,45,69,.4);text-align:right;font-family:var(--font-mono);font-size:12px;color:#a78bfa">${d.noturna.toFixed(1)}h</td>
            <td style="padding:10px 12px;border-bottom:1px solid rgba(34,45,69,.4);text-align:right;font-family:var(--font-mono);font-size:12px;font-weight:600;color:var(--amber)">${total}h</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
  `;
}

// ── Render hour preview ────────────────────────────────────────
function renderEscalaPreview(){
  if(!ES.parsed) return;
  // Group by mapped vet
  const vetHours = {};
  for(const [n,d] of Object.entries(ES.parsed)){
    const vet = ES.mapping[n];
    if(!vet) continue;
    if(!vetHours[vet]) vetHours[vet]={normal:0, noturna:0};
    vetHours[vet].normal  += d.normal;
    vetHours[vet].noturna += d.noturna;
  }

  const unmapped = Object.keys(ES.parsed).filter(n=>!ES.mapping[n]);
  const rows = Object.entries(vetHours).sort((a,b)=>a[0].localeCompare(b[0]));

  document.getElementById('escala-preview').innerHTML = `
    ${unmapped.length ? `<div style="padding:10px 14px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.2);border-radius:8px;font-size:11px;color:var(--red);font-family:var(--font-mono);margin-bottom:12px">
      ⚠️ ${unmapped.length} profissional(is) sem mapeamento: ${unmapped.join(' · ')}
    </div>`:''}
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="text-align:left;padding:8px 12px;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Veterinário</th>
          <th style="text-align:right;padding:8px 12px;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">H. Normais</th>
          <th style="text-align:right;padding:8px 12px;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">H. Noturnas</th>
          <th style="text-align:right;padding:8px 12px;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Total Horas</th>
          <th style="text-align:left;padding:8px 12px;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Status</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map(([v,h],ri)=>{
          const total = h.normal+h.noturna;
          return `<tr style="background:${ri%2===0?'rgba(255,255,255,.01)':'transparent'}">
            <td style="padding:10px 12px;border-bottom:1px solid rgba(34,45,69,.4);font-weight:600;color:var(--tx)">${v}</td>
            <td style="padding:10px 12px;border-bottom:1px solid rgba(34,45,69,.4);text-align:right;font-family:var(--font-mono);color:var(--cyan)">${h.normal.toFixed(1)}h</td>
            <td style="padding:10px 12px;border-bottom:1px solid rgba(34,45,69,.4);text-align:right;font-family:var(--font-mono);color:#a78bfa">${h.noturna.toFixed(1)}h</td>
            <td style="padding:10px 12px;border-bottom:1px solid rgba(34,45,69,.4);text-align:right;font-family:var(--font-mono);font-weight:700;color:var(--amber)">${total.toFixed(1)}h</td>
            <td style="padding:10px 12px;border-bottom:1px solid rgba(34,45,69,.4)"><span class="bdg bg">Pronto</span></td>
          </tr>`;
        }).join('')}
        ${rows.length===0?`<tr><td colspan="5" style="padding:24px;text-align:center;color:var(--tx3);font-size:12px">Mapeie os profissionais acima para ver a prévia.</td></tr>`:''}
      </tbody>
    </table>
  `;
}

// ── Save hours to Firebase ─────────────────────────────────────
function saveEscalaHours(){
  if(!ES.parsed || !ES.mes){
    toast('Nenhuma escala carregada.', 'err'); return;
  }

  const unmapped = Object.keys(ES.parsed).filter(n=>!ES.mapping[n]);
  if(unmapped.length > 0){
    if(!confirm(`${unmapped.length} profissional(is) sem mapeamento serão ignorados:\n${unmapped.join('\n')}\n\nContinuar assim mesmo?`)) return;
  }

  // Save mapping to Firebase for future re-use
  db.ref('laborbi/escalaMappings').set(ES.mapping);

  // Get current base data
  const baseRows = S.base || [];
  if(!baseRows.length){
    toast('Carregue a Base de Dados primeiro antes de salvar horas.', 'err'); return;
  }

  // Build vet->hours map from escala
  const vetHoursMap = {};
  for(const [n,d] of Object.entries(ES.parsed)){
    const vet = ES.mapping[n];
    if(!vet) continue;
    if(!vetHoursMap[vet]) vetHoursMap[vet]={normal:0, noturna:0};
    vetHoursMap[vet].normal  += d.normal;
    vetHoursMap[vet].noturna += d.noturna;
  }

  // Update horas on base rows for this month
  // Distribute hours proportionally across the detected number of weeks
  const nSemEscala = getNumSemanas(ES.mes) || 4;
  let updated = 0;
  const updatedBase = baseRows.map(row => {
    if(row.mes !== ES.mes) return row;
    const vh = vetHoursMap[row.vet];
    if(!vh) return row;
    // Each week gets 1/nSem of the month total (rounded to 1 decimal)
    const weekNorm = Math.round((vh.normal / nSemEscala) * 10) / 10;
    const weekNot  = Math.round((vh.noturna / nSemEscala) * 10) / 10;
    updated++;
    return {
      ...row,
      hNorm:  weekNorm,
      hNot:   weekNot,
      horas:  weekNorm + weekNot,
    };
  });

  if(!updated){
    toast(`Nenhuma linha encontrada para ${ES.mes} na Base de Dados. Carregue a planilha base primeiro.`, 'err');
    return;
  }

  document.getElementById('escala-save-status').textContent = 'Salvando...';

  db.ref('laborbi/base').set(updatedBase).then(()=>{
    db.ref('laborbi/meta/lastUpdated').set(new Date().toLocaleString('pt-BR'));
    db.ref('laborbi/meta/escala').set(ES.fileName + ' · ' + ES.mes + ' · ' + new Date().toLocaleString('pt-BR'));
    toast(`Horas de ${ES.mes} atualizadas! ${updated} linhas · ${Object.keys(vetHoursMap).length} veterinários ✓`, 'ok');
    document.getElementById('escala-save-status').textContent = `✓ ${updated} linhas atualizadas em ${ES.mes}`;
    document.getElementById('escala-save-status').style.color = 'var(--green)';
  }).catch(err=>{
    toast('Erro ao salvar: ' + err.message, 'err');
    document.getElementById('escala-save-status').textContent = '✗ Erro: ' + err.message;
    document.getElementById('escala-save-status').style.color = 'var(--red)';
  });
}

function renderEscalaMappingIfReady(){
  if(ES.parsed) renderEscalaMapping();
}

// ════════════════════════════════
//  ADMIN UI: USUÁRIOS
// ════════════════════════════════
