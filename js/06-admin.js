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
    healthEl.style.background = 'rgba(52,211,153,.06)';
    healthEl.style.border = '1px solid rgba(52,211,153,.3)';
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
