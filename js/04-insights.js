// ════════════════════════════════
//  INSIGHTS AI — MOTOR v2.2
//  (com análise semanal baseada no dia do mês)
// ════════════════════════════════

// ── UTILITY: número da semana a partir da data (baseado no DIA do mês) ──
function weekNumFromDateStr(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d)) return '';
    const day = d.getDate(); // dia do mês (1-31)
    if (day <= 7) return '1';
    if (day <= 14) return '2';
    if (day <= 21) return '3';
    return '4';
  } catch (_) { return ''; }
}

// ── UTILITY: extrair número da semana de "Semana 1" ou "1" ──
function extractWeekNumber(weekStr) {
  if (!weekStr) return null;
  const cleaned = String(weekStr).trim();
  const match = cleaned.match(/\d+/);
  if (match) return parseInt(match[0], 10);
  if (/^\d+$/.test(cleaned)) return parseInt(cleaned, 10);
  return null;
}

// ── UTILITY: formatar número da semana para exibição ──
function formatWeekNumber(num) {
  if (!num) return '';
  return `Semana ${num}`;
}

// ── HELPER: comparação mês a mês ──
function momCompare(current, previous) {
  if (previous === 0 || previous === undefined || previous === null) {
    return { current, previous: previous || 0, change: current, variation: 0, trend: current > 0 ? 'up' : 'flat' };
  }
  const change = current - previous;
  const variation = (change / Math.abs(previous)) * 100;
  return { current, previous, change, variation, trend: change > 0.001 ? 'up' : change < -0.001 ? 'down' : 'flat' };
}

// ── HELPER: classificar custo ──
function classifyCogsRow(r) {
  const cn = r.cat.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (cn.includes('faturamento') || cn.includes('receita')) return 'revenue';
  if (cn.includes('vet') || cn.includes('clt') || cn.includes('equipe') || cn.includes('medico') || cn.includes('comissao')) return 'team';
  return 'operational';
}

function sumCogsBy(rows, type) {
  return rows.filter(r => classifyCogsRow(r) === type).reduce((s, r) => s + r.val, 0);
}

// ── HELPER: filtra linhas por mês + (opcionalmente) semana(s) ──
// wk pode ser: null/'' (sem filtro), "1" (uma semana) ou "1,3" (várias semanas)
function filterRowsByMesAndWeeks(rows, mes, wk) {
  let res = (rows || []).filter(r => r.mes === mes);
  if (!wk) return res;
  const wkNums = String(wk).split(',').map(s => extractWeekNumber(s)).filter(n => n !== null);
  if (!wkNums.length) return res;
  return res.filter(r => {
    const semVal = r.sem || r.Semana || '';
    if (semVal) {
      const semNum = extractWeekNumber(semVal);
      if (semNum !== null) return wkNums.includes(semNum);
    }
    if (r.data) {
      try {
        const wn = weekNumFromDateStr(r.data);
        if (wn) return wkNums.includes(parseInt(wn, 10));
      } catch (e) { return false; }
    }
    return false;
  });
}

// ── HELPER: análise de setor (com semana baseada no dia do mês) ──
function analyzeSector(sheet, targetMes, previousMes, weekKey, prevWeekKey) {
  if (!S.anal || !S.anal[sheet]) return {
    revenue: 0, previousRevenue: 0, count: 0, efficiency: 0,
    variation: momCompare(0, 0),
    weekVariation: momCompare(0, 0),
    topProc: null, topVet: null, topVetProd: 0
  };

  const target = filterRowsByMesAndWeeks(S.anal[sheet], targetMes, weekKey);
  const previous = previousMes ? filterRowsByMesAndWeeks(S.anal[sheet], previousMes, weekKey) : [];
  const prevWeek = prevWeekKey ? filterRowsByMesAndWeeks(S.anal[sheet], targetMes, prevWeekKey) : [];

  const tRev = target.reduce((s, r) => s + r.valL, 0);
  const tTab = target.reduce((s, r) => s + r.valT, 0);
  const pRev = previous.reduce((s, r) => s + r.valL, 0);
  const pwRev = prevWeek.reduce((s, r) => s + r.valL, 0);

  const pMap = {};
  target.forEach(r => {
    if (!r.proc) return;
    if (!pMap[r.proc]) pMap[r.proc] = { val: 0, n: 0 };
    pMap[r.proc].val += r.valL; pMap[r.proc].n++;
  });
  const procList = Object.entries(pMap).sort((a, b) => b[1].val - a[1].val);

  const vMap = {};
  target.forEach(r => {
    if (!r.vet) return;
    if (!vMap[r.vet]) vMap[r.vet] = 0;
    vMap[r.vet] += r.valL;
  });
  const vetList = Object.entries(vMap).sort((a, b) => b[1] - a[1]);

  return {
    revenue: tRev,
    previousRevenue: pRev,
    count: target.length,
    efficiency: tTab > 0 ? tRev / tTab : 0,
    variation: momCompare(tRev, pRev),
    weekVariation: momCompare(tRev, pwRev),
    prevWeekRevenue: pwRev,
    topProc: procList[0] || null,
    topVet: vetList[0] ? vetList[0][0] : null,
    topVetProd: vetList[0] ? vetList[0][1] : 0
  };
}

