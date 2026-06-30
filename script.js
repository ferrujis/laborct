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
const CHART_COLORS = ['#15b8a6','#c9a455','#2dd4a0','#e0a93a','#c97a8a','#818cf8','#6ee7b7','#fde68a','#93c5fd','#f0abfc'];
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

function openInsights() {
  document.getElementById('hub-view').style.display = 'none';
  document.getElementById('insights-view').style.display = 'block';
  requestAnimationFrame(() => requestAnimationFrame(() => { generateInsights(); }));
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
];

function initLaborApp(){
  document.getElementById('tnav-labor').innerHTML=PAGES_LABOR.map((p,i)=>
    `<button class="nb${i===0?' on':''}" data-pg="${p.id}" onclick="showPg('${p.id}',this)">${p.label}</button>`
  ).join('');

  document.querySelectorAll('#labor-view .pg').forEach(p=>p.classList.remove('on'));
  document.getElementById('pg-petcare').classList.add('on');
  populateAllFilters();
  requestAnimationFrame(() => requestAnimationFrame(() => { renderPetcare(); }));
}

const PAGE_RENDER_MAP = {
  'petcare':     renderPetcare,
  'ranking':     renderRanking,
  'faturamento': renderFaturamento,
  'clinica':     renderClinica,
  'inter':       renderInter,
  'cirurgico':   renderCirurgico,
  'laboratorio': renderLab,
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
    {label:'Qnt Horas',data:ds2,type:'line',borderColor:'#15b8a6',backgroundColor:'rgba(21,184,166,.08)',borderWidth:2,tension:.4,pointRadius:3,yAxisID:'y2',order:1,fill:true}
  ]},options:{
    responsive:true,maintainAspectRatio:false,
    plugins:{legend:{labels:{color:'#8899bb',font:{family:'JetBrains Mono',size:10}}}},
    scales:{
      x:{ticks:TC,grid:{color:GC},stacked:true},
      y:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC},stacked:true},
      y2:{position:'right',ticks:{color:'#15b8a6',font:{family:'JetBrains Mono',size:11},callback:v=>v+'h'},grid:{display:false}}
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

function mkHBar(id,labels,data,color='#15b8a6',xFmt=v=>'R$'+fN(v)){
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
// Mantém o filtro de Mês sincronizado entre todas as abas do LaborBI —
// mesmo comportamento já existente no CogsBI (lá é um único select; aqui
// cada aba tem o seu próprio, então replicamos o valor escolhido.
const LABOR_MES_SELECTS = ['f-mes', 'r-mes', 'fat-mes', 'cl-mes', 'it-mes', 'ci-mes', 'lb-mes'];

function syncLaborMonth(sourceId) {
  const src = document.getElementById(sourceId);
  if (!src) return;
  const val = src.value;
  LABOR_MES_SELECTS.forEach(id => {
    if (id === sourceId) return;
    const sel = document.getElementById(id);
    if (!sel) return;
    const hasOption = Array.from(sel.options).some(o => o.value === val);
    sel.value = hasOption ? val : '';
  });
}

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

// ════════════════════════════════
//  PAGE: PETCARE-2026
// ════════════════════════════════
function renderPetcare(){
  const rows=fBase();
  const has=rows.length>0;

  document.getElementById('petcare-sub').textContent=S.meta.base
    ?'Base de Dados: '+S.meta.base
    :(S.role==='admin'?'Carregue os arquivos no painel Admin.':'Aguardando atualização dos dados da nuvem.');

  // ── produção (somente Base de Dados — planilha sem nome) ──
  const tProd=sumC(rows,'prod');
  const tVar=sumC(rows,'valVar'),tFixo=sumC(rows,'valFixo');
  const tTotal=sumC(rows,'valTotal'),tHoras=sumC(rows,'horas');

  const mes=document.getElementById('f-mes')?.value||'';
  const vet=document.getElementById('f-vet')?.value||'';
  const sem=document.getElementById('f-sem')?.value||'';

  // ── produção total = somente a base ──
  const tProdTotal = tProd;
  // nº de semanas real do mês (ou 1 se uma semana específica está filtrada)
  const nSemanas = sem ? 1 : getNumSemanas(mes);
  const avgProd = rows.length ? tProdTotal / nSemanas : 0;
  const avgSub = sem ? 'semana selecionada' : `total ÷ ${nSemanas} semana${nSemanas>1?'s':''}`;

  // ── Média Diária (respeita vet/mês selecionados) ──
  // Requer um mês definido; com "Todos os Meses" a média diária não faz sentido.
  const temMes = !!mes;
  const { dias: diasPeriodo } = getDiasPeriodo(mes);
  const avgDia = (has && temMes && diasPeriodo) ? tProdTotal / diasPeriodo : 0;
  const ehMesCorrente = MES_IDX[mes] === (new Date().getMonth()+1);
  const avgDiaSub = !temMes
    ? 'selecione um mês'
    : (sem
        ? 'semana selecionada'
        : (ehMesCorrente ? `total ÷ ${diasPeriodo} dias decorridos` : `total ÷ ${diasPeriodo} dias`));

  // ── Comparativo: média diária do mês anterior ──
  // A base é semanal (sem datas diárias), então não é possível isolar os
  // primeiros N dias do mês anterior. Usamos a média diária real do mês
  // anterior completo (produção total ÷ dias do mês) como base de comparação.
  const mesAnt = getMesAnterior(mes);
  let cmpVal = '—', cmpSub = 'sem mês anterior', cmpClr = 'var(--tx3)';
  if(has && temMes && !sem && mesAnt){
    const { diasNoMes: diasAnt } = getDiasPeriodo(mesAnt);
    const prodAnt = getProducaoMes(mesAnt, vet);
    const avgDiaAnt = diasAnt ? prodAnt / diasAnt : 0;
    if(avgDiaAnt > 0){
      const varPct = ((avgDia - avgDiaAnt) / avgDiaAnt) * 100;
      const up = varPct >= 0;
      cmpVal = fR(avgDiaAnt);
      cmpClr = up ? 'var(--green)' : 'var(--red)';
      cmpSub = `${up?'▲':'▼'} ${Math.abs(varPct).toFixed(1)}% vs atual · ${cap(mesAnt)} (mês cheio)`;
    } else {
      cmpVal = '—';
      cmpSub = `sem dados em ${cap(mesAnt)}`;
    }
  } else if(sem){
    cmpSub = 'indisponível por semana';
  } else if(!temMes){
    cmpSub = 'selecione um mês';
  }

  document.getElementById('pc-kpi').innerHTML=[
    kpiCard('Produção Total',has?fR(tProdTotal):'—','base de dados','var(--cyan)'),
    kpiCard('Média Semanal',has?fR(avgProd):'—',avgSub,'var(--green)'),
    kpiCard('Média Diária',(has&&temMes)?fR(avgDia):'—',avgDiaSub,'#2dd4a0'),
    kpiCard('Média Diária — Mês Anterior',cmpVal,cmpSub,cmpClr),
    kpiCard('Valor Variável',has?fR(tVar):'—','comissão sobre produção','#60a5fa'),
    kpiCard('Valor Fixo',has?fR(tFixo):'—','salário + horas','#c9a455'),
    kpiCard('Valor Total',has?fR(tTotal):'—','fixo + variável','#c9a455'),
    kpiCard('Horas no Mês',has?fN(tHoras)+'h':'—','normais + noturnas','var(--cyan)'),
  ].join('');

  if(has){
    const byS={};
    rows.forEach(r=>{const k=r.sem||r.data;if(!byS[k])byS[k]={fixo:0,var:0,horas:0};byS[k].fixo+=r.valFixo;byS[k].var+=r.valVar;byS[k].horas+=r.horas});
    const lbls=Object.keys(byS).sort();
    mkCombo('ch-combo',lbls,lbls.map(l=>byS[l].fixo),lbls.map(l=>byS[l].var),lbls.map(l=>byS[l].horas));
    mkDonut('ch-donut',
      ['Valor Fixo','Valor Variável'],
      [tFixo, tVar],
      ['rgba(139,92,246,.85)','rgba(16,185,129,.85)']
    );
  }else{killChart('ch-combo');killChart('ch-donut')}

  // ── tabela por veterinário (somente Base de Dados) ──
  const byV={};
  rows.forEach(r=>{
    if(!byV[r.vet])byV[r.vet]={prod:0,fixo:0,var:0,total:0,horas:0,hN:0,hNt:0};
    const v=byV[r.vet];v.prod+=r.prod;v.fixo+=r.valFixo;v.var+=r.valVar;v.total+=r.valTotal;v.horas+=r.horas;v.hN+=r.hNorm;v.hNt+=r.hNot;
  });

  const vets=Object.entries(byV).sort((a,b)=>b[1].prod-a[1].prod);
  document.getElementById('pc-tcount').textContent=vets.length+' profissionais';
  const maxP=Math.max(...vets.map(v=>v[1].prod),1);

  document.getElementById('pc-table').innerHTML=vets.length
    ?`<table><thead><tr><th>Veterinário</th><th>Produção R$</th><th>% Comissão</th><th>Variável</th><th>Fixo Calculado</th><th>H. Normal</th><th>H. Noturna</th><th>Total Pagar</th></tr></thead><tbody>
    ${vets.map(([n,d])=>{
      const pc=calcPerc(d.prod);
      return `<tr>
      <td style="font-weight:600">${n}</td>
      <td style="color:var(--cyan);font-weight:700">${fR(d.prod)}<div class="pbar"><div class="pfill" style="width:${(d.prod/maxP*100).toFixed(1)}%"></div></div></td>
      <td><span class="bdg ${pc>=.07?'bg':pc>=.03?'by':'br'}">${fP(pc)}</span></td>
      <td style="color:var(--green)">${fR(d.var)}</td>
      <td style="color:#c9a455">
        ${fR(d.fixo)}
        <div style="font-size:9px;color:var(--tx3);font-family:var(--font-mono);margin-top:2px">
          ${d.horas>0
            ? (FIXO_MENSAL[n]!==undefined
                ? 'fixo mensal ÷'+getNumSemanas(mes)
                : (HORA_FIXA[n]!==undefined
                    ? 'R$'+HORA_FIXA[n].toFixed(2).replace('.',',')+'/h'
                    : (d.hN*getNumSemanas(mes)<=180?'R$26,22':'R$23,60')+'/h norm + R$37,79/h not'))
            : 'da planilha'}
        </div>
      </td>
      <td style="font-family:var(--font-mono);font-size:12px;color:var(--cyan)">${fN(d.hN)}h</td>
      <td style="font-family:var(--font-mono);font-size:12px;color:#c9a455">${fN(d.hNt)}h</td>
      <td style="color:var(--amber);font-weight:700;font-size:13px">${fR(d.total)}</td>
      </tr>`;
    }).join('')}</tbody></table>`
    :'<div class="nd"><div class="nd-i">📂</div>'+(S.role==='admin'?'Carregue a planilha no painel Admin.':'Dados não disponíveis.')+'</div>';
}

function renderRanking(){
  const mes=document.getElementById('r-mes')?.value||'';
  let rows=getRawBase();
  if(mes)rows=rows.filter(r=>r.mes===mes);

  const byV={};
  rows.forEach(r=>{if(!byV[r.vet])byV[r.vet]={prod:0,total:0,horas:0};byV[r.vet].prod+=r.prod;byV[r.vet].total+=r.valTotal;byV[r.vet].horas+=r.horas});
  const ranked=Object.entries(byV).sort((a,b)=>b[1].prod-a[1].prod);
  const medals=['🥇','🥈','🥉'];

  // ── nº de semanas do período (mês selecionado ou soma de todos os meses) ──
  const ALERTA_SEMANAL = 10000;
  let nSemRank;
  if(mes){
    nSemRank = getNumSemanas(mes);
  } else {
    const mesesBase=[...new Set(getRawBase().map(r=>r.mes).filter(Boolean))];
    nSemRank = mesesBase.reduce((s,m)=>s+getNumSemanas(m),0) || getNumSemanas('');
  }
  // média semanal por vet
  ranked.forEach(([,d])=>{ d.semanal = nSemRank ? d.prod/nSemRank : d.prod; d.abaixo = d.semanal < ALERTA_SEMANAL; });

  if(ranked.length){
    const top=ranked.slice(0,12);
    mkBar('ch-rank',top.map(([n])=>n.split('.')[0]),[{label:'Produção Total',data:top.map(([,d])=>d.prod),backgroundColor:top.map(([,d])=>d.abaixo?'rgba(239,68,68,.85)':'rgba(0,212,255,.73)'),borderRadius:5}],{yFmt:v=>'R$'+fN(v)});
  }else killChart('ch-rank');

  const nAbaixo = ranked.filter(([,d])=>d.abaixo).length;
  document.getElementById('r-count').textContent=ranked.length+' profissionais'+(nAbaixo?` · ${nAbaixo} abaixo de R$10 mil/sem`:'');
  const maxP=Math.max(...ranked.map(v=>v[1].prod),1);
  document.getElementById('rank-table').innerHTML=ranked.length
    ?`<table><thead><tr><th>#</th><th>Veterinário</th><th>Produção Total R$</th><th>Média Semanal</th><th>% Comissão</th><th>Total</th><th>Horas</th></tr></thead><tbody>
    ${ranked.map(([n,d],i)=>{
      const pc=calcPerc(d.prod);
      const cor = d.abaixo ? 'var(--red)' : 'var(--cyan)';
      const rowStyle = d.abaixo ? 'background:rgba(239,68,68,.07)' : '';
      return `<tr style="${rowStyle}"><td><span style="font-size:15px">${medals[i]||'#'+(i+1)}</span></td>
      <td style="font-weight:600;color:${d.abaixo?'var(--red)':'var(--tx)'}">${n}${d.abaixo?' <span style="font-size:10px;font-family:var(--font-mono);color:var(--red)">⚠ &lt;10k/sem</span>':''}</td>
      <td style="color:${cor}">${fR(d.prod)}<div class="pbar"><div class="pfill" style="width:${(d.prod/maxP*100).toFixed(1)}%;${d.abaixo?'background:var(--red)':''}"></div></div></td>
      <td style="color:${d.abaixo?'var(--red)':'var(--green)'};font-family:var(--font-mono);font-size:12px;font-weight:600">${fR(d.semanal)}</td>
      <td><span class="bdg ${pc>=.07?'bg':pc>=.03?'by':'br'}">${fP(pc)}</span></td>
      <td style="color:var(--green)">${fR(d.total)}</td><td style="font-family:var(--font-mono)">${fN(d.horas)}h</td></tr>`;
    }).join('')}</tbody></table>`
    :'<div class="nd"><div class="nd-i">🏆</div>'+(S.role==='admin'?'Carregue os dados no painel Admin.':'Dados não disponíveis.')+'</div>';
}

// ════════════════════════════════
//  FATURAMENTO INDIVIDUAL
// ════════════════════════════════
function renderFaturamento(){
  const ALERTA_SEMANAL = 10000;
  const vet = document.getElementById('fat-vet')?.value || '';
  const mes = document.getElementById('fat-mes')?.value || '';
  const kpiEl = document.getElementById('fat-kpi');
  const alertEl = document.getElementById('fat-alert');
  const tblEl = document.getElementById('fat-table');

  if(!vet || !isEspecialista(vet)){
    kpiEl.innerHTML = '';
    alertEl.innerHTML = '';
    tblEl.innerHTML = '<div class="nd"><div class="nd-i">👤</div>Selecione um especialista para ver a análise individual.</div>';
    document.getElementById('fat-tcount').textContent='';
    killChart('ch-fat');
    return;
  }

  const lanc = getLancamentos().filter(r => r.vet === vet);
  let rows = mes ? lanc.filter(r => r.mes === mes) : lanc;

  const tVal = sumC(rows,'valL');
  const nLanc = rows.length;
  const nSem = mes ? getNumSemanas(mes) : (() => {
    const ms=[...new Set(rows.map(r=>r.mes).filter(Boolean))];
    return ms.reduce((s,m)=>s+getNumSemanas(m),0) || 1;
  })();
  const mediaSemanal = nSem ? tVal/nSem : 0;
  const abaixo = mediaSemanal < ALERTA_SEMANAL;

  // ── comparativo com mês anterior ──
  const mesAnt = mes ? getMesAnterior(mes) : null;
  let cmpVal='—', cmpSub='sem mês anterior', cmpClr='var(--tx3)';
  let semAnt=0;
  if(mes && mesAnt){
    const rowsAnt = lanc.filter(r=>r.mes===mesAnt);
    const valAnt = sumC(rowsAnt,'valL');
    semAnt = getNumSemanas(mesAnt) ? valAnt/getNumSemanas(mesAnt) : 0;
    if(valAnt>0){
      const varPct = ((tVal - valAnt)/valAnt)*100;
      const up = varPct>=0;
      cmpVal = fR(valAnt);
      cmpClr = up ? 'var(--green)' : 'var(--red)';
      cmpSub = `${up?'▲':'▼'} ${Math.abs(varPct).toFixed(1)}% vs atual · ${cap(mesAnt)}`;
    } else {
      cmpSub = `sem dados em ${cap(mesAnt)}`;
    }
  }

  kpiEl.innerHTML = [
    kpiCard('Faturamento', nLanc?fR(tVal):'—', mes?cap(mes):'todos os meses', 'var(--cyan)'),
    kpiCard('Média Semanal', nLanc?fR(mediaSemanal):'—', `÷ ${nSem} semana${nSem>1?'s':''}`, abaixo?'var(--red)':'var(--green)'),
    kpiCard('Faturamento — Mês Anterior', cmpVal, cmpSub, cmpClr),
    kpiCard('Nº de Lançamentos', nLanc?nLanc:'—', 'procedimentos lançados', 'var(--amber)'),
  ].join('');

  // ── alerta de meta semanal ──
  if(nLanc && abaixo){
    alertEl.innerHTML = `<div style="margin:4px 0 16px;padding:14px 18px;border-radius:12px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.35);display:flex;gap:12px;align-items:center">
      <span style="font-size:22px">⚠️</span>
      <div style="font-size:13px;color:var(--tx);line-height:1.5">
        <strong style="color:var(--red)">Abaixo da meta semanal.</strong>
        A média semanal de <strong>${fR(mediaSemanal)}</strong> está abaixo de <strong>${fR(ALERTA_SEMANAL)}</strong>${mesAnt&&semAnt?` (mês anterior: ${fR(semAnt)}/sem)`:''}.
      </div>
    </div>`;
  } else if(nLanc){
    alertEl.innerHTML = `<div style="margin:4px 0 16px;padding:12px 18px;border-radius:12px;background:rgba(45,212,160,.08);border:1px solid rgba(45,212,160,.25);display:flex;gap:12px;align-items:center">
      <span style="font-size:18px">✓</span>
      <div style="font-size:12.5px;color:var(--tx2)">Média semanal de <strong style="color:var(--green)">${fR(mediaSemanal)}</strong> — dentro da meta de ${fR(ALERTA_SEMANAL)}/semana.</div>
    </div>`;
  } else {
    alertEl.innerHTML = '';
  }

  // ── top 20 lançamentos por QUANTIDADE (qtd + valor) ──
  const byP = {};
  rows.forEach(r=>{
    if(!r.proc) return;
    if(!byP[r.proc]) byP[r.proc]={val:0, n:0, setor:r.setor};
    byP[r.proc].val += (r.valL||0); byP[r.proc].n++;
  });
  const top = Object.entries(byP).sort((a,b)=> b[1].n - a[1].n || b[1].val - a[1].val).slice(0,20);

  if(top.length){
    mkHBar('ch-fat', top.slice(0,15).map(([p])=>shortProc(p)), top.slice(0,15).map(([,d])=>d.n), '#f59e0b', v=>fN(v));
  } else killChart('ch-fat');

  document.getElementById('fat-tcount').textContent = top.length ? `top ${top.length} de ${Object.keys(byP).length}` : '';
  tblEl.innerHTML = top.length
    ? `<table><thead><tr><th>#</th><th>Procedimento</th><th>Setor</th><th>Qtd</th><th>Valor Lançado</th><th>Ticket Médio</th></tr></thead><tbody>
    ${top.map(([p,d],i)=>`<tr>
      <td style="font-family:var(--font-mono);color:var(--tx3)">${i+1}</td>
      <td style="font-weight:600">${p}</td>
      <td style="font-size:11px;color:var(--tx3);font-family:var(--font-mono)">${d.setor||'—'}</td>
      <td style="font-family:var(--font-mono);color:var(--amber);font-weight:700">${d.n}</td>
      <td style="color:var(--cyan);font-weight:700">${fR(d.val)}</td>
      <td style="font-family:var(--font-mono);font-size:12px;color:var(--tx2)">${fR(d.n?d.val/d.n:0)}</td>
    </tr>`).join('')}</tbody></table>`
    : '<div class="nd"><div class="nd-i">📂</div>Sem lançamentos para este veterinário'+(mes?' em '+cap(mes):'')+'.</div>';
}

// ════════════════════════════════
//  HELPER: build a grouped byVet analysis
// ════════════════════════════════
function analByVet(rows){
  const byV={};
  rows.forEach(r=>{
    if(!byV[r.vet]) byV[r.vet]={val:0,tab:0,n:0};
    byV[r.vet].val+=r.valL; byV[r.vet].tab+=r.valT; byV[r.vet].n++;
  });
  return Object.entries(byV).sort((a,b)=>b[1].val-a[1].val);
}

function analByProc(rows){
  const byP={};
  rows.forEach(r=>{
    if(!r.proc) return;
    if(!byP[r.proc]) byP[r.proc]={val:0,n:0,tab:0};
    byP[r.proc].val+=r.valL; byP[r.proc].n++; byP[r.proc].tab+=r.valT;
  });
  return Object.entries(byP).sort((a,b)=>b[1].val-a[1].val);
}

function shortName(n){ return n ? n.split('.')[0] : n; }
function shortProc(p,max=28){ return p && p.length>max ? p.slice(0,max)+'…' : p; }

// ════════════════════════════════
//  CLÍNICA MÉDICA
// ════════════════════════════════
function renderClinica(){
  const rows = fAnal('CLINICA','cl-mes','cl-vet');
  const tVal=sumC(rows,'valL'), tTab=sumC(rows,'valT'), n=rows.length;
  const nVets=new Set(rows.map(r=>r.vet)).size;
  const nProc=new Set(rows.map(r=>r.proc)).size;
  const ticket = n>0 ? tVal/n : 0;
  const efic = tTab>0 ? tVal/tTab : 0;

  document.getElementById('cl-kpi').innerHTML=[
    kpiCard('Valor Lançado', n?fR(tVal):'—', 'total clínica', 'var(--cyan)'),
    kpiCard('Valor de Tabela', n?fR(tTab):'—', 'referência tabela', '#c9a455'),
    kpiCard('Eficiência', n?fP(efic):'—', 'lançado ÷ tabela', efic>=0.9?'var(--green)':efic>=0.7?'var(--amber)':'var(--red)'),
    kpiCard('Ticket Médio', n?fR(ticket):'—', 'por lançamento', '#60a5fa'),
    kpiCard('Veterinários', n?nVets:'—', 'ativos na clínica', 'var(--green)'),
    kpiCard('Procedimentos', n?nProc:'—', 'tipos distintos', 'var(--amber)'),
  ].join('');

  if(!n){
    ['ch-cl-vet','ch-cl-efic','ch-cl-proc','ch-cl-vol'].forEach(killChart);
    document.getElementById('cl-table').innerHTML='<div class="nd"><div class="nd-i">📋</div>Sem dados.</div>';
    document.getElementById('cl-tcount').textContent='';
    return;
  }

  const byV = analByVet(rows);
  const byP = analByProc(rows);
  const top10P = byP.slice(0,10);

  // Chart 1: faturamento por vet (barras verticais)
  mkBar('ch-cl-vet',
    byV.map(([n])=>shortName(n)),
    [{label:'Valor Lançado',data:byV.map(([,d])=>d.val),
      backgroundColor:byV.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]+'cc'),borderRadius:5}],
    {yFmt:v=>'R$'+fN(v)}
  );

  // Chart 2: eficiência lançado vs tabela por vet (barras agrupadas)
  mkBar('ch-cl-efic',
    byV.map(([n])=>shortName(n)),
    [
      {label:'Lançado',data:byV.map(([,d])=>d.val),backgroundColor:'rgba(0,212,255,.75)',borderRadius:4},
      {label:'Tabela',data:byV.map(([,d])=>d.tab),backgroundColor:'rgba(139,92,246,.5)',borderRadius:4},
    ],
    {yFmt:v=>'R$'+fN(v)}
  );

  // Chart 3: top 10 procedimentos por valor (horizontal)
  mkHBar('ch-cl-proc',
    top10P.map(([p])=>shortProc(p)),
    top10P.map(([,d])=>d.val),
    'var(--cyan)'
  );

  // Chart 4: top 10 procedimentos por volume (horizontal)
  const byPvol = [...byP].sort((a,b)=>b[1].n-a[1].n).slice(0,10);
  killChart('ch-cl-vol');
  const ctx4=document.getElementById('ch-cl-vol')?.getContext('2d');
  if(ctx4) S.charts['ch-cl-vol']=new Chart(ctx4,{type:'bar',data:{
    labels:byPvol.map(([p])=>shortProc(p)),
    datasets:[{label:'Qtd',data:byPvol.map(([,d])=>d.n),backgroundColor:'rgba(16,185,129,.75)',borderRadius:5}]
  },options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{x:{ticks:{...TC,callback:v=>fN(v)},grid:{color:GC}},y:{ticks:{...TC,font:{size:9}},grid:{color:GC}}}}});

  // Table: by vet com eficiência
  const maxV=Math.max(...byV.map(([,d])=>d.val),1);
  document.getElementById('cl-tcount').textContent=byV.length+' veterinários';
  document.getElementById('cl-table').innerHTML=`<table><thead>
    <tr><th>Veterinário</th><th>Lançamentos</th><th>Valor Lançado</th><th>Valor Tabela</th><th>Eficiência</th><th>Ticket Médio</th></tr>
  </thead><tbody>
  ${byV.map(([nm,d])=>{
    const ef=d.tab>0?d.val/d.tab:0;
    const tk=d.n>0?d.val/d.n:0;
    return `<tr>
      <td style="font-weight:600">${nm}</td>
      <td style="font-family:var(--font-mono)">${d.n}</td>
      <td style="color:var(--cyan)">${fR(d.val)}<div class="pbar"><div class="pfill" style="width:${(d.val/maxV*100).toFixed(1)}%"></div></div></td>
      <td style="color:#c9a455;font-family:var(--font-mono)">${fR(d.tab)}</td>
      <td><span class="bdg ${ef>=0.9?'bg':ef>=0.7?'by':'br'}">${(ef*100).toFixed(1)}%</span></td>
      <td style="color:var(--amber);font-family:var(--font-mono)">${fR(tk)}</td>
    </tr>`;
  }).join('')}</tbody></table>`;
}

