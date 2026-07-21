// ════════════════════════════════
//  FIREBASE CONFIGURATION
// ════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyBeasaFybB-awfqxLdU8024-EQRaIHZFJA",
  authDomain: "gc-widget-obs.firebaseapp.com",
  databaseURL: "https://gc-widget-obs-default-rtdb.firebaseio.com",
  projectId: "gc-widget-obs",
  storageBucket: "gc-widget-obs.firebasestorage.app",
  messagingSenderId: "361431978410",
  appId: "1:361431978410:web:659db181abfdfd6cabdbd3",
  measurementId: "G-KJXWV2W24M"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// ════════════════════════════════
//  STATE & INITIALIZATION
// ════════════════════════════════
const CHART_COLORS = ['#22d3ee','#a78bfa','#34d399','#fbbf24','#fb7185','#818cf8','#6ee7b7','#fde68a','#93c5fd','#f0abfc'];
const GC = 'rgba(255,255,255,.07)';
const TC = {color:'#8faac8',font:{family:'JetBrains Mono',size:11}};

const S={role:'viewer', user:null, base:null, anal:null, cogs:null, meta:{}, charts:{}};
let globalUsers = [];
let globalLogs = [];

window.onload = () => {
    const savedUser = localStorage.getItem('loggedUser');
    if(savedUser) {
        const parsed = JSON.parse(savedUser);
        S.user = parsed.user;
        S.role = parsed.role;
        document.getElementById('ls').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        updateTopBar();
        showHub();
    }
};

db.ref('laborbi/users').on('value', (snap) => {
    if (snap.exists()) {
        let raw = snap.val();
        if(!Array.isArray(raw)) raw = Object.values(raw);
        globalUsers = raw.filter(x => x && x.user);
    } else {
        globalUsers = [{user:'clevis.junior', pass:'admin123', role:'admin'}];
        db.ref('laborbi/users').set(globalUsers);
    }
    if(S.role === 'admin' && document.getElementById('admin-view').style.display === 'block') {
        renderUsers();
    }
});

db.ref('laborbi/logs').orderByChild('timestamp').limitToLast(100).on('value', snap => {
    const logs = [];
    snap.forEach(c => { if(c.val()) logs.unshift(c.val()); });
    globalLogs = logs;
    if(S.role === 'admin' && document.getElementById('ab-logs').classList.contains('on')) {
        renderLogs();
    }
});

db.ref('laborbi').on('value', (snap) => {
  const data = snap.val() || {};

  let b = data.base || [];
  if(!Array.isArray(b)) b = Object.values(b);
  S.base = b.filter(x => x && typeof x === 'object' && x.vet);

  let a = data.anal || {};
  for(let k in a) {
      if(a[k]) {
          let sheetData = Array.isArray(a[k]) ? a[k] : Object.values(a[k]);
          a[k] = sheetData.filter(x => x && typeof x === 'object');
      } else {
          a[k] = [];
      }
  }
  S.anal = a;

  let c = data.cogs || [];
  if(!Array.isArray(c)) c = Object.values(c);
  S.cogs = c.filter(x => x && typeof x === 'object' && x.val !== undefined);

  S.meta = data.meta || {};

  if(S.meta.base) setFst('base', S.meta.base, true);
  if(S.meta.anal) setFst('anal', S.meta.anal, true);
  if(S.meta.cogs) setFst('cogs', S.meta.cogs, true);

  if(S.meta.lastUpdated) {
    document.getElementById('last-upd-labor').textContent = 'Atualizado: ' + S.meta.lastUpdated;
    document.getElementById('last-upd-labor').style.display = 'inline-block';
    document.getElementById('last-upd-cogs').textContent = 'Atualizado: ' + S.meta.lastUpdated;
    document.getElementById('last-upd-cogs').style.display = 'inline-block';
  }

  populateAllFilters();

  // Garantia extra: repopula comparativo e escolhe dois meses recentes automaticamente
  try{
    if(typeof populateComparativoSelects === 'function') populateComparativoSelects();
    const sel1 = document.getElementById('comp-mes1');
    const sel2 = document.getElementById('comp-mes2');
    if(sel1 && sel2){
      const vals = Array.from(sel1.querySelectorAll('option')).map(o=>o.value).filter(Boolean);
      if(vals.length>1){
        // ordenar por índice em MESES
        vals.sort((a,b)=> (MESES.indexOf(a)||999) - (MESES.indexOf(b)||999));
        sel2.value = vals[vals.length-1];
        sel1.value = vals[vals.length-2] || vals[vals.length-1];
        if(typeof populateComparativoWeeks === 'function') populateComparativoWeeks();
      }
    }
  }catch(e){ console.warn('comparativo: auto-select failed', e); }

  // Refresh admin dashboard if open
  if(document.getElementById('admin-view') && document.getElementById('admin-view').style.display === 'block'){
    renderAdminDashboard();
  }

  if(document.getElementById('labor-view').style.display === 'block') {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      renderPetcare();
      renderRanking();
      renderClinica();
      renderInter();
      renderCirurgico();
      renderLab();
      // nova aba comparativo também pode ser chamada se estiver visível
      if(document.getElementById('pg-comparativo').classList.contains('on')) renderComparativoMensal();
    }));
  }

  if(document.getElementById('cogs-view').style.display === 'block') {
    requestAnimationFrame(() => requestAnimationFrame(() => { renderCogs(); }));
  }
});