// ── HELPER: health score composto ──
function calculateHealthScore(metrics, team, costs, anomalies) {
  let score = 100;
  const factors = [];

  if (metrics.margin.current < 0) { score -= 40; factors.push({ pts: -40, txt: 'Margem negativa (prejuízo)' }); }
  else if (metrics.margin.current < 0.10) { score -= 25; factors.push({ pts: -25, txt: 'Margem baixa (<10%)' }); }
  else if (metrics.margin.current < 0.20) { score -= 12; factors.push({ pts: -12, txt: 'Margem moderada (<20%)' }); }
  else if (metrics.margin.current >= 0.30) { score += 5; factors.push({ pts: +5, txt: 'Margem excelente (≥30%)' }); }

  if (metrics.revenue.trend === 'down') {
    const drop = Math.min(20, Math.abs(metrics.revenue.variation) / 2);
    score -= drop; factors.push({ pts: -drop, txt: `Queda de receita (${Math.abs(metrics.revenue.variation).toFixed(1)}%)` });
  } else if (metrics.revenue.variation > 15) {
    score += 5; factors.push({ pts: +5, txt: `Crescimento forte (+${metrics.revenue.variation.toFixed(1)}%)` });
  }

  if (costs.teamRatio > 0.55) { score -= 15; factors.push({ pts: -15, txt: 'Custo de equipe crítico (>55%)' }); }
  else if (costs.teamRatio > 0.45) { score -= 8; factors.push({ pts: -8, txt: 'Custo de equipe elevado (>45%)' }); }

  if (costs.opRatio > 0.35) { score -= 15; factors.push({ pts: -15, txt: 'Custo operacional crítico (>35%)' }); }
  else if (costs.opRatio > 0.25) { score -= 7; factors.push({ pts: -7, txt: 'Custo operacional elevado (>25%)' }); }

  if (team.dependence > 45) { score -= 15; factors.push({ pts: -15, txt: 'Dependência crítica de um profissional' }); }
  else if (team.dependence > 30) { score -= 8; factors.push({ pts: -8, txt: 'Concentração moderada de receita' }); }

  const anPts = Math.min(10, anomalies.length * 2);
  if (anPts > 0) { score -= anPts; factors.push({ pts: -anPts, txt: `${anomalies.length} anomalia(s) detectada(s)` }); }

  if (team.totalVets < 3 && team.totalVets > 0) { score -= 5; factors.push({ pts: -5, txt: 'Equipe pequena (<3 vets ativos)' }); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  let status, color, label;
  if (score >= 85) { status = 'Excelente'; color = 'var(--green)'; label = 'Operação em ótimo estado'; }
  else if (score >= 70) { status = 'Saudável'; color = 'var(--cyan)'; label = 'Operação saudável com pequenos ajustes'; }
  else if (score >= 50) { status = 'Atenção'; color = 'var(--amber)'; label = 'Pontos críticos precisam de ação'; }
  else if (score >= 30) { status = 'Crítico'; color = '#f87171'; label = 'Ação imediata necessária'; }
  else { status = 'Emergência'; color = 'var(--red)'; label = 'Risco operacional elevado'; }

  return { score, status, color, label, factors };
}

// ── HELPER: gerar plano de ação ──
function generateActionPlan(metrics, sectors, team, costs, anomalies, targetMes) {
  const actions = [];

  if (metrics.revenue.trend === 'down' && Math.abs(metrics.revenue.variation) > 8) {
    actions.push({
      priority: 'alta', icon: '📉', title: 'Plano de Recuperação de Receita',
      desc: `Faturamento caiu ${Math.abs(metrics.revenue.variation).toFixed(1)}% em ${targetMes}. Acione reativação de clientes inativos, intensifique divulgação de serviços de alta demanda e revise a tabela de preços da concorrência.`,
      impact: 'Alto', effort: '2-4 semanas'
    });
  }

  if (metrics.revenue.variation > 15) {
    actions.push({
      priority: 'baixa', icon: '🚀', title: 'Capitalizar Crescimento',
      desc: `Faturamento cresceu ${metrics.revenue.variation.toFixed(1)}%. Momento ideal para investir em marketing, expandir equipe ou abrir novos horários. Cuidado para não saturar a operação atual.`,
      impact: 'Alto', effort: 'Imediato'
    });
  }

  Object.entries(sectors).forEach(([key, sec]) => {
    if (sec.weekVariation && sec.weekVariation.trend === 'down' && Math.abs(sec.weekVariation.variation) > 20 && sec.revenue > 1000) {
      const nomeSetor = { clinica: 'Clínica', inter: 'Internação', cirurgico: 'Cirúrgico', lab: 'Laboratório' }[key] || key;
      actions.push({
        priority: 'media',
        icon: '📉',
        title: `Queda semanal no setor ${nomeSetor}`,
        desc: `O setor ${nomeSetor} caiu ${Math.abs(sec.weekVariation.variation).toFixed(1)}% em relação à semana anterior. Investigue causas: faltas, feriados, mudanças na equipe ou demanda sazonal.`,
        impact: 'Médio',
        effort: 'Imediato'
      });
    }
  });

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

  if (team.dependence > 30 && team.topPerformers.length > 0) {
    actions.push({
      priority: team.dependence > 45 ? 'alta' : 'media', icon: '⚠️', title: 'Reduzir Concentração de Receita',
      desc: `${team.topPerformers[0][0]} é responsável por ${team.dependence.toFixed(1)}% da receita. Risco operacional se este profissional sair. Invista em cross-training, documente processos-chave e crie campanhas para outros veterinários.`,
      impact: 'Alto', effort: '1-3 meses'
    });
  }

  if (team.bottomPerformers.length > 0) {
    const names = team.bottomPerformers.slice(0, 3).map(([n]) => n.split('.')[0]).join(', ');
    actions.push({
      priority: 'media', icon: '📚', title: 'Plano de Desenvolvimento Individual',
      desc: `${team.bottomPerformers.length} profissional(is) produzindo abaixo de 50% da média (${names}). Agende 1-on-1 para entender bloqueios, ofereça mentoria com top performer e revise a carteira de clientes designados.`,
      impact: 'Médio', effort: 'Mensal'
    });
  }

  ['clinica', 'inter', 'cirurgico', 'lab'].forEach((key, i) => {
    const names = ['Clínica Médica', 'Internação', 'Bloco Cirúrgico', 'Laboratório'];
    const sec = sectors[key];
    if (sec.variation.trend === 'down' && Math.abs(sec.variation.variation) > 15 && sec.revenue > 0) {
      actions.push({
        priority: 'media', icon: '🏥', title: `Reativar ${names[i]}`,
        desc: `${names[i]} caiu ${Math.abs(sec.variation.variation).toFixed(1)}% vs mês anterior. Avaliar follow-up pós-consulta, parcerias externas (petshops, ONGs) e revisar capacidade/horários disponíveis.`,
        impact: 'Médio', effort: '2-4 semanas'
      });
    }
  });

  if (sectors.clinica.efficiency > 0 && sectors.clinica.efficiency < 0.7 && sectors.clinica.revenue > 5000) {
    actions.push({
      priority: 'baixa', icon: '💵', title: 'Revisar Tabela de Preços',
      desc: `Eficiência de ${(sectors.clinica.efficiency * 100).toFixed(1)}% na clínica indica preços abaixo da tabela. Analisar principais procedimentos e reajustar valores defasados.`,
      impact: 'Médio', effort: '1 semana'
    });
  }

  const totalHoras = team.totalHoras || 0;
  const avgHoras = team.totalVets > 0 ? totalHoras / team.totalVets : 0;
  if (avgHoras > 200) {
    actions.push({
      priority: 'media', icon: '⏰', title: 'Atenção à Sobrecarga',
      desc: `Média de ${avgHoras.toFixed(0)}h/veterinário/mês. Acima de 200h aumenta risco de burnout e erros. Avaliar contratação, banco de horas ou redistribuição de demanda.`,
      impact: 'Médio', effort: '1-2 meses'
    });
  }

  const positiveAnomaly = anomalies.find(a => a.type === 'high');
  if (positiveAnomaly) {
    actions.push({
      priority: 'baixa', icon: '🌟', title: `Reconhecer ${positiveAnomaly.vet.split('.')[0]}`,
      desc: `Produção ${positiveAnomaly.deviation}% acima da média. Considere bonificação, destaque em reunião de equipe ou novos desafios (liderança de projeto, mentoria).`,
      impact: 'Médio', effort: 'Imediato'
    });
  }

  if (metrics.margin.current > 0 && metrics.margin.current < 0.15 && metrics.revenue.current > 50000) {
    actions.push({
      priority: 'media', icon: '📊', title: 'Otimizar Estrutura de Custos',
      desc: `Margem de ${(metrics.margin.current * 100).toFixed(1)}% abaixo do ideal (>20%). Revisar contratos com fornecedores, automatizar processos repetitivos e renegociar prazos com clientes-chave.`,
      impact: 'Alto', effort: '1-3 meses'
    });
  }

  if (metrics.margin.current >= 0.30) {
    actions.push({
      priority: 'baixa', icon: '💎', title: 'Janela de Investimento',
      desc: `Margem de ${(metrics.margin.current * 100).toFixed(1)}% permite investir com segurança. Considere novos equipamentos, treinamento avançado da equipe ou expansão de serviços.`,
      impact: 'Alto', effort: 'Planejamento'
    });
  }

  const order = { alta: 0, media: 1, baixa: 2 };
  actions.sort((a, b) => order[a.priority] - order[b.priority]);
  return actions;
}

// ── HELPER: projeção baseada nos dados do próprio mês-alvo ──
function projectMonthFromData(rows, currentRevenue, currentProfit, targetMes) {
  if (!rows || !rows.length) return null;

  const monthIdx = MESES.indexOf(targetMes);
  if (monthIdx < 1) return null;

  const _hoje = new Date();
  const _mesCorrenteIdx = _hoje.getMonth() + 1;
  const _anoCorrente = _hoje.getFullYear();
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
      projectedRevenue: currentRevenue,
      projectedProfit: currentProfit,
      dailyAverage: _totalDays ? currentRevenue / _totalDays : 0
    };
  }

  const jsMonthIdx = monthIdx - 1;
  const mRows = rows.filter(r => r.mes === targetMes);
  const allDates = mRows.map(r => r.data).filter(d => d).sort();

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

  const isCurrentCalendarMonth = (year === _anoCorrente && monthIdx === _mesCorrenteIdx);
  const calendarDay = isCurrentCalendarMonth ? _hoje.getDate() : dataLatestDay;
  const latestDay = Math.min(Math.max(dataLatestDay, calendarDay), totalDays);

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

  const dataProgress = Math.max(0.05, dataLatestDay / totalDays);
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