// ════════════════════════════════
//  INTERNAÇÃO
// ════════════════════════════════
function renderInter(){
  const rows = fAnal('INTER','it-mes','it-vet');
  const tVal=sumC(rows,'valL'), tTab=sumC(rows,'valT'), n=rows.length;
  const nVets=new Set(rows.map(r=>r.vet)).size;
  const nProc=new Set(rows.map(r=>r.proc)).size;
  const ticket=n>0?tVal/n:0;
  const efic=tTab>0?tVal/tTab:0;

  document.getElementById('it-kpi').innerHTML=[
    kpiCard('Valor Lançado', n?fR(tVal):'—', 'total internação', 'var(--green)'),
    kpiCard('Valor de Tabela', n?fR(tTab):'—', 'referência tabela', '#c9a455'),
    kpiCard('Eficiência', n?fP(efic):'—', 'lançado ÷ tabela', efic>=0.9?'var(--green)':efic>=0.7?'var(--amber)':'var(--red)'),
    kpiCard('Ticket Médio', n?fR(ticket):'—', 'por lançamento', '#60a5fa'),
    kpiCard('Veterinários', n?nVets:'—', 'ativos na internação', 'var(--cyan)'),
    kpiCard('Procedimentos', n?nProc:'—', 'tipos distintos', 'var(--amber)'),
  ].join('');

  if(!n){
    ['ch-it-vet','ch-it-efic','ch-it-proc','ch-it-vol'].forEach(killChart);
    document.getElementById('it-table').innerHTML='<div class="nd"><div class="nd-i">📋</div>Sem dados.</div>';
    document.getElementById('it-tcount').textContent='';
    return;
  }

  const byV=analByVet(rows);
  const byP=analByProc(rows);
  const top10P=byP.slice(0,10);
  const byPvol=[...byP].sort((a,b)=>b[1].n-a[1].n).slice(0,10);

  mkHBar('ch-it-vet',byV.map(([nm])=>shortName(nm)),byV.map(([,d])=>d.val),'#2dd4a0');

  mkBar('ch-it-efic',
    byV.map(([nm])=>shortName(nm)),
    [
      {label:'Lançado',data:byV.map(([,d])=>d.val),backgroundColor:'rgba(16,185,129,.75)',borderRadius:4},
      {label:'Tabela',data:byV.map(([,d])=>d.tab),backgroundColor:'rgba(139,92,246,.5)',borderRadius:4},
    ],{yFmt:v=>'R$'+fN(v)}
  );

  mkHBar('ch-it-proc',top10P.map(([p])=>shortProc(p)),top10P.map(([,d])=>d.val),'#2dd4a0');

  killChart('ch-it-vol');
  const ctx4=document.getElementById('ch-it-vol')?.getContext('2d');
  if(ctx4) S.charts['ch-it-vol']=new Chart(ctx4,{type:'bar',data:{
    labels:byPvol.map(([p])=>shortProc(p)),
    datasets:[{label:'Qtd',data:byPvol.map(([,d])=>d.n),backgroundColor:'rgba(96,165,250,.75)',borderRadius:5}]
  },options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{x:{ticks:{...TC,callback:v=>fN(v)},grid:{color:GC}},y:{ticks:{...TC,font:{size:9}},grid:{color:GC}}}}});

  const maxP=Math.max(...byP.map(([,d])=>d.val),1);
  document.getElementById('it-tcount').textContent=byP.length+' procedimentos';
  document.getElementById('it-table').innerHTML=`<table><thead>
    <tr><th>Procedimento</th><th>Qtd</th><th>Valor Total</th><th>Ticket Médio</th><th>Tabela Total</th><th>Eficiência</th></tr>
  </thead><tbody>
  ${byP.slice(0,40).map(([p,d])=>{
    const ef=d.tab>0?d.val/d.tab:0;
    return `<tr>
      <td style="font-size:11px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p}">${p}</td>
      <td style="font-family:var(--font-mono);color:var(--cyan)">${d.n}</td>
      <td style="color:var(--green)">${fR(d.val)}<div class="pbar"><div class="pfill" style="width:${(d.val/maxP*100).toFixed(1)}%;background:var(--green)"></div></div></td>
      <td style="font-family:var(--font-mono)">${fR(d.val/d.n)}</td>
      <td style="color:#c9a455;font-family:var(--font-mono)">${fR(d.tab)}</td>
      <td><span class="bdg ${ef>=0.9?'bg':ef>=0.7?'by':'br'}">${(ef*100).toFixed(1)}%</span></td>
    </tr>`;
  }).join('')}</tbody></table>`;
}

// ════════════════════════════════
//  BLOCO CIRÚRGICO
// ════════════════════════════════
function renderCirurgico(){
  const rows = fAnal('C_CIRURGICO','ci-mes','ci-vet');
  const tVal=sumC(rows,'valL'), tTab=sumC(rows,'valT'), n=rows.length;
  const nVets=new Set(rows.map(r=>r.vet)).size;
  const nProc=new Set(rows.map(r=>r.proc)).size;
  const ticket=n>0?tVal/n:0;
  const efic=tTab>0?tVal/tTab:0;

  document.getElementById('ci-kpi').innerHTML=[
    kpiCard('Valor Lançado', n?fR(tVal):'—', 'total cirúrgico', 'var(--amber)'),
    kpiCard('Valor de Tabela', n?fR(tTab):'—', 'referência tabela', '#c9a455'),
    kpiCard('Eficiência', n?fP(efic):'—', 'lançado ÷ tabela', efic>=0.9?'var(--green)':efic>=0.7?'var(--amber)':'var(--red)'),
    kpiCard('Ticket Médio', n?fR(ticket):'—', 'por procedimento', '#60a5fa'),
    kpiCard('Cirurgiões', n?nVets:'—', 'ativos no bloco', 'var(--cyan)'),
    kpiCard('Tipos de Cirurgia', n?nProc:'—', 'procedimentos únicos', 'var(--green)'),
  ].join('');

  if(!n){
    ['ch-ci-vet','ch-ci-efic','ch-ci-proc','ch-ci-vol'].forEach(killChart);
    document.getElementById('ci-table').innerHTML='<div class="nd"><div class="nd-i">🔪</div>Sem dados.</div>';
    document.getElementById('ci-tcount').textContent='';
    return;
  }

  const byV=analByVet(rows);
  const byP=analByProc(rows);
  const top10P=byP.slice(0,10);
  const byPvol=[...byP].sort((a,b)=>b[1].n-a[1].n).slice(0,10);

  // Faturamento por cirurgião
  mkBar('ch-ci-vet',
    byV.map(([nm])=>shortName(nm)),
    [{label:'Valor Cirúrgico',data:byV.map(([,d])=>d.val),
      backgroundColor:byV.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]+'cc'),borderRadius:5}],
    {yFmt:v=>'R$'+fN(v)}
  );

  // Eficiência agrupada
  mkBar('ch-ci-efic',
    byV.map(([nm])=>shortName(nm)),
    [
      {label:'Lançado',data:byV.map(([,d])=>d.val),backgroundColor:'rgba(245,158,11,.75)',borderRadius:4},
      {label:'Tabela',data:byV.map(([,d])=>d.tab),backgroundColor:'rgba(139,92,246,.5)',borderRadius:4},
    ],{yFmt:v=>'R$'+fN(v)}
  );

  // Top cirurgias por valor
  mkHBar('ch-ci-proc',top10P.map(([p])=>shortProc(p)),top10P.map(([,d])=>d.val),'#e0a93a');

  // Top cirurgias por volume
  killChart('ch-ci-vol');
  const ctx4=document.getElementById('ch-ci-vol')?.getContext('2d');
  if(ctx4) S.charts['ch-ci-vol']=new Chart(ctx4,{type:'bar',data:{
    labels:byPvol.map(([p])=>shortProc(p)),
    datasets:[{label:'Qtd',data:byPvol.map(([,d])=>d.n),backgroundColor:'rgba(244,63,94,.7)',borderRadius:5}]
  },options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{x:{ticks:{...TC,callback:v=>fN(v)},grid:{color:GC}},y:{ticks:{...TC,font:{size:9}},grid:{color:GC}}}}});

  const maxP=Math.max(...byP.map(([,d])=>d.val),1);
  document.getElementById('ci-tcount').textContent=byP.length+' procedimentos';
  document.getElementById('ci-table').innerHTML=`<table><thead>
    <tr><th>Procedimento Cirúrgico</th><th>Qtd</th><th>Valor Total</th><th>Ticket Médio</th><th>Tabela Total</th><th>Eficiência</th></tr>
  </thead><tbody>
  ${byP.slice(0,40).map(([p,d])=>{
    const ef=d.tab>0?d.val/d.tab:0;
    return `<tr>
      <td style="font-size:11px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p}">${p}</td>
      <td style="font-family:var(--font-mono);color:var(--amber)">${d.n}</td>
      <td style="color:var(--amber)">${fR(d.val)}<div class="pbar"><div class="pfill" style="width:${(d.val/maxP*100).toFixed(1)}%;background:var(--amber)"></div></div></td>
      <td style="font-family:var(--font-mono)">${fR(d.val/d.n)}</td>
      <td style="color:#c9a455;font-family:var(--font-mono)">${fR(d.tab)}</td>
      <td><span class="bdg ${ef>=0.9?'bg':ef>=0.7?'by':'br'}">${(ef*100).toFixed(1)}%</span></td>
    </tr>`;
  }).join('')}</tbody></table>`;
}

// ════════════════════════════════
//  LABORATÓRIO
// ════════════════════════════════
function renderLab(){
  const rows = fAnal('LAB','lb-mes','lb-vet');
  const tVal=sumC(rows,'valL'), tTab=sumC(rows,'valT'), n=rows.length;
  const nVets=new Set(rows.map(r=>r.vet)).size;
  const nProc=new Set(rows.map(r=>r.proc)).size;
  const ticket=n>0?tVal/n:0;
  const efic=tTab>0?tVal/tTab:0;

  document.getElementById('lb-kpi').innerHTML=[
    kpiCard('Valor Lançado', n?fR(tVal):'—', 'total laboratório', '#c9a455'),
    kpiCard('Total Exames', n?fN(n):'—', 'lançamentos', 'var(--cyan)'),
    kpiCard('Eficiência', n?fP(efic):'—', 'lançado ÷ tabela', efic>=0.9?'var(--green)':efic>=0.7?'var(--amber)':'var(--red)'),
    kpiCard('Ticket Médio', n?fR(ticket):'—', 'por exame', '#60a5fa'),
    kpiCard('Solicitantes', n?nVets:'—', 'veterinários', 'var(--green)'),
    kpiCard('Tipos de Exame', n?nProc:'—', 'exames distintos', 'var(--amber)'),
  ].join('');

  if(!n){
    ['ch-lb-vol','ch-lb-fat','ch-lb-vet','ch-lb-ticket'].forEach(killChart);
    document.getElementById('lb-table').innerHTML='<div class="nd"><div class="nd-i">🧪</div>Sem dados.</div>';
    document.getElementById('lb-tcount').textContent='';
    return;
  }

  const byP=analByProc(rows);
  const byPvol=[...byP].sort((a,b)=>b[1].n-a[1].n);
  const top10vol=byPvol.slice(0,10);
  const top10fat=byP.slice(0,10);
  const byV=analByVet(rows);

  // Chart 1: top exames por volume
  killChart('ch-lb-vol');
  const ctx1=document.getElementById('ch-lb-vol')?.getContext('2d');
  if(ctx1) S.charts['ch-lb-vol']=new Chart(ctx1,{type:'bar',data:{
    labels:top10vol.map(([p])=>shortProc(p)),
    datasets:[{label:'Qtd',data:top10vol.map(([,d])=>d.n),backgroundColor:'rgba(139,92,246,.8)',borderRadius:5}]
  },options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{x:{ticks:{...TC,callback:v=>fN(v)},grid:{color:GC}},y:{ticks:{...TC,font:{size:9}},grid:{color:GC}}}}});

  // Chart 2: top exames por faturamento
  mkHBar('ch-lb-fat',top10fat.map(([p])=>shortProc(p)),top10fat.map(([,d])=>d.val),'#c9a455');

  // Chart 3: faturamento por vet solicitante
  mkBar('ch-lb-vet',
    byV.map(([nm])=>shortName(nm)),
    [{label:'Valor Solicitado',data:byV.map(([,d])=>d.val),
      backgroundColor:byV.map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]+'bb'),borderRadius:5}],
    {yFmt:v=>'R$'+fN(v)}
  );

  // Chart 4: ticket médio por exame (top 10 mais caros em média)
  const byPticket=[...byP].map(([p,d])=>([p,{...d,ticket:d.n>0?d.val/d.n:0}])).sort((a,b)=>b[1].ticket-a[1].ticket).slice(0,10);
  killChart('ch-lb-ticket');
  const ctx4=document.getElementById('ch-lb-ticket')?.getContext('2d');
  if(ctx4) S.charts['ch-lb-ticket']=new Chart(ctx4,{type:'bar',data:{
    labels:byPticket.map(([p])=>shortProc(p)),
    datasets:[{label:'Ticket Médio (R$)',data:byPticket.map(([,d])=>d.ticket),
      backgroundColor:'rgba(245,158,11,.75)',borderRadius:5}]
  },options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{x:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}},y:{ticks:{...TC,font:{size:9}},grid:{color:GC}}}}});

  // Table: catálogo completo de exames
  const maxV=Math.max(...byPvol.map(([,d])=>d.val),1);
  document.getElementById('lb-tcount').textContent=byP.length+' tipos de exame';
  document.getElementById('lb-table').innerHTML=`<table><thead>
    <tr><th>Exame / Procedimento</th><th>Qtd</th><th>Valor Total</th><th>Ticket Médio</th><th>% Volume</th></tr>
  </thead><tbody>
  ${byPvol.slice(0,50).map(([p,d])=>{
    const totalN=sumC(rows,'valL')>0?n:1;
    return `<tr>
      <td style="font-size:11px;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p}">${p}</td>
      <td style="color:#c9a455;font-weight:600;font-family:var(--font-mono)">${d.n}</td>
      <td style="color:var(--cyan)">${fR(d.val)}</td>
      <td style="font-family:var(--font-mono)">${fR(d.n>0?d.val/d.n:0)}</td>
      <td><div class="pbar" style="width:80px;display:inline-block;vertical-align:middle"><div class="pfill" style="width:${(d.n/Math.max(...byPvol.map(([,x])=>x.n))*100).toFixed(1)}%;background:#c9a455"></div></div> <span style="font-family:var(--font-mono);font-size:10px">${(d.n/n*100).toFixed(1)}%</span></td>
    </tr>`;
  }).join('')}</tbody></table>`;
}



// ════════════════════════════════
//  PAGE: COGS BI — DINÂMICO (lê categorias do xlsx automaticamente)
// ════════════════════════════════

// ── Grupos de categorias: mapeamento dinâmico ──
// Cada categoria do xlsx é classificada num grupo pelo nome
function getCatGroup(cat) {
  if (!cat) return 'outros';
  const cn = cat.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();

  // ── Receita ──
  if (cn.includes('faturamento') || cn.includes('receita'))   return 'receita';

  // ── LABOR: verificado ANTES dos impostos para evitar falsos positivos
  // ('comissao' contém 'iss', então labor deve vir primeiro)
  if (cn.includes('comissao') || cn.includes('comissão'))                 return 'labor';
  if (cn.startsWith('equipe') || cn.includes('equipe vet'))               return 'labor';
  if (cn.includes('clt') || cn.includes('horista') || cn.includes('salario') ||
      cn.includes('enferm') || cn.includes('especiali') ||
      cn.includes('recursos humanos') || cn === 'recepcao' ||
      cn.includes('recepcao'))                                             return 'labor';
  // 'vet' sozinho: só labor se não for "veterinaria" dentro de outro contexto
  if (cn.startsWith('equipe') || cn.includes(' vet') || cn.endsWith(' vet') ||
      cn.includes('veterinar'))                                            return 'labor';

  // ── Tributação / Impostos ──
  if (cn.startsWith('imposto') || cn.includes('icms') || cn.includes('difal') ||
      cn.includes('tribut') || cn.includes('cofins') || cn.includes('csll') ||
      cn.includes(' pis') || cn.startsWith('pis') || cn.includes('ir ') ||
      // 'iss' sozinho só como imposto, não dentro de palavras como 'comissao'
      /\biss\b/.test(cn))                                                 return 'imposto';

  // ── Laboratório externo ──
  if (cn.startsWith('laboratorio') || cn === 'lab')                       return 'lab';

  // ── Insumos e Medicamentos ──
  if (cn.includes('insumo') || cn.includes('medicament'))                 return 'insumos';

  // ── Facilities ──
  if (cn.startsWith('facilities') || cn === 'facilities')                 return 'facilities';

  // ── T.I. ──
  if (cn.startsWith('t.i.') || cn.startsWith('ti -') || cn.includes('informatica') ||
      cn.includes('internet') || cn.includes('tecnologia'))               return 'ti';

  // ── COGS operacional diverso ──
  if (cn.includes('banho') || cn.includes('tosa') || cn.includes('marketing') ||
      cn.includes('publicidade'))                                          return 'cogs_op';

  // ── Administrativo / Estoque ──
  if (cn.includes('admin') || cn.includes('estoque') || cn.includes('escritorio')) return 'admin';

  return 'outros';
}

// Cor e label por grupo — estrutura de 6 camadas do Clevis
const GROUP_META = {
  // Camada 2 — Labor
  labor:     { color:'#f97316', label:'Labor',              icon:'👥', camada:'labor' },
  // Camada 3 — COGS (subcategorias)
  lab:       { color:'#15b8a6', label:'Laboratório Ext.',   icon:'🧪', camada:'cogs' },
  insumos:   { color:'#2dd4a0', label:'Insumos e Med.',     icon:'💊', camada:'cogs' },
  facilities:{ color:'#e0a93a', label:'Facilities',         icon:'🏗️', camada:'cogs' },
  ti:        { color:'#818cf8', label:'T.I.',               icon:'💻', camada:'cogs' },
  admin:     { color:'#94a3b8', label:'Administrativo',     icon:'📋', camada:'cogs' },
  outros:    { color:'#64748b', label:'Outros',             icon:'📦', camada:'cogs' },
  // Camada 5 — Tributação
  imposto:   { color:'#c97a8a', label:'Tributação',         icon:'🏛️', camada:'tribut' },
  cogs_op:   { color:'#f472b6', label:'Op. Diverso',        icon:'🏷️', camada:'cogs' },
  // Base
  receita:   { color:'#15b8a6', label:'Faturamento Bruto',  icon:'💰', camada:'receita' },
};

// Taxa de imposto estimada para EBITDA → Lucro Líquido (configurável)
const TAXA_IMPOSTO_EST = 0.30; // 30% sobre EBITDA (Simples/Lucro Presumido estimado)

let _cogsActiveTab = 'dre';
let _cogsActiveCat = '';   // categoria exata quando tab === 'cat'
let _cogsCatsCache = [];

// Ícone por grupo
function getCatIcon(cat) {
  const g = getCatGroup(cat);
  const icons = { receita:'💰', labor:'👥', lab:'🧪', insumos:'💊',
    facilities:'🏗️', ti:'💻', admin:'📋', imposto:'🏛️', cogs_op:'🏷️', outros:'📦' };
  return icons[g] || '📦';
}

// Constrói as abas de categoria dinamicamente na navbar
function buildCogsNav() {
  // Cache all raw cats for other functions that still need them
  const allCats = [...new Set((S.cogs||[]).map(r => r.cat).filter(Boolean))]
    .filter(c => getCatGroup(c) !== 'receita');
  _cogsCatsCache = allCats;

  const nav = document.getElementById('tnav-cogs');
  if (!nav) return;

  // Remove dynamic tabs, rebuild as one button per GROUP (not per raw category)
  nav.querySelectorAll('.nb.cogs.dyn').forEach(b => b.remove());

  const GROUP_ORDER = ['labor','lab','insumos','facilities','ti','admin','cogs_op','imposto','outros'];
  const presentGroups = [...new Set(allCats.map(c => getCatGroup(c)))]
    .sort((a,b) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b));

  presentGroups.forEach(groupKey => {
    const meta = GROUP_META[groupKey] || GROUP_META.outros;
    const btn = document.createElement('button');
    btn.className = 'nb cogs dyn';
    btn.type = 'button';
    btn.setAttribute('role', 'tab');
    btn.setAttribute('aria-selected', 'false');
    btn.textContent = meta.icon + ' ' + meta.label;
    btn.onclick = function() { switchCogsGroupTab(groupKey, this); };
    if (_cogsActiveTab === 'group' && _cogsActiveCat === groupKey) btn.classList.add('on');
    nav.appendChild(btn);
  });
}

function switchCogsGroupTab(groupKey, btn) {
  _cogsActiveTab = 'group';
  _cogsActiveCat = groupKey;
  document.querySelectorAll('.cogs-tab').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#tnav-cogs .nb').forEach(b => {
    b.classList.remove('on');
    b.setAttribute('aria-selected', 'false');
  });
  document.getElementById('cogs-tab-cat').style.display = 'block';
  if (btn) { btn.classList.add('on'); btn.setAttribute('aria-selected', 'true'); }
  renderCogsGroup(groupKey);
}

function renderCogsGroup(groupKey) {
  if (!groupKey) return;
  const meta     = GROUP_META[groupKey] || GROUP_META.outros;
  const allRows  = getCogsFiltered();
  const rows     = allRows.filter(r => getCatGroup(r.cat) === groupKey);
  const totalGeral = allRows.filter(r => getCatGroup(r.cat) !== 'receita').reduce((s,r)=>s+r.val,0);
  const total    = rows.reduce((s,r)=>s+r.val,0);
  const pctTotal = totalGeral > 0 ? (total/totalGeral*100) : 0;

  const byForn = {};
  rows.forEach(r => { const k=r.forn||r.cat||'?'; byForn[k]=(byForn[k]||0)+r.val; });
  const sortedForn = Object.entries(byForn).sort((a,b)=>b[1]-a[1]);

  const byMes = {};
  rows.forEach(r => { if(r.mes) byMes[r.mes]=(byMes[r.mes]||0)+r.val; });
  const sortedMes = Object.entries(byMes).sort((a,b)=>MESES.indexOf(a[0])-MESES.indexOf(b[0]));

  const byCat = {};
  rows.forEach(r => { byCat[r.cat||'?']=(byCat[r.cat||'?']||0)+r.val; });
  const sortedCat = Object.entries(byCat).sort((a,b)=>b[1]-a[1]);

  const el = document.getElementById('cogs-cat-content');
  if (!el) return;

  el.innerHTML = `
    <div class="ptitle" style="color:var(--tx)">${meta.icon} <span style="color:${meta.color}">${meta.label}</span></div>
    <div class="psub">${rows.length} lançamentos · ${Object.keys(byCat).length} subcategoria(s) · ${sortedMes.length} mês/meses</div>

    <div class="kgrid">
      ${kpiCard('Total '+meta.label, fR(total), rows.length+' lançamentos', meta.color)}
      ${kpiCard('% dos Custos Totais', pctTotal.toFixed(1)+'%', 'participação no total', meta.color)}
      ${kpiCard('Maior Fornecedor', sortedForn.length?fR(sortedForn[0][1]):'—', sortedForn.length?sortedForn[0][0].substring(0,24):'—', meta.color)}
      ${kpiCard('Ticket Médio', rows.length?fR(total/rows.length):'—', 'por lançamento', meta.color)}
      ${kpiCard('Subcategorias', Object.keys(byCat).length, 'distintas', 'var(--tx2)')}
      ${kpiCard('Meses', sortedMes.length, 'com lançamentos', 'var(--tx2)')}
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:22px">
      <div class="cc">
        <div class="ctitle" style="--cyan:${meta.color}">Top Fornecedores / Itens — ${meta.label} (R$)</div>
        <canvas id="ch-grp-bar" height="200"></canvas>
      </div>
      <div class="cc">
        <div class="ctitle" style="--cyan:${meta.color}">Distribuição por Mês</div>
        <canvas id="ch-grp-mes" height="200"></canvas>
      </div>
    </div>

    ${sortedCat.length > 1 ? `
    <div class="cc" style="margin-bottom:22px">
      <div class="ctitle" style="--cyan:${meta.color}">Subcategorias em ${meta.label}</div>
      <canvas id="ch-grp-cat" height="110"></canvas>
    </div>` : ''}

    <div class="tw">
      <div class="th">
        <span>${meta.icon} Lançamentos — ${meta.label}</span>
        <span>${rows.length} itens</span>
      </div>
      <div class="tscroll"><div id="grp-table"></div></div>
    </div>`;

  // Chart: top suppliers (horizontal bar)
  killChart('ch-grp-bar');
  const ctx1 = document.getElementById('ch-grp-bar')?.getContext('2d');
  if (ctx1 && sortedForn.length) {
    S.charts['ch-grp-bar'] = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: sortedForn.slice(0,14).map(([k])=>k),
        datasets: [{label:'Valor (R$)', data: sortedForn.slice(0,14).map(([,v])=>v),
          backgroundColor: meta.color+'bb', borderRadius: 5}]
      },
      options: {indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}},
        scales:{x:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}},
                y:{ticks:{...TC,font:{size:10}},grid:{color:GC}}}}
    });
  }

  // Chart: monthly doughnut
  killChart('ch-grp-mes');
  const ctx2 = document.getElementById('ch-grp-mes')?.getContext('2d');
  if (ctx2 && sortedMes.length) {
    S.charts['ch-grp-mes'] = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: sortedMes.map(([m])=>m.charAt(0).toUpperCase()+m.slice(1)),
        datasets: [{data: sortedMes.map(([,v])=>v),
          backgroundColor: CHART_COLORS.slice(0,sortedMes.length).map(c=>c+'bb')}]
      },
      options: {responsive:true, maintainAspectRatio:false,
        plugins:{legend:{labels:{color:'#8faac8',font:{size:11}}}}}
    });
  }

  // Chart: subcategory bar (only when >1 subcategory)
  if (sortedCat.length > 1) {
    killChart('ch-grp-cat');
    const ctx3 = document.getElementById('ch-grp-cat')?.getContext('2d');
    if (ctx3) {
      S.charts['ch-grp-cat'] = new Chart(ctx3, {
        type: 'bar',
        data: {
          labels: sortedCat.map(([k])=>k),
          datasets: [{label:'R$', data: sortedCat.map(([,v])=>v),
            backgroundColor: CHART_COLORS.slice(0,sortedCat.length).map(c=>c+'99'),
            borderRadius: 5}]
        },
        options: {responsive:true, maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{x:{ticks:{...TC,font:{size:10}},grid:{color:GC}},
                  y:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}}}}
      });
    }
  }

  // Detail table
  document.getElementById('grp-table').innerHTML = rows.length ? `
    <table><thead><tr>
      <th>Data</th><th>Mês</th><th>Categoria</th><th>Fornecedor / Item</th>
      <th style="text-align:right">Valor R$</th><th style="text-align:right">%</th>
    </tr></thead><tbody>
    ${rows.sort((a,b)=>b.val-a.val).map(r=>{
      const p=total>0?(r.val/total*100).toFixed(1):0;
      return `<tr>
        <td style="font-family:var(--font-mono);font-size:11px">${(r.data||'').split('-').reverse().join('/')}</td>
        <td style="text-transform:capitalize;font-family:var(--font-mono);font-size:11px">${r.mes||'—'}</td>
        <td>${catBadge(r.cat)}</td>
        <td style="font-weight:500;font-size:12px">${r.forn||'—'}</td>
        <td style="color:${meta.color};font-family:var(--font-mono);font-weight:600;text-align:right">${fR(r.val)}</td>
        <td style="text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--tx3)">
          ${p}%<div class="pbar" style="width:50px;display:inline-block;vertical-align:middle;margin-left:6px"><div class="pfill" style="width:${p}%;background:${meta.color}"></div></div>
        </td>
      </tr>`;
    }).join('')}</tbody></table>` :
    `<div class="nd"><div class="nd-i">${meta.icon}</div>Sem lançamentos de "${meta.label}" neste período.</div>`;
}

function switchCogsTab(tab, btn) {
  _cogsActiveTab = tab;
  _cogsActiveCat = '';
  document.querySelectorAll('.cogs-tab').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#tnav-cogs .nb').forEach(b => b.classList.remove('on'));
  const tabEl = document.getElementById('cogs-tab-' + tab);
  if (tabEl) tabEl.style.display = 'block';
  if (btn) btn.classList.add('on');
  renderCogsTab(tab);
}

function switchCogsCatTab(cat, btn) {
  _cogsActiveTab = 'cat';
  _cogsActiveCat = cat;
  document.querySelectorAll('.cogs-tab').forEach(el => el.style.display = 'none');
  document.querySelectorAll('#tnav-cogs .nb').forEach(b => b.classList.remove('on'));
  document.getElementById('cogs-tab-cat').style.display = 'block';
  if (btn) btn.classList.add('on');
  renderCogsCatByName(cat);
}

function renderCogs() {
  buildCogsNav();
  renderCogsTab(_cogsActiveTab);
}

function getCogsFiltered() {
  const mes    = document.getElementById('cg-mes')?.value || '';
  const search = (document.getElementById('cg-search')?.value || '').toLowerCase().trim();
  let rows = S.cogs || [];
  if (mes)    rows = rows.filter(r => r.mes === mes);
  if (search) rows = rows.filter(r =>
    (r.forn||'').toLowerCase().includes(search) ||
    (r.cat||'').toLowerCase().includes(search)
  );
  return rows;
}

function renderCogsTab(tab) {
  if      (tab === 'dre')      renderCogsDRE();
  else if (tab === 'ebitda')   renderCogsEBITDA();
  else if (tab === 'historico')renderCogsHistorico();
  else if (tab === 'cat')      renderCogsCatByName(_cogsActiveCat);
  else if (tab === 'group')    renderCogsGroup(_cogsActiveCat);
}