// ════════════════════════════════
//  ROUTING
// ════════════════════════════════
function updateTopBar() {
  if(!S.user) return;
  const badgeClass = 'brl' + (S.role === 'admin' ? ' adm' : '');
  ['brl-hub', 'brl-labor', 'brl-cogs', 'brl-admin', 'brl-insights'].forEach(id => {
      const el = document.getElementById(id);
      if(el) { el.textContent = S.user; el.className = badgeClass; }
  });
}

function showHub() {
  document.getElementById('card-admin').style.display = (S.role === 'admin') ? 'block' : 'none';
  document.getElementById('hub-view').style.display = 'block';
  document.getElementById('labor-view').style.display = 'none';
  document.getElementById('cogs-view').style.display = 'none';
  document.getElementById('admin-view').style.display = 'none';
  document.getElementById('insights-view').style.display = 'none';
  killAll();
}

function goHub() { showHub(); }

function openLabor() {
  document.getElementById('hub-view').style.display = 'none';
  document.getElementById('labor-view').style.display = 'block';
  requestAnimationFrame(() => requestAnimationFrame(() => { initLaborApp(); }));
}

function openCogs() {
  document.getElementById("hub-view").style.display = "none";
  document.getElementById("cogs-view").style.display = "block";
  _cogsActiveTab = "dre";
  _cogsActiveCat = "";
  document.querySelectorAll(".cogs-tab").forEach(el => el.style.display = "none");
  const dreTab = document.getElementById("cogs-tab-dre");
  if (dreTab) dreTab.style.display = "block";
  // Reset: apenas os 3 botões fixos — os dinâmicos são recriados em buildCogsNav()
  document.querySelectorAll("#tnav-cogs .nb:not(.dyn)").forEach((b,i) => { b.classList.toggle("on", i===0); });
  populateAllFilters();
  requestAnimationFrame(() => requestAnimationFrame(() => { renderCogs(); }));
}

function populateInsightsMesSelect(selected) {
  const sel = document.getElementById('insights-mes-select');
  if (!sel) return;
  const baseRowsAll = getAdjustedBase();
  const cogsRowsAll = S.cogs || [];
  const allMeses = [...new Set([
    ...baseRowsAll.map(r => r.mes).filter(Boolean),
    ...cogsRowsAll.map(r => r.mes).filter(Boolean)
  ])].filter(Boolean).sort((a,b) => MESES.indexOf(a) - MESES.indexOf(b));

  const prevValue = selected !== undefined ? selected : sel.value;
  let html = '<option value="">Automático (mês mais recente)</option>';
  allMeses.forEach(m => {
    html += `<option value="${m}">${m.charAt(0).toUpperCase() + m.slice(1)}</option>`;
  });
  sel.innerHTML = html;
  if (prevValue && allMeses.includes(prevValue)) sel.value = prevValue;
  populateInsightsWeekSelect(sel.value || null);
}

