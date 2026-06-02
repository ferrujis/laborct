FJ
Analytics

Manual do Usuário — Viewer
Ecossistema de Inteligência de Negócios · Clínica Veterinária
Versão 2.0  ·  2026

1. O que é o FJ Analytics?
O FJ Analytics é um painel de inteligência de negócios (Business Intelligence) desenvolvido especificamente para a gestão da clínica veterinária. Ele centraliza dados de produção médica, comissões, custos operacionais e análises clínicas em um único ambiente, atualizado em tempo real.

Como usuário Viewer, você tem acesso de leitura a todos os módulos e painéis. Seu papel é analisar, interpretar e tomar decisões com base nas informações exibidas. Você não pode fazer upload de arquivos nem alterar dados.


2. Como Acessar
Acesse pelo navegador (Chrome, Edge ou Firefox). Não requer instalação de nenhum programa.

Passo a passo:
•	Acesse o link fornecido pelo administrador
•	Na tela de login, insira seu usuário (formato: nome.sobrenome) e senha
•	Clique em "Entrar no Sistema" ou pressione Enter
•	Você será direcionado ao Hub Central

🔒  Segurança
Nunca compartilhe sua senha com outros usuários.
O sistema registra data, hora, dispositivo e localização de cada acesso.
Em caso de problemas de login, contate o administrador do sistema.


3. Hub Central
Após o login, você chega ao Hub Central, de onde acessa todos os módulos:

🏥	LaborBI
Gestão de comissões, produção veterinária e análises por setor clínico.
Produção · Comissões · Clínica · Internação · Cirúrgico · Lab

📊	CogsBI
Gestão de custos, lucro bruto e inteligência financeira por DRE.
Faturamento · Custos de Equipe · Desp. Operacionais · Margem

🧠	InsightsAI
Análise executiva automática com diagnóstico e plano de ação para o mês.
Diagnóstico · Saúde Financeira · Plano de Ação Estratégico


4. Módulo LaborBI
O LaborBI calcula automaticamente as comissões de cada veterinário com base na produção registrada e exibe análises detalhadas por setor clínico.

4.1  Petcare 2026 — Comissões
Aba principal do módulo. Exibe produção e comissão de cada veterinário por período selecionado.

Tabela progressiva de comissão:

Produção Elegível no Mês	Percentual	Observação
Abaixo de R$ 35.000	0%	Sem comissão variável
R$ 35.000 a R$ 40.999	3%	Faixa inicial
R$ 41.000 a R$ 50.999	5%	Faixa intermediária
R$ 51.000 a R$ 60.999	7%	Faixa avançada
R$ 61.000 ou mais	10%	Faixa máxima

⚠️  Dedução Automática de Cirurgias
Para Larissa Iozzi e Vitor Tridapalli, os valores do Bloco Cirúrgico são
automaticamente DEDUZIDOS da produção elegível antes do cálculo da comissão.
Isso evita dupla contagem entre a produção base e o setor cirúrgico.

4.2  Ranking de Veterinários
Exibe todos os veterinários ordenados por produção bruta total. Filtre por mês para ver o ranking mensal. Os três primeiros recebem medalhas automaticamente.

4.3  Clínica Médica
Analisa os procedimentos clínicos. Cada linha representa um lançamento feito por um veterinário.

Indicador	O que significa	Como interpretar
Valor Lançado	Total faturado em consultas e atendimentos	Quanto maior, melhor o volume clínico
Valor de Tabela	Valor de referência do procedimento	Base de comparação com o lançado
Eficiência	Lançado ÷ Tabela × 100	Abaixo de 70% indica subcobranças
Ticket Médio	Valor médio por lançamento	Reflete o mix de procedimentos

4.4  Internação
Dados de internação por veterinário. Os gráficos mostram faturamento e volume por profissional e por tipo de procedimento de internação.

4.5  Bloco Cirúrgico
Cirurgias realizadas. A eficiência é especialmente relevante aqui, pois cirurgias costumam ter maior variação entre o lançado e o valor de tabela.

4.6  Laboratório
Exames laboratoriais solicitados. Ponto fundamental:

🔬  Quem vende os exames de laboratório?
Os exames de laboratório são SOLICITADOS e VENDIDOS pelos médicos veterinários.
O faturamento do setor LAB é reflexo direto da atuação clínica de cada profissional.
Ao analisar o LAB, observe QUEM está solicitando mais, não apenas o total.
Um alto volume de exames indica um profissional ativo e criterioso, não um setor independente.

Os gráficos do Laboratório exibem:
•	Volume de solicitações por tipo de exame
•	Faturamento total por tipo de exame
•	Faturamento por veterinário solicitante
•	Ticket médio por exame (os mais caros em média)