// ── HELPER: histórico mês a mês ──
function buildMonthHistory(baseRowsAll, cogsRowsAll) {
  function getRealMes(r) { return r.mes || ''; }

  const mesesSet = [...new Set([
    ...baseRowsAll.map(getRealMes),
    ...cogsRowsAll.map(getRealMes)
  ])].filter(Boolean);

  const meses = mesesSet.sort((a, b) => MESES.indexOf(a) - MESES.indexOf(b));

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
    const baseProd = mBase.reduce((s, r) => s + (r.prod || 0), 0);
    const cirProd = getCirByMes(m);
    const rev = baseProd + cirProd;
    const teamCost = mCogs.filter(r => classifyCogsRow(r) === 'team').reduce((s, r) => s + r.val, 0)
      || mBase.reduce((s, r) => s + r.valTotal, 0);
    const opCost = mCogs.filter(r => classifyCogsRow(r) === 'operational').reduce((s, r) => s + r.val, 0);
    const cost = teamCost + opCost;
    const profit = rev - cost;
    const margin = rev > 0 ? profit / rev : 0;
    return { mes: m, rev, profit, margin, cost, teamCost, opCost, rows: mBase.length };
  });
}

// ════════════════════════════════
//  FILTRO DO TOPO: mês + semana(s) múltiplas
// ════════════════════════════════

let selectedWeeksMulti = []; // semanas marcadas no dropdown, ex: ['1','3']