function populateInsightsWeekSelect(mes, selectedWeek) {
  const sel = document.getElementById('insights-week-select');
  if (!sel) return;
  const baseRowsAll = getAdjustedBase();
  const semanas = mes
    ? [...new Set(baseRowsAll.filter(r => r.mes === mes && r.sem).map(r => String(r.sem).trim()))]
        .filter(Boolean)
        .sort((a,b) => parseInt(a,10) - parseInt(b,10))
    : [];

  let html = '<option value="">Todas as semanas</option>';
  semanas.forEach(w => { html += `<option value="${w}">Semana ${w}</option>`; });
  sel.innerHTML = html;
  sel.disabled = !mes || semanas.length === 0;
  if (selectedWeek && semanas.includes(selectedWeek)) sel.value = selectedWeek;
  else sel.value = '';
}

function openInsights() {
  document.getElementById('hub-view').style.display = 'none';
  document.getElementById('insights-view').style.display = 'block';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    populateInsightsMesSelect();
    generateInsights();
  }));
}

function openAdmin() {
  if (S.role !== 'admin') { toast('Acesso negado.', 'err'); return; }
  document.getElementById('hub-view').style.display = 'none';
  document.getElementById('admin-view').style.display = 'block';
  renderUsers();
  renderLogs();
}