5. Módulo CogsBI
Analisa os custos operacionais e calcula a lucratividade bruta da clínica.

5.1  Indicadores Principais

Indicador	O que significa	Como interpretar
Faturamento Total	Receita bruta total da clínica	Soma das produções de todos os veterinários
Custo de Equipe	Comissões + CLT + contratos externos	Todos os gastos com pessoal médico
Custos Operacionais	Labs, insumos, gases, fornecedores	Despesas diretas de funcionamento
Lucro Bruto	Faturamento menos todos os custos	Verde = saudável  ·  Vermelho = prejuízo
Margem Bruta	Lucro ÷ Faturamento × 100	Acima 20% = excelente  ·  Abaixo 10% = alerta

5.2  Gráficos disponíveis
•	Composição de Gastos: Pizza mostrando a proporção entre Custo de Equipe e Despesas Operacionais.
•	Maiores Custos por Fornecedor: Barras horizontais com os fornecedores que mais pesam no caixa.
•	Detalhamento Operacional: Tabela completa com todos os lançamentos de custo, data, categoria e valor.

📌  Dica de uso
Use o filtro "Mês" no topo para ver os dados de um período específico.
Sem filtro, todos os meses disponíveis são exibidos somados.


6. Módulo InsightsAI
Motor de análise automática que processa os dados e gera um diagnóstico gerencial para o mês mais recente disponível.

6.1  O que o motor analisa
•	Saúde financeira geral (margem líquida do DRE)
•	Peso dos custos operacionais
•	Eficiência do repasse médico vs receita
•	Veterinário mais produtivo e risco de dependência
•	Setor clínico com maior faturamento
•	Fornecedor/insumo de maior impacto no caixa

6.2  Plano de Ação
•	Otimização de Fornecedores: identifica o maior custo extra e sugere negociação.
•	Expansão de Receita: destaca o setor de maior tração para potencializar.
•	Gestão de Risco Médico: alerta sobre dependência excessiva de um profissional.

⚠️  Fase de Aprendizagem — Leia com atenção
O InsightsAI está em fase de desenvolvimento e pode cometer erros de interpretação.
Use as análises como PONTO DE PARTIDA, não como conclusão definitiva.
Sempre valide os insights com o contexto real da clínica.

Lembrete: os exames de laboratório são solicitados pelos médicos veterinários.
O volume do LAB reflete a produção médica, não um setor independente.


7. Filtros e Navegação
•	Mês: filtra todos os gráficos e tabelas para o período selecionado.
•	Veterinário: exibe apenas os lançamentos de um profissional específico.
•	Semana: disponível na aba Petcare 2026 para ver produção semanal.

Para navegar entre as abas, use os botões na barra superior. Para voltar ao Hub Central, clique em ← Hub no canto superior esquerdo.


8. Cores e Badges

Elemento	Cor / Badge	Significa
Eficiência	🟢 Verde (≥ 90%)	Excelente — lançado próximo ao valor de tabela
Eficiência	🟡 Amarelo (70–89%)	Atenção — desconto moderado nos lançamentos
Eficiência	🔴 Vermelho (< 70%)	Alerta — muitos lançamentos abaixo da tabela
Comissão	🟢 Verde (≥ 7%)	Faixa avançada ou máxima de produção
Comissão	🟡 Amarelo (3–6%)	Faixa inicial ou intermediária
Comissão	🔴 Vermelho (0%)	Produção abaixo da faixa mínima (R$ 35.000)
Margem Bruta	🟢 Verde	Operação lucrátiva
Margem Bruta	🔴 Vermelho	Prejuízo bruto no período analisado


9. Perguntas Frequentes

Os dados são atualizados em tempo real?
Sim. Ao fazer upload de nova planilha, todos os usuários conectados recebem os dados atualizados automaticamente sem recarregar a página.

Por que a comissão de alguns veterinários está menor do que o esperado?
Para Larissa Iozzi e Vitor Tridapalli, os valores do Bloco Cirúrgico são deduzidos da produção elegível antes do cálculo. Isso é intencional para evitar dupla contagem.

O InsightsAI pode estar errado?
Sim. O módulo está em fase de aprendizagem. Trate os insights como ponto de partida e sempre valide com o contexto da clínica.

Não consigo acessar o painel Admin. Por quê?
O Admin é exclusivo para usuários Administrador. Como Viewer, você acessa apenas LaborBI, CogsBI e InsightsAI.

Os gráficos aparecem em branco ao trocar de aba?
Aguarde um segundo e clique na aba novamente. Se persistir, recarregue a página (F5) e faça login novamente.


FJ Analytics  ·  v2.0  ·  2026
Desenvolvido por Ferrujis  ·  Uso interno exclusivo