// ── TOTAIS por grupo ──
function getFatBrutoParaMeses(mesesDosCustos) {
  // Usa getRawBase() — idêntico ao "Produção Total" do LaborBI (sumC rows, 'prod').
  const base = getRawBase();
  if (!mesesDosCustos || mesesDosCustos.length === 0) {
    return sumC(base, 'prod');
  }
  return base
    .filter(r => mesesDosCustos.includes(r.mes))
    .reduce((s, r) => s + (r.prod || 0), 0);
}

function getCogsTotals(rows) {
  // ── Agrupa por grupo de categoria ──
  const byGroup = {};
  rows.forEach(r => {
    const g = getCatGroup(r.cat);
    byGroup[g] = (byGroup[g]||0) + r.val;
  });

  // ── Meses dos custos para buscar faturamento correto no LaborBI ──
  const mesFiltro = document.getElementById('cg-mes')?.value || '';
  const mesesDosCustos = mesFiltro
    ? [mesFiltro]
    : [...new Set(rows.map(r => r.mes).filter(Boolean))];

  // ── CAMADA 1: Faturamento Bruto — sempre do LaborBI ──
  let fatBruto = getFatBrutoParaMeses(mesesDosCustos);
  if (!fatBruto) fatBruto = byGroup['receita'] || 0; // fallback

  // ── CAMADA 2: Labor — CLT, PJ, Comissão, Horistas ──
  // Vem exclusivamente dos lançamentos no xlsx de custos
  const laborLaborBI = 0; // não usado — labor vem somente do xlsx
  const laborManual  = byGroup['labor'] || 0;
  const custoLabor   = laborManual;

  // ── CAMADA 3: COGS — custos diretos da operação ──
  const custoLab      = byGroup['lab']        || 0; // laboratório externo
  const custoIns      = byGroup['insumos']    || 0; // insumos e medicamentos
  const custoFac      = byGroup['facilities'] || 0; // facilities
  const custoTI       = byGroup['ti']         || 0; // tecnologia
  const custoAdm      = byGroup['admin']      || 0; // administrativo
  const custoOpDiv    = byGroup['cogs_op']    || 0; // marketing, banho e tosa, etc.
  const custoOutros   = byGroup['outros']     || 0;
  const custoCOGS     = custoLab + custoIns + custoFac + custoTI + custoAdm + custoOpDiv + custoOutros;

  const custoTotal    = custoLabor + custoCOGS;

  // ── CAMADA 4: Pré-tributação (EBITDA) ──
  const preTribu      = fatBruto - custoLabor - custoCOGS;

  // ── CAMADA 5: Tributação ──
  const custoImposto  = byGroup['imposto'] || 0;
  const impostosLancados   = custoImposto;
  const impostosEstimados  = impostosLancados > 0 ? 0 : Math.max(0, preTribu * TAXA_IMPOSTO_EST);
  const totalImpostos      = impostosLancados + impostosEstimados;

  // ── CAMADA 6: Lucro Líquido ──
  const lucroLiquido  = preTribu - totalImpostos;

  // Margens
  const margemLabor   = fatBruto > 0 ? custoLabor  / fatBruto : 0;
  const margemCOGS    = fatBruto > 0 ? custoCOGS   / fatBruto : 0;
  const margemPreTribu= fatBruto > 0 ? preTribu     / fatBruto : 0;
  const margemLiquida = fatBruto > 0 ? lucroLiquido / fatBruto : 0;

  // Alias de compatibilidade
  const ebitda         = preTribu;
  const margemEbitda   = margemPreTribu;
  const custoOpSemImposto = custoLabor + custoCOGS;
  const custoPessoal   = custoLabor; // compatibilidade

  return {
    // Camadas principais
    fatBruto,
    custoLabor, laborLaborBI, laborManual,
    custoCOGS, custoLab, custoIns, custoFac, custoTI, custoAdm, custoOpDiv, custoOutros,
    preTribu,
    impostosLancados, impostosEstimados, totalImpostos,
    lucroLiquido,
    // Totais / margens
    custoTotal, custoOpSemImposto, custoPessoal,
    ebitda, margemLabor, margemCOGS, margemPreTribu, margemEbitda, margemLiquida,
    byGroup, mesesDosCustos,
    // Alias
    custoImposto: totalImpostos,
  };
}

// helper badge colorido
function catBadge(cat) {
  const g = getCatGroup(cat);
  const m = GROUP_META[g] || GROUP_META.outros;
  return `<span style="padding:2px 8px;border-radius:100px;font-size:10px;font-family:var(--font-mono);background:${m.color}18;color:${m.color};border:1px solid ${m.color}44;white-space:nowrap">${cat}</span>`;
}

// ── ABA 1: DRE COMPLETO ──
function renderCogsDRE() {
  const rows     = getCogsFiltered();
  const mes      = document.getElementById('cg-mes')?.value || '';
  const t        = getCogsTotals(rows);
  const mesLabel = mes ? mes.charAt(0).toUpperCase()+mes.slice(1) : 'Todos os Meses';
  const pct      = v => t.fatBruto > 0 ? Math.abs(v / t.fatBruto * 100) : 0;

  document.getElementById('cg-dre-mes-label').textContent = mesLabel;

  // ── KPIs das 6 camadas ──
  const fonteFat = (S.base && S.base.length > 0)
    ? `LaborBI · ${(t.mesesDosCustos||[]).length > 0 ? t.mesesDosCustos.map(m=>m.charAt(0).toUpperCase()+m.slice(1)).join(' + ') : 'todos os meses'}`
    : 'sem dados LaborBI';

  document.getElementById('cg-kpi').innerHTML = [
    kpiCard('① Faturamento Bruto',  fR(t.fatBruto),      fonteFat,                               '#15b8a6'),
    kpiCard('② Labor',              fR(t.custoLabor),    fP(t.margemLabor)+' da receita',         '#f97316'),
    kpiCard('③ COGS Total',          fR(t.custoCOGS),     fP(t.margemCOGS)+' da receita',          '#c9a455'),
    kpiCard('  Lab. Externo',        fR(t.custoLab),      '% '+(pct(t.custoLab).toFixed(1))+'%',  '#15b8a6'),
    kpiCard('  Insumos e Med.',      fR(t.custoIns),      '% '+(pct(t.custoIns).toFixed(1))+'%',  '#2dd4a0'),
    kpiCard('  Facilities',          fR(t.custoFac),      '% '+(pct(t.custoFac).toFixed(1))+'%',  '#e0a93a'),
    kpiCard('  T.I.',                fR(t.custoTI),       '% '+(pct(t.custoTI).toFixed(1))+'%',   '#818cf8'),
    kpiCard('④ Pré-tributação',      fR(t.preTribu),      fP(t.margemPreTribu)+' margem',          t.preTribu>=0?'#2dd4a0':'#e5685f'),
    kpiCard('⑤ Tributação',          fR(t.totalImpostos), t.impostosEstimados>0?'estimado '+((TAXA_IMPOSTO_EST*100).toFixed(0))+'%':'lançado', '#c97a8a'),
    kpiCard('⑥ Lucro Líquido',       fR(t.lucroLiquido),  fP(t.margemLiquida)+' margem liq.',      t.lucroLiquido>=0?'#2dd4a0':'#e5685f'),
  ].join('');

  // ── Cascata DRE — 6 Camadas Visuais ──
  // Todas as categorias individuais do COGS (exceto receita, labor, imposto)
  const cogsCatsRows = rows.filter(r => {
    const g = getCatGroup(r.cat);
    return g !== 'receita' && g !== 'labor' && g !== 'imposto';
  });
  const cogsByCat = {};
  cogsCatsRows.forEach(r => { cogsByCat[r.cat] = (cogsByCat[r.cat]||0) + r.val; });
  const cogsCatsSorted = Object.entries(cogsByCat).sort((a,b)=>b[1]-a[1]);

  // Todas as categorias de labor
  const laborCatsRows = rows.filter(r => getCatGroup(r.cat) === 'labor');
  const laborByCat = {};
  laborCatsRows.forEach(r => { laborByCat[r.cat] = (laborByCat[r.cat]||0) + r.val; });
  const laborCatsSorted = Object.entries(laborByCat).sort((a,b)=>b[1]-a[1]);

  // Todas as categorias de imposto
  const impostoCatsRows = rows.filter(r => getCatGroup(r.cat) === 'imposto');
  const impostoByCat = {};
  impostoCatsRows.forEach(r => { impostoByCat[r.cat] = (impostoByCat[r.cat]||0) + r.val; });
  const impostoCatsSorted = Object.entries(impostoByCat).sort((a,b)=>b[1]-a[1]);

  const camadas = [
    // Camada 1
    { n:'1', label:'Faturamento Bruto',           val:t.fatBruto,      color:'#15b8a6', tipo:'receita',  indent:0 },
    // Camada 2 — Labor (com todas subcategorias)
    { n:'2', label:'(−) Labor',                   val:t.custoLabor,    color:'#f97316', tipo:'camada',   indent:0, bold:true },
    ...laborCatsSorted.filter(([,v])=>v>0).map(([cat,v]) => ({
      n:'', label:cat, val:v,
      color:'#fb923c', tipo:'sub', indent:1
    })),
    // Camada 3 — COGS com TODAS as categorias individuais
    { n:'3', label:'(−) COGS',                    val:t.custoCOGS,     color:'#c9a455', tipo:'camada',   indent:0, bold:true },
    ...cogsCatsSorted.filter(([,v])=>v>0).map(([cat,v]) => {
      const g = getCatGroup(cat);
      const m = GROUP_META[g] || GROUP_META.outros;
      return { n:'', label:cat, val:v, color:m.color, tipo:'sub', indent:1 };
    }),
    // Camada 4 — Pré-tributação
    { n:'4', label:'(=) Pré-tributação (EBITDA)', val:t.preTribu,      color:t.preTribu>=0?'#2dd4a0':'#e5685f', tipo:'resultado', indent:0, bold:true },
    // Camada 5 — Tributação com todas subcategorias
    { n:'5', label:'(−) Tributação'+(t.impostosEstimados>0?' (est. '+(TAXA_IMPOSTO_EST*100).toFixed(0)+'%)':''), val:t.totalImpostos, color:'#c97a8a', tipo:'camada', indent:0, bold:true },
    ...impostoCatsSorted.filter(([,v])=>v>0).map(([cat,v]) => ({
      n:'', label:cat, val:v, color:'#fda4af', tipo:'sub', indent:1
    })),
    // Camada 6 — Lucro Líquido
    { n:'6', label:t.lucroLiquido>=0?'(=) Lucro Líquido':'(=) Prejuízo Líquido', val:t.lucroLiquido, color:t.lucroLiquido>=0?'#2dd4a0':'#e5685f', tipo:'resultado', indent:0, bold:true },
  ];

  document.getElementById('cg-dre-visual').innerHTML = `
    <div style="background:var(--sf);border:1px solid var(--bd);border-radius:var(--radius);padding:28px;position:relative;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#15b8a6,#c9a455,#2dd4a0)"></div>

      <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--tx);margin-bottom:24px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="width:3px;height:18px;background:var(--violet);border-radius:2px;display:inline-block"></span>
        DRE — 6 Camadas · ${mesLabel}
        <span style="font-size:10px;font-family:var(--font-mono);padding:2px 10px;background:rgba(21,184,166,.1);color:#15b8a6;border:1px solid rgba(21,184,166,.3);border-radius:4px">📊 ${fonteFat}</span>
        ${t.impostosEstimados>0?`<span style="font-size:10px;font-family:var(--font-mono);padding:2px 10px;background:rgba(201,122,138,.1);color:#c97a8a;border:1px solid rgba(201,122,138,.3);border-radius:4px">⚠️ Tributação estimada ${(TAXA_IMPOSTO_EST*100).toFixed(0)}%</span>`:''}
      </div>

      <div style="display:flex;flex-direction:column;gap:6px">
        ${camadas.map(item => {
          const p = pct(item.val);
          const barW = Math.min(p, 100).toFixed(1);
          const isSep = item.tipo === 'resultado';
          const isSub = item.tipo === 'sub';
          return `<div style="display:grid;grid-template-columns:28px 240px 1fr 160px;align-items:center;gap:10px${isSep?';padding-top:10px;border-top:1px dashed var(--bd)':''}${isSub?';opacity:.85':''}">
            <div style="font-family:var(--font-mono);font-size:10px;color:${item.color};font-weight:700;text-align:center">${item.n?`<span style="background:${item.color}22;border:1px solid ${item.color}55;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center">${item.n}</span>`:''}</div>
            <div style="font-size:${isSub?'11.5':'13'}px;font-family:var(--font-mono);color:${item.bold?item.color:'var(--tx2)'};font-weight:${item.bold?700:400};padding-left:${item.indent*18}px">${item.label}</div>
            <div style="height:${isSub?'10':'16'}px;background:var(--sf3);border-radius:3px;overflow:hidden">
              <div style="height:100%;width:${barW}%;background:${item.color};border-radius:3px;opacity:${isSub?.6:.9};transition:width .6s ease"></div>
            </div>
            <div style="text-align:right;font-family:var(--font-mono);font-size:${isSub?'11.5':'13'}px;color:${item.color};font-weight:${item.bold?700:500}">
              ${item.tipo!=='receita'?'':''} ${fR(Math.abs(item.val))}
              <span style="font-size:9px;color:var(--tx3);margin-left:4px">${p.toFixed(1)}%</span>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  // ── Gráficos ──
  // Donut: Labor vs COGS vs Tributação vs Lucro
  const donutData = [
    { l:'Labor',       v:t.custoLabor,    c:'#f97316cc' },
    { l:'COGS',        v:t.custoCOGS,     c:'#c9a455cc' },
    { l:'Tributação',  v:t.totalImpostos, c:'#c97a8acc' },
    { l:'Lucro Líq.',  v:Math.max(0,t.lucroLiquido), c:'#2dd4a0cc' },
  ].filter(x=>x.v>0);
  if (donutData.length) {
    mkDonut('ch-cogs-donut', donutData.map(x=>x.l), donutData.map(x=>x.v), donutData.map(x=>x.c));
  } else killChart('ch-cogs-donut');

  // Barras: as 6 camadas
  killChart('ch-cogs-gauge');
  const ctx = document.getElementById('ch-cogs-gauge')?.getContext('2d');
  const bData = [
    { l:'Faturamento',   v:t.fatBruto,      c:'rgba(21,184,166,.85)' },
    { l:'Labor',         v:t.custoLabor,    c:'rgba(249,115,22,.85)' },
    { l:'COGS',          v:t.custoCOGS,     c:'rgba(201,164,85,.85)' },
    { l:'Pré-trib.',     v:t.preTribu,      c:t.preTribu>=0?'rgba(45,212,160,.85)':'rgba(229,104,95,.85)' },
    { l:'Tributação',    v:t.totalImpostos, c:'rgba(201,122,138,.85)' },
    { l:'Lucro Líq.',    v:t.lucroLiquido,  c:t.lucroLiquido>=0?'rgba(45,212,160,.9)':'rgba(229,104,95,.9)' },
  ].filter(x=>Math.abs(x.v)>0);
  if (ctx && bData.length) {
    S.charts['ch-cogs-gauge'] = new Chart(ctx, {
      type:'bar',
      data:{ labels:bData.map(x=>x.l), datasets:[{ data:bData.map(x=>x.v), backgroundColor:bData.map(x=>x.c), borderRadius:7 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales:{ x:{ticks:{...TC},grid:{color:GC}}, y:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}} } }
    });
  }

  // ── Tabela DRE estruturada por camadas — TODAS as categorias ──
  const dreLinhas = [
    { sep:false, label:'① Faturamento Bruto',  val:t.fatBruto,   color:'#15b8a6', bold:true,  obs:fonteFat },
    // ② Labor — cada categoria
    { sep:true,  label:'② (−) Labor',           val:t.custoLabor, color:'#f97316', bold:true,  obs:'CLT + PJ + Comissão + Horistas' },
    ...laborCatsSorted.filter(([,v])=>v>0).map(([cat,v]) => ({
      sep:false, label:'    '+cat, val:v, color:'#fb923c', bold:false, obs:''
    })),
    // ③ COGS — cada categoria individual
    { sep:true,  label:'③ (−) COGS',            val:t.custoCOGS,  color:'#c9a455', bold:true,  obs:'custos diretos da operação' },
    ...cogsCatsSorted.filter(([,v])=>v>0).map(([cat,v]) => {
      const g = getCatGroup(cat);
      const m = GROUP_META[g] || GROUP_META.outros;
      return { sep:false, label:'    '+cat, val:v, color:m.color, bold:false, obs:'' };
    }),
    { sep:true,  label:'④ (=) Pré-tributação (EBITDA)', val:t.preTribu, color:t.preTribu>=0?'#2dd4a0':'#e5685f', bold:true, obs:'faturamento − labor − cogs' },
    // ⑤ Tributação — cada imposto
    { sep:true,  label:'⑤ (−) Tributação'+(t.impostosEstimados>0?' (est. '+(TAXA_IMPOSTO_EST*100).toFixed(0)+'%)':''), val:t.totalImpostos, color:'#c97a8a', bold:true, obs:t.impostosEstimados>0?'estimativa':'valores lançados' },
    ...impostoCatsSorted.filter(([,v])=>v>0).map(([cat,v]) => ({
      sep:false, label:'    '+cat, val:v, color:'#fda4af', bold:false, obs:''
    })),
    { sep:true,  label:t.lucroLiquido>=0?'⑥ (=) Lucro Líquido':'⑥ (=) Prejuízo Líquido', val:t.lucroLiquido, color:t.lucroLiquido>=0?'#2dd4a0':'#e5685f', bold:true, obs:'resultado final' },
  ];

  document.getElementById('cg-dre-table').innerHTML = `
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="padding:11px 20px;text-align:left;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Linha DRE</th>
        <th style="padding:11px 20px;text-align:right;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Valor (R$)</th>
        <th style="padding:11px 20px;text-align:right;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">% Receita</th>
        <th style="padding:11px 20px;text-align:left;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Descrição</th>
        <th style="padding:11px 20px;text-align:left;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Barra</th>
      </tr></thead>
      <tbody>
        ${dreLinhas.map(row => {
          const p = t.fatBruto > 0 ? (Math.abs(row.val)/t.fatBruto*100) : 0;
          const barW = Math.min(p,100).toFixed(1);
          return `<tr style="${row.sep?'border-top:2px solid var(--bd)':''}">
            <td style="padding:${row.bold?'13':'10'}px 20px;font-size:${row.bold?'13':'12'}px;color:${row.bold?row.color:'var(--tx3)'};font-weight:${row.bold?700:400};border-bottom:1px solid rgba(30,45,71,.4)">${row.label}</td>
            <td style="padding:${row.bold?'13':'10'}px 20px;text-align:right;font-family:var(--font-mono);color:${row.color};font-weight:${row.bold?700:500};font-size:${row.bold?'13':'12'}px;border-bottom:1px solid rgba(30,45,71,.4)">${fR(row.val)}</td>
            <td style="padding:${row.bold?'13':'10'}px 20px;text-align:right;font-family:var(--font-mono);font-size:11px;color:${row.bold?row.color:'var(--tx3)'};font-weight:${row.bold?600:400};border-bottom:1px solid rgba(30,45,71,.4)">${p.toFixed(1)}%</td>
            <td style="padding:${row.bold?'13':'10'}px 20px;font-size:11px;color:var(--tx3);font-family:var(--font-mono);border-bottom:1px solid rgba(30,45,71,.4)">${row.obs||''}</td>
            <td style="padding:${row.bold?'13':'10'}px 20px;border-bottom:1px solid rgba(30,45,71,.4)"><div style="height:${row.bold?'6':'4'}px;background:var(--sf3);border-radius:3px;overflow:hidden;width:100px"><div style="height:100%;width:${barW}%;background:${row.color};border-radius:3px"></div></div></td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
}