// ════════════════════════════════
//  FORMATTERS & MATH
// ════════════════════════════════
const fN=v=>(parseFloat(v)||0).toLocaleString('pt-BR',{maximumFractionDigits:0});
const fR=v=>'R$ '+(parseFloat(v)||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const fP=v=>((parseFloat(v)||0)*100).toFixed(1)+'%';
const sumC=(a,k)=>a.reduce((s,r)=>s+(r[k]||0),0);

function calcPerc(p){
  if(p >= 61000) return 0.10;
  if(p >= 51000) return 0.07;
  if(p >= 41000) return 0.05;
  if(p >= 35000) return 0.03;
  return 0;
}

// ── Cálculo automático do Valor Fixo pela tabela de remuneração ──
// Regras (foto):
//   Hora Normal:  R$26,22/h se hNorm ≤ 180h  |  R$23,60/h se hNorm > 180h
//   Hora Noturna: R$37,79/h (adicional sobre hora normal)
//   Processos Adm/Financeiros (internação): fixo mensal configurado por vet
//   O valor fixo na planilha base é usado como fallback se horas = 0
const HORA_NORMAL_180 = 26.22;  // até 180h/mês
const HORA_NORMAL_200 = 23.60;  // de 181h até 200h/mês
const HORA_NOTURNA    = 37.79;  // adicional noturno

// Especialistas que podem ser filtrados na aba Especialistas (match por primeiro nome)
const ESPECIALISTAS = ['nelson','natasha','charleston','suzana','susana'];
function isEspecialista(vet){
  if(!vet) return false;
  const first = String(vet).toLowerCase().split('.')[0].trim();
  return ESPECIALISTAS.includes(first);
}

// Vets que recebem fixo mensal (não calculado por hora) — chave = login
// Configurar conforme contratos individuais
const FIXO_MENSAL = {
  'erica.santana': 8000.00,
  // 'talita.xxx': 8000.00,  // adicionar quando o login for cadastrado
};

// Vets com taxa fixa por hora (sobrepõe a tabela de remuneração) — chave = login
const HORA_FIXA = {
  'larissa.iozzi': 37.74,
};

function calcFixo(vetLogin, hNorm, hNot, mes){
  const nSem = getNumSemanas(mes) || 4;
  // 1. Se tem fixo mensal definido → retorna o mensal ÷ nº de semanas
  if(FIXO_MENSAL[vetLogin] !== undefined){
    return r2(FIXO_MENSAL[vetLogin] / nSem);
  }
  // 1b. Taxa fixa por hora (aplica a todas as horas, normais e noturnas)
  if(HORA_FIXA[vetLogin] !== undefined){
    if(!hNorm && !hNot) return 0;
    return r2((hNorm + hNot) * HORA_FIXA[vetLogin]);
  }
  // 2. Sem horas registradas → retorna 0 (será pego da planilha base)
  if(!hNorm && !hNot) return 0;
  // 3. Calcula por hora conforme tabela
  // hNorm e hNot aqui são horas DA SEMANA (já divididos por nº de semanas)
  // Para saber a faixa (≤180 ou >180) precisamos do total mensal
  const hNormMes = hNorm * nSem;
  const rateNorm = hNormMes <= 180 ? HORA_NORMAL_180 : HORA_NORMAL_200;
  const fixoNorm = r2(hNorm * rateNorm);
  const fixoNot  = r2(hNot  * HORA_NOTURNA);
  return r2(fixoNorm + fixoNot);
}

const MESES=['','janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function getMes(ds){
  if(!ds) return '';
  const p = ds.split('-');
  if(p.length >= 2) return MESES[parseInt(p[1], 10)] || '';
  return '';
}
function r2(v){return Math.round(v*100)/100}

// ── Detecção automática de semanas ──
const MES_IDX = {};
MESES.forEach((m,i)=>{ if(m) MES_IDX[m]=i; });

// Quantas semanas (seg→dom) um mês de calendário possui
function semanasNoCalendario(ano, mesIdx){
  const primeiro = new Date(ano, mesIdx-1, 1);
  const ultimo   = new Date(ano, mesIdx, 0).getDate();
  const dow = (primeiro.getDay() + 6) % 7; // seg=0
  return Math.ceil((ultimo + dow) / 7);
}

// Número de semanas detectado para um mês.
// 1º conta semanas distintas presentes na base (campo r.sem);
// senão calcula pelo calendário; fallback = 4.
function getNumSemanas(mes){
  try {
    if(typeof S !== 'undefined' && S.base && S.base.length){
      const sems = new Set(
        S.base.filter(r => (!mes || r.mes===mes) && r.sem).map(r => String(r.sem).trim())
      );
      if(sems.size > 0) return sems.size;
    }
  } catch(e){}
  const idx = MES_IDX[mes];
  if(idx) return semanasNoCalendario(new Date().getFullYear(), idx);
  return 4;
}

// Em qual semana do mês estamos hoje (1-based).
// Se o mês alvo não for o mês corrente, retorna o total (mês fechado).
function getSemanaAtual(mes){
  const hoje = new Date();
  const idx = MES_IDX[mes];
  const total = getNumSemanas(mes);
  if(idx && (idx !== hoje.getMonth()+1)) return total;
  const ano = hoje.getFullYear();
  const m = idx || (hoje.getMonth()+1);
  const primeiro = new Date(ano, m-1, 1);
  const dow = (primeiro.getDay() + 6) % 7; // seg=0
  const semana = Math.ceil((hoje.getDate() + dow) / 7);
  return Math.min(semana, total);
}

// ── Dias considerados de um mês ──
// Mês corrente → dias decorridos até hoje; mês fechado/passado → dias totais do mês.
// Se limitDia for informado, limita ao mesmo dia (para comparação "mesmo período").
function getDiasPeriodo(mes, limitDia){
  const hoje = new Date();
  const idx = MES_IDX[mes];
  const ano = hoje.getFullYear();
  const m = idx || (hoje.getMonth()+1);
  const diasNoMes = new Date(ano, m, 0).getDate();
  let dias;
  if(idx && idx === hoje.getMonth()+1){
    dias = hoje.getDate(); // mês corrente → até hoje
  } else {
    dias = diasNoMes;      // mês fechado → mês inteiro
  }
  if(limitDia) dias = Math.min(dias, limitDia, diasNoMes);
  return { dias, diasNoMes };
}

// Produção total da Base de Dados de um mês, respeitando o vet filtrado.
function getProducaoMes(mes, vet){
  let base = getRawBase();
  if(vet) base = base.filter(x => x.vet === vet);
  if(mes) base = base.filter(x => x.mes === mes);
  return sumC(base, 'prod');
}

// Mês anterior (texto) a partir do mês informado.
function getMesAnterior(mes){
  const idx = MES_IDX[mes];
  if(idx && idx > 1) return MESES[idx-1];
  return null;
}

// ════════════════════════════════
//  LOGIN / LOGOUT & AUDITORIA
// ════════════════════════════════
async function logAccess(username) {
  let loc = "Desconhecida";
  try {
    const res = await fetch('https://ipapi.co/json/');
    if(res.ok) {
      const data = await res.json();
      if(data.city) loc = `${data.city}, ${data.region} - ${data.country_name}`;
    }
  } catch(e) {}

  const ua = navigator.userAgent;
  let device = "Desktop";
  if (/android/i.test(ua)) device = "Android";
  else if (/ipad|iphone|ipod/i.test(ua)) device = "iOS";
  else if (/windows/i.test(ua)) device = "Windows";
  else if (/mac/i.test(ua)) device = "Mac";
  else if (/linux/i.test(ua)) device = "Linux";

  const now = new Date().toLocaleString('pt-BR');
  db.ref('laborbi/logs').push({ user: username, time: now, device: device, location: loc, timestamp: Date.now() });
}

function doLogin(){
  const u = document.getElementById('lu').value.trim().toLowerCase();
  const p = document.getElementById('lp').value;

  db.ref('laborbi/users').once('value').then(snap => {
      let users = snap.val() || [];
      if(!Array.isArray(users)) users = Object.values(users);
      users = users.filter(x => x && x.user);
      const f = users.find(x => x.user === u && x.pass === p);

      if(f){
        S.user = f.user;
        S.role = f.role;
        localStorage.setItem('loggedUser', JSON.stringify(f));
        document.getElementById('ls').style.display='none';
        document.getElementById('app').style.display='block';
        updateTopBar();
        logAccess(S.user).catch(()=>console.log('Sem tracking de ip'));
        showHub();
      } else {
        const e=document.getElementById('lerr');
        e.style.display='block';
        setTimeout(()=>e.style.display='none',3000);
      }
  });
}

function doLogout(){
  localStorage.removeItem('loggedUser');
  S.user = null;
  S.role = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('ls').style.display = 'flex';
  document.getElementById('lu').value = '';
  document.getElementById('lp').value = '';
  document.getElementById('last-upd-labor').style.display = 'none';
  document.getElementById('last-upd-cogs').style.display = 'none';
  killAll();
}

// ════════════════════════════════
//  LABOR BI INIT
// ════════════════════════════════
const PAGES_LABOR=[
  {id:'petcare',    label:'Visão Geral'},
  {id:'ranking',    label:'Ranking'},
  {id:'faturamento',label:'Especialistas'},
  {id:'clinica',    label:'Clínica Médica'},
  {id:'inter',      label:'Internação'},
  {id:'cirurgico',  label:'Bloco Cirúrgico'},
  {id:'laboratorio',label:'Laboratório'},
  {id:'comparativo',label:'Comparativo Mensal'}, // NOVA ABA
];

function initLaborApp(){
  document.getElementById('tnav-labor').innerHTML=PAGES_LABOR.map((p,i)=>
    `<button class="nb${i===0?' on':''}" data-pg="${p.id}" onclick="showPg('${p.id}',this)">${p.label}</button>`
  ).join('');

  document.querySelectorAll('#labor-view .pg').forEach(p=>p.classList.remove('on'));
  document.getElementById('pg-petcare').classList.add('on');
  populateAllFilters();
  requestAnimationFrame(() => requestAnimationFrame(() => { const fn = PAGE_RENDER_MAP && PAGE_RENDER_MAP['petcare']; if(typeof fn === 'function') fn(); }));
}

// Lazy wrappers: resolve actual render functions at call time to avoid
// ReferenceError if the render modules load after this file.
const PAGE_RENDER_MAP = {
  'petcare':     () => (window.renderPetcare ? window.renderPetcare() : undefined),
  'ranking':     () => (window.renderRanking ? window.renderRanking() : undefined),
  'faturamento': () => (window.renderFaturamento ? window.renderFaturamento() : undefined),
  'clinica':     () => (window.renderClinica ? window.renderClinica() : undefined),
  'inter':       () => (window.renderInter ? window.renderInter() : undefined),
  'cirurgico':   () => (window.renderCirurgico ? window.renderCirurgico() : undefined),
  'laboratorio': () => (window.renderLab ? window.renderLab() : undefined),
  'comparativo': () => (window.renderComparativoMensal ? window.renderComparativoMensal() : undefined),
};

function showPg(id,btn){
  document.querySelectorAll('#labor-view .pg').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('#labor-view .nb').forEach(b=>b.classList.remove('on'));
  document.getElementById('pg-'+id).classList.add('on');
  if(btn) btn.classList.add('on');
  // Wait for the page to be visible in the DOM before rendering charts
  requestAnimationFrame(() => {
    const renderFn = PAGE_RENDER_MAP[id];
    if(renderFn) renderFn();
    // Force resize on any already-existing charts so they recalculate dimensions
    requestAnimationFrame(() => {
      Object.values(S.charts).forEach(c => { try { c.resize(); } catch(_){} });
    });
  });
}

function switchAdmin(id, btn){
  document.querySelectorAll('.ab-sec').forEach(s => s.classList.remove('on'));
  document.querySelectorAll('.as-btn').forEach(b => b.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  btn.classList.add('on');
  if(id === 'ab-logs') renderLogs();
  if(id === 'ab-users') renderUsers();
  if(id === 'ab-escala') renderEscalaMappingIfReady();
}

// ════════════════════════════════
//  CHARTS
// ════════════════════════════════
function killAll(){Object.values(S.charts).forEach(c=>{try{c.destroy()}catch(_){}});S.charts={}}
function killChart(k){if(S.charts[k]){try{S.charts[k].destroy()}catch(_){}delete S.charts[k]}}

function mkBar(id,labels,datasets,opts={}){
  killChart(id);
  const el=document.getElementById(id);
  if(!el)return;
  const ctx=el.getContext('2d');
  if(!ctx)return;
  S.charts[id]=new Chart(ctx,{type:'bar',data:{labels,datasets},options:{
    responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:datasets.length>1,labels:{color:'#8899bb',font:{family:'JetBrains Mono',size:10}}}},
    scales:{
      x:{ticks:{...TC,maxRotation:35},grid:{color:GC}},
      y:{ticks:{...TC,callback:opts.yFmt||(v=>'R$'+fN(v))},grid:{color:GC}}
    },...opts.extra
  }});
}

