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
    kpiCard('Média Diária',(has&&temMes)?fR(avgDia):'—',avgDiaSub,'#34d399'),
    kpiCard('Média Diária — Mês Anterior',cmpVal,cmpSub,cmpClr),
    kpiCard('Valor Variável',has?fR(tVar):'—','comissão sobre produção','#60a5fa'),
    kpiCard('Valor Fixo',has?fR(tFixo):'—','salário + horas','#a78bfa'),
    kpiCard('Valor Total',has?fR(tTotal):'—','fixo + variável','#a78bfa'),
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
      <td style="color:#a78bfa">
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
      <td style="font-family:var(--font-mono);font-size:12px;color:#a78bfa">${fN(d.hNt)}h</td>
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
    alertEl.innerHTML = `<div style="margin:4px 0 16px;padding:12px 18px;border-radius:12px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.25);display:flex;gap:12px;align-items:center">
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
    kpiCard('Valor de Tabela', n?fR(tTab):'—', 'referência tabela', '#a78bfa'),
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
      <td style="color:#a78bfa;font-family:var(--font-mono)">${fR(d.tab)}</td>
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
    kpiCard('Valor de Tabela', n?fR(tTab):'—', 'referência tabela', '#a78bfa'),
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

  mkHBar('ch-it-vet',byV.map(([nm])=>shortName(nm)),byV.map(([,d])=>d.val),'#34d399');

  mkBar('ch-it-efic',
    byV.map(([nm])=>shortName(nm)),
    [
      {label:'Lançado',data:byV.map(([,d])=>d.val),backgroundColor:'rgba(16,185,129,.75)',borderRadius:4},
      {label:'Tabela',data:byV.map(([,d])=>d.tab),backgroundColor:'rgba(139,92,246,.5)',borderRadius:4},
    ],{yFmt:v=>'R$'+fN(v)}
  );

  mkHBar('ch-it-proc',top10P.map(([p])=>shortProc(p)),top10P.map(([,d])=>d.val),'#34d399');

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
      <td style="color:#a78bfa;font-family:var(--font-mono)">${fR(d.tab)}</td>
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
    kpiCard('Valor de Tabela', n?fR(tTab):'—', 'referência tabela', '#a78bfa'),
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
  mkHBar('ch-ci-proc',top10P.map(([p])=>shortProc(p)),top10P.map(([,d])=>d.val),'#fbbf24');

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
      <td style="color:#a78bfa;font-family:var(--font-mono)">${fR(d.tab)}</td>
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
    kpiCard('Valor Lançado', n?fR(tVal):'—', 'total laboratório', '#a78bfa'),
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
  mkHBar('ch-lb-fat',top10fat.map(([p])=>shortProc(p)),top10fat.map(([,d])=>d.val),'#a78bfa');

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
      <td style="color:#a78bfa;font-weight:600;font-family:var(--font-mono)">${d.n}</td>
      <td style="color:var(--cyan)">${fR(d.val)}</td>
      <td style="font-family:var(--font-mono)">${fR(d.n>0?d.val/d.n:0)}</td>
      <td><div class="pbar" style="width:80px;display:inline-block;vertical-align:middle"><div class="pfill" style="width:${(d.n/Math.max(...byPvol.map(([,x])=>x.n))*100).toFixed(1)}%;background:#a78bfa"></div></div> <span style="font-family:var(--font-mono);font-size:10px">${(d.n/n*100).toFixed(1)}%</span></td>
    </tr>`;
  }).join('')}</tbody></table>`;
}



// ════════════════════════════════
//  PAGE: COGS BI — DINÂMICO (lê categorias do xlsx automaticamente)
// ════════════════════════════════

// ── Grupos de categorias: mapeamento dinâmico ──
// Cada categoria do xlsx é classificada num grupo pelo nome