// ── ABA 2: EBITDA / PRÉ-TRIBUTAÇÃO ──
function renderCogsEBITDA() {
  const rows     = getCogsFiltered();
  const mes      = document.getElementById('cg-mes')?.value || '';
  const t        = getCogsTotals(rows);
  const mesLabel = mes ? mes.charAt(0).toUpperCase()+mes.slice(1) : 'Todos os Meses';
  document.getElementById('cg-ebitda-mes-label').textContent = mesLabel;

  // Todas as categorias individuais para o EBITDA visual
  const cogsCatsRows = rows.filter(r => { const g=getCatGroup(r.cat); return g!=='receita'&&g!=='labor'&&g!=='imposto'; });
  const cogsByCat = {}; cogsCatsRows.forEach(r=>{cogsByCat[r.cat]=(cogsByCat[r.cat]||0)+r.val;});
  const cogsCatsSorted = Object.entries(cogsByCat).sort((a,b)=>b[1]-a[1]);
  const laborCatsRows = rows.filter(r=>getCatGroup(r.cat)==='labor');
  const laborByCat = {}; laborCatsRows.forEach(r=>{laborByCat[r.cat]=(laborByCat[r.cat]||0)+r.val;});
  const laborCatsSorted = Object.entries(laborByCat).sort((a,b)=>b[1]-a[1]);
  const impostoCatsRows = rows.filter(r=>getCatGroup(r.cat)==='imposto');
  const impostoByCat = {}; impostoCatsRows.forEach(r=>{impostoByCat[r.cat]=(impostoByCat[r.cat]||0)+r.val;});
  const impostoCatsSorted = Object.entries(impostoByCat).sort((a,b)=>b[1]-a[1]);

  const fonteFat = (S.base && S.base.length > 0)
    ? `LaborBI · ${(t.mesesDosCustos||[]).length > 0 ? t.mesesDosCustos.map(m=>m.charAt(0).toUpperCase()+m.slice(1)).join(' + ') : 'todos os meses'}`
    : 'sem dados LaborBI';

  document.getElementById('cg-ebitda-kpi').innerHTML = [
    kpiCard('① Faturamento Bruto', fR(t.fatBruto),      fonteFat,                           '#15b8a6'),
    kpiCard('② Labor',             fR(t.custoLabor),    fP(t.margemLabor)+' da receita',     '#f97316'),
    kpiCard('③ COGS',              fR(t.custoCOGS),     fP(t.margemCOGS)+' da receita',      '#c9a455'),
    kpiCard('④ Pré-tributação',    fR(t.preTribu),      fP(t.margemPreTribu)+' margem',       t.preTribu>=0?'#2dd4a0':'#e5685f'),
    kpiCard('⑤ Tributação',        fR(t.totalImpostos), t.impostosEstimados>0?'estimado '+((TAXA_IMPOSTO_EST*100).toFixed(0))+'%':'lançado', '#c97a8a'),
    kpiCard('⑥ Lucro Líquido',     fR(t.lucroLiquido),  fP(t.margemLiquida)+' margem liq.',  t.lucroLiquido>=0?'#2dd4a0':'#e5685f'),
  ].join('');

  // Visual 6 camadas em cards grandes
  document.getElementById('cg-ebitda-visual').innerHTML = `
    <div style="background:var(--sf);border:1px solid var(--bd);border-radius:var(--radius);padding:28px;position:relative;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#15b8a6,#f97316,#c9a455,#2dd4a0,#c97a8a,#2dd4a0)"></div>
      <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--tx);margin-bottom:24px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="width:3px;height:18px;background:#2dd4a0;border-radius:2px;display:inline-block"></span>
        Estrutura de 6 Camadas — ${mesLabel}
        ${t.impostosEstimados>0?`<span style="font-size:10px;font-family:var(--font-mono);padding:3px 10px;background:rgba(201,122,138,.1);color:#c97a8a;border:1px solid rgba(201,122,138,.3);border-radius:4px">⚠️ Tributação estimada em ${(TAXA_IMPOSTO_EST*100).toFixed(0)}%</span>`:''}
      </div>

      <!-- Fluxo das 6 camadas — com todas categorias expandidas -->
      <div style="display:flex;flex-direction:column;gap:8px">

        <!-- ① Faturamento Bruto -->
        ${(()=>{ const p=t.fatBruto>0?100:0; return `
        <div style="display:grid;grid-template-columns:40px 1fr;align-items:stretch;gap:0;border-radius:12px;overflow:hidden;border:1px solid #15b8a633;background:var(--bg2)">
          <div style="background:#15b8a6;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;padding:4px">①</div>
          <div style="padding:12px 18px;display:flex;justify-content:space-between;align-items:center">
            <div><div style="font-size:12px;font-weight:600;color:var(--tx)">Faturamento Bruto</div><div style="font-size:10px;font-family:var(--font-mono);color:var(--tx3)">${fonteFat}</div></div>
            <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:#15b8a6">${fR(t.fatBruto)}</div>
          </div>
        </div>`; })()}

        <!-- ② Labor — todas categorias -->
        <div style="border-radius:12px;overflow:hidden;border:1px solid #f9731633;background:var(--bg2)">
          <div style="display:grid;grid-template-columns:40px 1fr;align-items:center">
            <div style="background:#f97316;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;padding:14px 4px;align-self:stretch">②</div>
            <div style="padding:12px 18px;display:flex;justify-content:space-between;align-items:center">
              <div style="font-size:13px;font-weight:700;color:#f97316">(−) Labor</div>
              <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:#f97316">${fR(t.custoLabor)}</div>
            </div>
          </div>
          ${laborCatsSorted.filter(([,v])=>v>0).map(([cat,v])=>{
            const p=t.fatBruto>0?(v/t.fatBruto*100):0;
            return `<div style="display:grid;grid-template-columns:40px 1fr;border-top:1px solid rgba(249,115,22,.15)">
              <div style="background:rgba(249,115,22,.08)"></div>
              <div style="padding:8px 18px;display:flex;justify-content:space-between;align-items:center">
                <div style="font-size:11.5px;font-family:var(--font-mono);color:var(--tx2)">${cat}</div>
                <div style="text-align:right">
                  <span style="font-family:var(--font-mono);font-size:12px;color:#fb923c;font-weight:600">${fR(v)}</span>
                  <span style="font-size:9.5px;font-family:var(--font-mono);color:var(--tx3);margin-left:8px">${p.toFixed(1)}%</span>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>

        <!-- ③ COGS — todas categorias -->
        <div style="border-radius:12px;overflow:hidden;border:1px solid #c9a45533;background:var(--bg2)">
          <div style="display:grid;grid-template-columns:40px 1fr;align-items:center">
            <div style="background:#c9a455;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;padding:14px 4px;align-self:stretch">③</div>
            <div style="padding:12px 18px;display:flex;justify-content:space-between;align-items:center">
              <div style="font-size:13px;font-weight:700;color:#c9a455">(−) COGS</div>
              <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:#c9a455">${fR(t.custoCOGS)}</div>
            </div>
          </div>
          ${cogsCatsSorted.filter(([,v])=>v>0).map(([cat,v])=>{
            const g=getCatGroup(cat);
            const m=GROUP_META[g]||GROUP_META.outros;
            const p=t.fatBruto>0?(v/t.fatBruto*100):0;
            return `<div style="display:grid;grid-template-columns:40px 1fr;border-top:1px solid rgba(201,164,85,.15)">
              <div style="background:rgba(201,164,85,.06);display:flex;align-items:center;justify-content:center">
                <span style="font-size:11px">${m.icon}</span>
              </div>
              <div style="padding:8px 18px;display:flex;justify-content:space-between;align-items:center">
                <div style="font-size:11.5px;font-family:var(--font-mono);color:var(--tx2)">${cat}</div>
                <div style="text-align:right">
                  <span style="font-family:var(--font-mono);font-size:12px;color:${m.color};font-weight:600">${fR(v)}</span>
                  <span style="font-size:9.5px;font-family:var(--font-mono);color:var(--tx3);margin-left:8px">${p.toFixed(1)}%</span>
                </div>
              </div>
            </div>`;
          }).join('')}
        </div>

        <!-- ④ Pré-tributação -->
        ${(()=>{ const c=t.preTribu>=0?'#2dd4a0':'#e5685f'; const p=t.fatBruto>0?Math.abs(t.preTribu/t.fatBruto*100):0; return `
        <div style="border-radius:12px;overflow:hidden;border:2px solid ${c}55;background:${c}12">
          <div style="display:grid;grid-template-columns:40px 1fr;align-items:center">
            <div style="background:${c};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;padding:16px 4px;align-self:stretch">④</div>
            <div style="padding:14px 18px;display:flex;justify-content:space-between;align-items:center">
              <div><div style="font-size:13px;font-weight:800;color:${c}">(=) Pré-tributação (EBITDA)</div><div style="font-size:10px;font-family:var(--font-mono);color:var(--tx3)">① − ② − ③ · ${p.toFixed(1)}% da receita</div></div>
              <div style="font-family:var(--font-display);font-size:22px;font-weight:800;color:${c}">${fR(t.preTribu)}</div>
            </div>
          </div>
        </div>`; })()}

        <!-- ⑤ Tributação — todas categorias -->
        <div style="border-radius:12px;overflow:hidden;border:1px solid #c97a8a33;background:var(--bg2)">
          <div style="display:grid;grid-template-columns:40px 1fr;align-items:center">
            <div style="background:#c97a8a;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;padding:14px 4px;align-self:stretch">⑤</div>
            <div style="padding:12px 18px;display:flex;justify-content:space-between;align-items:center">
              <div style="font-size:13px;font-weight:700;color:#c97a8a">(−) Tributação${t.impostosEstimados>0?' (est. '+(TAXA_IMPOSTO_EST*100).toFixed(0)+'%)':''}</div>
              <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:#c97a8a">${fR(t.totalImpostos)}</div>
            </div>
          </div>
          ${impostoCatsSorted.filter(([,v])=>v>0).map(([cat,v])=>{
            const p=t.fatBruto>0?(v/t.fatBruto*100):0;
            return `<div style="display:grid;grid-template-columns:40px 1fr;border-top:1px solid rgba(201,122,138,.15)">
              <div style="background:rgba(201,122,138,.06)"></div>
              <div style="padding:8px 18px;display:flex;justify-content:space-between;align-items:center">
                <div style="font-size:11.5px;font-family:var(--font-mono);color:var(--tx2)">${cat}</div>
                <div style="text-align:right">
                  <span style="font-family:var(--font-mono);font-size:12px;color:#fda4af;font-weight:600">${fR(v)}</span>
                  <span style="font-size:9.5px;font-family:var(--font-mono);color:var(--tx3);margin-left:8px">${p.toFixed(1)}%</span>
                </div>
              </div>
            </div>`;
          }).join('')}
          ${t.impostosEstimados>0?`<div style="border-top:1px solid rgba(201,122,138,.2);padding:8px 18px 8px 58px;font-size:10.5px;font-family:var(--font-mono);color:#c97a8a">⚠️ Estimativa de ${(TAXA_IMPOSTO_EST*100).toFixed(0)}% sobre pré-tributação. Lance impostos no xlsx (ICMS/ISS/PIS/COFINS) para valores reais.</div>`:''}
        </div>

        <!-- ⑥ Lucro Líquido -->
        ${(()=>{ const c=t.lucroLiquido>=0?'#2dd4a0':'#e5685f'; const p=t.fatBruto>0?Math.abs(t.lucroLiquido/t.fatBruto*100):0; return `
        <div style="border-radius:12px;overflow:hidden;border:2px solid ${c}55;background:${c}12">
          <div style="display:grid;grid-template-columns:40px 1fr;align-items:center">
            <div style="background:${c};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;padding:16px 4px;align-self:stretch">⑥</div>
            <div style="padding:14px 18px;display:flex;justify-content:space-between;align-items:center">
              <div><div style="font-size:13px;font-weight:800;color:${c}">(=) ${t.lucroLiquido>=0?'Lucro Líquido':'Prejuízo Líquido'}</div><div style="font-size:10px;font-family:var(--font-mono);color:var(--tx3)">④ − ⑤ · ${p.toFixed(1)}% da receita</div></div>
              <div style="font-family:var(--font-display);font-size:22px;font-weight:800;color:${c}">${fR(t.lucroLiquido)}</div>
            </div>
          </div>
        </div>`; })()}

      </div>

      ${t.impostosEstimados>0?`
      <div style="margin-top:16px;padding:12px 16px;background:rgba(201,122,138,.07);border:1px solid rgba(201,122,138,.25);border-radius:8px;font-size:11.5px;font-family:var(--font-mono);color:#c97a8a;line-height:1.7">
        ⚠️ <strong>Tributação estimada:</strong> Nenhum lançamento de imposto encontrado. Usando ${(TAXA_IMPOSTO_EST*100).toFixed(0)}% sobre pré-tributação = ${fR(t.impostosEstimados)}.
        Para valores reais, adicione no xlsx com categoria <strong>ICMS / ISS / Impostos / Tributação</strong>.
      </div>`:''}
    </div>`;

  // Barras decomposição
  killChart('ch-ebitda-bar');
  const ctx1 = document.getElementById('ch-ebitda-bar')?.getContext('2d');
  const barsDecomp = [
    { l:'Labor',        v:t.custoLabor,    c:'rgba(249,115,22,.8)' },
    { l:'COGS',         v:t.custoCOGS,     c:'rgba(201,164,85,.8)' },
    { l:'Tributação',   v:t.totalImpostos, c:'rgba(201,122,138,.8)' },
    { l:'Lucro Líq.',   v:Math.max(0,t.lucroLiquido), c:'rgba(45,212,160,.8)' },
  ].filter(x=>x.v>0);
  if (ctx1 && barsDecomp.length) {
    S.charts['ch-ebitda-bar'] = new Chart(ctx1, {
      type:'bar',
      data:{ labels:['Faturamento Bruto', ...barsDecomp.map(x=>x.l)], datasets:[{
        data:[t.fatBruto,...barsDecomp.map(x=>x.v)],
        backgroundColor:['rgba(21,184,166,.85)',...barsDecomp.map(x=>x.c)],
        borderRadius:7,
      }]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales:{ x:{ticks:{...TC},grid:{color:GC}}, y:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}} } }
    });
  }

  // Donut composição
  const pieData = [
    { l:'Labor',       v:t.custoLabor,    c:'rgba(249,115,22,.85)' },
    { l:'COGS',        v:t.custoCOGS,     c:'rgba(201,164,85,.85)' },
    { l:'Tributação',  v:t.totalImpostos, c:'rgba(201,122,138,.85)' },
    { l:'Lucro Líq.',  v:Math.max(0,t.lucroLiquido), c:'rgba(45,212,160,.85)' },
  ].filter(x=>x.v>0);
  killChart('ch-ebitda-pie');
  const ctx2 = document.getElementById('ch-ebitda-pie')?.getContext('2d');
  if (ctx2 && pieData.length) {
    S.charts['ch-ebitda-pie'] = new Chart(ctx2, {
      type:'doughnut',
      data:{ labels:pieData.map(x=>x.l), datasets:[{ data:pieData.map(x=>x.v), backgroundColor:pieData.map(x=>x.c), borderWidth:0 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{labels:{color:'#8faac8',font:{size:11}}}} }
    });
  }

  // Tabela EBITDA
  document.getElementById('cg-ebitda-table').innerHTML = `
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th style="padding:11px 20px;text-align:left;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Camada</th>
        <th style="padding:11px 20px;text-align:right;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Valor</th>
        <th style="padding:11px 20px;text-align:right;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">% Receita</th>
        <th style="padding:11px 20px;text-align:left;font-size:10px;font-family:var(--font-mono);text-transform:uppercase;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Descrição</th>
      </tr></thead><tbody>
      ${[
        { n:'①', l:'Faturamento Bruto',  c:'#15b8a6', v:t.fatBruto,      obs:fonteFat, bold:true },
        { n:'②', l:'(−) Labor',          c:'#f97316', v:-t.custoLabor,   obs:'CLT + PJ + Comissão + Horistas — LaborBI + xlsx', bold:true },
        { n:'③', l:'(−) COGS',           c:'#c9a455', v:-t.custoCOGS,    obs:'Lab. Ext. + Insumos + Facilities + TI + Adm.', bold:true },
        { n:'④', l:'Pré-tributação',     c:t.preTribu>=0?'#2dd4a0':'#e5685f', v:t.preTribu, obs:'EBITDA — ① − ② − ③', bold:true },
        { n:'',  l:'Margem Pré-trib.',   c:'var(--tx3)', v:null, obs:fP(t.margemPreTribu), bold:false },
        { n:'⑤', l:'(−) Tributação',     c:'#c97a8a', v:-t.totalImpostos, obs:t.impostosEstimados>0?'Estimativa '+((TAXA_IMPOSTO_EST*100).toFixed(0))+'% · inclua no xlsx para precisão':'Impostos lançados', bold:true },
        { n:'⑥', l:t.lucroLiquido>=0?'Lucro Líquido':'Prejuízo', c:t.lucroLiquido>=0?'#2dd4a0':'#e5685f', v:t.lucroLiquido, obs:'Resultado final — ④ − ⑤', bold:true },
        { n:'',  l:'Margem Líquida',     c:'var(--tx3)', v:null, obs:fP(t.margemLiquida), bold:false },
      ].map(row => {
        const p = row.v !== null && t.fatBruto > 0 ? (Math.abs(row.v)/t.fatBruto*100) : null;
        return `<tr style="${row.n?'border-top:1px solid var(--bd)':''}">
          <td style="padding:13px 20px;font-size:${row.bold?'13':'12'}px;color:${row.bold?row.c:'var(--tx3)'};font-weight:${row.bold?700:400};border-bottom:1px solid rgba(30,45,71,.4)">
            ${row.n?`<span style="font-size:12px;margin-right:8px;color:${row.c}">${row.n}</span>`:'<span style="width:24px;display:inline-block"></span>'}${row.l}
          </td>
          <td style="padding:13px 20px;text-align:right;font-family:var(--font-mono);color:${row.c};font-weight:${row.bold?700:500};font-size:${row.bold?'13':'12'}px;border-bottom:1px solid rgba(30,45,71,.4)">${row.v!==null?fR(row.v):'—'}</td>
          <td style="padding:13px 20px;text-align:right;font-family:var(--font-mono);font-size:11px;color:${row.bold?row.c:'var(--tx3)'};font-weight:${row.bold?600:400};border-bottom:1px solid rgba(30,45,71,.4)">${p!==null?p.toFixed(1)+'%':'—'}</td>
          <td style="padding:13px 20px;font-size:11.5px;color:var(--tx3);font-family:var(--font-mono);border-bottom:1px solid rgba(30,45,71,.4)">${row.obs}</td>
        </tr>`;
      }).join('')}
      </tbody>
    </table>`;
}


// ── RENDERIZA UMA CATEGORIA ESPECÍFICA (pelo nome exato do xlsx) ──
function renderCogsCatByName(catName) {
  if (!catName) return;
  const allRows  = getCogsFiltered();
  const rows     = allRows.filter(r => r.cat === catName);
  const totalGeral = allRows
    .filter(r => getCatGroup(r.cat) !== 'receita')
    .reduce((s,r) => s+r.val, 0);
  const total    = rows.reduce((s,r) => s+r.val, 0);
  const pctTotal = totalGeral > 0 ? (total/totalGeral*100) : 0;
  const grp      = getCatGroup(catName);
  const meta     = GROUP_META[grp] || GROUP_META.outros;
  const color    = meta.color;

  // Agrupa por fornecedor
  const byForn = {};
  rows.forEach(r => { const k = r.forn||'?'; byForn[k]=(byForn[k]||0)+r.val; });
  const sortedForn = Object.entries(byForn).sort((a,b)=>b[1]-a[1]);

  // Agrupa por mês
  const byMes = {};
  rows.forEach(r => { if(r.mes) byMes[r.mes]=(byMes[r.mes]||0)+r.val; });
  const sortedMes = Object.entries(byMes).sort((a,b)=>MESES.indexOf(a[0])-MESES.indexOf(b[0]));

  const el = document.getElementById('cogs-cat-content');
  if (!el) return;

  el.innerHTML = `
    <div class="ptitle" style="color:var(--tx)">${meta.icon} <span style="color:${color}">${catName}</span></div>
    <div class="psub">${meta.label} · grupo ${grp} · ${rows.length} lançamentos</div>

    <div class="kgrid">
      ${kpiCard('Total '+catName, fR(total), rows.length+' lançamentos', color)}
      ${kpiCard('% dos Custos Totais', pctTotal.toFixed(1)+'%', 'participação no total', color)}
      ${kpiCard('Maior Fornecedor', sortedForn.length?fR(sortedForn[0][1]):'—', sortedForn.length?sortedForn[0][0].substring(0,24):'—', color)}
      ${kpiCard('Ticket Médio', rows.length?fR(total/rows.length):'—', 'por lançamento', color)}
      ${kpiCard('Fornecedores', sortedForn.length, 'distintos', 'var(--tx2)')}
      ${kpiCard('Meses', sortedMes.length, 'com lançamentos', 'var(--tx2)')}
    </div>

    <div style="display:grid;grid-template-columns:2fr 1fr;gap:14px;margin-bottom:22px">
      <div class="cc">
        <div class="ctitle">Top Fornecedores / Itens — ${catName} (R$)</div>
        <canvas id="ch-dyncat-bar" height="200"></canvas>
      </div>
      <div class="cc">
        <div class="ctitle">Distribuição por Mês</div>
        <canvas id="ch-dyncat-mes" height="200"></canvas>
      </div>
    </div>

    <div class="tw">
      <div class="th">
        <span>Lançamentos — ${catName}</span>
        <span>${rows.length} itens · ${fR(total)}</span>
      </div>
      <div class="tscroll">
        ${rows.length ? `
        <table><thead><tr>
          <th>Data</th><th>Mês</th><th>Fornecedor / Item</th>
          <th style="text-align:right">Valor R$</th>
          <th style="text-align:right">% da Categoria</th>
        </tr></thead><tbody>
        ${rows.sort((a,b)=>b.val-a.val).map(r => {
          const p = total>0?(r.val/total*100).toFixed(1):0;
          return `<tr>
            <td style="font-family:var(--font-mono);font-size:11px;white-space:nowrap">${(r.data||'').split('-').reverse().join('/')}</td>
            <td style="text-transform:capitalize;font-family:var(--font-mono);font-size:11px">${r.mes||'—'}</td>
            <td style="font-weight:500;font-size:12px">${r.forn||'—'}</td>
            <td style="color:${color};font-family:var(--font-mono);font-weight:600;text-align:right;white-space:nowrap">${fR(r.val)}</td>
            <td style="text-align:right;font-size:11px;font-family:var(--font-mono);color:var(--tx3)">
              ${p}%
              <div class="pbar" style="width:50px;display:inline-block;vertical-align:middle;margin-left:6px">
                <div class="pfill" style="width:${p}%;background:${color}"></div>
              </div>
            </td>
          </tr>`;
        }).join('')}
        </tbody></table>` :
        `<div class="nd"><div class="nd-i">${meta.icon}</div>Sem lançamentos de "${catName}" neste período.</div>`}
      </div>
    </div>`;

  // Gráfico barras top fornecedores
  killChart('ch-dyncat-bar');
  const ctx1 = document.getElementById('ch-dyncat-bar')?.getContext('2d');
  if (ctx1 && sortedForn.length) {
    S.charts['ch-dyncat-bar'] = new Chart(ctx1, {
      type: 'bar',
      data: {
        labels: sortedForn.slice(0,15).map(([k])=>k),
        datasets: [{ label:'Valor (R$)', data: sortedForn.slice(0,15).map(([,v])=>v),
          backgroundColor: color+'bb', borderRadius:5 }]
      },
      options: { indexAxis:'y', responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false}},
        scales:{ x:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}},
                 y:{ticks:{...TC,font:{size:10}},grid:{color:GC}} } }
    });
  }

  // Gráfico donut por mês
  killChart('ch-dyncat-mes');
  const ctx2 = document.getElementById('ch-dyncat-mes')?.getContext('2d');
  if (ctx2 && sortedMes.length) {
    S.charts['ch-dyncat-mes'] = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: sortedMes.map(([m])=>m.charAt(0).toUpperCase()+m.slice(1)),
        datasets: [{ data: sortedMes.map(([,v])=>v),
          backgroundColor: CHART_COLORS.slice(0,sortedMes.length).map(c=>c+'cc'), borderWidth:0 }]
      },
      options: { responsive:true, maintainAspectRatio:false,
        plugins:{legend:{labels:{color:'#8faac8',font:{size:11}}}} }
    });
  }
}

// ── FUNÇÃO GENÉRICA POR GRUPO ──
function renderCogsCatTab(groupKey) {
  const meta     = GROUP_META[groupKey] || GROUP_META.outros;
  const allRows  = getCogsFiltered();
  const rows     = allRows.filter(r => getCatGroup(r.cat) === groupKey);
  const totalGeral = allRows.filter(r => !['receita'].includes(getCatGroup(r.cat))).reduce((s,r)=>s+r.val,0);
  const total    = rows.reduce((s,r)=>s+r.val,0);
  const pctTotal = totalGeral>0?(total/totalGeral*100):0;

  const kpiId   = 'cg-'+groupKey+'-kpi';
  const barId   = 'ch-cogs-'+groupKey+'-bar';
  const mesId   = 'ch-cogs-'+groupKey+'-mes';
  const countId = 'cg-'+groupKey+'-count';
  const tableId = 'cg-'+groupKey+'-table';

  const byForn = {};
  rows.forEach(r=>{ const k=r.forn||r.cat||'?'; byForn[k]=(byForn[k]||0)+r.val; });
  const sorted = Object.entries(byForn).sort((a,b)=>b[1]-a[1]);
  const byMes  = {};
  rows.forEach(r=>{ if(r.mes) byMes[r.mes]=(byMes[r.mes]||0)+r.val; });

  // Sub-categorias dentro do grupo
  const byCat = {};
  rows.forEach(r=>{ byCat[r.cat||'?']=(byCat[r.cat||'?']||0)+r.val; });

  document.getElementById(kpiId).innerHTML = [
    kpiCard(meta.label, fR(total), rows.length+' lançamentos', meta.color),
    kpiCard('% Custos Totais', pctTotal.toFixed(1)+'%', 'participação', meta.color),
    kpiCard('Maior Fornecedor', sorted.length?fR(sorted[0][1]):'—', sorted.length?sorted[0][0].substring(0,22):'—', meta.color),
    kpiCard('Ticket Médio', rows.length?fR(total/rows.length):'—', 'por lançamento', meta.color),
    kpiCard('Categorias', Object.keys(byCat).length, 'subcategorias distintas', 'var(--tx2)'),
  ].join('');

  killChart(barId);
  const ctx1=document.getElementById(barId)?.getContext('2d');
  if(ctx1&&sorted.length){
    S.charts[barId]=new Chart(ctx1,{type:'bar',data:{
      labels:sorted.slice(0,14).map(([k])=>k),
      datasets:[{label:'Valor (R$)',data:sorted.slice(0,14).map(([,v])=>v),backgroundColor:meta.color+'bb',borderRadius:5}]
    },options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,
      plugins:{legend:{display:false}},
      scales:{x:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}},y:{ticks:{...TC,font:{size:10}},grid:{color:GC}}}}});
  }

  killChart(mesId);
  const ctx2=document.getElementById(mesId)?.getContext('2d');
  const mesEntries=Object.entries(byMes).sort((a,b)=>MESES.indexOf(a[0])-MESES.indexOf(b[0]));
  if(ctx2&&mesEntries.length){
    S.charts[mesId]=new Chart(ctx2,{type:'doughnut',data:{
      labels:mesEntries.map(([m])=>m.charAt(0).toUpperCase()+m.slice(1)),
      datasets:[{data:mesEntries.map(([,v])=>v),backgroundColor:CHART_COLORS.slice(0,mesEntries.length).map(c=>c+'bb')}]
    },options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8faac8',font:{size:11}}}}}});
  }

  document.getElementById(countId).textContent=rows.length+' lançamentos';
  document.getElementById(tableId).innerHTML=rows.length?`
    <table><thead><tr>
      <th>Data</th><th>Mês</th><th>Categoria</th><th>Fornecedor / Item</th>
      <th style="text-align:right">Valor R$</th><th style="text-align:right">%</th>
    </tr></thead><tbody>
    ${rows.sort((a,b)=>b.val-a.val).map(r=>{
      const p=total>0?(r.val/total*100).toFixed(1):0;
      return `<tr>
        <td style="font-family:var(--font-mono);font-size:11px">${(r.data||'').split('-').reverse().join('/')}</td>
        <td style="text-transform:capitalize;font-family:var(--font-mono);font-size:11px">${r.mes||'—'}</td>
        <td>${catBadge(r.cat)}</td>
        <td style="font-weight:500;font-size:12px">${r.forn||'—'}</td>
        <td style="color:${meta.color};font-family:var(--font-mono);font-weight:600;text-align:right">${fR(r.val)}</td>
        <td style="text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--tx3)">
          ${p}%<div class="pbar" style="width:50px;display:inline-block;vertical-align:middle;margin-left:6px"><div class="pfill" style="width:${p}%;background:${meta.color}"></div></div>
        </td>
      </tr>`;
    }).join('')}</tbody></table>`:
    `<div class="nd"><div class="nd-i">${meta.icon}</div>Sem lançamentos de "${meta.label}" neste período.</div>`;
}

// ── FACILITIES (com subcategorias visuais) ──
function renderCogsFacilities() {
  const allRows = getCogsFiltered();
  const rows    = allRows.filter(r=>getCatGroup(r.cat)==='facilities');
  const total   = rows.reduce((s,r)=>s+r.val,0);
  const totalGeral=allRows.filter(r=>!['receita'].includes(getCatGroup(r.cat))).reduce((s,r)=>s+r.val,0);

  const byCat={};
  rows.forEach(r=>{ byCat[r.cat||'?']=(byCat[r.cat||'?']||0)+r.val; });
  const sortedCat=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);

  document.getElementById('cg-facilities-kpi').innerHTML=[
    kpiCard('Total Facilities',fR(total),rows.length+' lançamentos','#e0a93a'),
    kpiCard('% Custos Totais',(totalGeral>0?(total/totalGeral*100):0).toFixed(1)+'%','participação','#e0a93a'),
    kpiCard('Maior Subcategoria',sortedCat.length?fR(sortedCat[0][1]):'—',sortedCat.length?sortedCat[0][0].replace('Facilities - ','').substring(0,20):'—','#e0a93a'),
    kpiCard('Subcategorias',sortedCat.length,'tipos distintos','var(--tx2)'),
  ].join('');

  // Cards subcategorias
  document.getElementById('cg-facilities-subcats').innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px">
      ${sortedCat.map(([cat,val],i)=>{
        const p=total>0?(val/total*100).toFixed(1):0;
        const clr=CHART_COLORS[i%CHART_COLORS.length];
        const subLabel=cat.replace('Facilities - ','').replace('Facilities','Geral');
        return `<div style="background:var(--sf);border:1px solid var(--bd);border-radius:12px;padding:14px;position:relative;overflow:hidden">
          <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${clr}"></div>
          <div style="font-size:10px;font-family:var(--font-mono);color:var(--tx3);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${subLabel}</div>
          <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:${clr}">${fR(val)}</div>
          <div style="height:3px;background:var(--sf3);border-radius:2px;margin-top:8px;overflow:hidden">
            <div style="height:100%;width:${p}%;background:${clr};border-radius:2px"></div>
          </div>
          <div style="font-size:10px;font-family:var(--font-mono);color:var(--tx3);margin-top:4px">${p}% do grupo</div>
        </div>`;
      }).join('')}
    </div>`;

  // Barras fornecedores
  const byForn={};
  rows.forEach(r=>{ const k=r.forn||r.cat||'?'; byForn[k]=(byForn[k]||0)+r.val; });
  const sorted=Object.entries(byForn).sort((a,b)=>b[1]-a[1]);
  killChart('ch-cogs-facilities-bar');
  const ctx1=document.getElementById('ch-cogs-facilities-bar')?.getContext('2d');
  if(ctx1&&sorted.length){
    S.charts['ch-cogs-facilities-bar']=new Chart(ctx1,{type:'bar',data:{
      labels:sorted.slice(0,12).map(([k])=>k),
      datasets:[{data:sorted.slice(0,12).map(([,v])=>v),backgroundColor:'rgba(224,169,58,.8)',borderRadius:5}]
    },options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}},y:{ticks:{...TC,font:{size:10}},grid:{color:GC}}}}});
  }

  // Donut subcategorias
  killChart('ch-cogs-facilities-sub');
  const ctx2=document.getElementById('ch-cogs-facilities-sub')?.getContext('2d');
  if(ctx2&&sortedCat.length){
    S.charts['ch-cogs-facilities-sub']=new Chart(ctx2,{type:'doughnut',data:{
      labels:sortedCat.map(([k])=>k.replace('Facilities - ','')),
      datasets:[{data:sortedCat.map(([,v])=>v),backgroundColor:CHART_COLORS.slice(0,sortedCat.length).map(c=>c+'cc'),borderWidth:0}]
    },options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#8faac8',font:{size:10}}}}}});
  }

  document.getElementById('cg-facilities-count').textContent=rows.length+' lançamentos';
  document.getElementById('cg-facilities-table').innerHTML=rows.length?`
    <table><thead><tr><th>Data</th><th>Mês</th><th>Subcategoria</th><th>Fornecedor / Item</th>
    <th style="text-align:right">Valor R$</th><th style="text-align:right">%</th></tr></thead><tbody>
    ${rows.sort((a,b)=>b.val-a.val).map(r=>{
      const p=total>0?(r.val/total*100).toFixed(1):0;
      return `<tr>
        <td style="font-family:var(--font-mono);font-size:11px">${(r.data||'').split('-').reverse().join('/')}</td>
        <td style="text-transform:capitalize;font-family:var(--font-mono);font-size:11px">${r.mes||'—'}</td>
        <td>${catBadge(r.cat)}</td>
        <td style="font-weight:500;font-size:12px">${r.forn||'—'}</td>
        <td style="color:#e0a93a;font-family:var(--font-mono);font-weight:600;text-align:right">${fR(r.val)}</td>
        <td style="text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--tx3)">${p}%</td>
      </tr>`;
    }).join('')}</tbody></table>`:
    '<div class="nd"><div class="nd-i">🏗️</div>Sem lançamentos de Facilities neste período.</div>';
}

// ── T.I. ──
function renderCogsTI() {
  const allRows=getCogsFiltered();
  const rows   =allRows.filter(r=>getCatGroup(r.cat)==='ti');
  const total  =rows.reduce((s,r)=>s+r.val,0);
  const totalGeral=allRows.filter(r=>!['receita'].includes(getCatGroup(r.cat))).reduce((s,r)=>s+r.val,0);

  const byCat={};
  rows.forEach(r=>{ byCat[r.cat||'?']=(byCat[r.cat||'?']||0)+r.val; });
  const byForn={};
  rows.forEach(r=>{ const k=r.forn||r.cat||'?'; byForn[k]=(byForn[k]||0)+r.val; });
  const sorted=Object.entries(byForn).sort((a,b)=>b[1]-a[1]);
  const catEntries=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);

  document.getElementById('cg-ti-kpi').innerHTML=[
    kpiCard('Total T.I.',fR(total),rows.length+' lançamentos','#818cf8'),
    kpiCard('% Custos Totais',(totalGeral>0?(total/totalGeral*100):0).toFixed(1)+'%','participação','#818cf8'),
    kpiCard('Maior Fornecedor',sorted.length?fR(sorted[0][1]):'—',sorted.length?sorted[0][0].substring(0,22):'—','#818cf8'),
    kpiCard('Tipos',Object.keys(byCat).length,'subcategorias T.I.','var(--tx2)'),
  ].join('');

  killChart('ch-cogs-ti-bar');
  const ctx1=document.getElementById('ch-cogs-ti-bar')?.getContext('2d');
  if(ctx1&&sorted.length){
    S.charts['ch-cogs-ti-bar']=new Chart(ctx1,{type:'bar',data:{
      labels:sorted.slice(0,12).map(([k])=>k),
      datasets:[{data:sorted.slice(0,12).map(([,v])=>v),backgroundColor:'rgba(129,140,248,.8)',borderRadius:5}]
    },options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}},y:{ticks:{...TC,font:{size:10}},grid:{color:GC}}}}});
  }

  mkDonut('ch-cogs-ti-sub',catEntries.map(([k])=>k.replace('T.I. - ','').replace('T.I.','Geral')),catEntries.map(([,v])=>v),
    ['rgba(129,140,248,.85)','rgba(99,102,241,.85)','rgba(201,164,85,.85)']);

  document.getElementById('cg-ti-count').textContent=rows.length+' lançamentos';
  document.getElementById('cg-ti-table').innerHTML=rows.length?`
    <table><thead><tr><th>Data</th><th>Mês</th><th>Subcategoria</th><th>Fornecedor / Item</th>
    <th style="text-align:right">Valor R$</th><th style="text-align:right">%</th></tr></thead><tbody>
    ${rows.sort((a,b)=>b.val-a.val).map(r=>{
      const p=total>0?(r.val/total*100).toFixed(1):0;
      return `<tr>
        <td style="font-family:var(--font-mono);font-size:11px">${(r.data||'').split('-').reverse().join('/')}</td>
        <td style="text-transform:capitalize;font-family:var(--font-mono);font-size:11px">${r.mes||'—'}</td>
        <td>${catBadge(r.cat)}</td>
        <td style="font-weight:500;font-size:12px">${r.forn||'—'}</td>
        <td style="color:#818cf8;font-family:var(--font-mono);font-weight:600;text-align:right">${fR(r.val)}</td>
        <td style="text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--tx3)">${p}%</td>
      </tr>`;
    }).join('')}</tbody></table>`:
    '<div class="nd"><div class="nd-i">💻</div>Sem lançamentos de T.I. neste período.</div>';
}