function mkCombo(id,labels,ds1a,ds1b,ds2){
  killChart(id);
  const ctx=document.getElementById(id)?.getContext('2d');
  if(!ctx)return;
  S.charts[id]=new Chart(ctx,{type:'bar',data:{labels,datasets:[
    {label:'Valor Fixo',data:ds1a,backgroundColor:'rgba(139,92,246,.75)',borderRadius:4,stack:'s',order:2},
    {label:'Valor Variável',data:ds1b,backgroundColor:'rgba(16,185,129,.75)',borderRadius:4,stack:'s',order:2},
    {label:'Qnt Horas',data:ds2,type:'line',borderColor:'#22d3ee',backgroundColor:'rgba(34,211,238,.08)',borderWidth:2,tension:.4,pointRadius:3,yAxisID:'y2',order:1,fill:true}
  ]},options:{
    responsive:true,maintainAspectRatio:false,
    plugins:{legend:{labels:{color:'#8899bb',font:{family:'JetBrains Mono',size:10}}}},
    scales:{
      x:{ticks:TC,grid:{color:GC},stacked:true},
      y:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC},stacked:true},
      y2:{position:'right',ticks:{color:'#22d3ee',font:{family:'JetBrains Mono',size:11},callback:v=>v+'h'},grid:{display:false}}
    }
  }});
}

