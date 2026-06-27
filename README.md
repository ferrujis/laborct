# FJ Analytics — Manual do Usuário (Viewer)
> Ecossistema de Inteligência de Negócios · Clínica Veterinária · v2.0 · 2026

---

## Índice

1. [O que é o FJ Analytics](#1-o-que-é-o-fj-analytics)
2. [Como Acessar](#2-como-acessar)
3. [Hub Central](#3-hub-central)
4. [Módulo LaborBI](#4-módulo-laborbi)
5. [Módulo CogsBI](#5-módulo-cogsbi)
6. [Módulo InsightsAI](#6-módulo-insightsai)
7. [Filtros e Navegação](#7-filtros-e-navegação)
8. [Cores e Badges](#8-cores-e-badges)
9. [Perguntas Frequentes](#9-perguntas-frequentes)

---

## 1. O que é o FJ Analytics?

O **FJ Analytics** é um painel de inteligência de negócios (Business Intelligence) desenvolvido especificamente para a gestão da clínica veterinária. Ele centraliza dados de produção médica, comissões, custos operacionais e análises clínicas em um único ambiente, atualizado em tempo real.

> **Como usuário Viewer**, você tem acesso de leitura a todos os módulos e painéis. Seu papel é analisar, interpretar e tomar decisões com base nas informações exibidas. Você **não pode** fazer upload de arquivos nem alterar dados.

---

## 2. Como Acessar

Acesse pelo navegador (**Chrome**, **Edge** ou **Firefox** recomendados). Não requer instalação de nenhum programa.

**Passo a passo:**

1. Abra o arquivo HTML no navegador ou acesse o link fornecido pelo administrador
2. Na tela de login, insira seu usuário (formato: `nome.sobrenome`) e senha
3. Clique em **"Entrar no Sistema"** ou pressione `Enter`
4. Você será direcionado ao **Hub Central**

> 🔒 **Segurança**
> - Nunca compartilhe sua senha com outros usuários
> - O sistema registra data, hora, dispositivo e localização de cada acesso
> - Em caso de problemas de login, contate o administrador do sistema

---

## 3. Hub Central

Após o login, você chega ao Hub Central, de onde acessa todos os módulos:

| Módulo | Descrição | Seções |
|--------|-----------|--------|
| 🏥 **LaborBI** | Gestão de comissões, produção veterinária e análises por setor clínico | Produção · Comissões · Clínica · Internação · Cirúrgico · Lab |
| 📊 **CogsBI** | Gestão de custos, lucro bruto e inteligência financeira por DRE | Faturamento · Custos de Equipe · Desp. Operacionais · Margem |
| 🧠 **InsightsAI** | Análise executiva automática com diagnóstico e plano de ação para o mês | Diagnóstico · Saúde Financeira · Plano de Ação Estratégico |

---

## 4. Módulo LaborBI

O LaborBI calcula automaticamente as comissões de cada veterinário com base na produção registrada e exibe análises detalhadas por setor clínico.

---

### 4.1 FJ — Comissões

Aba principal do módulo. Exibe a produção e comissão de cada veterinário no período selecionado.

**Tabela progressiva de comissão:**

| Produção Elegível no Mês | Percentual | Observação |
|--------------------------|:----------:|------------|
| Abaixo de R$ 35.000 | **0%** | Sem comissão variável |
| R$ 35.000 a R$ 40.999 | **3%** | Faixa inicial |
| R$ 41.000 a R$ 50.999 | **5%** | Faixa intermediária |
| R$ 51.000 a R$ 60.999 | **7%** | Faixa avançada |
| R$ 61.000 ou mais | **10%** | Faixa máxima |

> ⚠️ **Dedução Automática de Cirurgias**
>
> Para os veterinários **Larissa Iozzi** e **Vitor Tridapalli**, os valores lançados no Bloco Cirúrgico são automaticamente **deduzidos** da produção elegível antes do cálculo da comissão. Isso evita dupla contagem entre a produção base e o setor cirúrgico. Este comportamento é esperado e correto.

---

### 4.2 Ranking de Veterinários

Exibe todos os veterinários ordenados por produção bruta total. Filtre por mês para ver o ranking mensal.

- 🥇🥈🥉 Os três primeiros recebem medalhas automaticamente
- **Produção Bruta** = valor antes da dedução cirúrgica, refletindo o total faturado pelo veterinário

---

### 4.3 Clínica Médica

Analisa os procedimentos clínicos registrados na aba `CLINICA` do arquivo Análises.

| Indicador | O que significa | Como interpretar |
|-----------|----------------|------------------|
| **Valor Lançado** | Total faturado em consultas e atendimentos | Quanto maior, melhor o volume clínico |
| **Valor de Tabela** | Valor de referência do procedimento | Base de comparação com o lançado |
| **Eficiência** | Lançado ÷ Tabela × 100 | Abaixo de 70% indica subcobranças frequentes |
| **Ticket Médio** | Valor médio por lançamento | Reflete o mix de procedimentos do veterinário |

**Gráficos disponíveis:**
- Faturamento por veterinário
- Eficiência (Lançado vs Tabela) por veterinário
- Top 10 procedimentos por valor total
- Top 10 procedimentos por volume (quantidade)

---

### 4.4 Internação

Dados da aba `INTER` — registros de internação por veterinário. Os gráficos mostram faturamento e volume por profissional e por tipo de procedimento.

---

### 4.5 Bloco Cirúrgico

Dados da aba `C. CIRURGICO` — cirurgias realizadas. A eficiência é especialmente relevante aqui, pois cirurgias costumam ter maior variação entre o valor lançado e o valor de tabela.

> 💡 Os valores do Bloco Cirúrgico de **Larissa Iozzi** e **Vitor Tridapalli** são deduzidos da produção base no cálculo de comissão. Isso é intencional — não é um erro.

---

### 4.6 Laboratório

Dados da aba `LAB` — exames laboratoriais solicitados.

> 🔬 **Quem vende os exames de laboratório?**
>
> Os exames de laboratório são **solicitados e vendidos pelos médicos veterinários**. O faturamento do setor LAB é reflexo direto da atuação clínica de cada profissional — não é um departamento independente.
>
> Ao analisar o LAB, observe **quem está solicitando mais**, não apenas o total geral. Um veterinário com alto volume de exames é um profissional ativo e criterioso no diagnóstico dos seus pacientes.

**Gráficos disponíveis:**
- Top 10 exames por volume de solicitações
- Top 10 exames por faturamento total
- Faturamento por veterinário solicitante
- Ticket médio por exame (os mais caros em média)

---

## 5. Módulo CogsBI

Analisa os custos operacionais e calcula a lucratividade bruta da clínica com base nos dados carregados pelo administrador.

### 5.1 Indicadores Principais

| Indicador | O que significa | Como interpretar |
|-----------|----------------|------------------|
| **Faturamento Total** | Receita bruta total da clínica | Soma das produções de todos os veterinários |
| **Custo de Equipe** | Comissões + CLT + contratos externos | Todos os gastos com pessoal médico |
| **Custos Operacionais** | Labs externos, insumos, gases, fornecedores | Despesas diretas de funcionamento |
| **Lucro Bruto** | Faturamento menos todos os custos | 🟢 Verde = saudável · 🔴 Vermelho = prejuízo |
| **Margem Bruta** | Lucro ÷ Faturamento × 100 | Acima de 20% = excelente · Abaixo de 10% = alerta |

### 5.2 Gráficos Disponíveis

- **Composição de Gastos:** pizza mostrando a proporção entre Custo de Equipe e Despesas Operacionais
- **Maiores Custos por Fornecedor:** barras horizontais com os fornecedores que mais pesam no caixa
- **Detalhamento Operacional:** tabela completa com todos os lançamentos, data, categoria e valor

> 📌 Use o filtro **"Mês"** no topo para ver dados de um período específico. Sem filtro, todos os meses disponíveis são exibidos somados.

---

## 6. Módulo InsightsAI

Motor de análise automática que processa os dados carregados e gera um diagnóstico gerencial para o mês mais recente disponível.

### 6.1 O que o motor analisa

- Saúde financeira geral (margem líquida do DRE)
- Peso e composição dos custos operacionais
- Eficiência do repasse médico vs receita
- Veterinário mais produtivo e risco de dependência
- Setor clínico com maior faturamento no período
- Fornecedor/insumo de maior impacto no caixa

### 6.2 Plano de Ação Estratégico

Ao final de cada análise, o sistema sugere automaticamente 3 ações:

| Ação | O que faz |
|------|-----------|
| **Otimização de Fornecedores** | Identifica o maior custo extra e sugere negociação |
| **Expansão de Receita** | Destaca o setor de maior tração para potencializar |
| **Gestão de Risco Médico** | Alerta sobre dependência excessiva de um profissional |

> ⚠️ **Fase de Aprendizagem — Leia com atenção**
>
> O InsightsAI está em fase de desenvolvimento e **pode cometer erros de interpretação**. As análises são geradas automaticamente e devem ser usadas como **ponto de partida**, não como conclusão definitiva. Sempre valide os insights com o contexto real da clínica.
>
> **Lembrete:** os exames de laboratório são solicitados pelos médicos veterinários. O volume do setor LAB reflete a produção médica da equipe, não um setor independente.

---

## 7. Filtros e Navegação

Todos os módulos possuem filtros no topo da página que segmentam os dados sem alterar nada no banco:

| Filtro | Disponível em | Função |
|--------|--------------|--------|
| **Mês** | Todos os módulos | Exibe apenas o período selecionado |
| **Veterinário** | Abas de análise clínica | Filtra lançamentos de um profissional específico |
| **Semana** | Petcare 2026 | Visualiza a produção por semana do mês |

Para navegar entre abas, use os botões na barra superior (ex: `Petcare-2026`, `Ranking`, `Clínica Médica`...).

Para voltar ao Hub Central, clique em **← Hub** no canto superior esquerdo.

---

## 8. Cores e Badges

O sistema usa um padrão visual consistente para facilitar a leitura rápida:

| Elemento | Badge | Significa |
|----------|-------|-----------|
| Eficiência | 🟢 Verde (≥ 90%) | Excelente — lançado próximo ao valor de tabela |
| Eficiência | 🟡 Amarelo (70–89%) | Atenção — desconto moderado nos lançamentos |
| Eficiência | 🔴 Vermelho (< 70%) | Alerta — muitos lançamentos abaixo da tabela |
| Comissão | 🟢 Verde (≥ 7%) | Faixa avançada ou máxima de produção |
| Comissão | 🟡 Amarelo (3–6%) | Faixa inicial ou intermediária |
| Comissão | 🔴 Vermelho (0%) | Produção abaixo da faixa mínima (R$ 35.000) |
| Margem Bruta | 🟢 Verde | Operação lucrativa |
| Margem Bruta | 🔴 Vermelho | Prejuízo bruto no período analisado |
| Barra de ranking | Azul → Roxo | Proporcional ao maior valor da lista |

---

## 9. Perguntas Frequentes

**Os dados são atualizados em tempo real?**
Sim. Ao fazer upload de nova planilha, todos os usuários conectados recebem os dados atualizados automaticamente sem precisar recarregar a página.

---

**Por que a comissão de alguns veterinários está menor do que o esperado?**
Para **Larissa Iozzi** e **Vitor Tridapalli**, os valores do Bloco Cirúrgico são deduzidos da produção elegível antes do cálculo. Isso é intencional para evitar dupla contagem entre a produção base e o setor cirúrgico.

---

**O InsightsAI pode estar errado?**
Sim. O módulo está em fase de aprendizagem. Trate os insights como ponto de partida e sempre valide com o contexto da clínica.

---

**Não consigo acessar o painel Admin. Por quê?**
O painel Admin é exclusivo para usuários com perfil **Administrador**. Como Viewer, você acessa apenas LaborBI, CogsBI e InsightsAI.

---

**Os gráficos aparecem em branco ao trocar de aba?**
Aguarde um segundo e clique na aba novamente. Se o problema persistir, recarregue a página (`F5`) e faça login novamente.

---

> *FJ Analytics · v2.0 · 2026 · Desenvolvido por Ferrujis · Uso interno exclusivo*