// ── PESSOAL ──
function renderCogsPessoal() {
  const allRows=getCogsFiltered();
  const rows   =allRows.filter(r=>getCatGroup(r.cat)==='pessoal');
  const total  =rows.reduce((s,r)=>s+r.val,0);
  const totalGeral=allRows.filter(r=>!['receita'].includes(getCatGroup(r.cat))).reduce((s,r)=>s+r.val,0);
  const byCat={};
  rows.forEach(r=>{ byCat[r.cat||'?']=(byCat[r.cat||'?']||0)+r.val; });
  const byForn={};
  rows.forEach(r=>{ const k=r.forn||r.cat||'?'; byForn[k]=(byForn[k]||0)+r.val; });
  const sorted=Object.entries(byForn).sort((a,b)=>b[1]-a[1]);
  const catEntries=Object.entries(byCat).sort((a,b)=>b[1]-a[1]);

  document.getElementById('cg-pessoal-kpi').innerHTML=[
    kpiCard('Total Pessoal',fR(total),rows.length+' lançamentos','#f97316'),
    kpiCard('% Custos Totais',(totalGeral>0?(total/totalGeral*100):0).toFixed(1)+'%','participação','#f97316'),
    kpiCard('Maior Item',sorted.length?fR(sorted[0][1]):'—',sorted.length?sorted[0][0].substring(0,22):'—','#f97316'),
    kpiCard('Tipos de Pessoal',catEntries.length,'categorias','var(--tx2)'),
  ].join('');

  killChart('ch-cogs-pessoal-bar');
  const ctx1=document.getElementById('ch-cogs-pessoal-bar')?.getContext('2d');
  if(ctx1&&sorted.length){
    S.charts['ch-cogs-pessoal-bar']=new Chart(ctx1,{type:'bar',data:{
      labels:sorted.slice(0,15).map(([k])=>k),
      datasets:[{data:sorted.slice(0,15).map(([,v])=>v),backgroundColor:sorted.slice(0,15).map((_,i)=>CHART_COLORS[i%CHART_COLORS.length]+'bb'),borderRadius:5}]
    },options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}},y:{ticks:{...TC,font:{size:10}},grid:{color:GC}}}}});
  }
  mkDonut('ch-cogs-pessoal-donut',catEntries.map(([k])=>k),catEntries.map(([,v])=>v),
    ['rgba(249,115,22,.85)','rgba(245,158,11,.85)','rgba(201,122,138,.85)','rgba(21,184,166,.85)']);

  document.getElementById('cg-pessoal-count').textContent=rows.length+' lançamentos';
  document.getElementById('cg-pessoal-table').innerHTML=rows.length?`
    <table><thead><tr><th>Data</th><th>Mês</th><th>Categoria</th><th>Colaborador / Item</th>
    <th style="text-align:right">Valor R$</th><th style="text-align:right">%</th></tr></thead><tbody>
    ${rows.sort((a,b)=>a.data.localeCompare(b.data)).map(r=>{
      const p=total>0?(r.val/total*100).toFixed(1):0;
      return `<tr>
        <td style="font-family:var(--font-mono);font-size:11px">${(r.data||'').split('-').reverse().join('/')}</td>
        <td style="text-transform:capitalize;font-family:var(--font-mono);font-size:11px">${r.mes||'—'}</td>
        <td>${catBadge(r.cat)}</td>
        <td style="font-weight:500">${r.forn||'—'}</td>
        <td style="color:#f97316;font-family:var(--font-mono);font-weight:600;text-align:right">${fR(r.val)}</td>
        <td style="text-align:right;font-family:var(--font-mono);font-size:11px;color:var(--tx3)">${p}%</td>
      </tr>`;
    }).join('')}</tbody></table>`:
    '<div class="nd"><div class="nd-i">👥</div>Sem lançamentos de Pessoal neste período.</div>';
}

// ── ADMINISTRATIVO ──
function renderCogsAdmin() {
  const allRows=getCogsFiltered();
  const rows   =allRows.filter(r=>getCatGroup(r.cat)==='admin'||getCatGroup(r.cat)==='imposto');
  const rowsAdm=rows.filter(r=>getCatGroup(r.cat)==='admin');
  const rowsImp=rows.filter(r=>getCatGroup(r.cat)==='imposto');
  const total  =rows.reduce((s,r)=>s+r.val,0);
  const totalImp=rowsImp.reduce((s,r)=>s+r.val,0);
  const totalAdm=rowsAdm.reduce((s,r)=>s+r.val,0);
  const totalGeral=allRows.filter(r=>!['receita'].includes(getCatGroup(r.cat))).reduce((s,r)=>s+r.val,0);

  const byForn={};
  rows.forEach(r=>{ const k=r.forn||r.cat||'?'; byForn[k]=(byForn[k]||0)+r.val; });
  const sorted=Object.entries(byForn).sort((a,b)=>b[1]-a[1]);

  document.getElementById('cg-admin-kpi').innerHTML=[
    kpiCard('Total Adm. + Impostos',fR(total),rows.length+' lançamentos','#94a3b8'),
    kpiCard('Impostos Lançados',fR(totalImp),rowsImp.length+' registros','#c97a8a'),
    kpiCard('Outros Administrativo',fR(totalAdm),rowsAdm.length+' registros','#94a3b8'),
    kpiCard('% Custos Totais',(totalGeral>0?(total/totalGeral*100):0).toFixed(1)+'%','participação','var(--tx2)'),
  ].join('');

  killChart('ch-cogs-admin-bar');
  const ctx1=document.getElementById('ch-cogs-admin-bar')?.getContext('2d');
  if(ctx1&&sorted.length){
    S.charts['ch-cogs-admin-bar']=new Chart(ctx1,{type:'bar',data:{
      labels:sorted.slice(0,12).map(([k])=>k),
      datasets:[{data:sorted.slice(0,12).map(([,v])=>v),
        backgroundColor:sorted.slice(0,12).map(([k])=>byForn[k]&&rows.find(r=>(r.forn||r.cat)===k&&getCatGroup(r.cat)==='imposto')?'rgba(201,122,138,.8)':'rgba(148,163,184,.8)'),borderRadius:5}]
    },options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}},y:{ticks:{...TC,font:{size:10}},grid:{color:GC}}}}});
  }

  mkDonut('ch-cogs-admin-mes',['Impostos','Administrativo'],[totalImp,totalAdm],
    ['rgba(201,122,138,.85)','rgba(148,163,184,.85)']);

  document.getElementById('cg-admin-count').textContent=rows.length+' lançamentos';
  document.getElementById('cg-admin-table').innerHTML=rows.length?`
    <table><thead><tr><th>Data</th><th>Mês</th><th>Tipo</th><th>Categoria</th><th>Item</th>
    <th style="text-align:right">Valor R$</th></tr></thead><tbody>
    ${rows.sort((a,b)=>b.val-a.val).map(r=>{
      const isImp=getCatGroup(r.cat)==='imposto';
      return `<tr>
        <td style="font-family:var(--font-mono);font-size:11px">${(r.data||'').split('-').reverse().join('/')}</td>
        <td style="text-transform:capitalize;font-family:var(--font-mono);font-size:11px">${r.mes||'—'}</td>
        <td><span class="bdg ${isImp?'br':'bc'}">${isImp?'🏛️ Imposto':'📋 Adm.'}</span></td>
        <td>${catBadge(r.cat)}</td>
        <td style="font-weight:500;font-size:12px">${r.forn||'—'}</td>
        <td style="color:${isImp?'#c97a8a':'#94a3b8'};font-family:var(--font-mono);font-weight:600;text-align:right">${fR(r.val)}</td>
      </tr>`;
    }).join('')}</tbody></table>`:
    '<div class="nd"><div class="nd-i">📋</div>Sem lançamentos administrativos neste período.</div>';
}