function mkDonut(id,labels,data,customColors){
  killChart(id);
  const ctx=document.getElementById(id)?.getContext('2d');
  if(!ctx)return;
  const colors = customColors || ['rgba(139,92,246,.85)','rgba(16,185,129,.85)'];
  S.charts[id]=new Chart(ctx,{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:colors,borderColor:'#101520',borderWidth:3}]},
  options:{responsive:true,maintainAspectRatio:false,cutout:'68%',plugins:{legend:{position:'bottom',labels:{color:'#8899bb',font:{family:'JetBrains Mono',size:11},padding:16}},tooltip:{callbacks:{label:c=>' '+fR(c.raw)}}}}});
}

function mkHBar(id,labels,data,color='#22d3ee',xFmt=v=>'R$'+fN(v)){
  killChart(id);
  const ctx=document.getElementById(id)?.getContext('2d');
  if(!ctx)return;
  S.charts[id]=new Chart(ctx,{type:'bar',data:{labels,datasets:[{data,backgroundColor:color+'cc',borderRadius:4,borderSkipped:false}]},
  options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
  plugins:{legend:{display:false}},
  scales:{x:{ticks:{...TC,callback:xFmt},grid:{color:GC}},y:{ticks:{...TC,font:{size:9}},grid:{color:GC}}}}});
}

