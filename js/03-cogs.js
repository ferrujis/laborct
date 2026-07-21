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
  lab:       { color:'#22d3ee', label:'Laboratório Ext.',   icon:'🧪', camada:'cogs' },
  insumos:   { color:'#34d399', label:'Insumos e Med.',     icon:'💊', camada:'cogs' },
  facilities:{ color:'#fbbf24', label:'Facilities',         icon:'🏗️', camada:'cogs' },
  ti:        { color:'#818cf8', label:'T.I.',               icon:'💻', camada:'cogs' },
  admin:     { color:'#94a3b8', label:'Administrativo',     icon:'📋', camada:'cogs' },
  outros:    { color:'#64748b', label:'Outros',             icon:'📦', camada:'cogs' },
  // Camada 5 — Tributação
  imposto:   { color:'#fb7185', label:'Tributação',         icon:'🏛️', camada:'tribut' },
  cogs_op:   { color:'#f472b6', label:'Op. Diverso',        icon:'🏷️', camada:'cogs' },
  // Base
  receita:   { color:'#22d3ee', label:'Faturamento Bruto',  icon:'💰', camada:'receita' },
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
    kpiCard('① Faturamento Bruto',  fR(t.fatBruto),      fonteFat,                               '#22d3ee'),
    kpiCard('② Labor',              fR(t.custoLabor),    fP(t.margemLabor)+' da receita',         '#f97316'),
    kpiCard('③ COGS Total',          fR(t.custoCOGS),     fP(t.margemCOGS)+' da receita',          '#a78bfa'),
    kpiCard('  Lab. Externo',        fR(t.custoLab),      '% '+(pct(t.custoLab).toFixed(1))+'%',  '#22d3ee'),
    kpiCard('  Insumos e Med.',      fR(t.custoIns),      '% '+(pct(t.custoIns).toFixed(1))+'%',  '#34d399'),
    kpiCard('  Facilities',          fR(t.custoFac),      '% '+(pct(t.custoFac).toFixed(1))+'%',  '#fbbf24'),
    kpiCard('  T.I.',                fR(t.custoTI),       '% '+(pct(t.custoTI).toFixed(1))+'%',   '#818cf8'),
    kpiCard('④ Pré-tributação',      fR(t.preTribu),      fP(t.margemPreTribu)+' margem',          t.preTribu>=0?'#34d399':'#f87171'),
    kpiCard('⑤ Tributação',          fR(t.totalImpostos), t.impostosEstimados>0?'estimado '+((TAXA_IMPOSTO_EST*100).toFixed(0))+'%':'lançado', '#fb7185'),
    kpiCard('⑥ Lucro Líquido',       fR(t.lucroLiquido),  fP(t.margemLiquida)+' margem liq.',      t.lucroLiquido>=0?'#34d399':'#f87171'),
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
    { n:'1', label:'Faturamento Bruto',           val:t.fatBruto,      color:'#22d3ee', tipo:'receita',  indent:0 },
    // Camada 2 — Labor (com todas subcategorias)
    { n:'2', label:'(−) Labor',                   val:t.custoLabor,    color:'#f97316', tipo:'camada',   indent:0, bold:true },
    ...laborCatsSorted.filter(([,v])=>v>0).map(([cat,v]) => ({
      n:'', label:cat, val:v,
      color:'#fb923c', tipo:'sub', indent:1
    })),
    // Camada 3 — COGS com TODAS as categorias individuais
    { n:'3', label:'(−) COGS',                    val:t.custoCOGS,     color:'#a78bfa', tipo:'camada',   indent:0, bold:true },
    ...cogsCatsSorted.filter(([,v])=>v>0).map(([cat,v]) => {
      const g = getCatGroup(cat);
      const m = GROUP_META[g] || GROUP_META.outros;
      return { n:'', label:cat, val:v, color:m.color, tipo:'sub', indent:1 };
    }),
    // Camada 4 — Pré-tributação
    { n:'4', label:'(=) Pré-tributação (EBITDA)', val:t.preTribu,      color:t.preTribu>=0?'#34d399':'#f87171', tipo:'resultado', indent:0, bold:true },
    // Camada 5 — Tributação com todas subcategorias
    { n:'5', label:'(−) Tributação'+(t.impostosEstimados>0?' (est. '+(TAXA_IMPOSTO_EST*100).toFixed(0)+'%)':''), val:t.totalImpostos, color:'#fb7185', tipo:'camada', indent:0, bold:true },
    ...impostoCatsSorted.filter(([,v])=>v>0).map(([cat,v]) => ({
      n:'', label:cat, val:v, color:'#fda4af', tipo:'sub', indent:1
    })),
    // Camada 6 — Lucro Líquido
    { n:'6', label:t.lucroLiquido>=0?'(=) Lucro Líquido':'(=) Prejuízo Líquido', val:t.lucroLiquido, color:t.lucroLiquido>=0?'#34d399':'#f87171', tipo:'resultado', indent:0, bold:true },
  ];

  document.getElementById('cg-dre-visual').innerHTML = `
    <div style="background:var(--sf);border:1px solid var(--bd);border-radius:var(--radius);padding:28px;position:relative;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#22d3ee,#a78bfa,#34d399)"></div>

      <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--tx);margin-bottom:24px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="width:3px;height:18px;background:var(--violet);border-radius:2px;display:inline-block"></span>
        DRE — 6 Camadas · ${mesLabel}
        <span style="font-size:10px;font-family:var(--font-mono);padding:2px 10px;background:rgba(34,211,238,.1);color:#22d3ee;border:1px solid rgba(34,211,238,.3);border-radius:4px">📊 ${fonteFat}</span>
        ${t.impostosEstimados>0?`<span style="font-size:10px;font-family:var(--font-mono);padding:2px 10px;background:rgba(251,113,133,.1);color:#fb7185;border:1px solid rgba(251,113,133,.3);border-radius:4px">⚠️ Tributação estimada ${(TAXA_IMPOSTO_EST*100).toFixed(0)}%</span>`:''}
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
    { l:'COGS',        v:t.custoCOGS,     c:'#a78bfacc' },
    { l:'Tributação',  v:t.totalImpostos, c:'#fb7185cc' },
    { l:'Lucro Líq.',  v:Math.max(0,t.lucroLiquido), c:'#34d399cc' },
  ].filter(x=>x.v>0);
  if (donutData.length) {
    mkDonut('ch-cogs-donut', donutData.map(x=>x.l), donutData.map(x=>x.v), donutData.map(x=>x.c));
  } else killChart('ch-cogs-donut');

  // Barras: as 6 camadas
  killChart('ch-cogs-gauge');
  const ctx = document.getElementById('ch-cogs-gauge')?.getContext('2d');
  const bData = [
    { l:'Faturamento',   v:t.fatBruto,      c:'rgba(34,211,238,.85)' },
    { l:'Labor',         v:t.custoLabor,    c:'rgba(249,115,22,.85)' },
    { l:'COGS',          v:t.custoCOGS,     c:'rgba(167,139,250,.85)' },
    { l:'Pré-trib.',     v:t.preTribu,      c:t.preTribu>=0?'rgba(52,211,153,.85)':'rgba(248,113,113,.85)' },
    { l:'Tributação',    v:t.totalImpostos, c:'rgba(251,113,133,.85)' },
    { l:'Lucro Líq.',    v:t.lucroLiquido,  c:t.lucroLiquido>=0?'rgba(52,211,153,.9)':'rgba(248,113,113,.9)' },
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
    { sep:false, label:'① Faturamento Bruto',  val:t.fatBruto,   color:'#22d3ee', bold:true,  obs:fonteFat },
    // ② Labor — cada categoria
    { sep:true,  label:'② (−) Labor',           val:t.custoLabor, color:'#f97316', bold:true,  obs:'CLT + PJ + Comissão + Horistas' },
    ...laborCatsSorted.filter(([,v])=>v>0).map(([cat,v]) => ({
      sep:false, label:'    '+cat, val:v, color:'#fb923c', bold:false, obs:''
    })),
    // ③ COGS — cada categoria individual
    { sep:true,  label:'③ (−) COGS',            val:t.custoCOGS,  color:'#a78bfa', bold:true,  obs:'custos diretos da operação' },
    ...cogsCatsSorted.filter(([,v])=>v>0).map(([cat,v]) => {
      const g = getCatGroup(cat);
      const m = GROUP_META[g] || GROUP_META.outros;
      return { sep:false, label:'    '+cat, val:v, color:m.color, bold:false, obs:'' };
    }),
    { sep:true,  label:'④ (=) Pré-tributação (EBITDA)', val:t.preTribu, color:t.preTribu>=0?'#34d399':'#f87171', bold:true, obs:'faturamento − labor − cogs' },
    // ⑤ Tributação — cada imposto
    { sep:true,  label:'⑤ (−) Tributação'+(t.impostosEstimados>0?' (est. '+(TAXA_IMPOSTO_EST*100).toFixed(0)+'%)':''), val:t.totalImpostos, color:'#fb7185', bold:true, obs:t.impostosEstimados>0?'estimativa':'valores lançados' },
    ...impostoCatsSorted.filter(([,v])=>v>0).map(([cat,v]) => ({
      sep:false, label:'    '+cat, val:v, color:'#fda4af', bold:false, obs:''
    })),
    { sep:true,  label:t.lucroLiquido>=0?'⑥ (=) Lucro Líquido':'⑥ (=) Prejuízo Líquido', val:t.lucroLiquido, color:t.lucroLiquido>=0?'#34d399':'#f87171', bold:true, obs:'resultado final' },
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
    kpiCard('① Faturamento Bruto', fR(t.fatBruto),      fonteFat,                           '#22d3ee'),
    kpiCard('② Labor',             fR(t.custoLabor),    fP(t.margemLabor)+' da receita',     '#f97316'),
    kpiCard('③ COGS',              fR(t.custoCOGS),     fP(t.margemCOGS)+' da receita',      '#a78bfa'),
    kpiCard('④ Pré-tributação',    fR(t.preTribu),      fP(t.margemPreTribu)+' margem',       t.preTribu>=0?'#34d399':'#f87171'),
    kpiCard('⑤ Tributação',        fR(t.totalImpostos), t.impostosEstimados>0?'estimado '+((TAXA_IMPOSTO_EST*100).toFixed(0))+'%':'lançado', '#fb7185'),
    kpiCard('⑥ Lucro Líquido',     fR(t.lucroLiquido),  fP(t.margemLiquida)+' margem liq.',  t.lucroLiquido>=0?'#34d399':'#f87171'),
  ].join('');

  // Visual 6 camadas em cards grandes
  document.getElementById('cg-ebitda-visual').innerHTML = `
    <div style="background:var(--sf);border:1px solid var(--bd);border-radius:var(--radius);padding:28px;position:relative;overflow:hidden">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#22d3ee,#f97316,#a78bfa,#34d399,#fb7185,#34d399)"></div>
      <div style="font-family:var(--font-display);font-size:15px;font-weight:700;color:var(--tx);margin-bottom:24px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <span style="width:3px;height:18px;background:#34d399;border-radius:2px;display:inline-block"></span>
        Estrutura de 6 Camadas — ${mesLabel}
        ${t.impostosEstimados>0?`<span style="font-size:10px;font-family:var(--font-mono);padding:3px 10px;background:rgba(251,113,133,.1);color:#fb7185;border:1px solid rgba(251,113,133,.3);border-radius:4px">⚠️ Tributação estimada em ${(TAXA_IMPOSTO_EST*100).toFixed(0)}%</span>`:''}
      </div>

      <!-- Fluxo das 6 camadas — com todas categorias expandidas -->
      <div style="display:flex;flex-direction:column;gap:8px">

        <!-- ① Faturamento Bruto -->
        ${(()=>{ const p=t.fatBruto>0?100:0; return `
        <div style="display:grid;grid-template-columns:40px 1fr;align-items:stretch;gap:0;border-radius:12px;overflow:hidden;border:1px solid #22d3ee33;background:var(--bg2)">
          <div style="background:#22d3ee;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;padding:4px">①</div>
          <div style="padding:12px 18px;display:flex;justify-content:space-between;align-items:center">
            <div><div style="font-size:12px;font-weight:600;color:var(--tx)">Faturamento Bruto</div><div style="font-size:10px;font-family:var(--font-mono);color:var(--tx3)">${fonteFat}</div></div>
            <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:#22d3ee">${fR(t.fatBruto)}</div>
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
        <div style="border-radius:12px;overflow:hidden;border:1px solid #a78bfa33;background:var(--bg2)">
          <div style="display:grid;grid-template-columns:40px 1fr;align-items:center">
            <div style="background:#a78bfa;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;padding:14px 4px;align-self:stretch">③</div>
            <div style="padding:12px 18px;display:flex;justify-content:space-between;align-items:center">
              <div style="font-size:13px;font-weight:700;color:#a78bfa">(−) COGS</div>
              <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:#a78bfa">${fR(t.custoCOGS)}</div>
            </div>
          </div>
          ${cogsCatsSorted.filter(([,v])=>v>0).map(([cat,v])=>{
            const g=getCatGroup(cat);
            const m=GROUP_META[g]||GROUP_META.outros;
            const p=t.fatBruto>0?(v/t.fatBruto*100):0;
            return `<div style="display:grid;grid-template-columns:40px 1fr;border-top:1px solid rgba(167,139,250,.15)">
              <div style="background:rgba(167,139,250,.06);display:flex;align-items:center;justify-content:center">
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
        ${(()=>{ const c=t.preTribu>=0?'#34d399':'#f87171'; const p=t.fatBruto>0?Math.abs(t.preTribu/t.fatBruto*100):0; return `
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
        <div style="border-radius:12px;overflow:hidden;border:1px solid #fb718533;background:var(--bg2)">
          <div style="display:grid;grid-template-columns:40px 1fr;align-items:center">
            <div style="background:#fb7185;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:#fff;padding:14px 4px;align-self:stretch">⑤</div>
            <div style="padding:12px 18px;display:flex;justify-content:space-between;align-items:center">
              <div style="font-size:13px;font-weight:700;color:#fb7185">(−) Tributação${t.impostosEstimados>0?' (est. '+(TAXA_IMPOSTO_EST*100).toFixed(0)+'%)':''}</div>
              <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:#fb7185">${fR(t.totalImpostos)}</div>
            </div>
          </div>
          ${impostoCatsSorted.filter(([,v])=>v>0).map(([cat,v])=>{
            const p=t.fatBruto>0?(v/t.fatBruto*100):0;
            return `<div style="display:grid;grid-template-columns:40px 1fr;border-top:1px solid rgba(251,113,133,.15)">
              <div style="background:rgba(251,113,133,.06)"></div>
              <div style="padding:8px 18px;display:flex;justify-content:space-between;align-items:center">
                <div style="font-size:11.5px;font-family:var(--font-mono);color:var(--tx2)">${cat}</div>
                <div style="text-align:right">
                  <span style="font-family:var(--font-mono);font-size:12px;color:#fda4af;font-weight:600">${fR(v)}</span>
                  <span style="font-size:9.5px;font-family:var(--font-mono);color:var(--tx3);margin-left:8px">${p.toFixed(1)}%</span>
                </div>
              </div>
            </div>`;
          }).join('')}
          ${t.impostosEstimados>0?`<div style="border-top:1px solid rgba(251,113,133,.2);padding:8px 18px 8px 58px;font-size:10.5px;font-family:var(--font-mono);color:#fb7185">⚠️ Estimativa de ${(TAXA_IMPOSTO_EST*100).toFixed(0)}% sobre pré-tributação. Lance impostos no xlsx (ICMS/ISS/PIS/COFINS) para valores reais.</div>`:''}
        </div>

        <!-- ⑥ Lucro Líquido -->
        ${(()=>{ const c=t.lucroLiquido>=0?'#34d399':'#f87171'; const p=t.fatBruto>0?Math.abs(t.lucroLiquido/t.fatBruto*100):0; return `
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
      <div style="margin-top:16px;padding:12px 16px;background:rgba(251,113,133,.07);border:1px solid rgba(251,113,133,.25);border-radius:8px;font-size:11.5px;font-family:var(--font-mono);color:#fb7185;line-height:1.7">
        ⚠️ <strong>Tributação estimada:</strong> Nenhum lançamento de imposto encontrado. Usando ${(TAXA_IMPOSTO_EST*100).toFixed(0)}% sobre pré-tributação = ${fR(t.impostosEstimados)}.
        Para valores reais, adicione no xlsx com categoria <strong>ICMS / ISS / Impostos / Tributação</strong>.
      </div>`:''}
    </div>`;

  // Barras decomposição
  killChart('ch-ebitda-bar');
  const ctx1 = document.getElementById('ch-ebitda-bar')?.getContext('2d');
  const barsDecomp = [
    { l:'Labor',        v:t.custoLabor,    c:'rgba(249,115,22,.8)' },
    { l:'COGS',         v:t.custoCOGS,     c:'rgba(167,139,250,.8)' },
    { l:'Tributação',   v:t.totalImpostos, c:'rgba(251,113,133,.8)' },
    { l:'Lucro Líq.',   v:Math.max(0,t.lucroLiquido), c:'rgba(52,211,153,.8)' },
  ].filter(x=>x.v>0);
  if (ctx1 && barsDecomp.length) {
    S.charts['ch-ebitda-bar'] = new Chart(ctx1, {
      type:'bar',
      data:{ labels:['Faturamento Bruto', ...barsDecomp.map(x=>x.l)], datasets:[{
        data:[t.fatBruto,...barsDecomp.map(x=>x.v)],
        backgroundColor:['rgba(34,211,238,.85)',...barsDecomp.map(x=>x.c)],
        borderRadius:7,
      }]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}},
        scales:{ x:{ticks:{...TC},grid:{color:GC}}, y:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}} } }
    });
  }

  // Donut composição
  const pieData = [
    { l:'Labor',       v:t.custoLabor,    c:'rgba(249,115,22,.85)' },
    { l:'COGS',        v:t.custoCOGS,     c:'rgba(167,139,250,.85)' },
    { l:'Tributação',  v:t.totalImpostos, c:'rgba(251,113,133,.85)' },
    { l:'Lucro Líq.',  v:Math.max(0,t.lucroLiquido), c:'rgba(52,211,153,.85)' },
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
        { n:'①', l:'Faturamento Bruto',  c:'#22d3ee', v:t.fatBruto,      obs:fonteFat, bold:true },
        { n:'②', l:'(−) Labor',          c:'#f97316', v:-t.custoLabor,   obs:'CLT + PJ + Comissão + Horistas — LaborBI + xlsx', bold:true },
        { n:'③', l:'(−) COGS',           c:'#a78bfa', v:-t.custoCOGS,    obs:'Lab. Ext. + Insumos + Facilities + TI + Adm.', bold:true },
        { n:'④', l:'Pré-tributação',     c:t.preTribu>=0?'#34d399':'#f87171', v:t.preTribu, obs:'EBITDA — ① − ② − ③', bold:true },
        { n:'',  l:'Margem Pré-trib.',   c:'var(--tx3)', v:null, obs:fP(t.margemPreTribu), bold:false },
        { n:'⑤', l:'(−) Tributação',     c:'#fb7185', v:-t.totalImpostos, obs:t.impostosEstimados>0?'Estimativa '+((TAXA_IMPOSTO_EST*100).toFixed(0))+'% · inclua no xlsx para precisão':'Impostos lançados', bold:true },
        { n:'⑥', l:t.lucroLiquido>=0?'Lucro Líquido':'Prejuízo', c:t.lucroLiquido>=0?'#34d399':'#f87171', v:t.lucroLiquido, obs:'Resultado final — ④ − ⑤', bold:true },
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
    kpiCard('Total Facilities',fR(total),rows.length+' lançamentos','#fbbf24'),
    kpiCard('% Custos Totais',(totalGeral>0?(total/totalGeral*100):0).toFixed(1)+'%','participação','#fbbf24'),
    kpiCard('Maior Subcategoria',sortedCat.length?fR(sortedCat[0][1]):'—',sortedCat.length?sortedCat[0][0].replace('Facilities - ','').substring(0,20):'—','#fbbf24'),
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
      datasets:[{data:sorted.slice(0,12).map(([,v])=>v),backgroundColor:'rgba(251,191,36,.8)',borderRadius:5}]
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
        <td style="color:#fbbf24;font-family:var(--font-mono);font-weight:600;text-align:right">${fR(r.val)}</td>
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
    ['rgba(129,140,248,.85)','rgba(99,102,241,.85)','rgba(167,139,250,.85)']);

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
    ['rgba(249,115,22,.85)','rgba(245,158,11,.85)','rgba(251,113,133,.85)','rgba(34,211,238,.85)']);

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
    kpiCard('Impostos Lançados',fR(totalImp),rowsImp.length+' registros','#fb7185'),
    kpiCard('Outros Administrativo',fR(totalAdm),rowsAdm.length+' registros','#94a3b8'),
    kpiCard('% Custos Totais',(totalGeral>0?(total/totalGeral*100):0).toFixed(1)+'%','participação','var(--tx2)'),
  ].join('');

  killChart('ch-cogs-admin-bar');
  const ctx1=document.getElementById('ch-cogs-admin-bar')?.getContext('2d');
  if(ctx1&&sorted.length){
    S.charts['ch-cogs-admin-bar']=new Chart(ctx1,{type:'bar',data:{
      labels:sorted.slice(0,12).map(([k])=>k),
      datasets:[{data:sorted.slice(0,12).map(([,v])=>v),
        backgroundColor:sorted.slice(0,12).map(([k])=>byForn[k]&&rows.find(r=>(r.forn||r.cat)===k&&getCatGroup(r.cat)==='imposto')?'rgba(251,113,133,.8)':'rgba(148,163,184,.8)'),borderRadius:5}]
    },options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},
      scales:{x:{ticks:{...TC,callback:v=>'R$'+fN(v)},grid:{color:GC}},y:{ticks:{...TC,font:{size:10}},grid:{color:GC}}}}});
  }

  mkDonut('ch-cogs-admin-mes',['Impostos','Administrativo'],[totalImp,totalAdm],
    ['rgba(251,113,133,.85)','rgba(148,163,184,.85)']);

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
        <td style="color:${isImp?'#fb7185':'#94a3b8'};font-family:var(--font-mono);font-weight:600;text-align:right">${fR(r.val)}</td>
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
        {label:'Receita',   data:hist.map(h=>h.fat),     borderColor:'#22d3ee',backgroundColor:'rgba(34,211,238,.08)',tension:.35,pointRadius:4,fill:true},
        {label:'EBITDA',    data:hist.map(h=>h.ebitda),  borderColor:'#34d399', backgroundColor:'rgba(52,211,153,.06)',tension:.35,pointRadius:4,fill:true},
        {label:'Lucro Líq.',data:hist.map(h=>h.lucroLiq),borderColor:'#a78bfa', backgroundColor:'rgba(167,139,250,.06)',tension:.35,pointRadius:4,fill:true},
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
        {label:'Laboratório',   data:hist.map(h=>h.lab), backgroundColor:'rgba(34,211,238,.75)', stack:'a'},
        {label:'Insumos e Med.',data:hist.map(h=>h.ins), backgroundColor:'rgba(52,211,153,.75)', stack:'a'},
        {label:'Facilities',    data:hist.map(h=>h.fac), backgroundColor:'rgba(251,191,36,.75)', stack:'a'},
        {label:'T.I.',          data:hist.map(h=>h.ti),  backgroundColor:'rgba(129,140,248,.75)',stack:'a'},
        {label:'Pessoal',       data:hist.map(h=>h.pes), backgroundColor:'rgba(249,115,22,.75)', stack:'a'},
        {label:'Adm.',          data:hist.map(h=>h.adm), backgroundColor:'rgba(148,163,184,.75)',stack:'a'},
        {label:'Impostos',      data:hist.map(h=>h.imp), backgroundColor:'rgba(251,113,133,.85)',stack:'a'},
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
        {label:'Mg. EBITDA %',  data:hist.map(h=>+(h.mEbitda*100).toFixed(1)), backgroundColor:hist.map(h=>h.mEbitda>=0.2?'rgba(52,211,153,.7)':h.mEbitda>=0.1?'rgba(251,191,36,.7)':'rgba(239,68,68,.7)'),borderRadius:4},
        {label:'Mg. Líquida %', data:hist.map(h=>+(h.mLiq*100).toFixed(1)),    backgroundColor:'rgba(167,139,250,.6)',borderRadius:4},
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
        <td style="text-align:right;font-family:var(--font-mono);color:#22d3ee;font-size:11px">${fR(h.lab)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:#34d399;font-size:11px">${fR(h.ins)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:#fbbf24;font-size:11px">${fR(h.fac)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:#818cf8;font-size:11px">${fR(h.ti)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:#f97316;font-size:11px">${fR(h.pes)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:#94a3b8;font-size:11px">${fR(h.adm)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:${h.ebitda>=0?'var(--green)':'var(--red)'};font-weight:700">${fR(h.ebitda)}</td>
        <td style="text-align:right;font-family:var(--font-mono);color:#fb7185;font-size:11px">${fR(h.impTotal)}</td>
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
