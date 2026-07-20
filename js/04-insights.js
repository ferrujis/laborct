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
  else if (score >= 30) { status = 'Crítico'; color = '#f87171'; label = 'Ação imediata necessária'; }
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
  // IMPORTANTE: soma apenas Larissa/Vitor — são os únicos cujo valor cirúrgico
  // foi DEDUZIDO do 'prod' base em getAdjustedBase(). Somar de todos os vets
  // duplicava a receita cirúrgica dos demais (já incluída no 'prod' bruto).
  function getCirByMes(mes) {
    if (!mes) return 0;
    const cirRows = (S.anal && S.anal['C_CIRURGICO']) || [];
    return cirRows
      .filter(r => r.mes === mes && (r.vet === 'larissa.iozzi' || r.vet === 'vitor.tridapalli'))
      .reduce((s, r) => s + (r.valL || 0), 0);
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
function generateInsights(mesEscolhido) {
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

    // Se o usuário escolheu um mês manualmente no seletor, usa-o diretamente
    if (mesEscolhido && allMeses.includes(mesEscolhido)) {
      targetMes = mesEscolhido;
      previousMes = MESES.indexOf(targetMes) > 1 ? MESES[MESES.indexOf(targetMes) - 1] : null;
    }

    let baseTarget = filterByMes(baseRowsAll, targetMes);
    let cogsTarget = filterByMes(cogsRowsAll, targetMes);

    // Fallbacks automáticos só se o mês não foi escolhido manualmente
    if (!mesEscolhido) {
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
    // IMPORTANTE: soma apenas Larissa/Vitor — são os únicos cujo valor cirúrgico
    // foi DEDUZIDO do 'prod' base em getAdjustedBase(). Somar de todos os vets
    // duplicava a receita cirúrgica dos demais (já incluída no 'prod' bruto),
    // inflando a "Receita Total" do InsightsAI acima do valor real do Labor/COGS BI.
    function getCirurgicoByMes(mes) {
      if (!mes) return 0;
      const cirRows = (S.anal && S.anal['C_CIRURGICO']) || [];
      return cirRows
        .filter(x => x.mes === mes && (x.vet === 'larissa.iozzi' || x.vet === 'vitor.tridapalli'))
        .reduce((s, r) => s + (r.valL || 0), 0);
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
      const bg = a.type === 'high' ? 'rgba(52,211,153,.05)' : 'rgba(248,113,113,.05)';
      const border = a.type === 'high' ? 'rgba(52,211,153,.25)' : 'rgba(248,113,113,.25)';
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
        baixa: {bg:'rgba(52,211,153,.15)', fg:'var(--green)', border:'rgba(52,211,153,.35)'}
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
      <div style="text-align:center;padding:30px 20px;background:rgba(52,211,153,.05);border:1px solid rgba(52,211,153,.2);border-radius:10px">
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
        <div style="margin-bottom:14px;padding:10px 14px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.25);border-radius:10px;display:flex;align-items:center;gap:10px">
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
          <div style="width:42px;height:42px;background:var(--cyan-dim);border:1px solid rgba(34,211,238,.3);border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">📅</div>
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
                <tr style="background:${m.isCurrent ? 'rgba(34,211,238,.04)' : 'transparent'}">
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
                <span style="padding:3px 9px;border-radius:100px;font-size:10px;font-family:var(--font-mono);background:${f.pts > 0 ? 'rgba(52,211,153,.1)' : 'rgba(248,113,113,.08)'};color:${f.pts > 0 ? 'var(--green)' : 'var(--red)'};border:1px solid ${f.pts > 0 ? 'rgba(52,211,153,.2)' : 'rgba(248,113,113,.2)'}">
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
          <div style="width:46px;height:46px;background:var(--pink-dim);border:1px solid rgba(251,113,133,.3);border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">🎯</div>
          <div style="flex:1">
            <div style="font-family:var(--font-display);font-size:18px;font-weight:700;color:var(--tx);letter-spacing:-0.3px">Plano de Ação Prioritário</div>
            <div style="font-size:11.5px;color:var(--tx3);font-family:var(--font-mono);margin-top:3px">${actions.length} ${actions.length === 1 ? 'ação identificada' : 'ações identificadas'} · ordenado por criticidade</div>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            ${actions.filter(a => a.priority === 'alta').length > 0 ? `<span style="display:flex;align-items:center;gap:4px;padding:4px 9px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.25);border-radius:100px;font-size:10px;font-family:var(--font-mono);color:var(--red)"><span style="width:6px;height:6px;background:var(--red);border-radius:50%;animation:pulse 1.5s infinite"></span>${actions.filter(a => a.priority === 'alta').length} urgente</span>` : ''}
            ${actions.filter(a => a.priority === 'media').length > 0 ? `<span style="padding:4px 9px;background:rgba(245,158,11,.1);border:1px solid rgba(245,158,11,.25);border-radius:100px;font-size:10px;font-family:var(--font-mono);color:var(--amber)">${actions.filter(a => a.priority === 'media').length} importante</span>` : ''}
            ${actions.filter(a => a.priority === 'baixa').length > 0 ? `<span style="padding:4px 9px;background:rgba(52,211,153,.1);border:1px solid rgba(52,211,153,.25);border-radius:100px;font-size:10px;font-family:var(--font-mono);color:var(--green)">${actions.filter(a => a.priority === 'baixa').length} oportunidade</span>` : ''}
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