// ════════════════════════════════
//  FILTERS POPULATION
// ════════════════════════════════
function populateAllFilters(){
  const baseMeses = [...new Set((S.base||[]).map(r=>r.mes).filter(Boolean))];
  const cogsMeses = [...new Set((S.cogs||[]).map(r=>r.mes).filter(Boolean))];
  const allMeses = [...new Set([...baseMeses, ...cogsMeses])].sort();

  fillSel('f-vet','Todos os Veterinários', [...new Set((S.base||[]).map(r=>r.vet))].sort());
  fillSel('f-mes','Todos os Meses', baseMeses, true);
  fillSel('f-sem','Todas as Semanas', [...new Set((S.base||[]).map(r=>r.sem).filter(Boolean))].sort());
  fillSel('r-mes','Todos os Meses', baseMeses, true);

  fillSel('cg-mes', 'Todos os Meses', allMeses, true);
  const cogsCats = [...new Set((S.cogs||[]).map(r=>r.cat).filter(Boolean))].sort();
  fillSel('cg-cat', 'Todas as Categorias', cogsCats);

  if(S.anal){
    const clM=[...new Set((S.anal.CLINICA||[]).map(r=>r.mes).filter(Boolean))];
    const clV=[...new Set((S.anal.CLINICA||[]).map(r=>r.vet).filter(Boolean))].sort();
    fillSel('cl-mes','Todos os Meses',clM,true);fillSel('cl-vet','Todos os Veterinários',clV);
    const itM=[...new Set((S.anal.INTER||[]).map(r=>r.mes).filter(Boolean))];
    const itV=[...new Set((S.anal.INTER||[]).map(r=>r.vet).filter(Boolean))].sort();
    fillSel('it-mes','Todos os Meses',itM,true);fillSel('it-vet','Todos os Veterinários',itV);
    const ciM=[...new Set((S.anal['C_CIRURGICO']||[]).map(r=>r.mes).filter(Boolean))];
    const ciV=[...new Set((S.anal['C_CIRURGICO']||[]).map(r=>r.vet).filter(Boolean))].sort();
    fillSel('ci-mes','Todos os Meses',ciM,true);fillSel('ci-vet','Todos os Veterinários',ciV);
    const lbM=[...new Set((S.anal.LAB||[]).map(r=>r.mes).filter(Boolean))];
    const lbV=[...new Set((S.anal.LAB||[]).map(r=>r.vet).filter(Boolean))].sort();
    fillSel('lb-mes','Todos os Meses',lbM,true);fillSel('lb-vet','Todos os Veterinários',lbV);

    // ── Especialistas: apenas nelson, natasha, charles, suzana ──
    const allLanc = getLancamentos();
    const fatV=[...new Set(allLanc.map(r=>r.vet).filter(Boolean))].filter(isEspecialista).sort();
    const fatM=[...new Set(allLanc.map(r=>r.mes).filter(Boolean))]
      .sort((a,b)=>(MES_IDX[a]||0)-(MES_IDX[b]||0));
    fillSel('fat-vet','Selecione o Especialista',fatV);
    fillSel('fat-mes','Todos os Meses',fatM,true);
  }
  // Popula selects da aba comparativo
  populateComparativoSelects();
}

// Junta os lançamentos de todos os setores de análise num array só,
// marcando o setor de origem. Cada linha = 1 lançamento (quantidade contável).
function getLancamentos(){
  if(!S.anal) return [];
  const setores = {CLINICA:'Clínica', INTER:'Internação', C_CIRURGICO:'Cirúrgico', LAB:'Laboratório'};
  const out=[];
  Object.keys(setores).forEach(k=>{
    let arr = S.anal[k];
    if(!arr) return;
    if(!Array.isArray(arr)) arr = Object.values(arr);
    arr.forEach(r=>{ if(r && r.vet) out.push({...r, setor:setores[k]}); });
  });
  return out;
}

function fillSel(id,placeholder,opts,capFirst=false){
  const el=document.getElementById(id);if(!el)return;
  const cur=el.value;
  el.innerHTML=`<option value="">${placeholder}</option>`+
    opts.map(o=>`<option value="${o}"${cur===o?' selected':''}>${capFirst?cap(o):o}</option>`).join('');
}
function cap(s){return s?s.charAt(0).toUpperCase()+s.slice(1):s}