// ── HISTÓRICO ──
function renderCogsHistorico() {
  const allCogs=S.cogs||[];
  const allBase=getAdjustedBase();
  const meses=[...new Set([...allCogs.map(r=>r.mes),...allBase.map(r=>r.mes)].filter(Boolean))]
    .sort((a,b)=>MESES.indexOf(a)-MESES.indexOf(b));

  const hist=meses.map(m=>{
    const mCogs=allCogs.filter(r=>r.mes===m);
    // ① Faturamento Bruto — sempre do LaborBI
    let fat=getFatBrutoParaMeses([m]);
    if(!fat) fat=mCogs.filter(r=>getCatGroup(r.cat)==='receita').reduce((s,r)=>s+r.val,0);
    // ② Labor — somente lançamentos no xlsx de custos
    const laborBI=0;
    const laborManual=mCogs.filter(r=>getCatGroup(r.cat)==='labor').reduce((s,r)=>s+r.val,0);
    const labor=laborManual;
    // ③ COGS — custos diretos
    const lab    =mCogs.filter(r=>getCatGroup(r.cat)==='lab').reduce((s,r)=>s+r.val,0);
    const ins    =mCogs.filter(r=>getCatGroup(r.cat)==='insumos').reduce((s,r)=>s+r.val,0);
    const fac    =mCogs.filter(r=>getCatGroup(r.cat)==='facilities').reduce((s,r)=>s+r.val,0);
    const ti     =mCogs.filter(r=>getCatGroup(r.cat)==='ti').reduce((s,r)=>s+r.val,0);
    const adm    =mCogs.filter(r=>getCatGroup(r.cat)==='admin').reduce((s,r)=>s+r.val,0);
    const opDiv  =mCogs.filter(r=>getCatGroup(r.cat)==='cogs_op').reduce((s,r)=>s+r.val,0);
    const cogs   =lab+ins+fac+ti+adm+opDiv;
    // ④ Pré-tributação
    const preTribu=fat-labor-cogs;
    // ⑤ Tributação
    const imp    =mCogs.filter(r=>getCatGroup(r.cat)==='imposto').reduce((s,r)=>s+r.val,0);
    const impTotal=imp>0?imp:Math.max(0,preTribu*TAXA_IMPOSTO_EST);
    // ⑥ Lucro Líquido
    const lucroLiq=preTribu-impTotal;
    const mPreTribu=fat>0?preTribu/fat:0;
    const mLiq   =fat>0?lucroLiq/fat:0;
    // aliases
    const ebitda=preTribu; const mEbitda=mPreTribu;
    const pes=labor; const custoOp=labor+cogs;
    return {mes:m,fat,labor,laborBI,laborManual,lab,ins,fac,ti,adm,cogs,preTribu,imp,impTotal,lucroLiq,mPreTribu,mEbitda,mLiq,ebitda,pes,custoOp};
  });

  if(hist.length){
    const last=hist[hist.length-1],prev=hist.length>1?hist[hist.length-2]:null;
    const varF=prev&&prev.fat>0?((last.fat-prev.fat)/prev.fat*100):0;
    document.getElementById('cg-hist-kpi').innerHTML=[
      kpiCard('Meses Analisados',hist.length,'períodos com dados','var(--cyan)'),
      kpiCard('Receita (Último Mês)',fR(last.fat),cap(last.mes),'var(--cyan)'),
      kpiCard('Pré-tributação (Último Mês)',fR(last.preTribu||last.ebitda),fP(last.mPreTribu||last.mEbitda)+' margem',(last.preTribu||last.ebitda)>=0?'var(--green)':'var(--red)'),
      kpiCard('Lucro Líquido (Último Mês)',fR(last.lucroLiq),fP(last.mLiq)+' mg. liq.',last.lucroLiq>=0?'var(--green)':'var(--red)'),
      kpiCard('Var. Receita',(varF>=0?'+':'')+varF.toFixed(1)+'%',prev?`vs ${cap(prev.mes)}`:'—',varF>=0?'var(--green)':'var(--red)'),
    ].join('');
  }

  // Line
  killChart('ch-cogs-hist-line');
  const ctx1=document.getElementById('ch-cogs-hist-line')?.getContext('2d');
  if(ctx1&&hist.length){
    S.charts['ch-cogs-hist-line']=new Chart(ctx1,{type:'line',data:{
      labels:hist.map(h=>cap(h.mes)),
      datasets:[
        {label:'Receita',   data:hist.map(h=>h.fat),     borderColor:'#15b8a6',backgroundColor:'rgba(21,184,166,.08)',tension:.35,pointRadius:4,fill:true},
        {label:'EBITDA',    data:hist.map(h=>h.ebitda),  borderColor:'#2dd4a0', backgroundColor:'rgba(45,212,160,.06)',tension:.35,pointRadius:4,fill:true},
        {label:'Lucro Líq.',data:hist.map(h=>h.lucroLiq),borderColor:'#c9a455', backgroundColor:'rgba(201,164,85,.06)',tension:.35,pointRadius:4,fill:true},
      ]
    },options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#8faac8',font:{size:11}}}},
      scales:{x:{ticks:{...TC},grid:{color:GC}},y:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}}}}});
  }

  // Stacked
  killChart('ch-cogs-hist-stack');
  const ctx3=document.getElementById('ch-cogs-hist-stack')?.getContext('2d');
  if(ctx3&&hist.length){
    S.charts['ch-cogs-hist-stack']=new Chart(ctx3,{type:'bar',data:{
      labels:hist.map(h=>cap(h.mes)),
      datasets:[
        {label:'Laboratório',   data:hist.map(h=>h.lab), backgroundColor:'rgba(21,184,166,.75)', stack:'a'},
        {label:'Insumos e Med.',data:hist.map(h=>h.ins), backgroundColor:'rgba(45,212,160,.75)', stack:'a'},
        {label:'Facilities',    data:hist.map(h=>h.fac), backgroundColor:'rgba(224,169,58,.75)', stack:'a'},
        {label:'T.I.',          data:hist.map(h=>h.ti),  backgroundColor:'rgba(129,140,248,.75)',stack:'a'},
        {label:'Pessoal',       data:hist.map(h=>h.pes), backgroundColor:'rgba(249,115,22,.75)', stack:'a'},
        {label:'Adm.',          data:hist.map(h=>h.adm), backgroundColor:'rgba(148,163,184,.75)',stack:'a'},
        {label:'Impostos',      data:hist.map(h=>h.imp), backgroundColor:'rgba(201,122,138,.85)',stack:'a'},
      ]
    },options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#8faac8',font:{size:10}}}},
      scales:{x:{ticks:{...TC},grid:{color:GC}},y:{stacked:true,ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}}}}});
  }

  // Margem
  killChart('ch-cogs-hist-margin');
  const ctx2=document.getElementById('ch-cogs-hist-margin')?.getContext('2d');
  if(ctx2&&hist.length){
    S.charts['ch-cogs-hist-margin']=new Chart(ctx2,{type:'bar',data:{
      labels:hist.map(h=>cap(h.mes)),
      datasets:[
        {label:'Mg. EBITDA %',  data:hist.map(h=>+(h.mEbitda*100).toFixed(1)), backgroundColor:hist.map(h=>h.mEbitda>=0.2?'rgba(45,212,160,.7)':h.mEbitda>=0.1?'rgba(224,169,58,.7)':'rgba(239,68,68,.7)'),borderRadius:4},
        {label:'Mg. Líquida %', data:hist.map(h=>+(h.mLiq*100).toFixed(1)),    backgroundColor:'rgba(201,164,85,.6)',borderRadius:4},
      ]
    },options:{responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#8faac8',font:{size:11}}}},
      scales:{x:{ticks:{...TC},grid:{color:GC}},y:{ticks:{...TC,callback:v=>v+'%'},grid:{color:GC}}}}});
  }

  document.getElementById('cg-hist-count').textContent=hist.length+' meses';
  document.getElementById('cg-hist-table').innerHTML=hist.length?`
    <table><thead><tr>
      <th>Mês</th><th style="text-align:right">Receita</th>
      <th style="text-align:right">👥 Labor</th><th style="text-align:right">🧪 Lab</th>
      <th style="text-align:right">💊 Ins.</th><th style="text-align:right">🏗️ Fac.</th>
      <th style="text-align:right">💻 T.I.</th><th style="text-align:right">③ COGS</th>
      <th style="text-align:right">④ Pré-trib.</th><th style="text-align:right">⑤ Trib.</th>
      <th style="text-align:right">⑥ Lucro Líq.</th><th style="text-align:right">Mg. Líq.</th>
    </tr></thead><tbody>
    ${hist.map((h,i)=>{
      const mClr=h.mLiq>=0.15?'var(--green)':h.mLiq>=0.05?'var(--amber)':'var(--red)';
      return `<tr>
        <td style="font-family:var(--font-display);font-weight:600;color:var(--tx)">${cap(h.mes)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:var(--cyan);font-weight:600">${fR(h.fat)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:#15b8a6;font-size:11px">${fR(h.lab)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:#2dd4a0;font-size:11px">${fR(h.ins)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:#e0a93a;font-size:11px">${fR(h.fac)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:#818cf8;font-size:11px">${fR(h.ti)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:#f97316;font-size:11px">${fR(h.pes)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:#94a3b8;font-size:11px">${fR(h.adm)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:${h.ebitda>=0?'var(--green)':'var(--red)'};font-weight:700">${fR(h.ebitda)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:#c97a8a;font-size:11px">${fR(h.impTotal)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:${h.lucroLiq>=0?'var(--green)':'var(--red)'};font-weight:700">${fR(h.lucroLiq)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:${mClr};font-weight:600">${(h.mLiq*100).toFixed(1)}%</td>
      </tr>`;
    }).join('')}</tbody></table>`:
    '<div class="nd"><div class="nd-i">📅</div>Dados históricos insuficientes.</div>';
}

// ════════════════════════════════
//  PAGE: INSIGHTS AI — MOTOR v2.0
// ════════════════════════════════

// ── HELPER: comparação mês a mês ──
function momCompare(current, previous) {
  if (previous === 0 || previous === undefined || previous === null) {
    return {current, previous: previous||0, change: current, variation: 0, trend: current > 0 ? 'up' : 'flat'};
  }
  const change = current - previous;
  const variation = (change / Math.abs(previous)) * 100;
  return {current, previous, change, variation, trend: change > 0.001 ? 'up' : change < -0.001 ? 'down' : 'flat'};
}

// ── HELPER: classificar custo ──
function classifyCogsRow(r) {
  const cn = r.cat.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (cn.includes('faturamento') || cn.includes('receita')) return 'revenue';
  if (cn.includes('vet') || cn.includes('clt') || cn.includes('equipe') || cn.includes('medico') || cn.includes('comissao')) return 'team';
  return 'operational';
}

function sumCogsBy(rows, type) {
  return rows.filter(r => classifyCogsRow(r) === type).reduce((s,r) => s + r.val, 0);
}

// ── HELPER: análise de setor (filtra por mês real da DATA) ──
function analyzeSector(sheet, targetMes, previousMes) {
  if (!S.anal || !S.anal[sheet]) return {revenue:0, previousRevenue:0, count:0, efficiency:0, variation: momCompare(0,0), topProc:null, topVet:null, topVetProd:null};

  // Filtra pelo campo `mes` (mesma lógica do Labor BI)
  const target = S.anal[sheet].filter(r => r.mes === targetMes);
  const previous = previousMes ? S.anal[sheet].filter(r => r.mes === previousMes) : [];
  const tRev = target.reduce((s,r) => s + r.valL, 0);
  const tTab = target.reduce((s,r) => s + r.valT, 0);
  const pRev = previous.reduce((s,r) => s + r.valL, 0);
  // top proc
  const pMap = {};
  target.forEach(r => {
    if (!r.proc) return;
    if (!pMap[r.proc]) pMap[r.proc] = {val:0, n:0};
    pMap[r.proc].val += r.valL; pMap[r.proc].n++;
  });
  const procList = Object.entries(pMap).sort((a,b) => b[1].val - a[1].val);
  // top vet
  const vMap = {};
  target.forEach(r => {
    if (!r.vet) return;
    if (!vMap[r.vet]) vMap[r.vet] = 0;
    vMap[r.vet] += r.valL;
  });
  const vetList = Object.entries(vMap).sort((a,b) => b[1] - a[1]);
  return {
    revenue: tRev, previousRevenue: pRev, count: target.length,
    efficiency: tTab > 0 ? tRev / tTab : 0,
    variation: momCompare(tRev, pRev),
    topProc: procList[0] || null,
    topVet: vetList[0] ? vetList[0][0] : null,
    topVetProd: vetList[0] ? vetList[0][1] : 0
  };
}

// ── HELPER: health score composto ──
function calculateHealthScore(metrics, team, costs, anomalies) {
  let score = 100;
  const factors = [];

  // Margem (até -40)
  if (metrics.margin.current < 0) { score -= 40; factors.push({pts:-40, txt:'Margem negativa (prejuízo)'}); }
  else if (metrics.margin.current < 0.10) { score -= 25; factors.push({pts:-25, txt:'Margem baixa (<10%)'}); }
  else if (metrics.margin.current < 0.20) { score -= 12; factors.push({pts:-12, txt:'Margem moderada (<20%)'}); }
  else if (metrics.margin.current >= 0.30) { score += 5; factors.push({pts:+5, txt:'Margem excelente (≥30%)'}); }

  // Tendência de receita (até -20)
  if (metrics.revenue.trend === 'down') {
    const drop = Math.min(20, Math.abs(metrics.revenue.variation) / 2);
    score -= drop; factors.push({pts:-drop, txt:`Queda de receita (${Math.abs(metrics.revenue.variation).toFixed(1)}%)`});
  } else if (metrics.revenue.variation > 15) {
    score += 5; factors.push({pts:+5, txt:`Crescimento forte (+${metrics.revenue.variation.toFixed(1)}%)`});
  }

  // Custo de equipe (até -15)
  if (costs.teamRatio > 0.55) { score -= 15; factors.push({pts:-15, txt:'Custo de equipe crítico (>55%)'}); }
  else if (costs.teamRatio > 0.45) { score -= 8; factors.push({pts:-8, txt:'Custo de equipe elevado (>45%)'}); }

  // Custo operacional (até -15)
  if (costs.opRatio > 0.35) { score -= 15; factors.push({pts:-15, txt:'Custo operacional crítico (>35%)'}); }
  else if (costs.opRatio > 0.25) { score -= 7; factors.push({pts:-7, txt:'Custo operacional elevado (>25%)'}); }

  // Dependência de um profissional (até -15)
  if (team.dependence > 45) { score -= 15; factors.push({pts:-15, txt:'Dependência crítica de um profissional'}); }
  else if (team.dependence > 30) { score -= 8; factors.push({pts:-8, txt:'Concentração moderada de receita'}); }

  // Anomalias (até -10)
  const anPts = Math.min(10, anomalies.length * 2);
  if (anPts > 0) { score -= anPts; factors.push({pts:-anPts, txt:`${anomalies.length} anomalia(s) detectada(s)`}); }

  // Equipe muito pequena (até -10)
  if (team.totalVets < 3 && team.totalVets > 0) { score -= 5; factors.push({pts:-5, txt:'Equipe pequena (<3 vets ativos)'}); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  let status, color, label;
  if (score >= 85) { status = 'Excelente'; color = 'var(--green)'; label = 'Operação em ótimo estado'; }
  else if (score >= 70) { status = 'Saudável'; color = 'var(--cyan)'; label = 'Operação saudável com pequenos ajustes'; }
  else if (score >= 50) { status = 'Atenção'; color = 'var(--amber)'; label = 'Pontos críticos precisam de ação'; }
  else if (score >= 30) { status = 'Crítico'; color = '#e5685f'; label = 'Ação imediata necessária'; }
  else { status = 'Emergência'; color = 'var(--red)'; label = 'Risco operacional elevado'; }

  return {score, status, color, label, factors};
}

// ── HELPER: gerar plano de ação ──
function generateActionPlan(metrics, sectors, team, costs, anomalies, targetMes) {
  const actions = [];

  // 1. Queda forte de receita
  if (metrics.revenue.trend === 'down' && Math.abs(metrics.revenue.variation) > 8) {
    actions.push({
      priority: 'alta', icon: '📉', title: 'Plano de Recuperação de Receita',
      desc: `Faturamento caiu ${Math.abs(metrics.revenue.variation).toFixed(1)}% em ${targetMes}. Acione reativação de clientes inativos, intensifique divulgação de serviços de alta demanda e revise a tabela de preços da concorrência.`,
      impact: 'Alto', effort: '2-4 semanas'
    });
  }

  // 2. Crescimento forte - oportunidade
  if (metrics.revenue.variation > 15) {
    actions.push({
      priority: 'baixa', icon: '🚀', title: 'Capitalizar Crescimento',
      desc: `Faturamento cresceu ${metrics.revenue.variation.toFixed(1)}%. Momento ideal para investir em marketing, expandir equipe ou abrir novos horários. Cuidado para não saturar a operação atual.`,
      impact: 'Alto', effort: 'Imediato'
    });
  }

  // 3. Renegociação com fornecedor
  if (costs.topProviders.length > 0) {
    const top = costs.topProviders[0];
    const share = metrics.revenue.current > 0 ? (top[1] / metrics.revenue.current * 100) : 0;
    if (share > 8) {
      actions.push({
        priority: share > 15 ? 'alta' : 'media', icon: '💰', title: `Renegociar contrato com ${top[0]}`,
        desc: `Este fornecedor representa ${share.toFixed(1)}% da receita. Volume alto = poder de barganha. Busque desconto por volume, bônus por fidelidade ou cota mínima garantida com preço melhor.`,
        impact: share > 15 ? 'Alto' : 'Médio', effort: '1-2 semanas'
      });
    }
  }

  // 4. Dependência de um profissional
  if (team.dependence > 30 && team.topPerformers.length > 0) {
    actions.push({
      priority: team.dependence > 45 ? 'alta' : 'media', icon: '⚠️', title: 'Reduzir Concentração de Receita',
      desc: `${team.topPerformers[0][0]} é responsável por ${team.dependence.toFixed(1)}% da receita. Risco operacional se este profissional sair. Invista em cross-training, documente processos-chave e crie campanhas para outros veterinários.`,
      impact: 'Alto', effort: '1-3 meses'
    });
  }

  // 5. Profissionais abaixo da média
  if (team.bottomPerformers.length > 0) {
    const names = team.bottomPerformers.slice(0,3).map(([n]) => n.split('.')[0]).join(', ');
    actions.push({
      priority: 'media', icon: '📚', title: 'Plano de Desenvolvimento Individual',
      desc: `${team.bottomPerformers.length} profissional(is) produzindo abaixo de 50% da média (${names}). Agende 1-on-1 para entender bloqueios, ofereça mentoria com top performer e revise a carteira de clientes designados.`,
      impact: 'Médio', effort: 'Mensal'
    });
  }

  // 6. Setor em queda
  ['clinica','inter','cirurgico','lab'].forEach((key, i) => {
    const names = ['Clínica Médica','Internação','Bloco Cirúrgico','Laboratório'];
    const sec = sectors[key];
    if (sec.variation.trend === 'down' && Math.abs(sec.variation.variation) > 15 && sec.revenue > 0) {
      actions.push({
        priority: 'media', icon: '🏥', title: `Reativar ${names[i]}`,
        desc: `${names[i]} caiu ${Math.abs(sec.variation.variation).toFixed(1)}% vs mês anterior. Avaliar follow-up pós-consulta, parcerias externas (petshops, ONGs) e revisar capacidade/horários disponíveis.`,
        impact: 'Médio', effort: '2-4 semanas'
      });
    }
  });

  // 7. Eficiência baixa na clínica
  if (sectors.clinica.efficiency > 0 && sectors.clinica.efficiency < 0.7 && sectors.clinica.revenue > 5000) {
    actions.push({
      priority: 'baixa', icon: '💵', title: 'Revisar Tabela de Preços',
      desc: `Eficiência de ${(sectors.clinica.efficiency*100).toFixed(1)}% na clínica indica preços abaixo da tabela. Analisar principais procedimentos e reajustar valores defasados.`,
      impact: 'Médio', effort: '1 semana'
    });
  }

  // 8. Carga horária elevada
  const totalHoras = team.totalHoras || 0;
  const avgHoras = team.totalVets > 0 ? totalHoras / team.totalVets : 0;
  if (avgHoras > 200) {
    actions.push({
      priority: 'media', icon: '⏰', title: 'Atenção à Sobrecarga',
      desc: `Média de ${avgHoras.toFixed(0)}h/veterinário/mês. Acima de 200h aumenta risco de burnout e erros. Avaliar contratação, banco de horas ou redistribuição de demanda.`,
      impact: 'Médio', effort: '1-2 meses'
    });
  }

  // 9. Anomalia positiva - reconhecer
  const positiveAnomaly = anomalies.find(a => a.type === 'high');
  if (positiveAnomaly) {
    actions.push({
      priority: 'baixa', icon: '🌟', title: `Reconhecer ${positiveAnomaly.vet.split('.')[0]}`,
      desc: `Produção ${positiveAnomaly.deviation}% acima da média. Considere bonificação, destaque em reunião de equipe ou novos desafios (liderança de projeto, mentoria).`,
      impact: 'Médio', effort: 'Imediato'
    });
  }

  // 10. Margem baixa
  if (metrics.margin.current > 0 && metrics.margin.current < 0.15 && metrics.revenue.current > 50000) {
    actions.push({
      priority: 'media', icon: '📊', title: 'Otimizar Estrutura de Custos',
      desc: `Margem de ${(metrics.margin.current*100).toFixed(1)}% abaixo do ideal (>20%). Revisar contratos com fornecedores, automatizar processos repetitivos e renegociar prazos com clientes-chave.`,
      impact: 'Alto', effort: '1-3 meses'
    });
  }

  // 11. Margem excelente - investir
  if (metrics.margin.current >= 0.30) {
    actions.push({
      priority: 'baixa', icon: '💎', title: 'Janela de Investimento',
      desc: `Margem de ${(metrics.margin.current*100).toFixed(1)}% permite investir com segurança. Considere novos equipamentos, treinamento avançado da equipe ou expansão de serviços.`,
      impact: 'Alto', effort: 'Planejamento'
    });
  }

  // Sort by priority
  const order = {alta: 0, media: 1, baixa: 2};
  actions.sort((a, b) => order[a.priority] - order[b.priority]);
  return actions;
}

// ── HELPER: projeção baseada nos dados do próprio mês-alvo ──
// Detecta se o mês está completo ou em andamento olhando as DATAS dos dados
function projectMonthFromData(rows, currentRevenue, currentProfit, targetMes) {
  if (!rows || !rows.length) return null;

  const monthIdx = MESES.indexOf(targetMes);
  if (monthIdx < 1) return null;

  // ── Se o mês-alvo NÃO é o mês corrente do calendário, ele já está fechado.
  //    Mostra os totais REAIS (iguais ao Labor BI / Cogs BI), sem projetar/inflar.
  const _hoje = new Date();
  const _mesCorrenteIdx = _hoje.getMonth() + 1;     // MESES é 1-indexado
  const _anoCorrente = _hoje.getFullYear();
  // Ano dos dados do mês-alvo (para comparar past/current corretamente)
  const _mDatas = rows.filter(r => r.mes === targetMes).map(r => r.data).filter(Boolean).sort();
  const _yearTarget = _mDatas.length ? parseInt(_mDatas[_mDatas.length - 1].split('-')[0]) : _anoCorrente;
  const _isPastMonth = (_yearTarget < _anoCorrente) || (_yearTarget === _anoCorrente && monthIdx < _mesCorrenteIdx);
  if (_isPastMonth) {
    const _totalDays = new Date(_yearTarget, monthIdx, 0).getDate();
    return {
      isComplete: true,
      currentDay: _totalDays,
      totalDays: _totalDays,
      progress: 1,
      projectedRevenue: currentRevenue,   // total real = mesmo do Labor BI
      projectedProfit: currentProfit,     // total real = mesmo do Cogs BI
      dailyAverage: _totalDays ? currentRevenue / _totalDays : 0
    };
  }

  // MESES[] é 1-indexado: MESES[6] = "junho"
  // JavaScript Date é 0-indexado: janeiro=0, ..., junho=5
  // new Date(year, monthIdx, 0) retorna o último dia do mês ANTERIOR
  // new Date(year, 6, 0) = último dia de JUNHO = 30 dias ✓
  const jsMonthIdx = monthIdx - 1;

  // Pega todas as datas DENTRO do mês-alvo (pelo campo mes, não pela data)
  const mRows = rows.filter(r => r.mes === targetMes);
  const allDates = mRows.map(r => r.data).filter(d => d).sort();

  // Se não há datas do mês-alvo mas há dados → mês anterior já fechou
  if (!allDates.length) {
    const rawDates = rows.map(r => r.data).filter(Boolean).sort();
    if (!rawDates.length) return null;
    const year = parseInt(rawDates[rawDates.length - 1].split('-')[0]);
    const totalDays = new Date(year, jsMonthIdx + 1, 0).getDate();
    return {
      isComplete: true,
      currentDay: totalDays,
      totalDays,
      progress: 1,
      projectedRevenue: currentRevenue,
      projectedProfit: currentProfit,
      dailyAverage: currentRevenue / totalDays
    };
  }

  const year = parseInt(allDates[allDates.length - 1].split('-')[0]);
  const totalDays = new Date(year, jsMonthIdx + 1, 0).getDate();
  const dataLatestDay = parseInt(allDates[allDates.length - 1].split('-')[2], 10);
  const earliestDay = parseInt(allDates[0].split('-')[2], 10);

  // Se o mês-alvo é o mês corrente do calendário, o "dia atual" é o dia real de hoje
  // (assim a barra não fica presa no último dia com dados — ex.: hoje 03/jun mostra "Dia 3").
  const isCurrentCalendarMonth = (year === _anoCorrente && monthIdx === _mesCorrenteIdx);
  const calendarDay = isCurrentCalendarMonth ? _hoje.getDate() : dataLatestDay;
  const latestDay = Math.min(Math.max(dataLatestDay, calendarDay), totalDays);

  // Se os dados cobrem até o último dia do mês (ou faltando 1 dia), considera completo
  if (dataLatestDay >= totalDays - 1) {
    return {
      isComplete: true,
      currentDay: totalDays,
      totalDays,
      progress: 1,
      projectedRevenue: currentRevenue,
      projectedProfit: currentProfit,
      dailyAverage: currentRevenue / totalDays
    };
  }

  // Projeção da RECEITA/LUCRO usa o progresso REAL dos dados (dias com dados),
  // pois projetar pelo dia do calendário inflaria se os dados estiverem atrasados.
  const dataProgress = Math.max(0.05, dataLatestDay / totalDays);
  // A barra/indicador de DIA usa o dia do calendário (corrige "Dia 28" quando já é dia 3 do mês seguinte).
  const dayProgress = Math.max(0.05, latestDay / totalDays);
  return {
    isComplete: false,
    currentDay: latestDay,
    dataDay: dataLatestDay,
    earliestDay,
    totalDays,
    progress: dayProgress,
    projectedRevenue: currentRevenue / dataProgress,
    projectedProfit: currentProfit / dataProgress,
    dailyAverage: currentRevenue / dataLatestDay
  };
}

// ── HELPER: histórico mês a mês (separado, sem misturar) ──
function buildMonthHistory(baseRowsAll, cogsRowsAll) {
  // Usa campo `mes` como Labor BI (não extrai da data)
  function getRealMes(r) {
    return r.mes || '';
  }

  const mesesSet = [...new Set([
    ...baseRowsAll.map(getRealMes),
    ...cogsRowsAll.map(getRealMes)
  ])].filter(Boolean);

  // Ordena cronologicamente usando MESES
  const meses = mesesSet.sort((a, b) => MESES.indexOf(a) - MESES.indexOf(b));

  // cirúrgico por mês (mesma lógica do Labor BI)
  function getCirByMes(mes) {
    if (!mes) return 0;
    const cirRows = (S.anal && S.anal['C_CIRURGICO']) || [];
    return cirRows.filter(r => r.mes === mes).reduce((s, r) => s + (r.valL || 0), 0);
  }

  return meses.map(m => {
    const mBase = baseRowsAll.filter(r => r.mes === m);
    const mCogs = cogsRowsAll.filter(r => r.mes === m);
    // produção base (ajustada) + cirúrgico (mesmo cálculo do KPI Produção Total)
    const baseProd = mBase.reduce((s, r) => s + (r.prod || 0), 0);
    const cirProd = getCirByMes(m);
    const rev = baseProd + cirProd;
    const teamCost = mCogs.filter(r => classifyCogsRow(r) === 'team').reduce((s, r) => s + r.val, 0)
                  || mBase.reduce((s, r) => s + r.valTotal, 0);
    const opCost = mCogs.filter(r => classifyCogsRow(r) === 'operational').reduce((s, r) => s + r.val, 0);
    const cost = teamCost + opCost;
    const profit = rev - cost;
    const margin = rev > 0 ? profit / rev : 0;
    return {mes: m, rev, profit, margin, cost, teamCost, opCost, rows: mBase.length};
  });
}

// ── FUNÇÃO PRINCIPAL ──
function generateInsights() {
  const content = document.getElementById('ai-content');

  if(!S.base || !S.base.length) {
    content.innerHTML = '<div class="nd"><div class="nd-i">❌</div>Sem dados para analisar. Carregue as planilhas primeiro no Admin Center.</div>';
    return;
  }

  // ── Loading com estágios ──
  const stages = [
    {pct: 18, label: 'Coletando dados do período...', icon: '📊'},
    {pct: 36, label: 'Calculando variações mensais...', icon: '📈'},
    {pct: 54, label: 'Analisando performance por setor...', icon: '🏥'},
    {pct: 72, label: 'Detectando anomalias e padrões...', icon: '🔍'},
    {pct: 88, label: 'Cruzando benchmarks internos...', icon: '🎯'},
    {pct: 100, label: 'Gerando recomendações...', icon: '🧠'}
  ];

  content.innerHTML = `
    <div style="text-align:center; padding: 48px 20px;">
      <div style="position:relative;width:84px;height:84px;margin:0 auto 22px">
        <div style="position:absolute;inset:0;border:3px solid var(--bd);border-top-color:var(--pink);border-radius:50%;animation: spin 1s linear infinite"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:34px">🧠</div>
      </div>
      <div style="color:var(--pink);font-family:var(--font-display);font-weight:700;font-size:18px;margin-bottom:6px">Motor Analítico v2.0</div>
      <div style="color:var(--tx3);font-size:12px;font-family:var(--font-mono);margin-bottom:22px">Análise multidimensional em andamento</div>
      <div style="max-width:420px;margin:0 auto;height:5px;background:var(--sf2);border-radius:3px;overflow:hidden;border:1px solid var(--bd)">
        <div id="ai-progress" style="height:100%;background:linear-gradient(90deg, var(--pink), var(--violet), var(--cyan));width:0%;transition:width 0.3s ease;border-radius:3px"></div>
      </div>
      <div id="ai-stage" style="margin-top:16px;font-size:12px;color:var(--tx2);font-family:var(--font-mono);min-height:18px">${stages[0].icon} ${stages[0].label}</div>
    </div>
  `;

  const progressEl = document.getElementById('ai-progress');
  const stageEl = document.getElementById('ai-stage');
  let stageIdx = 0;
  const stageInterval = setInterval(() => {
    stageIdx++;
    if (stageIdx < stages.length) {
      progressEl.style.width = stages[stageIdx].pct + '%';
      stageEl.textContent = stages[stageIdx].icon + ' ' + stages[stageIdx].label;
    }
  }, 280);

  // ── ANÁLISE PRINCIPAL ──
  setTimeout(() => {
    clearInterval(stageInterval);
    progressEl.style.width = '100%';
    stageEl.textContent = '✓ Análise completa';

// ===== 1. Determinar período-alvo =====
    const hoje = new Date();
    const diaAtual = hoje.getDate();
    // JavaScript Date: janeiro=0, junho=5 → mesAtualIdx=6 → MESES[6]="junho"
    const mesAtualIdx = hoje.getMonth() + 1;
    // Mes atual em texto
    let targetMes = MESES[mesAtualIdx] || '';
    let previousMes = null;
    if (MESES.indexOf(targetMes) > 1) previousMes = MESES[MESES.indexOf(targetMes) - 1];

    // Filtra base por mês (usa campo mes como Labor BI)
    function filterByMes(rows, mes) {
      if (!mes) return rows;
      return rows.filter(r => r.mes === mes);
    }

    // getAdjustedBase() calcula exatamente como Labor BI (proporção - dedução cirúrgica para Larissa/Vitor)
    let baseRowsAll = getAdjustedBase();
    let cogsRowsAll = S.cogs || [];

    // Descobre meses disponíveis
    const allMeses = [...new Set([
      ...baseRowsAll.map(r => r.mes).filter(Boolean),
      ...cogsRowsAll.map(r => r.mes).filter(Boolean)
    ])].filter(Boolean).sort((a,b) => MESES.indexOf(a) - MESES.indexOf(b));

    let baseTarget = filterByMes(baseRowsAll, targetMes);
    let cogsTarget = filterByMes(cogsRowsAll, targetMes);

    // Se estamos nos primeiros 10 dias do mês E não há dados do mês atual, o mês anterior já está fechado
    // Usa o mês anterior como target (mês fechado/completo)
    if (diaAtual <= 10 && !baseTarget.length && !cogsTarget.length && allMeses.length) {
      targetMes = allMeses[allMeses.length - 1];
      previousMes = MESES.indexOf(targetMes) > 1 ? MESES[MESES.indexOf(targetMes) - 1] : null;
      baseTarget = filterByMes(baseRowsAll, targetMes);
      cogsTarget = filterByMes(cogsRowsAll, targetMes);
    }
    // Se não há dados do mês atual, usa o mais recente disponível
    else if (!baseTarget.length && !cogsTarget.length && allMeses.length) {
      targetMes = allMeses[allMeses.length - 1];
      previousMes = MESES.indexOf(targetMes) > 1 ? MESES[MESES.indexOf(targetMes) - 1] : null;
      baseTarget = filterByMes(baseRowsAll, targetMes);
      cogsTarget = filterByMes(cogsRowsAll, targetMes);
    }
    if (!baseTarget.length && !cogsTarget.length) {
      content.innerHTML = '<div class="nd"><div class="nd-i">❌</div>Não há dados suficientes para gerar insights.</div>';
      return;
    }

    const basePrevious = previousMes ? filterByMes(baseRowsAll, previousMes) : [];
    const cogsPrevious = previousMes ? filterByMes(cogsRowsAll, previousMes) : [];

    // ── Reconhecimento automático da semana em análise ──
    const totalSemanas   = getNumSemanas(targetMes);
    const semanaAtual    = getSemanaAtual(targetMes);
    const mesEhCorrente  = (MES_IDX[targetMes] === (new Date().getMonth()+1));
    const periodoParcial = mesEhCorrente && (semanaAtual < totalSemanas);
    const semanaInfo = {
      total: totalSemanas,
      atual: semanaAtual,
      parcial: periodoParcial,
      // fração do mês já decorrida (para projeções proporcionais)
      fracaoDecorrida: totalSemanas ? Math.min(1, semanaAtual / totalSemanas) : 1,
      label: periodoParcial
        ? `Semana ${semanaAtual} de ${totalSemanas} (mês em andamento)`
        : `Mês completo · ${totalSemanas} semanas`
    };

    // ── cirúrgico por mês (mesmo filtro do Labor BI) ──
    function getCirurgicoByMes(mes) {
      if (!mes) return 0;
      const cirRows = (S.anal && S.anal['C_CIRURGICO']) || [];
      return cirRows.filter(x => x.mes === mes).reduce((s, r) => s + (r.valL || 0), 0);
    }

    // ===== 2. Métricas financeiras (exatamente como Labor BI) =====
    // produção base (já com dedução cirúrgica para Larissa/Vitor)
    const baseProd = sumC(baseTarget, 'prod');
    const baseProdPrev = sumC(basePrevious, 'prod');
    // cirúrgico adicionado
    const cirProd = getCirurgicoByMes(targetMes);
    const cirProdPrev = getCirurgicoByMes(previousMes);
    // Produção Total = base + cirúrgico (mesmo cálculo do KPI)
    const currentRevenue = baseProd + cirProd;
    const previousRevenue = baseProdPrev + cirProdPrev;

    // Custos de equipe = valor total a pagar (fixo + variável) — mesmo do Labor BI
    const currentTeamCost = sumC(baseTarget, 'valTotal');
    const previousTeamCost = sumC(basePrevious, 'valTotal');
    const currentOpCost = sumCogsBy(cogsTarget, 'operational');
    const previousOpCost = sumCogsBy(cogsPrevious, 'operational');
    const currentCost = currentTeamCost + currentOpCost;
    const previousCost = previousTeamCost + previousOpCost;
    const currentProfit = currentRevenue - currentCost;
    const previousProfit = previousRevenue - previousCost;
    const currentMargin = currentRevenue > 0 ? currentProfit / currentRevenue : 0;
    const previousMargin = previousRevenue > 0 ? previousProfit / previousRevenue : 0;

    const metrics = {
      revenue: momCompare(currentRevenue, previousRevenue),
      profit: momCompare(currentProfit, previousProfit),
      margin: momCompare(currentMargin, previousMargin),
      teamCostVar: momCompare(currentTeamCost, previousTeamCost),
      opCostVar: momCompare(currentOpCost, previousOpCost)
    };

    // ===== 3. Análise por setor =====
    const sectors = {
      clinica:   analyzeSector('CLINICA', targetMes, previousMes),
      inter:     analyzeSector('INTER', targetMes, previousMes),
      cirurgico: analyzeSector('C_CIRURGICO', targetMes, previousMes),
      lab:       analyzeSector('LAB', targetMes, previousMes)
    };

    // ===== 4. Análise de equipe =====
    const vetMap = {};
    baseTarget.forEach(r => {
      if (!r.vet) return;
      if (!vetMap[r.vet]) vetMap[r.vet] = {prod:0, horas:0, hN:0, hNt:0, fixo:0, var:0, total:0, n:0};
      vetMap[r.vet].prod += r.prod || 0;
      vetMap[r.vet].horas += r.horas || 0;
      vetMap[r.vet].hN += r.hNorm || 0;
      vetMap[r.vet].hNt += r.hNot || 0;
      vetMap[r.vet].fixo += r.valFixo || 0;
      vetMap[r.vet].var += r.valVar || 0;
      vetMap[r.vet].total += r.valTotal || 0;
      vetMap[r.vet].n++;
    });
    const vets = Object.entries(vetMap);
    const topVets = [...vets].sort((a,b) => b[1].prod - a[1].prod);
    const avgProd = topVets.length ? topVets.reduce((s,[,d]) => s + d.prod, 0) / topVets.length : 0;
    const bottomVets = topVets.filter(([,d]) => d.prod < avgProd * 0.5 && d.horas > 10);

    // ── Produção por vet no mês ANTERIOR (referência para anomalias) ──
    const prevVetMap = {};
    basePrevious.forEach(r => {
      if (!r.vet) return;
      if (!prevVetMap[r.vet]) prevVetMap[r.vet] = {prod: 0};
      prevVetMap[r.vet].prod += r.prod || 0;
    });
    const prevVetAvg = previousRevenue > 0 && basePrevious.length
      ? Object.values(prevVetMap).reduce((s, v) => s + v.prod, 0) / Math.max(1, Object.keys(prevVetMap).length)
      : 0;

    // Anomalias: variação vs mês anterior por vet (>+50% = alta positiva, <-30% = baixa)
    // Se vet não existia no mês anterior, usa a média do mês anterior como referência.
    const anomalies = [];
    topVets.forEach(([n, d]) => {
      const prevProd = prevVetMap[n] ? prevVetMap[n].prod : prevVetAvg;
      if (prevProd <= 0) return; // sem referência
      const pctChange = ((d.prod / prevProd) - 1) * 100;
      if (pctChange >= 50 && d.prod > 20000) {
        anomalies.push({type:'high', vet:n, prod:d.prod, prevProd, deviation: pctChange.toFixed(0)});
      } else if (pctChange <= -30 && d.horas > 10) {
        anomalies.push({type:'low', vet:n, prod:d.prod, prevProd, deviation: Math.abs(pctChange).toFixed(0), horas: d.horas});
      }
    });
    // Ordena: maiores variações positivas primeiro, depois negativas
    anomalies.sort((a, b) => {
      if (a.type === b.type) return b.prod - a.prod;
      return a.type === 'high' ? -1 : 1;
    });

    const team = {
      topPerformers: topVets.slice(0, 3),
      bottomPerformers: bottomVets,
      average: avgProd,
      dependence: currentRevenue > 0 && topVets[0] ? (topVets[0][1].prod / currentRevenue * 100) : 0,
      totalVets: topVets.length,
      total: topVets.reduce((s,[,d]) => s + d.prod, 0),
      totalHoras: topVets.reduce((s,[,d]) => s + d.horas, 0)
    };

    // ===== 5. Análise de custos =====
    const opByForn = {};
    cogsTarget.forEach(r => {
      if (classifyCogsRow(r) !== 'operational') return;
      const k = r.forn || r.cat || 'Outros';
      opByForn[k] = (opByForn[k] || 0) + r.val;
    });
    const topProviders = Object.entries(opByForn).sort((a,b) => b[1] - a[1]).slice(0, 5);

    const costs = {
      teamRatio: currentRevenue > 0 ? currentTeamCost / currentRevenue : 0,
      opRatio: currentRevenue > 0 ? currentOpCost / currentRevenue : 0,
      topProviders,
      totalOp: currentOpCost,
      totalTeam: currentTeamCost
    };

    // ===== 6. Health score =====
    const health = calculateHealthScore(metrics, team, costs, anomalies);

    // ===== 7. Projeção (baseada nos dados do próprio mês) =====
    const projection = projectMonthFromData(baseTarget, currentRevenue, currentProfit, targetMes);

    // ===== 7b. Histórico mês a mês (separado, sem misturar) =====
    const monthHistory = buildMonthHistory(baseRowsAll, cogsRowsAll);
    // Variação mês a mês
    monthHistory.forEach((m, i) => {
      if (i > 0) {
        const prev = monthHistory[i - 1];
        m.varRev = prev.rev > 0 ? ((m.rev / prev.rev - 1) * 100) : 0;
        m.varProfit = prev.profit > 0 ? ((m.profit / prev.profit - 1) * 100) : 0;
      } else {
        m.varRev = 0; m.varProfit = 0;
      }
      // Marca "Em andamento" apenas se for o mês corrente do calendário.
      // Meses passados (mesmo que sejam o targetMes) aparecem como "Fechado".
      const _calMesNome = MESES[hoje.getMonth() + 1] || '';
      m.isCurrent = (m.mes === _calMesNome);
    });

    // ===== 8. Plano de ação =====
    const actions = generateActionPlan(metrics, sectors, team, costs, anomalies, targetMes);

    // ===== 9. RENDER =====
    const healthCirc = 327; // 2*pi*52

    // MoM card
    const momCard = (label, mom, isPct = false) => {
      const trendColor = mom.trend === 'up' ? 'var(--green)' : mom.trend === 'down' ? 'var(--red)' : 'var(--cyan)';
      const sym = mom.trend === 'up' ? '↑' : mom.trend === 'down' ? '↓' : '→';
      const display = isPct ? (mom.current * 100).toFixed(2) + '%' : fR(mom.current);
      return `
        <div class="kc" style="--clr:${trendColor};cursor:default">
          <div class="klbl">${label}</div>
          <div class="kval" style="font-size:19px">${display}</div>
          <div class="ksub" style="color:${trendColor}">${sym} ${Math.abs(mom.variation).toFixed(1)}%${previousMes ? ' vs ' + cap(previousMes) : ''}</div>
        </div>
      `;
    };

    // Sector card
    const sectorCard = (name, icon, data) => {
      const trendColor = data.variation.trend === 'up' ? 'var(--green)' : data.variation.trend === 'down' ? 'var(--red)' : 'var(--tx3)';
      const sym = data.variation.trend === 'up' ? '↑' : data.variation.trend === 'down' ? '↓' : '→';
      const efColor = data.efficiency >= 0.9 ? 'var(--green)' : data.efficiency >= 0.7 ? 'var(--amber)' : 'var(--red)';
      return `
        <div style="background:var(--sf);border:1px solid var(--bd);border-radius:14px;padding:16px 18px;position:relative;overflow:hidden">
          <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${trendColor};opacity:0.7"></div>
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:12px">
            <div style="font-size:22px;line-height:1">${icon}</div>
            <div style="flex:1;min-width:0">
              <div style="font-family:var(--font-display);font-size:13.5px;font-weight:600;color:var(--tx);letter-spacing:-0.2px">${name}</div>
              <div style="font-size:9.5px;color:var(--tx3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px">${data.count} lançamentos</div>
            </div>
          </div>
          <div style="font-family:var(--font-display);font-size:19px;font-weight:700;color:${trendColor};letter-spacing:-0.4px;margin-bottom:8px">${data.revenue > 0 ? fR(data.revenue) : '—'}</div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:10.5px;font-family:var(--font-mono);color:var(--tx3)">
            <span>${sym} ${Math.abs(data.variation.variation).toFixed(1)}%</span>
            <span>Ef: <span style="color:${efColor};font-weight:600">${data.efficiency > 0 ? (data.efficiency*100).toFixed(0) + '%' : '—'}</span></span>
          </div>
          ${data.topProc ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd);font-size:10.5px;color:var(--tx3);font-family:var(--font-mono);line-height:1.5">
            <div style="text-transform:uppercase;letter-spacing:1px;font-size:9px;margin-bottom:3px">Top procedimento</div>
            <div style="color:var(--tx2);font-size:11px">${data.topProc[0].length > 30 ? data.topProc[0].slice(0,30)+'…' : data.topProc[0]}</div>
            <div style="color:var(--cyan);font-size:10.5px">${fR(data.topProc[1].val)} · ${data.topProc[1].n}x</div>
          </div>` : ''}
        </div>
      `;
    };

    // Top performers table
    const topVetsHTML = team.topPerformers.length > 0 ? team.topPerformers.map(([n, d], i) => {
      const medal = ['🥇', '🥈', '🥉'][i] || `#${i+1}`;
      const share = team.total > 0 ? (d.prod / team.total * 100) : 0;
      return `
        <tr>
          <td style="padding:10px 14px;font-size:15px;width:30px">${medal}</td>
          <td style="padding:10px 14px;font-weight:600">${n}</td>
          <td style="padding:10px 14px;text-align:right;color:var(--cyan);font-family:var(--font-mono);font-weight:600">${fR(d.prod)}</td>
          <td style="padding:10px 14px;text-align:right;font-family:var(--font-mono);color:var(--tx2);font-size:11.5px">${fN(d.horas)}h</td>
          <td style="padding:10px 14px;text-align:right;width:110px">
            <div class="pbar" style="width:60px;display:inline-block;vertical-align:middle"><div class="pfill" style="width:${Math.min(100, share*2).toFixed(1)}%"></div></div>
            <span style="font-size:10px;color:var(--tx3);font-family:var(--font-mono);margin-left:6px">${share.toFixed(1)}%</span>
          </td>
        </tr>
      `;
    }).join('') : '<tr><td colspan="5" class="nd" style="padding:30px">Sem dados</td></tr>';

    // Anomalies
    const anomaliesHTML = anomalies.length > 0 ? anomalies.map(a => {
      const bg = a.type === 'high' ? 'rgba(45,212,160,.05)' : 'rgba(229,104,95,.05)';
      const border = a.type === 'high' ? 'rgba(45,212,160,.25)' : 'rgba(229,104,95,.25)';
      const icon = a.type === 'high' ? '🚀' : '⚠️';
      const txt = a.type === 'high'
        ? `acima de ${previousMes ? cap(previousMes) : 'mês anterior'}`
        : `abaixo de ${previousMes ? cap(previousMes) : 'mês anterior'}${a.horas ? ` (${fN(a.horas)}h trabalhadas)` : ''}`;
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:${bg};border:1px solid ${border};border-radius:8px;margin-bottom:6px;font-size:12px">
          <span style="font-size:16px">${icon}</span>
          <div style="flex:1">
            <strong style="color:var(--tx)">${a.vet}</strong> — produção <strong>${txt}</strong> em <strong style="color:${a.type === 'high' ? 'var(--green)' : 'var(--red)'}">${a.deviation}%</strong>
          </div>
          <span style="color:var(--tx3);font-family:var(--font-mono);font-size:11px">${fR(a.prod)}</span>
        </div>
      `;
    }).join('') : `
      <div style="text-align:center;padding:18px;color:var(--tx3);font-size:12px">
        ✅ Nenhuma anomalia significativa detectada.
      </div>
    `;

    // Priority badge
    const priorityBadge = p => {
      const c = {
        alta:  {bg:'rgba(239,68,68,.15)', fg:'var(--red)', border:'rgba(239,68,68,.35)'},
        media: {bg:'rgba(245,158,11,.15)', fg:'var(--amber)', border:'rgba(245,158,11,.35)'},
        baixa: {bg:'rgba(45,212,160,.15)', fg:'var(--green)', border:'rgba(45,212,160,.35)'}
      }[p];
      return `<span style="background:${c.bg};color:${c.fg};border:1px solid ${c.border};padding:2px 8px;border-radius:100px;font-size:9px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;font-weight:600">${p}</span>`;
    };
    const impactBadge = i => {
      const c = {Alto:'var(--red)', Médio:'var(--amber)', Baixo:'var(--green)'}[i] || 'var(--tx3)';
      return `<span style="color:${c};font-size:10px;font-family:var(--font-mono);font-weight:600">● ${i}</span>`;
    };

    // Action items
    const actionsHTML = actions.length > 0 ? actions.map(a => `
      <div style="background:var(--bg2);border:1px solid var(--bd);border-left:3px solid ${a.priority === 'alta' ? 'var(--red)' : a.priority === 'media' ? 'var(--amber)' : 'var(--green)'};border-radius:10px;padding:14px 18px;margin-bottom:10px">
        <div style="display:flex;align-items:flex-start;gap:12px">
          <div style="font-size:24px;flex-shrink:0;line-height:1">${a.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
              <div style="font-family:var(--font-display);font-size:13.5px;font-weight:600;color:var(--tx);letter-spacing:-0.2px">${a.title}</div>
              ${priorityBadge(a.priority)}
              <span style="font-size:10px;color:var(--tx3);font-family:var(--font-mono)">·</span>
              ${impactBadge(a.impact)}
              ${a.effort ? `<span style="font-size:10px;color:var(--tx3);font-family:var(--font-mono)">· ${a.effort}</span>` : ''}
            </div>
            <div style="font-size:12.5px;color:var(--tx2);line-height:1.65">${a.desc}</div>
          </div>
        </div>
      </div>
    `).join('') : `
      <div style="text-align:center;padding:30px 20px;background:rgba(45,212,160,.05);border:1px solid rgba(45,212,160,.2);border-radius:10px">
        <div style="font-size:32px;margin-bottom:8px">🎉</div>
        <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--green);margin-bottom:4px">Operação em Excelente Estado</div>
        <div style="font-size:12px;color:var(--tx2)">Nenhuma ação crítica identificada. Mantenha o ritmo e foque em oportunidades de crescimento.</div>
      </div>
    `;

    // Top providers
    const providersHTML = topProviders.length > 0 ? `
      <table style="width:100%;border-collapse:collapse">
        ${topProviders.map(([f, v], i) => `
          <tr>
            <td style="padding:8px 0;border-bottom:1px solid rgba(30,45,71,.4);font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${f}">
              <span style="color:var(--tx3);font-family:var(--font-mono);margin-right:8px;font-size:10px">#${i+1}</span>
              <span style="color:var(--tx)">${f}</span>
            </td>
            <td style="padding:8px 0;border-bottom:1px solid rgba(30,45,71,.4);text-align:right;color:var(--red);font-family:var(--font-mono);font-weight:600;font-size:12px;white-space:nowrap">${fR(v)}</td>
          </tr>
        `).join('')}
      </table>
      <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--bd);display:flex;justify-content:space-between;font-size:11px;font-family:var(--font-mono)">
        <span style="color:var(--tx3)">Total operacional:</span>
        <span style="color:var(--red);font-weight:600">${fR(costs.totalOp)}</span>
      </div>
    ` : '<div class="nd" style="padding:20px">Nenhum custo operacional registrado no período.</div>';

    // Projeção (baseada em dados do próprio mês — não mistura com outros meses)
    let projHTML;
    if (!projection) {
      projHTML = `
        <div style="text-align:center;padding:30px 20px;color:var(--tx3);font-size:13px">
          <div style="font-size:32px;margin-bottom:8px">📅</div>
          Sem dados disponíveis para ${cap(targetMes)}
        </div>
      `;
    } else if (projection.isComplete) {
      // Mês fechado - mostra totais reais, sem projeção
      const projVariacao = previousRevenue > 0 ? ((projection.projectedRevenue / previousRevenue - 1) * 100) : 0;
      projHTML = `
        <div style="margin-bottom:14px;padding:10px 14px;background:rgba(45,212,160,.08);border:1px solid rgba(45,212,160,.25);border-radius:10px;display:flex;align-items:center;gap:10px">
          <span style="font-size:18px">✅</span>
          <div>
            <div style="font-family:var(--font-display);font-size:13px;font-weight:600;color:var(--green)">Mês Fechado</div>
            <div style="font-size:10.5px;color:var(--tx2);font-family:var(--font-mono)">${projection.totalDays} dias · 100% concluído · ${cap(targetMes)}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div style="padding:12px;background:var(--bg2);border:1px solid var(--bd);border-radius:8px">
            <div style="font-size:9px;color:var(--tx3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">💰 Receita Total</div>
            <div style="font-family:var(--font-display);font-size:17px;font-weight:700;color:var(--cyan);letter-spacing:-0.3px">${fR(projection.projectedRevenue)}</div>
            <div style="font-size:10px;color:var(--tx3);font-family:var(--font-mono);margin-top:4px">Média: ${fR(projection.dailyAverage)}/dia</div>
          </div>
          <div style="padding:12px;background:var(--bg2);border:1px solid var(--bd);border-radius:8px">
            <div style="font-size:9px;color:var(--tx3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">📈 Lucro Total</div>
            <div style="font-family:var(--font-display);font-size:17px;font-weight:700;color:${projection.projectedProfit >= 0 ? 'var(--green)' : 'var(--red)'};letter-spacing:-0.3px">${fR(projection.projectedProfit)}</div>
            <div style="font-size:10px;color:var(--tx3);font-family:var(--font-mono);margin-top:4px">Margem: ${(projection.projectedRevenue > 0 ? (projection.projectedProfit/projection.projectedRevenue*100) : 0).toFixed(1)}%</div>
          </div>
        </div>
        ${previousRevenue > 0 ? `
          <div style="padding:10px 12px;background:var(--bg2);border:1px solid var(--bd);border-radius:8px;font-size:11px;font-family:var(--font-mono);color:var(--tx2);display:flex;align-items:center;gap:8px">
            <span style="font-size:14px">${projVariacao > 0 ? '📈' : projVariacao < 0 ? '📉' : '➡️'}</span>
            <span>Fechamento <strong style="color:${projVariacao > 0 ? 'var(--green)' : projVariacao < 0 ? 'var(--red)' : 'var(--tx)'}">${Math.abs(projVariacao).toFixed(1)}% ${projVariacao > 0 ? 'acima' : projVariacao < 0 ? 'abaixo' : 'igual'}</strong> de ${cap(previousMes)}</span>
          </div>
        ` : ''}
      `;
    } else {
      // Mês em andamento - projeta com base no progresso real dos dados
      const projVariacao = previousRevenue > 0 ? ((projection.projectedRevenue / previousRevenue - 1) * 100) : 0;
      projHTML = `
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--tx3);font-family:var(--font-mono);margin-bottom:7px">
            <span>📅 Dia ${projection.currentDay} de ${projection.totalDays}${projection.earliestDay && projection.dataDay && projection.earliestDay !== projection.dataDay ? ` (dados do dia ${projection.earliestDay} ao ${projection.dataDay})` : ''}</span>
            <span>${(projection.progress*100).toFixed(0)}% concluído</span>
          </div>
          <div style="height:8px;background:var(--sf3);border-radius:4px;overflow:hidden;border:1px solid var(--bd)">
            <div style="height:100%;background:linear-gradient(90deg, var(--cyan), var(--violet));width:${projection.progress*100}%;border-radius:4px"></div>
          </div>
          <div style="margin-top:6px;font-size:10px;color:var(--tx3);font-family:var(--font-mono)">Média diária: ${fR(projection.dailyAverage)} · ${projection.dataDay || projection.currentDay} dias com dados</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
          <div style="padding:12px;background:var(--bg2);border:1px solid var(--bd);border-radius:8px">
            <div style="font-size:9px;color:var(--tx3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">💰 Receita Projetada</div>
            <div style="font-family:var(--font-display);font-size:17px;font-weight:700;color:var(--cyan);letter-spacing:-0.3px">${fR(projection.projectedRevenue)}</div>
            <div style="font-size:10px;color:var(--tx3);font-family:var(--font-mono);margin-top:4px">Atual: ${fR(currentRevenue)}</div>
          </div>
          <div style="padding:12px;background:var(--bg2);border:1px solid var(--bd);border-radius:8px">
            <div style="font-size:9px;color:var(--tx3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;margin-bottom:5px">📈 Lucro Projetado</div>
            <div style="font-family:var(--font-display);font-size:17px;font-weight:700;color:${projection.projectedProfit >= 0 ? 'var(--green)' : 'var(--red)'};letter-spacing:-0.3px">${fR(projection.projectedProfit)}</div>
            <div style="font-size:10px;color:var(--tx3);font-family:var(--font-mono);margin-top:4px">Atual: ${fR(currentProfit)}</div>
          </div>
        </div>
        ${previousRevenue > 0 ? `
          <div style="padding:10px 12px;background:var(--bg2);border:1px solid var(--bd);border-radius:8px;font-size:11px;font-family:var(--font-mono);color:var(--tx2);display:flex;align-items:center;gap:8px">
            <span style="font-size:14px">${projVariacao > 0 ? '📈' : projVariacao < 0 ? '📉' : '➡️'}</span>
            <span>Projeção <strong style="color:${projVariacao > 0 ? 'var(--green)' : projVariacao < 0 ? 'var(--red)' : 'var(--tx)'}">${Math.abs(projVariacao).toFixed(1)}% ${projVariacao > 0 ? 'acima' : projVariacao < 0 ? 'abaixo' : 'igual'}</strong> de ${cap(previousMes)}</span>
          </div>
        ` : ''}
      `;
    }

    // Histórico mês a mês (separado por mês)
    const monthHistoryHTML = monthHistory.length > 1 ? `
      <div style="background:var(--sf);border:1px solid var(--bd);border-radius:18px;padding:22px;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px;padding-bottom:16px;border-bottom:1px solid var(--bd)">
          <div style="width:42px;height:42px;background:var(--cyan-dim);border:1px solid rgba(21,184,166,.3);border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📅</div>
          <div style="flex:1">
            <div style="font-family:var(--font-display);font-size:17px;font-weight:700;color:var(--tx);letter-spacing:-0.3px">Histórico Mês a Mês</div>
            <div style="font-size:11px;color:var(--tx3);font-family:var(--font-mono);margin-top:3px">${monthHistory.length} meses · dados separados por período</div>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12.5px">
          <thead>
            <tr>
              <th style="padding:10px 14px;text-align:left;font-size:9.5px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Mês</th>
              <th style="padding:10px 14px;text-align:right;font-size:9.5px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Receita</th>
              <th style="padding:10px 14px;text-align:right;font-size:9.5px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Lucro</th>
              <th style="padding:10px 14px;text-align:right;font-size:9.5px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Margem</th>
              <th style="padding:10px 14px;text-align:right;font-size:9.5px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Δ Receita</th>
              <th style="padding:10px 14px;text-align:center;font-size:9.5px;font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;color:var(--tx3);background:var(--sf2);border-bottom:1px solid var(--bd)">Status</th>
            </tr>
          </thead>
          <tbody>
            ${monthHistory.map(m => {
              const maxRev = Math.max(...monthHistory.map(x => x.rev), 1);
              const barW = (m.rev / maxRev * 100).toFixed(1);
              const varColor = m.varRev > 0 ? 'var(--green)' : m.varRev < 0 ? 'var(--red)' : 'var(--tx3)';
              const statusBadge = m.isCurrent
                ? '<span class="bdg bc">Em andamento</span>'
                : '<span class="bdg bg">Fechado</span>';
              return `
                <tr style="background:${m.isCurrent ? 'rgba(21,184,166,.04)' : 'transparent'}">
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(30,45,71,.4);font-family:var(--font-display);font-weight:600;color:var(--tx)">
                    ${cap(m.mes)}
                    ${m.isCurrent ? '<span style="display:inline-block;width:6px;height:6px;background:var(--cyan);border-radius:50%;margin-left:6px;animation:pulse 1.5s infinite;vertical-align:middle"></span>' : ''}
                  </td>
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(30,45,71,.4);text-align:right;font-family:var(--font-mono);color:var(--cyan);font-weight:600">${fR(m.rev)}<div class="pbar" style="width:80px;display:inline-block;margin-left:8px;vertical-align:middle"><div class="pfill" style="width:${barW}%;background:var(--cyan)"></div></div></td>
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(30,45,71,.4);text-align:right;font-family:var(--font-mono);color:${m.profit >= 0 ? 'var(--green)' : 'var(--red)'};font-weight:600">${fR(m.profit)}</td>
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(30,45,71,.4);text-align:right;font-family:var(--font-mono)">${(m.margin*100).toFixed(1)}%</td>
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(30,45,71,.4);text-align:right;font-family:var(--font-mono);color:${varColor};font-weight:600">${m.varRev > 0 ? '↑' : m.varRev < 0 ? '↓' : '→'} ${Math.abs(m.varRev).toFixed(1)}%</td>
                  <td style="padding:12px 14px;border-bottom:1px solid rgba(30,45,71,.4);text-align:center">${statusBadge}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    // Cost structure
    const totalCost = costs.totalOp + costs.totalTeam;
    const costPie = (costs.teamRatio > 0 || costs.opRatio > 0) ? `
      <div style="margin-bottom:14px">
        <div style="display:flex;height:10px;border-radius:5px;overflow:hidden;background:var(--sf3);border:1px solid var(--bd)">
          <div style="background:var(--amber);width:${(costs.teamRatio*100/(costs.teamRatio+costs.opRatio||1)*100).toFixed(1)}%;transition:width 0.5s ease" title="Equipe"></div>
          <div style="background:var(--red);width:${(costs.opRatio*100/(costs.teamRatio+costs.opRatio||1)*100).toFixed(1)}%;transition:width 0.5s ease" title="Operacional"></div>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:10.5px;font-family:var(--font-mono)">
          <span><span style="display:inline-block;width:8px;height:8px;background:var(--amber);border-radius:2px;margin-right:6px;vertical-align:middle"></span>Equipe: <strong style="color:var(--amber)">${(costs.teamRatio*100).toFixed(1)}%</strong></span>
          <span><span style="display:inline-block;width:8px;height:8px;background:var(--red);border-radius:2px;margin-right:6px;vertical-align:middle"></span>Operacional: <strong style="color:var(--red)">${(costs.opRatio*100).toFixed(1)}%</strong></span>
        </div>
      </div>
    ` : '';

    // Final HTML
    content.innerHTML = `
      <!-- ═══ HEADER: SCORE DE SAÚDE ═══ -->
      <div style="display:grid;grid-template-columns:auto 1fr;gap:24px;padding:24px;background:linear-gradient(135deg, ${health.color}10 0%, var(--sf) 60%);border:1px solid var(--bd);border-radius:18px;margin-bottom:20px;align-items:center">
        <div style="position:relative;width:130px;height:130px;flex-shrink:0">
          <svg viewBox="0 0 130 130" style="transform:rotate(-90deg);width:100%;height:100%">
            <circle cx="65" cy="65" r="56" fill="none" stroke="var(--sf3)" stroke-width="9"/>
            <circle cx="65" cy="65" r="56" fill="none" stroke="${health.color}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(health.score/100)*healthCirc} ${healthCirc}" style="transition:stroke-dasharray 1.2s ease;filter:drop-shadow(0 0 6px ${health.color}66)"/>
          </svg>
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <div style="font-family:var(--font-display);font-size:38px;font-weight:800;color:${health.color};letter-spacing:-1.5px;line-height:1">${health.score}</div>
            <div style="font-size:8.5px;color:var(--tx3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px;margin-top:3px">SCORE</div>
          </div>
        </div>
        <div>
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
            <div style="font-size:10px;color:var(--tx3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1.5px">Diagnóstico Consolidado</div>
            <span style="font-size:9.5px;color:var(--tx3);font-family:var(--font-mono);padding:2px 7px;background:var(--sf2);border:1px solid var(--bd);border-radius:4px">📅 ${cap(targetMes)}</span>
            <span style="font-size:9.5px;font-family:var(--font-mono);padding:2px 7px;border-radius:4px;${semanaInfo.parcial ? 'color:var(--amber);background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3)' : 'color:var(--green);background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25)'}">📆 ${semanaInfo.label}</span>
          </div>
          <div style="font-family:var(--font-display);font-size:26px;font-weight:800;color:${health.color};letter-spacing:-0.7px;margin-bottom:8px">${health.status}</div>
          <div style="font-size:13px;color:var(--tx2);line-height:1.6;margin-bottom:10px">${health.label}</div>
          ${health.factors.length > 0 ? `
            <div style="display:flex;flex-wrap:wrap;gap:6px">
              ${health.factors.slice(0,4).map(f => `
                <span style="padding:3px 9px;border-radius:100px;font-size:10px;font-family:var(--font-mono);background:${f.pts > 0 ? 'rgba(45,212,160,.1)' : 'rgba(229,104,95,.08)'};color:${f.pts > 0 ? 'var(--green)' : 'var(--red)'};border:1px solid ${f.pts > 0 ? 'rgba(45,212,160,.2)' : 'rgba(229,104,95,.2)'}">
                  ${f.pts > 0 ? '+' : ''}${f.pts} · ${f.txt}
                </span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>

      <!-- ═══ COMPARAÇÃO MÊS A MÊS ═══ -->
      <div style="margin-bottom:24px">
        <div class="ctitle" style="margin-bottom:14px">📊 Indicadores de Performance — ${cap(targetMes)} vs ${cap(previousMes || 'mês anterior')}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px">
          ${momCard('💰 Receita', metrics.revenue)}
          ${momCard('⚕️ Produção', momCompare(currentRevenue, previousRevenue))}
          ${momCard('💵 Lucro Líquido', metrics.profit)}
          ${momCard('% Margem', metrics.margin, true)}
          ${momCard('👥 Custo Equipe', metrics.teamCostVar)}
          ${momCard('🏢 Custo Operacional', metrics.opCostVar)}
        </div>
      </div>

      <!-- ═══ PERFORMANCE POR SETOR ═══ -->
      <div class="ctitle" style="margin-bottom:14px">🏥 Performance por Setor</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:24px">
        ${sectorCard('Clínica Médica', '🩺', sectors.clinica)}
        ${sectorCard('Internação', '🏨', sectors.inter)}
        ${sectorCard('Bloco Cirúrgico', '🔪', sectors.cirurgico)}
        ${sectorCard('Laboratório', '🧪', sectors.lab)}
      </div>

      <!-- ═══ EQUIPE & ANOMALIAS ═══ -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
        <div class="tw" style="margin-bottom:0">
          <div class="th">
            <span>🏆 Top Performers</span>
            <span>${team.totalVets} ativos</span>
          </div>
          <div class="tscroll">
            <table>
              <thead><tr><th>#</th><th>Veterinário</th><th style="text-align:right">Produção</th><th style="text-align:right">Horas</th><th style="text-align:right">% Total</th></tr></thead>
              <tbody>${topVetsHTML}</tbody>
            </table>
          </div>
        </div>
        <div class="panel" style="margin:0">
          <div class="ptl">🔍 Anomalias Detectadas <span style="font-size:10px;color:var(--tx3);font-family:var(--font-mono);font-weight:400">vs ${previousMes ? cap(previousMes) : 'mês anterior'}</span></div>
          ${anomaliesHTML}
          ${team.bottomPerformers.length > 0 ? `
            <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--bd)">
              <div style="font-size:10px;color:var(--amber);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">⚠️ Abaixo da Média (${team.bottomPerformers.length})</div>
              <div style="display:flex;flex-wrap:wrap;gap:5px">
                ${team.bottomPerformers.slice(0,5).map(([n,d]) => `
                  <span style="padding:3px 9px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:100px;font-size:10.5px;font-family:var(--font-mono);color:var(--amber)">
                    ${n.split('.')[0]} · ${fR(d.prod)}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- ═══ CUSTOS & PROJEÇÃO ═══ -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
        <div class="panel" style="margin:0">
          <div class="ptl">💸 Estrutura de Custos & Top Fornecedores</div>
          ${costPie}
          <div style="margin-top:${costPie ? '14px' : '0'};padding-top:${costPie ? '14px' : '0'};${costPie ? 'border-top:1px solid var(--bd)' : ''}">
            ${providersHTML}
          </div>
        </div>
        <div class="panel" style="margin:0">
          <div class="ptl">📅 Projeção de Fechamento do Mês</div>
          ${projHTML}
        </div>
      </div>

      ${monthHistoryHTML}

      <!-- ═══ PLANO DE AÇÃO ═══ -->
      <div style="background:var(--sf);border:1px solid var(--bd);border-radius:18px;padding:24px;margin-bottom:20px">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:20px;padding-bottom:18px;border-bottom:1px solid var(--bd)">
          <div style="width:46px;height:46px;background:var(--pink-dim);border:1px solid rgba(201,122,138,.3);border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🎯</div>
          <div style="flex:1">
            <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--tx);letter-spacing:-0.3px">Plano de Ação Prioritário</div>
            <div style="font-size:11.5px;color:var(--tx3);font-family:var(--font-mono);margin-top:3px">${actions.length} ${actions.length === 1 ? 'ação identificada' : 'ações identificadas'} · ordenado por criticidade</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            ${actions.filter(a => a.priority === 'alta').length > 0 ? `<span style="display:flex;align-items:center;gap:4px;padding:4px 9px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:100px;font-size:10px;font-family:var(--font-mono);color:var(--red)"><span style="width:6px;height:6px;background:var(--red);border-radius:50%;animation:pulse 1.5s infinite"></span>${actions.filter(a => a.priority === 'alta').length} urgente</span>` : ''}
            ${actions.filter(a => a.priority === 'media').length > 0 ? `<span style="padding:4px 9px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);border-radius:100px;font-size:10px;font-family:var(--font-mono);color:var(--amber)">${actions.filter(a => a.priority === 'media').length} importante</span>` : ''}
            ${actions.filter(a => a.priority === 'baixa').length > 0 ? `<span style="padding:4px 9px;background:rgba(45,212,160,.1);border:1px solid rgba(45,212,160,.25);border-radius:100px;font-size:10px;font-family:var(--font-mono);color:var(--green)">${actions.filter(a => a.priority === 'baixa').length} oportunidade</span>` : ''}
          </div>
        </div>
        ${actionsHTML}
      </div>

      <!-- ═══ NOTA ═══ -->
      <div style="margin-top:18px;padding:14px 18px;border-radius:10px;background:rgba(74,90,128,.08);border:1px solid rgba(74,90,128,.2);display:flex;gap:10px;align-items:flex-start;">
        <span style="font-size:16px;flex-shrink:0">💡</span>
        <div style="font-size:11px;color:var(--tx3);font-family:var(--font-mono);line-height:1.8;">
          <strong style="color:var(--tx2)">Sobre o Motor Analítico v2.0:</strong> Análise multidimensional gerada por regras heurísticas a partir dos dados carregados no sistema.
          Os insights devem ser usados como <strong style="color:var(--tx2)">ponto de partida para investigação</strong>, não como verdade absoluta. Sempre valide com o contexto real e considere fatores externos (sazonalidade, eventos locais, equipe em férias).
          <br><br>
          <strong style="color:var(--tx2)">Lembrete:</strong> exames laboratoriais são solicitados pelos médicos veterinários — o volume do setor LAB é reflexo direto da produção clínica, não uma operação independente.
        </div>
      </div>
    `;
  }, 1800);
}

// ════════════════════════════════
//  FILE LOADING & PARSING (EXCEL)
// ════════════════════════════════
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
  let col = { data:-1, cat:-1, forn:-1, val:-1, mes:-1 };

  for(let i=0; i<raw.length; i++){
    if(raw[i] && Array.isArray(raw[i])){
      let achouData = false;
      for(let j=0; j<raw[i].length; j++) {
        if(!raw[i][j]) continue;
        const norm = String(raw[i][j]).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        if(norm.includes('data')) { col.data = j; achouData = true; }
        else if(norm.includes('categoria')) col.cat = j;
        else if(norm.includes('fornecedor') || norm.includes('item')) col.forn = j;
        else if(norm.includes('valor')) col.val = j;
        else if(norm==='mes'||norm==='mês') col.mes = j;
      }
      if(achouData && col.val !== -1) { hi = i; break; }
    }
  }

  if(hi < 0 || col.val < 0){setFst('cogs','Cabeçalho "Data" ou "Valor" não encontrado.',false);return}

  const rows=[];
  for(let i=hi+1; i<raw.length; i++){
    const r=raw[i];
    if(!r || r[col.val] == null) continue;

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

    const mesRaw = col.mes >= 0 && r[col.mes] ? String(r[col.mes]).trim().toLowerCase() : '';
    const mes = mesRaw || getMes(ds);
    const cat=String(r[col.cat]||'Geral').trim();
    const forn=String(r[col.forn]||'').trim();

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
            <td style="padding:10px 12px;border-bottom:1px solid rgba(34,45,69,.4);text-align:right;font-family:var(--font-mono);font-size:12px;color:#c9a455">${d.noturna.toFixed(1)}h</td>
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
            <td style="padding:10px 12px;border-bottom:1px solid rgba(34,45,69,.4);text-align:right;font-family:var(--font-mono);color:#c9a455">${h.noturna.toFixed(1)}h</td>
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
function renderUsers(){
  document.getElementById('ulist').innerHTML=globalUsers.map((u,i)=>`
    <div class="ui-item">
      <div class="uav ${u.role==='admin'?'ua':'uv'}">${u.user[0].toUpperCase()}</div>
      <div class="uin"><div class="unm">${u.user}</div><div class="url">${u.role}</div></div>
      <button class="ebtn" onclick="editUser(${i})">editar senha</button>
      ${u.role!=='admin'?`<button class="dbtn" onclick="rmUser(${i})">remover</button>`:''}
    </div>`).join('');
}

function addUser(){
  if(S.role !== 'admin') return;
  const u=document.getElementById('nu').value.trim().toLowerCase();
  const p=document.getElementById('np').value.trim();
  const r=document.getElementById('nrole').value;

  if(!u||!p){toast('Preencha usuário e senha.','err');return}
  if(!u.includes('.')){toast('O usuário deve conter um PONTO (ex: nome.sobrenome)', 'err'); return;}
  if(globalUsers.find(x=>x.user===u)){toast('Usuário já existe.','err');return}

  globalUsers.push({user:u,pass:p,role:r});
  db.ref('laborbi/users').set(globalUsers).then(() => {
      document.getElementById('nu').value='';document.getElementById('np').value='';
      toast(`"${u}" adicionado na nuvem ✓`,'ok');
  });
}

function editUser(i){
  if(S.role !== 'admin') return;
  const u = globalUsers[i];
  if(u.role === 'admin' && S.user !== u.user){toast('Apenas o dono pode alterar sua própria senha.','err');return}
  const np = prompt(`Nova senha para ${u.user}:`, u.pass);
  if(np && np.trim()!==''){
      globalUsers[i].pass = np.trim();
      db.ref('laborbi/users').set(globalUsers).then(() => toast('Senha atualizada! ✓','ok'));
  }
}

function rmUser(i){
  if(S.role !== 'admin') return;
  if(globalUsers[i]?.role==='admin'){toast('Não é possível remover o admin.','err');return}
  globalUsers.splice(i,1);
  db.ref('laborbi/users').set(globalUsers).then(() => toast('Usuário removido da nuvem.','ok'));
}

// ════════════════════════════════
//  ADMIN UI: LOGS
// ════════════════════════════════
function renderLogs() {
  if(!globalLogs.length) {
    document.getElementById('log-list').innerHTML = '<div class="nd">Nenhum log registrado ainda.</div>';
    return;
  }
  document.getElementById('log-list').innerHTML = `
    <table class="log-table">
      <thead><tr><th>Data / Hora</th><th>Usuário</th><th>Dispositivo</th><th>Localização</th></tr></thead>
      <tbody>
        ${globalLogs.map(l => `<tr>
          <td style="color:var(--cyan);white-space:nowrap;font-family:var(--font-mono)">${l.time}</td>
          <td><strong>${l.user}</strong></td>
          <td style="font-family:var(--font-mono);font-size:11px">${l.device}</td>
          <td style="font-size:11px">${l.location}</td>
        </tr>`).join('')}
      </tbody>
    </table>
  `;
}

// ════════════════════════════════
//  TOAST
// ════════════════════════════════
function toast(msg,type='inf'){
  const t=document.getElementById('toast');
  t.textContent=msg;t.className='toast '+type+' show';
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),4000);
}

// ════════════════════════════════
//  ADMIN DASHBOARD
// ════════════════════════════════
function renderAdminDashboard(){
  if(S.role !== 'admin') return;

  // Users count
  document.getElementById('ad-users-count').textContent = globalUsers.length || '0';
  const admins = globalUsers.filter(u=>u.role==='admin').length;
  document.getElementById('ad-users-role').textContent = admins + ' admin(s) · ' + (globalUsers.length - admins) + ' viewer(s)';

  // Base data
  const baseLen = S.base ? S.base.length : 0;
  document.getElementById('ad-base-rows').textContent = baseLen ? baseLen + ' linhas' : '—';
  document.getElementById('ad-base-status').textContent = S.meta.base || 'sem dados';
  document.getElementById('fi-base-count').textContent = baseLen || '—';

  // Anal data
  let analLen = 0;
  if(S.anal){
    analLen = Object.values(S.anal).reduce((s,v) => s + (Array.isArray(v) ? v.length : 0), 0);
  }
  document.getElementById('ad-anal-rows').textContent = analLen ? analLen + ' linhas' : '—';
  document.getElementById('ad-anal-status').textContent = S.meta.anal || 'sem dados';
  document.getElementById('fi-anal-count').textContent = analLen || '—';

  // Cogs data
  const cogsLen = S.cogs ? S.cogs.length : 0;
  document.getElementById('ad-cogs-rows').textContent = cogsLen ? cogsLen + ' linhas' : '—';
  document.getElementById('ad-cogs-status').textContent = S.meta.cogs || 'sem dados';
  document.getElementById('fi-cogs-count').textContent = cogsLen || '—';

  // Escala
  document.getElementById('ad-escala-status').textContent = ES.parsed ? Object.keys(ES.parsed).length + ' profs' : '—';
  document.getElementById('ad-escala-meta').textContent = S.meta.escala || 'sem escala';

  // Last sync
  document.getElementById('ad-last-sync').textContent = S.meta.lastUpdated || '—';

  // Logs count
  document.getElementById('ad-logs-count').textContent = globalLogs.length + ' registros';
  const el = document.getElementById('ab-logs-total');
  if(el) el.textContent = globalLogs.length;

  // Health alert
  const alerts = [];
  if(baseLen === 0) alerts.push('⚠️ Base de dados vazia — faça upload do arquivo Planilha_sem_título.xlsx');
  if(analLen === 0) alerts.push('⚠️ Análises vazia — faça upload do arquivo Analises_Balneario.xlsx');
  if(cogsLen === 0) alerts.push('⚠️ Custos vazio — faça upload do arquivo Custos_Balneario.xlsx');
  const healthEl = document.getElementById('ad-health-alert');
  if(alerts.length > 0){
    healthEl.style.display = 'block';
    healthEl.style.background = 'rgba(245,158,11,.06)';
    healthEl.style.border = '1px solid rgba(245,158,11,.3)';
    healthEl.innerHTML = alerts.join('<br>');
  } else {
    healthEl.style.display = 'block';
    healthEl.style.background = 'rgba(45,212,160,.06)';
    healthEl.style.border = '1px solid rgba(45,212,160,.3)';
    healthEl.innerHTML = '✅ Sistema saudável — todos os dados carregados e sincronizados.';
  }

  // Show data preview if data exists
  const previewEl = document.getElementById('ad-data-preview');
  if(baseLen > 0 || analLen > 0 || cogsLen > 0){
    previewEl.style.display = 'block';
  }

  // Config info
  document.getElementById('cfg-admin-info').textContent = S.user || '—';
  document.getElementById('cfg-browser-info').textContent = navigator.userAgent.includes('Chrome') ? 'Chrome' :
    navigator.userAgent.includes('Firefox') ? 'Firefox' :
    navigator.userAgent.includes('Safari') ? 'Safari' : 'Outro';

  // Load saved config
  loadConfig();
}

// ════════════════════════════════
//  EXPORT / CLEAR DATA
// ════════════════════════════════
function exportAllData(){
  const data = {
    base: S.base || [],
    anal: S.anal || {},
    cogs: S.cogs || [],
    meta: S.meta || {},
    users: globalUsers.map(u=>({user:u.user,role:u.role})),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fj-analytics-backup-' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('Dados exportados com sucesso! ✓', 'ok');
}

function clearAllData(){
  if(S.role !== 'admin'){ toast('Acesso negado.','err'); return; }
  if(!confirm('⚠️ Tem certeza que deseja limpar TODOS os dados?\nEsta ação não pode ser desfeita.\n\nClique em OK para continuar.')) return;
  if(!confirm('⚠️ ÚLTIMA CONFIRMAÇÃO!\n\nTodos os dados (base, análises, custos, usuários) serão permanentemente removidos do Firebase.\n\nContinuar?')) return;

  db.ref('laborbi').remove().then(()=>{
    S.base = null; S.anal = null; S.cogs = null; S.meta = {};
    toast('Todos os dados foram limpos. ⚠️', 'err');
    renderAdminDashboard();
  }).catch(err=>toast('Erro: '+err.message,'err'));
}

function exportLogs(){
  if(!globalLogs.length){
    toast('Nenhum log para exportar.','err'); return;
  }
  const csv = 'Data/Hora,Usuário,Dispositivo,Localização\n' +
    globalLogs.map(l=>`"${l.time}","${l.user}","${l.device}","${l.location}"`).join('\n');
  const blob = new Blob([csv], {type:'text/csv'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fj-analytics-logs-' + new Date().toISOString().slice(0,10) + '.csv';
  a.click();
  URL.revokeObjectURL(url);
  toast('Logs exportados! ✓', 'ok');
}

function clearLogs(){
  if(S.role !== 'admin'){ toast('Acesso negado.','err'); return; }
  if(!confirm('Limpar todos os logs de acesso?')) return;
  db.ref('laborbi/logs').remove().then(()=>{
    globalLogs = [];
    toast('Logs limpos. ✓', 'ok');
    renderLogs();
    renderAdminDashboard();
  }).catch(err=>toast('Erro: '+err.message,'err'));
}

// ════════════════════════════════
//  PREVIEW DATA
// ════════════════════════════════
function previewData(type){
  const el = document.getElementById('ad-preview-content');
  let html = '';
  if(type === 'base'){
    const rows = (S.base || []).slice(0, 10);
    if(!rows.length){ el.innerHTML = '<span style="color:var(--tx3)">Nenhum dado na base.</span>'; return; }
    html = '<table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr>' +
      '<th style="padding:6px 8px;text-align:left;color:var(--tx3);border-bottom:1px solid var(--bd)">Vet</th>' +
      '<th style="padding:6px 8px;text-align:right;color:var(--tx3);border-bottom:1px solid var(--bd)">Prod</th>' +
      '<th style="padding:6px 8px;text-align:right;color:var(--tx3);border-bottom:1px solid var(--bd)">Mês</th>' +
      '<th style="padding:6px 8px;text-align:right;color:var(--tx3);border-bottom:1px solid var(--bd)">Sem</th></tr></thead><tbody>';
    html += rows.map(r=>`<tr>
      <td style="padding:6px 8px;border-bottom:1px solid rgba(30,45,71,.5)">${r.vet||'—'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid rgba(30,45,71,.5);text-align:right;font-family:var(--font-mono)">${fR(r.prod||0)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid rgba(30,45,71,.5);text-align:right">${r.mes||'—'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid rgba(30,45,71,.5);text-align:right">${r.sem||'—'}</td>
    </tr>`).join('');
    html += '</tbody></table>';
    html += `<div style="margin-top:8px;font-size:10px;color:var(--tx3)">Mostrando 10 de ${S.base.length} linhas</div>`;
  } else if(type === 'anal'){
    const sheets = S.anal || {};
    html = '<div style="display:flex;flex-direction:column;gap:10px">';
    for(const [k,v] of Object.entries(sheets)){
      const arr = Array.isArray(v) ? v : [];
      html += `<div style="padding:8px 10px;background:var(--sf2);border:1px solid var(--bd);border-radius:6px">
        <div style="font-size:11px;font-weight:600;color:var(--violet);margin-bottom:4px">${k} — ${arr.length} registros</div>
        ${arr.slice(0,5).map(r=>`<div style="font-size:10px;color:var(--tx2);margin-bottom:2px">• ${r.vet||'?'} | ${r.proc||'?'} | ${fR(r.valL||0)}</div>`).join('')}
        ${arr.length > 5 ? `<div style="font-size:10px;color:var(--tx3)">... e mais ${arr.length - 5} registros</div>` : ''}
      </div>`;
    }
    html += '</div>';
  } else if(type === 'cogs'){
    const rows = (S.cogs || []).slice(0, 10);
    if(!rows.length){ el.innerHTML = '<span style="color:var(--tx3)">Nenhum dado de custos.</span>'; return; }
    html = '<table style="width:100%;border-collapse:collapse;font-size:10px"><thead><tr>' +
      '<th style="padding:6px 8px;text-align:left;color:var(--tx3);border-bottom:1px solid var(--bd)">Data</th>' +
      '<th style="padding:6px 8px;text-align:left;color:var(--tx3);border-bottom:1px solid var(--bd)">Categoria</th>' +
      '<th style="padding:6px 8px;text-align:left;color:var(--tx3);border-bottom:1px solid var(--bd)">Fornecedor</th>' +
      '<th style="padding:6px 8px;text-align:right;color:var(--tx3);border-bottom:1px solid var(--bd)">Valor</th></tr></thead><tbody>';
    html += rows.map(r=>`<tr>
      <td style="padding:6px 8px;border-bottom:1px solid rgba(30,45,71,.5)">${r.data||'—'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid rgba(30,45,71,.5)"><span class="bdg bc">${r.cat||'?'}</span></td>
      <td style="padding:6px 8px;border-bottom:1px solid rgba(30,45,71,.5)">${r.forn||'—'}</td>
      <td style="padding:6px 8px;border-bottom:1px solid rgba(30,45,71,.5);text-align:right;color:var(--red);font-family:var(--font-mono)">${fR(r.val||0)}</td>
    </tr>`).join('');
    html += '</tbody></table>';
  }
  el.innerHTML = html;
}

// ════════════════════════════════
//  CONFIG MANAGEMENT
// ════════════════════════════════
function loadConfig(){
  db.ref('laborbi/config').once('value').then(snap=>{
    const cfg = snap.val() || {};
    if(cfg.hn180) document.getElementById('cfg-hn180').value = cfg.hn180;
    if(cfg.hn200) document.getElementById('cfg-hn200').value = cfg.hn200;
    if(cfg.hnot) document.getElementById('cfg-hnot').value = cfg.hnot;

    // Update global constants
    if(cfg.hn180) window.HORA_NORMAL_180 = parseFloat(cfg.hn180);
    if(cfg.hn200) window.HORA_NORMAL_200 = parseFloat(cfg.hn200);
    if(cfg.hnot) window.HORA_NOTURNA = parseFloat(cfg.hnot);

    // Fixos
    const fixosItems = document.getElementById('cfg-fixos-items');
    if(cfg.fixos){
      let html = '';
      for(const [user, val] of Object.entries(cfg.fixos)){
        html += `<div style="display:flex;gap:8px;align-items:center;padding:8px 10px;background:var(--sf2);border:1px solid var(--bd);border-radius:8px;margin-bottom:6px">
          <span style="flex:1;font-size:12px;font-family:var(--font-mono)">${user}</span>
          <span style="font-size:12px;font-family:var(--font-mono);color:var(--cyan)">${fR(val)}/mês</span>
          <button onclick="rmFixo('${user}')" style="padding:3px 8px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.3);border-radius:4px;color:var(--red);font-size:10px;cursor:pointer">✕</button>
        </div>`;
      }
      fixosItems.innerHTML = html;
    }
  });
}

function saveConfig(){
  const hn180 = parseFloat(document.getElementById('cfg-hn180').value) || 26.22;
  const hn200 = parseFloat(document.getElementById('cfg-hn200').value) || 23.60;
  const hnot = parseFloat(document.getElementById('cfg-hnot').value) || 37.79;

  db.ref('laborbi/config').update({hn180, hn200, hnot}).then(()=>{
    window.HORA_NORMAL_180 = hn180;
    window.HORA_NORMAL_200 = hn200;
    window.HORA_NOTURNA = hnot;
    const el = document.getElementById('cfg-save-status');
    el.textContent = '✓ Salvo em ' + new Date().toLocaleTimeString('pt-BR');
    el.style.color = 'var(--green)';
    toast('Configurações salvas! ✓', 'ok');
  }).catch(err=>{
    const el = document.getElementById('cfg-save-status');
    el.textContent = '✕ Erro: ' + err.message;
    el.style.color = 'var(--red)';
    toast('Erro: '+err.message,'err');
  });
}

function addFixo(){
  const user = document.getElementById('cfg-fix-user').value.trim().toLowerCase();
  const val = parseFloat(document.getElementById('cfg-fix-val').value) || 0;
  if(!user){ toast('Informe o usuário.','err'); return; }
  if(val <= 0){ toast('Informe um valor válido.','err'); return; }

  db.ref('laborbi/config/fixos/'+user).set(val).then(()=>{
    document.getElementById('cfg-fix-user').value = '';
    document.getElementById('cfg-fix-val').value = '';
    loadConfig();
    toast('Fixo mensal adicionado! ✓', 'ok');
  }).catch(err=>toast('Erro: '+err.message,'err'));
}

function rmFixo(user){
  if(!confirm('Remover fixo de '+user+'?')) return;
  db.ref('laborbi/config/fixos/'+user).remove().then(()=>{
    loadConfig();
    toast('Removido. ✓', 'ok');
  }).catch(err=>toast('Erro: '+err.message,'err'));
}

// Hook admin dashboard into the data listener
const origOnValue = db.ref('laborbi').on;
db.ref('laborbi').on('value', (snap) => {
  // Call original handler
  // (Original code continues in the original onvalue handler)
});

// Patch the existing on('value') to also call renderAdminDashboard when admin is open
const origFunc = document.getElementById('admin-view') ? window.renderAdminDashboard : null;

// Add admin dashboard refresh to the existing data listener
const adminViewObserver = new MutationObserver(()=>{
  if(document.getElementById('admin-view').style.display === 'block'){
    renderAdminDashboard();
  }
});
adminViewObserver.observe(document.getElementById('admin-view'), {attributes:true, attributeFilter:['style']});

// Also call on admin open
const origOpenAdmin = window.openAdmin;
window.openAdmin = function(){
  if (S.role !== 'admin') { toast('Acesso negado.', 'err'); return; }
  document.getElementById('hub-view').style.display = 'none';
  document.getElementById('admin-view').style.display = 'block';
  renderUsers();
  renderLogs();
  renderAdminDashboard();
};

// Ensure admin dashboard updates after data sync
setInterval(()=>{
  if(document.getElementById('admin-view').style.display === 'block'){
    renderAdminDashboard();
  }
}, 10000); // refresh every 10s when on admin

// ════════════════════════════════
//  MICRO-INTERACTIONS
// ════════════════════════════════

// Ripple effect on login button
(function(){
  var btn = document.querySelector('.login-btn');
  if (!btn) return;
  btn.addEventListener('click', function(e){
    var dot = document.createElement('span');
    dot.className = 'ripple-dot';
    var rect = btn.getBoundingClientRect();
    dot.style.left = (e.clientX - rect.left) + 'px';
    dot.style.top  = (e.clientY - rect.top)  + 'px';
    btn.appendChild(dot);
    setTimeout(function(){ dot.remove(); }, 600);
  });
})();

// Animate KPI values whenever they are updated
(function(){
  function animateKval(el){
    el.classList.remove('updated');
    void el.offsetWidth; // reflow to restart animation
    el.classList.add('updated');
  }

  // Observe kval elements for text changes
  var observer = new MutationObserver(function(mutations){
    mutations.forEach(function(m){
      if (m.target.classList && m.target.classList.contains('kval')) {
        animateKval(m.target);
      }
    });
  });

  function watchKvals(){
    document.querySelectorAll('.kval').forEach(function(el){
      observer.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  // Run once now and re-check after Firebase data arrives
  watchKvals();
  setTimeout(watchKvals, 2000);
  setTimeout(watchKvals, 5000);
})();

// Intersection Observer — re-trigger fadeSlideUp when cards scroll into view
(function(){
  if (!window.IntersectionObserver) return;
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if (e.isIntersecting) {
        var el = e.target;
        el.style.animation = 'none';
        void el.offsetWidth;
        el.style.animation = '';
        io.unobserve(el);
      }
    });
  }, { threshold: 0.12 });

  function observeCards(){
    document.querySelectorAll('.kc, .cc, .tw, .hub-module').forEach(function(el){
      io.observe(el);
    });
  }

  observeCards();
  // Re-observe after pages are revealed
  document.addEventListener('click', function(){ setTimeout(observeCards, 100); });
})();

// ════════════════════════════════════════════════════════════
//  FX ENGINE 2026 — Malha 3D (Three.js) · Liquid Glass · Reveal
//  Rede de pontos/linhas iridescente, contínua em todo o site.
//  Recua (opacidade/blur) automaticamente sobre telas com
//  tabelas e gráficos, para preservar leitura de dados.
//  Não interfere na lógica de dados/Firebase.
// ════════════════════════════════════════════════════════════
(function () {
  if (window.__fxEngineInit) return;
  window.__fxEngineInit = true;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Three.js: malha de dados iridescente em profundidade ── */
  function initFx3D() {
    var canvas = document.getElementById('fx-3d');
    if (!canvas || typeof THREE === 'undefined') return;

    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);

    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 9);

    var PALETTE = [
      new THREE.Color(0x15b8a6), // teal
      new THREE.Color(0xc9a455), // dourado fosco
      new THREE.Color(0xc97a8a)  // rosa-acinzentado
    ];

    function paletteAt(t) {
      var n = PALETTE.length;
      var f = ((t % 1) + 1) % 1 * n;
      var i = Math.floor(f);
      var frac = f - i;
      return PALETTE[i].clone().lerp(PALETTE[(i + 1) % n], frac);
    }

    /* — Núcleo: icosaedro wireframe, baixo poly, girando lentamente — */
    var coreGeo = new THREE.IcosahedronGeometry(2.3, 1);
    var coreWire = new THREE.WireframeGeometry(coreGeo);
    var coreMat = new THREE.LineBasicMaterial({ color: 0x15b8a6, transparent: true, opacity: 0.5 });
    var core = new THREE.LineSegments(coreWire, coreMat);
    scene.add(core);

    var coreGeo2 = new THREE.IcosahedronGeometry(3.6, 0);
    var coreWire2 = new THREE.WireframeGeometry(coreGeo2);
    var coreMat2 = new THREE.LineBasicMaterial({ color: 0xc9a455, transparent: true, opacity: 0.16 });
    var coreOuter = new THREE.LineSegments(coreWire2, coreMat2);
    scene.add(coreOuter);

    /* — Rede de pontos (constellation) com conexões dinâmicas — */
    var N = window.innerWidth < 760 ? 46 : 84;
    var RADIUS = 7.2;
    var pts = [];
    for (var i = 0; i < N; i++) {
      var phi = Math.acos(2 * Math.random() - 1);
      var theta = Math.random() * Math.PI * 2;
      var r = RADIUS * (0.45 + Math.random() * 0.65);
      pts.push({
        base: new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        ),
        speed: 0.06 + Math.random() * 0.10,
        offset: Math.random() * Math.PI * 2,
        amp: 0.25 + Math.random() * 0.35
      });
    }

    var pointPositions = new Float32Array(N * 3);
    var pointColors = new Float32Array(N * 3);
    var pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(pointPositions, 3));
    pointGeo.setAttribute('color', new THREE.BufferAttribute(pointColors, 3));
    var pointMat = new THREE.PointsMaterial({
      size: 0.085,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    var pointCloud = new THREE.Points(pointGeo, pointMat);
    scene.add(pointCloud);

    var MAXDIST = 2.1;
    var lineGeo = new THREE.BufferGeometry();
    var lineMaxVerts = N * 6; // estimativa segura de pares próximos
    var linePositions = new Float32Array(lineMaxVerts * 3);
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    var lineMat = new THREE.LineBasicMaterial({ color: 0x15b8a6, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending });
    var lineMesh = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lineMesh);

    /* — Parallax sutil de câmera conforme o mouse — */
    var mouseX = 0, mouseY = 0, camTX = 0, camTY = 0;
    window.addEventListener('mousemove', function (e) {
      mouseX = (e.clientX / window.innerWidth - 0.5);
      mouseY = (e.clientY / window.innerHeight - 0.5);
    }, { passive: true });

    function resize() {
      var w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', resize);
    resize();

    var clock = new THREE.Clock();
    var rafId = null;

    function renderFrame(staticOnly) {
      var t = clock.getElapsedTime();

      core.rotation.x = t * 0.07;
      core.rotation.y = t * 0.10;
      coreOuter.rotation.x = -t * 0.045;
      coreOuter.rotation.y = t * 0.06;

      var c1 = paletteAt(t * 0.025);
      var c2 = paletteAt(t * 0.025 + 0.5);
      coreMat.color.copy(c1);
      coreMat2.color.copy(c2);
      lineMat.color.copy(c1);

      for (var i = 0; i < N; i++) {
        var p = pts[i];
        var wobble = Math.sin(t * p.speed + p.offset) * p.amp;
        var px = p.base.x + wobble;
        var py = p.base.y + Math.cos(t * p.speed * 0.8 + p.offset) * p.amp;
        var pz = p.base.z + wobble * 0.6;
        pointPositions[i * 3] = px;
        pointPositions[i * 3 + 1] = py;
        pointPositions[i * 3 + 2] = pz;

        var pc = paletteAt(t * 0.03 + i * 0.01);
        pointColors[i * 3] = pc.r;
        pointColors[i * 3 + 1] = pc.g;
        pointColors[i * 3 + 2] = pc.b;
      }
      pointGeo.attributes.position.needsUpdate = true;
      pointGeo.attributes.color.needsUpdate = true;

      var vi = 0;
      for (var a = 0; a < N && vi < lineMaxVerts - 2; a++) {
        for (var b = a + 1; b < N && vi < lineMaxVerts - 2; b++) {
          var dx = pointPositions[a * 3] - pointPositions[b * 3];
          var dy = pointPositions[a * 3 + 1] - pointPositions[b * 3 + 1];
          var dz = pointPositions[a * 3 + 2] - pointPositions[b * 3 + 2];
          var d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d < MAXDIST) {
            linePositions[vi * 3] = pointPositions[a * 3];
            linePositions[vi * 3 + 1] = pointPositions[a * 3 + 1];
            linePositions[vi * 3 + 2] = pointPositions[a * 3 + 2];
            vi++;
            linePositions[vi * 3] = pointPositions[b * 3];
            linePositions[vi * 3 + 1] = pointPositions[b * 3 + 1];
            linePositions[vi * 3 + 2] = pointPositions[b * 3 + 2];
            vi++;
          }
        }
      }
      lineGeo.setDrawRange(0, vi);
      lineGeo.attributes.position.needsUpdate = true;

      camTX += ((mouseX * 1.1) - camTX) * 0.04;
      camTY += ((-mouseY * 0.8) - camTY) * 0.04;
      camera.position.x = camTX;
      camera.position.y = camTY;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);

      if (!staticOnly) rafId = requestAnimationFrame(function () { renderFrame(false); });
    }

    if (reducedMotion) {
      renderFrame(true); // um frame estático apenas — respeita preferência do usuário
    } else {
      renderFrame(false);
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) {
          if (rafId) cancelAnimationFrame(rafId);
        } else {
          renderFrame(false);
        }
      });
    }
  }

  /* ── Recuo automático da malha 3D sobre telas com tabelas/gráficos ── */
  function initFxDimming() {
    var dataViews = ['labor-view', 'cogs-view', 'insights-view', 'admin-view'];
    function check() {
      var anyDataViewVisible = dataViews.some(function (id) {
        var el = document.getElementById(id);
        return el && el.style.display !== 'none' && el.offsetParent !== null;
      });
      document.body.classList.toggle('fx-dim-3d', anyDataViewVisible);
    }
    document.addEventListener('click', function () { setTimeout(check, 30); });
    setTimeout(check, 300);
  }

  /* ── Brilho especular que acompanha o mouse dentro dos cards ── */
  function initCardGlow() {
    if (reducedMotion) return;
    document.addEventListener('mousemove', function (e) {
      var el = e.target.closest && e.target.closest('.hub-module, .cc, .kc');
      if (!el) return;
      var rect = el.getBoundingClientRect();
      var px = ((e.clientX - rect.left) / rect.width) * 100;
      var py = ((e.clientY - rect.top) / rect.height) * 100;
      el.style.setProperty('--mx', px.toFixed(1) + '%');
      el.style.setProperty('--my', py.toFixed(1) + '%');
    }, { passive: true });
  }

  /* ── Parallax muito leve no headline do hub ── */
  function initHeadlineParallax() {
    if (reducedMotion) return;
    var headline = document.querySelector('.hub-headline');
    if (!headline) return;
    document.addEventListener('scroll', function () {
      var y = window.scrollY || 0;
      headline.style.transform = 'translateY(' + Math.min(y * 0.15, 22) + 'px)';
    }, { passive: true });
  }

  /* ── Ripple sutil ao clicar em botões ── */
  function initRipple() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('button, .login-btn, .lgbtn, .nb');
      if (!btn) return;
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height);
      var ripple = document.createElement('span');
      ripple.className = 'fx-ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      var prevPos = getComputedStyle(btn).position;
      if (prevPos === 'static') btn.style.position = 'relative';
      btn.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 520);
    });
  }

  /* ── Scroll reveal com leve stagger ── */
  var revealIO = null;
  function initScrollReveal() {
    if (!window.IntersectionObserver) return;
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('fx-in');
          revealIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    tagRevealTargets();
  }

  function tagRevealTargets() {
    if (!revealIO) return;
    var groups = document.querySelectorAll('.kgrid, .hub-grid, .cgrid');
    groups.forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        if (!child.classList.contains('fx-reveal') && !child.classList.contains('fx-in')) {
          child.classList.add('fx-reveal');
          child.style.transitionDelay = (Math.min(i, 8) * 55) + 'ms';
          revealIO.observe(child);
        }
      });
    });
    document.querySelectorAll('.tw, .cc').forEach(function (el) {
      if (!el.classList.contains('fx-reveal') && !el.classList.contains('fx-in')) {
        el.classList.add('fx-reveal');
        revealIO.observe(el);
      }
    });
  }

  /* ── Transição de entrada ao trocar de view ── */
  function initViewTransitions() {
    var views = ['hub-view', 'labor-view', 'cogs-view', 'insights-view', 'admin-view'];
    var lastVisible = {};
    views.forEach(function (id) { lastVisible[id] = false; });

    function check() {
      views.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        var visible = el.style.display !== 'none' && el.offsetParent !== null;
        if (visible && !lastVisible[id]) {
          el.classList.remove('fx-view-enter');
          void el.offsetWidth;
          el.classList.add('fx-view-enter');
          setTimeout(tagRevealTargets, 50);
        }
        lastVisible[id] = visible;
      });
    }

    document.addEventListener('click', function () { setTimeout(check, 30); });
    setTimeout(check, 300);
  }

  function boot() {
    initFx3D();
    initFxDimming();
    initCardGlow();
    initHeadlineParallax();
    initRipple();
    initScrollReveal();
    initViewTransitions();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