function getAvailableWeeksForMes(mes) {
  if (!mes) return [];
  const base = getAdjustedBase();
  const raw = [...new Set(base.filter(r => r.mes === mes).map(r => r.sem || r.Semana || '').filter(Boolean))];
  const nums = raw.map(s => extractWeekNumber(s)).filter(n => n !== null);
  return [...new Set(nums)].sort((a, b) => a - b);
}

function onInsightsMesChange() {
  const mes = document.getElementById('insights-mes-select')?.value || null;
  populateInsightsWeekMulti(mes);
  generateInsights(mes, null);
}

function populateInsightsWeekMulti(mes) {
  const btn = document.getElementById('insights-week-multibtn');
  const dropdown = document.getElementById('insights-week-dropdown');
  const label = document.getElementById('insights-week-multilabel');
  if (!btn || !dropdown || !label) return;

  selectedWeeksMulti = [];
  dropdown.innerHTML = '';
  dropdown.style.display = 'none';
  label.textContent = 'Todas as semanas';

  if (!mes) { btn.disabled = true; return; }

  const weeks = getAvailableWeeksForMes(mes);
  if (!weeks.length) { btn.disabled = true; return; }

  btn.disabled = false;
  const itemsHtml = weeks.map(function (w) {
    return '<label style="display:flex;align-items:center;gap:8px;padding:9px 14px;cursor:pointer;font-family:var(--font-mono);font-size:12px;color:var(--tx2);white-space:nowrap" onmouseover="this.style.background=\'rgba(255,255,255,.06)\'" onmouseout="this.style.background=\'transparent\'">' +
      '<input type="checkbox" value="' + w + '" onchange="onWeekMultiToggle()" style="accent-color:var(--pink);cursor:pointer">' +
      ' Semana ' + w +
      '</label>';
  }).join('');
  dropdown.innerHTML = itemsHtml;
}

function onWeekMultiToggle() {
  const dropdown = document.getElementById('insights-week-dropdown');
  const label = document.getElementById('insights-week-multilabel');
  if (!dropdown || !label) return;
  const checked = Array.from(dropdown.querySelectorAll('input[type=checkbox]:checked')).map(c => c.value);
  selectedWeeksMulti = checked;
  if (!checked.length) label.textContent = 'Todas as semanas';
  else if (checked.length === 1) label.textContent = 'Semana ' + checked[0];
  else label.textContent = checked.length + ' semanas selecionadas';

  const mes = document.getElementById('insights-mes-select')?.value || null;
  generateInsights(mes, checked.length ? checked.join(',') : null);
}