// ════════════════════════════════
//  DEDUÇÃO DINÂMICA
// ════════════════════════════════
// ── Base de Dados PURA (planilha sem nome), sem qualquer dedução/soma
//    das planilhas de análise. Usada pela visão principal do LaborBI. ──
function getRawBase() {
  let r = S.base || [];
  // total mensal por vet (para a faixa de comissão ≤180/>180)
  const mProd = {};
  r.forEach(x => {
    const val = x.rawProd !== undefined ? x.rawProd : x.prod;
    const key = x.vet + '|' + x.mes;
    mProd[key] = (mProd[key] || 0) + val;
  });
  return r.map(x => {
    const val = x.rawProd !== undefined ? x.rawProd : x.prod;
    const key = x.vet + '|' + x.mes;
    const totalMes = mProd[key];           // produção mensal só da base
    const perc = calcPerc(totalMes);       // comissão pela produção da base
    const prodReal = val;                  // produção = exatamente a da base
    const valVar = r2(perc * prodReal);
    const fixoFinal = (x.hNorm || x.hNot)
      ? calcFixo(x.vet, x.hNorm || 0, x.hNot || 0, x.mes)
      : x.valFixo;
    const valTotal = r2(valVar + fixoFinal);
    return { ...x, prod: prodReal, perc, valVar, valFixo: fixoFinal, valTotal };
  });
}

function getAdjustedBase() {
  let r = S.base || [];
  const mProd = {};
  r.forEach(x => {
    const val = x.rawProd !== undefined ? x.rawProd : x.prod;
    const key = x.vet + '|' + x.mes;
    mProd[key] = (mProd[key] || 0) + val;
  });

  const cDed = {};
  if (S.anal && S.anal['C_CIRURGICO']) {
    let cCir = S.anal['C_CIRURGICO'];
    if(!Array.isArray(cCir)) cCir = Object.values(cCir);
    cCir.filter(x=>x && x.vet).forEach(a => {
      if (a.vet === 'larissa.iozzi' || a.vet === 'vitor.tridapalli') {
        const key = a.vet + '|' + a.mes;
        cDed[key] = (cDed[key] || 0) + a.valL;
      }
    });
  }

  return r.map(x => {
     const val = x.rawProd !== undefined ? x.rawProd : x.prod;
     const key = x.vet + '|' + x.mes;
     const totalMes = mProd[key];
     const ded = (x.vet === 'larissa.iozzi' || x.vet === 'vitor.tridapalli') ? (cDed[key] || 0) : 0;

     let elig = totalMes - ded;
     if (elig < 0) elig = 0;

     const prop = totalMes > 0 ? val / totalMes : 0;
     const prodReal = elig * prop;

     const perc = calcPerc(elig);
     const valVar = r2(perc * prodReal);

     // ── Valor Fixo: calculado pela tabela de horas se disponíveis,
     //    senão usa o valor fixo lido da planilha base ──────────────
     const fixoFinal = (x.hNorm || x.hNot)
       ? calcFixo(x.vet, x.hNorm || 0, x.hNot || 0, x.mes)
       : x.valFixo;

     const valTotal = r2(valVar + fixoFinal);

     return { ...x, prod: prodReal, perc, valVar, valFixo: fixoFinal, valTotal };
  });
}

function fBase(){
  let r = getRawBase();
  const vet=document.getElementById('f-vet')?.value;
  const mes=document.getElementById('f-mes')?.value;
  const sem=document.getElementById('f-sem')?.value;
  if(vet)r=r.filter(x=>x.vet===vet);
  if(mes)r=r.filter(x=>x.mes===mes);
  if(sem)r=r.filter(x=>x.sem===sem);
  return r;
}

function fAnal(sheet,mesId,vetId){
  let r=(S.anal&&S.anal[sheet])||[];
  const mes=document.getElementById(mesId)?.value;
  const vet=document.getElementById(vetId)?.value;
  if(mes)r=r.filter(x=>x.mes===mes);
  if(vet)r=r.filter(x=>x.vet===vet);
  return r;
}

// ════════════════════════════════
//  KPI BUILDER
// ════════════════════════════════
function kpiCard(lbl,val,sub,clr='var(--cyan)'){
  return `<div class="kc" style="--clr:${clr}"><div class="klbl">${lbl}</div><div class="kval">${val}</div><div class="ksub">${sub}</div></div>`;
}