function toggleWeekDropdown() {
  const dropdown = document.getElementById('insights-week-dropdown');
  const btn = document.getElementById('insights-week-multibtn');
  if (!dropdown || (btn && btn.disabled)) return;
  dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

document.addEventListener('click', function (e) {
  const dropdown = document.getElementById('insights-week-dropdown');
  const btn = document.getElementById('insights-week-multibtn');
  if (!dropdown || !btn) return;
  if (dropdown.style.display === 'block' && !dropdown.contains(e.target) && e.target !== btn) {
    dropdown.style.display = 'none';
  }
});

// ════════════════════════════════
//  FUNÇÃO PRINCIPAL: generateInsights
// ════════════════════════════════
function generateInsights(mesEscolhido, semEscolhido) {
  const content = document.getElementById('ai-content');

  if (!S.base || !S.base.length) {
    content.innerHTML = '<div class="nd"><div class="nd-i">❌</div>Sem dados para analisar. Carregue as planilhas primeiro no Admin Center.</div>';
    return;
  }

  const stages = [
    { pct: 18, label: 'Coletando dados do período...', icon: '📊' },
    { pct: 36, label: 'Calculando variações mensais...', icon: '📈' },
    { pct: 54, label: 'Analisando performance por setor...', icon: '🏥' },
    { pct: 72, label: 'Detectando anomalias e padrões...', icon: '🔍' },
    { pct: 88, label: 'Cruzando benchmarks internos...', icon: '🎯' },
    { pct: 100, label: 'Gerando recomendações...', icon: '🧠' }
  ];

  content.innerHTML = `
    <div style="text-align:center; padding: 48px 20px;">
      <div style="position:relative;width:84px;height:84px;margin:0 auto 22px">
        <div style="position:absolute;inset:0;border:3px solid var(--bd);border-top-color:var(--pink);border-radius:50%;animation: spin 1s linear infinite"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:34px">🧠</div>
      </div>
      <div style="color:var(--pink);font-family:var(--font-display);font-weight:700;font-size:18px;margin-bottom:6px">Motor Analítico v2.2</div>
      <div style="color:var(--tx3);font-size:12px;font-family:var(--font-mono);margin-bottom:22px">Análise multidimensional com suporte a semanas</div>
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

  setTimeout(() => {
    clearInterval(stageInterval);
    progressEl.style.width = '100%';
    stageEl.textContent = '✓ Análise completa';

    // ===== 1. Determinar período-alvo =====
    const hoje = new Date();
    const diaAtual = hoje.getDate();
    const mesAtualIdx = hoje.getMonth() + 1;
    let targetMes = MESES[mesAtualIdx] || '';
    let previousMes = null;
    if (MESES.indexOf(targetMes) > 1) previousMes = MESES[MESES.indexOf(targetMes) - 1];

    function filterByMes(rows, mes) {
      if (!mes) return rows;
      return rows.filter(r => r.mes === mes);
    }

    let baseRowsAll = getAdjustedBase();
    let cogsRowsAll = S.cogs || [];

    const allMeses = [...new Set([
      ...baseRowsAll.map(r => r.mes).filter(Boolean),
      ...cogsRowsAll.map(r => r.mes).filter(Boolean)
    ])].filter(Boolean).sort((a, b) => MESES.indexOf(a) - MESES.indexOf(b));

    if (mesEscolhido && allMeses.includes(mesEscolhido)) {
      targetMes = mesEscolhido;
      previousMes = MESES.indexOf(targetMes) > 1 ? MESES[MESES.indexOf(targetMes) - 1] : null;
    }

    let baseTarget = filterByMes(baseRowsAll, targetMes);
    let cogsTarget = filterByMes(cogsRowsAll, targetMes);

    // Normaliza a(s) semana(s) selecionada(s): "Semana 1", "1" ou "1,2" para múltiplas
    let selectedWeek = semEscolhido || '';
    let selectedWeeksArr = [];
    if (selectedWeek) {
      selectedWeeksArr = String(selectedWeek).split(',').map(s => extractWeekNumber(s)).filter(n => n !== null);
      selectedWeek = selectedWeeksArr.length ? selectedWeeksArr.join(',') : '';
    }

    // Semana anterior intra-mês (só quando exatamente 1 semana está selecionada)
    let prevWeekKey = null;
    if (selectedWeeksArr.length === 1) {
      const wkNum = selectedWeeksArr[0];
      if (wkNum > 1) {
        prevWeekKey = String(wkNum - 1);
        const hasPrevWeek = baseRowsAll.some(r => r.mes === targetMes && extractWeekNumber(r.sem || r.Semana || '') === wkNum - 1);
        if (!hasPrevWeek) prevWeekKey = null;
      }
    }

    if (selectedWeeksArr.length) {
      baseTarget = baseTarget.filter(r => selectedWeeksArr.includes(extractWeekNumber(r.sem || r.Semana || '')));
      cogsTarget = cogsTarget.filter(r => selectedWeeksArr.includes(extractWeekNumber(r.sem || r.Semana || '')));
    }

    if (!mesEscolhido) {
      if (diaAtual <= 10 && !baseTarget.length && !cogsTarget.length && allMeses.length) {
        targetMes = allMeses[allMeses.length - 1];
        previousMes = MESES.indexOf(targetMes) > 1 ? MESES[MESES.indexOf(targetMes) - 1] : null;
        baseTarget = filterByMes(baseRowsAll, targetMes);
        cogsTarget = filterByMes(cogsRowsAll, targetMes);
      } else if (!baseTarget.length && !cogsTarget.length && allMeses.length) {
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

    let basePrevious = previousMes ? filterByMes(baseRowsAll, previousMes) : [];
    let cogsPrevious = previousMes ? filterByMes(cogsRowsAll, previousMes) : [];
    if (selectedWeeksArr.length) {
      basePrevious = basePrevious.filter(r => selectedWeeksArr.includes(extractWeekNumber(r.sem || r.Semana || '')));
      cogsPrevious = cogsPrevious.filter(r => selectedWeeksArr.includes(extractWeekNumber(r.sem || r.Semana || '')));
    }

    const totalSemanas = getNumSemanas(targetMes);
    const semanaAtual = getSemanaAtual(targetMes);
    const mesEhCorrente = (MES_IDX[targetMes] === (new Date().getMonth() + 1));
    const periodoParcial = mesEhCorrente && (semanaAtual < totalSemanas);
    const semanaLabelTxt = selectedWeeksArr.length > 1
      ? `Semanas ${selectedWeeksArr.join(', ')}`
      : selectedWeeksArr.length === 1
        ? `Semana ${selectedWeeksArr[0]}`
        : '';
    const semanaInfo = {
      total: totalSemanas,
      atual: semanaAtual,
      parcial: periodoParcial,
      fracaoDecorrida: totalSemanas ? Math.min(1, semanaAtual / totalSemanas) : 1,
      label: semanaLabelTxt
        ? `${semanaLabelTxt} · ${cap(targetMes)}`
        : periodoParcial
          ? `Semana ${semanaAtual} de ${totalSemanas} (mês em andamento)`
          : `Mês completo · ${totalSemanas} semanas`
    };

    function getCirurgicoByMes(mes) {
      if (!mes) return 0;
      const cirRows = (S.anal && S.anal['C_CIRURGICO']) || [];
      return cirRows
        .filter(x => x.mes === mes && (x.vet === 'larissa.iozzi' || x.vet === 'vitor.tridapalli'))
        .reduce((s, r) => s + (r.valL || 0), 0);
    }

    // ===== 2. Métricas financeiras =====
    const baseProd = sumC(baseTarget, 'prod');
    const baseProdPrev = sumC(basePrevious, 'prod');
    const cirProd = getCirurgicoByMes(targetMes);
    const cirProdPrev = getCirurgicoByMes(previousMes);
    const currentRevenue = baseProd + cirProd;
    const previousRevenue = baseProdPrev + cirProdPrev;

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
      clinica: analyzeSector('CLINICA', targetMes, previousMes, selectedWeek, prevWeekKey),
      inter: analyzeSector('INTER', targetMes, previousMes, selectedWeek, prevWeekKey),
      cirurgico: analyzeSector('C_CIRURGICO', targetMes, previousMes, selectedWeek, prevWeekKey),
      lab: analyzeSector('LAB', targetMes, previousMes, selectedWeek, prevWeekKey)
    };

    // ===== 4. Análise de equipe =====
    const vetMap = {};
    baseTarget.forEach(r => {
      if (!r.vet) return;
      if (!vetMap[r.vet]) vetMap[r.vet] = { prod: 0, horas: 0, hN: 0, hNt: 0, fixo: 0, var: 0, total: 0, n: 0 };
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
    const topVets = [...vets].sort((a, b) => b[1].prod - a[1].prod);
    const avgProd = topVets.length ? topVets.reduce((s, [, d]) => s + d.prod, 0) / topVets.length : 0;
    const bottomVets = topVets.filter(([, d]) => d.prod < avgProd * 0.5 && d.horas > 10);

    const prevVetMap = {};
    basePrevious.forEach(r => {
      if (!r.vet) return;
      if (!prevVetMap[r.vet]) prevVetMap[r.vet] = { prod: 0 };
      prevVetMap[r.vet].prod += r.prod || 0;
    });
    const prevVetAvg = previousRevenue > 0 && basePrevious.length
      ? Object.values(prevVetMap).reduce((s, v) => s + v.prod, 0) / Math.max(1, Object.keys(prevVetMap).length)
      : 0;

    const anomalies = [];
    topVets.forEach(([n, d]) => {
      const prevProd = prevVetMap[n] ? prevVetMap[n].prod : prevVetAvg;
      if (prevProd <= 0) return;
      const pctChange = ((d.prod / prevProd) - 1) * 100;
      if (pctChange >= 50 && d.prod > 20000) {
        anomalies.push({ type: 'high', vet: n, prod: d.prod, prevProd, deviation: pctChange.toFixed(0) });
      } else if (pctChange <= -30 && d.horas > 10) {
        anomalies.push({ type: 'low', vet: n, prod: d.prod, prevProd, deviation: Math.abs(pctChange).toFixed(0), horas: d.horas });
      }
    });
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
      total: topVets.reduce((s, [, d]) => s + d.prod, 0),
      totalHoras: topVets.reduce((s, [, d]) => s + d.horas, 0)
    };

    // ===== 5. Análise de custos =====
    const opByForn = {};
    cogsTarget.forEach(r => {
      if (classifyCogsRow(r) !== 'operational') return;
      const forn = r.forn || r.fornecedor || r.cat || 'Outros';
      if (!opByForn[forn]) opByForn[forn] = 0;
      opByForn[forn] += r.val || 0;
    });
    const topProviders = Object.entries(opByForn).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const costs = {
      teamRatio: currentRevenue > 0 ? currentTeamCost / currentRevenue : 0,
      opRatio: currentRevenue > 0 ? currentOpCost / currentRevenue : 0,
      topProviders
    };

    // ===== 6. Score de saúde =====
    const health = calculateHealthScore(metrics, team, costs, anomalies);

    // ===== 7. Plano de ação =====
    const actions = generateActionPlan(metrics, sectors, team, costs, anomalies, targetMes);

    // ===== 8. Projeção de fechamento =====
    const proj = projectMonthFromData(baseRowsAll, currentRevenue, currentProfit, targetMes);

    // ===== 9. Histórico mensal =====
    const monthHistory = buildMonthHistory(baseRowsAll, cogsRowsAll);

    // ────────────────────────────────
    //  RENDERIZAÇÃO
    // ────────────────────────────────
    const healthCirc = 2 * Math.PI * 56;

    const trendIcon = (t) => t === 'up' ? '↑' : t === 'down' ? '↓' : '→';
    const trendColorOf = (t, invert) => {
      if (t === 'flat') return 'var(--tx3)';
      const isUp = t === 'up';
      const good = invert ? !isUp : isUp;
      return good ? 'var(--green)' : 'var(--red)';
    };

    function momCard(label, data, invert) {
      const color = trendColorOf(data.trend, invert);
      const isPct = Math.abs(data.current) <= 5 && Math.abs(data.previous) <= 5 && label.includes('%');
      const displayCurrent = isPct ? (data.current * 100).toFixed(2) + '%' : fR(data.current);
      return `
        <div style="background:var(--sf);border:1px solid var(--bd);border-radius:14px;padding:14px 16px">
          <div style="font-size:10px;color:var(--tx3);font-family:var(--font-mono);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">${label}</div>
          <div style="font-family:var(--font-display);font-size:19px;font-weight:700;color:${color};letter-spacing:-0.4px;margin-bottom:4px">${displayCurrent}</div>
          <div style="font-size:10.5px;font-family:var(--font-mono);color:${color}">${trendIcon(data.trend)} ${Math.abs(data.variation).toFixed(1)}% vs ${cap(previousMes || 'mês ant.')}</div>
        </div>
      `;
    }

    const sectorCard = (name, icon, data) => {
      const trendColor = data.variation.trend === 'up' ? 'var(--green)' : data.variation.trend === 'down' ? 'var(--red)' : 'var(--tx3)';
      const weekColor = data.weekVariation.trend === 'up' ? 'var(--green)' : data.weekVariation.trend === 'down' ? 'var(--red)' : 'var(--tx3)';
      const sym = data.variation.trend === 'up' ? '↑' : data.variation.trend === 'down' ? '↓' : '→';
      const weekSym = data.weekVariation.trend === 'up' ? '↑' : data.weekVariation.trend === 'down' ? '↓' : '→';
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
            <span>${sym} ${Math.abs(data.variation.variation).toFixed(1)}% vs mês ant.</span>
            ${selectedWeeksArr.length === 1 ? `<span>${weekSym} ${Math.abs(data.weekVariation.variation).toFixed(1)}% vs sem. ant.</span>` : ''}
            <span>Ef: <span style="color:${efColor};font-weight:600">${data.efficiency > 0 ? (data.efficiency * 100).toFixed(0) + '%' : '—'}</span></span>
          </div>
          ${data.topProc ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--bd);font-size:10.5px;color:var(--tx3);font-family:var(--font-mono);line-height:1.5">
            <div style="text-transform:uppercase;letter-spacing:1px;font-size:9px;margin-bottom:3px">Top procedimento</div>
            <div style="color:var(--tx2);font-size:11px">${data.topProc[0].length > 30 ? data.topProc[0].slice(0, 30) + '…' : data.topProc[0]}</div>
            <div>${fR(data.topProc[1].val)} · ${data.topProc[1].n}x</div>
          </div>` : ''}
        </div>
      `;
    };

    const topVetsHTML = topVets.slice(0, 8).map(([n, d], i) => `
      <tr>
        <td style="padding:8px 10px;color:var(--tx3);font-family:var(--font-mono);font-size:11px">${i + 1}</td>
        <td style="padding:8px 10px;color:var(--tx);font-size:12px">${n.split('.')[0]}</td>
        <td style="padding:8px 10px;text-align:right;color:var(--tx2);font-family:var(--font-mono);font-size:11.5px">${fR(d.prod)}</td>
        <td style="padding:8px 10px;text-align:right;color:var(--tx3);font-family:var(--font-mono);font-size:11px">${d.horas.toFixed(0)}h</td>
        <td style="padding:8px 10px;text-align:right;color:var(--tx3);font-family:var(--font-mono);font-size:11px">${currentRevenue > 0 ? ((d.prod / currentRevenue) * 100).toFixed(1) : '0.0'}%</td>
      </tr>
    `).join('');

    const anomaliesHTML = anomalies.length
      ? anomalies.slice(0, 5).map(a => `
        <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd)">
          <span style="font-size:16px">${a.type === 'high' ? '📈' : '📉'}</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:var(--tx);font-weight:500">${a.vet.split('.')[0]}</div>
            <div style="font-size:10.5px;color:var(--tx3);font-family:var(--font-mono)">${a.type === 'high' ? `+${a.deviation}% acima do esperado` : `-${a.deviation}% abaixo do esperado`}</div>
          </div>
          <div style="font-size:11.5px;font-family:var(--font-mono);color:${a.type === 'high' ? 'var(--green)' : 'var(--red)'}">${fR(a.prod)}</div>
        </div>
      `).join('')
      : '<div class="nd" style="padding:16px 0"><div class="nd-i">✅</div>Nenhuma anomalia significativa detectada.</div>';

    const providersHTML = costs.topProviders.length
      ? costs.topProviders.map(([forn, val]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;font-size:12px">
          <span style="color:var(--tx2)">${forn.length > 28 ? forn.slice(0, 28) + '…' : forn}</span>
          <span style="color:var(--tx);font-family:var(--font-mono);font-weight:600">${fR(val)}</span>
        </div>
      `).join('')
      : '<div class="nd" style="padding:12px 0"><div class="nd-i">—</div>Sem dados de fornecedores.</div>';

    const costPie = (currentTeamCost > 0 || currentOpCost > 0) ? `
      <div style="display:flex;align-items:center;gap:16px;padding:6px 0">
        <div style="flex:1">
          <div style="display:flex;height:10px;border-radius:6px;overflow:hidden;background:var(--sf2)">
            <div style="width:${currentCost > 0 ? (currentTeamCost / currentCost * 100) : 0}%;background:var(--pink)"></div>
            <div style="width:${currentCost > 0 ? (currentOpCost / currentCost * 100) : 0}%;background:var(--violet)"></div>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-size:10.5px;font-family:var(--font-mono);color:var(--tx3)">
            <span><span style="color:var(--pink)">●</span> Equipe ${fR(currentTeamCost)}</span>
            <span><span style="color:var(--violet)">●</span> Operacional ${fR(currentOpCost)}</span>
          </div>
        </div>
      </div>
    ` : '';

    const projHTML = proj ? (proj.isComplete ? `
      <div class="nd" style="padding:12px 0"><div class="nd-i">✅</div>Mês completo — sem projeção necessária.</div>
    ` : `
      <div style="font-size:12px;color:var(--tx2);line-height:1.7">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <span>Dia ${proj.currentDay} de ${proj.totalDays}</span>
          <span style="font-family:var(--font-mono);color:var(--tx3)">${(proj.progress * 100).toFixed(0)}% do mês</span>
        </div>
        <div style="height:6px;background:var(--sf2);border-radius:4px;overflow:hidden;margin-bottom:12px">
          <div style="height:100%;width:${proj.progress * 100}%;background:linear-gradient(90deg, var(--pink), var(--violet))"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div>
            <div style="font-size:9.5px;color:var(--tx3);font-family:var(--font-mono);text-transform:uppercase">Projeção Receita</div>
            <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:var(--tx)">${fR(proj.projectedRevenue)}</div>
          </div>
          <div>
            <div style="font-size:9.5px;color:var(--tx3);font-family:var(--font-mono);text-transform:uppercase">Projeção Lucro</div>
            <div style="font-family:var(--font-display);font-size:16px;font-weight:700;color:${proj.projectedProfit >= 0 ? 'var(--green)' : 'var(--red)'}">${fR(proj.projectedProfit)}</div>
          </div>
        </div>
      </div>
    `) : '<div class="nd" style="padding:12px 0"><div class="nd-i">—</div>Dados insuficientes para projeção.</div>';

    const monthHistoryHTML = monthHistory.length > 1 ? `
      <div style="margin-bottom:24px">
        <div class="ctitle" style="margin-bottom:14px">📅 Histórico Mensal</div>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse">
            <thead>
              <tr>
                <th style="text-align:left;padding:8px 12px;border-bottom:2px solid var(--bd);font-size:10px;font-family:var(--font-mono);color:var(--tx3);text-transform:uppercase">Mês</th>
                <th style="text-align:right;padding:8px 12px;border-bottom:2px solid var(--bd);font-size:10px;font-family:var(--font-mono);color:var(--tx3);text-transform:uppercase">Receita</th>
                <th style="text-align:right;padding:8px 12px;border-bottom:2px solid var(--bd);font-size:10px;font-family:var(--font-mono);color:var(--tx3);text-transform:uppercase">Lucro</th>
                <th style="text-align:right;padding:8px 12px;border-bottom:2px solid var(--bd);font-size:10px;font-family:var(--font-mono);color:var(--tx3);text-transform:uppercase">Margem</th>
              </tr>
            </thead>
            <tbody>
              ${monthHistory.map(m => `
                <tr>
                  <td style="padding:9px 12px;border-bottom:1px solid rgba(30,45,71,.4);font-size:12px;color:${m.mes === targetMes ? 'var(--pink)' : 'var(--tx2)'};font-weight:${m.mes === targetMes ? '700' : '400'}">${cap(m.mes)}</td>
                  <td style="padding:9px 12px;border-bottom:1px solid rgba(30,45,71,.4);text-align:right;font-family:var(--font-mono);font-size:12px;color:var(--tx)">${fR(m.rev)}</td>
                  <td style="padding:9px 12px;border-bottom:1px solid rgba(30,45,71,.4);text-align:right;font-family:var(--font-mono);font-size:12px;color:${m.profit >= 0 ? 'var(--green)' : 'var(--red)'}">${fR(m.profit)}</td>
                  <td style="padding:9px 12px;border-bottom:1px solid rgba(30,45,71,.4);text-align:right;font-family:var(--font-mono);font-size:12px;color:var(--tx2)">${(m.margin * 100).toFixed(1)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    ` : '';

    const actionsHTML = actions.length ? actions.map(a => {
      const prColor = a.priority === 'alta' ? 'var(--red)' : a.priority === 'media' ? 'var(--amber)' : 'var(--green)';
      return `
        <div style="display:flex;gap:14px;padding:16px 0;border-bottom:1px solid var(--bd)">
          <div style="width:38px;height:38px;background:${prColor}15;border:1px solid ${prColor}40;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${a.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;flex-wrap:wrap">
              <div style="font-family:var(--font-display);font-size:14px;font-weight:700;color:var(--tx)">${a.title}</div>
              <span style="font-size:9px;font-family:var(--font-mono);padding:2px 7px;border-radius:100px;background:${prColor}15;color:${prColor};text-transform:uppercase;letter-spacing:0.5px">${a.priority}</span>
            </div>
            <div style="font-size:12.5px;color:var(--tx2);line-height:1.6;margin-bottom:7px">${a.desc}</div>
            <div style="display:flex;gap:14px;font-size:10.5px;font-family:var(--font-mono);color:var(--tx3)">
              <span>💥 Impacto: ${a.impact}</span>
              <span>⏱ Esforço: ${a.effort}</span>
            </div>
          </div>
        </div>
      `;
    }).join('') : '<div class="nd" style="padding:20px 0"><div class="nd-i">✅</div>Nenhuma ação crítica identificada no momento.</div>';

    content.innerHTML = `
      <div style="display:grid;grid-template-columns:auto 1fr;gap:24px;padding:24px;background:linear-gradient(135deg, ${health.color}10 0%, var(--sf) 60%);border:1px solid var(--bd);border-radius:18px;margin-bottom:20px;align-items:center">
        <div style="position:relative;width:130px;height:130px;flex-shrink:0">
          <svg viewBox="0 0 130 130" style="transform:rotate(-90deg);width:100%;height:100%">
            <circle cx="65" cy="65" r="56" fill="none" stroke="var(--sf3)" stroke-width="9"/>
            <circle cx="65" cy="65" r="56" fill="none" stroke="${health.color}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(health.score / 100) * healthCirc} ${healthCirc}" style="transition:stroke-dasharray 1.2s ease;filter:drop-shadow(0 0 6px ${health.color}66)"/>
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
              ${health.factors.slice(0, 4).map(f => `
                <span style="padding:3px 9px;border-radius:100px;font-size:10px;font-family:var(--font-mono);background:${f.pts > 0 ? 'rgba(52,211,153,.1)' : 'rgba(248,113,113,.08)'};color:${f.pts > 0 ? 'var(--green)' : 'var(--red)'};border:1px solid ${f.pts > 0 ? 'rgba(52,211,153,.2)' : 'rgba(248,113,113,.2)'}">
                  ${f.pts > 0 ? '+' : ''}${f.pts} · ${f.txt}
                </span>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </div>

      <div style="margin-bottom:24px">
        <div class="ctitle" style="margin-bottom:14px">📊 Indicadores de Performance — ${cap(targetMes)} vs ${cap(previousMes || 'mês anterior')}</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px">
          ${momCard('⚕️ Produção', momCompare(currentRevenue, previousRevenue))}
        </div>
      </div>

      <div class="ctitle" style="margin-bottom:14px">🏥 Performance por Setor</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:24px">
        ${sectorCard('Clínica Médica', '🩺', sectors.clinica)}
        ${sectorCard('Internação', '🏨', sectors.inter)}
        ${sectorCard('Bloco Cirúrgico', '🔪', sectors.cirurgico)}
        ${sectorCard('Laboratório', '🧪', sectors.lab)}
      </div>

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
                ${team.bottomPerformers.slice(0, 5).map(([n, d]) => `
                  <span style="padding:3px 9px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.2);border-radius:100px;font-size:10.5px;font-family:var(--font-mono);color:var(--amber)">
                    ${n.split('.')[0]} · ${fR(d.prod)}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>

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

      <div style="margin-top:18px;padding:14px 18px;border-radius:10px;background:rgba(74,90,128,.08);border:1px solid rgba(74,90,128,.2);display:flex;gap:10px;align-items:flex-start;">
        <span style="font-size:16px;flex-shrink:0">💡</span>
        <div style="font-size:11px;color:var(--tx3);font-family:var(--font-mono);line-height:1.8;">
          <strong style="color:var(--tx2)">Sobre o Motor Analítico v2.2:</strong> Análise multidimensional gerada por regras heurísticas a partir dos dados carregados no sistema.
          Os insights devem ser usados como <strong style="color:var(--tx2)">ponto de partida para investigação</strong>, não como verdade absoluta. Sempre valide com o contexto real e considere fatores externos (sazonalidade, eventos locais, equipe em férias).
          <br><br>
          <strong style="color:var(--tx2)">Suporte a semanas:</strong> O motor interpreta as semanas baseadas no dia do mês (1-7 = Semana 1, 8-14 = Semana 2, etc.), compatível com a fórmula do Excel, e aceita múltiplas semanas selecionadas ao mesmo tempo.
          <br><br>
          <strong style="color:var(--tx2)">Lembrete:</strong> exames laboratoriais são solicitados pelos médicos veterinários — o volume do setor LAB é reflexo direto da produção clínica, não uma operação independente.
        </div>
      </div>
    `;
  }, 1800);
}