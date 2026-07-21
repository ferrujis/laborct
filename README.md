# FJ Analytics — Projeto separado por arquivos

Estrutura pensada para facilitar pedir alterações pontuais (menos tokens, mais foco).

```
fj/
├── head.html                    # <head> básico (metas, título, libs externas)
├── css/
│   └── styles.css               # todo o CSS (design tokens, componentes)
├── html/
│   ├── 01-login.html            # tela de login
│   ├── 02-hub.html              # hub central (menu de módulos)
│   ├── 03-labor.html            # módulo Labor BI (petcare, ranking, faturamento, clínica, internação, cirúrgico, laboratório)
│   ├── 04-cogs.html             # módulo COGS BI (DRE, EBITDA, categorias)
│   ├── 05-insights.html         # módulo Insights AI
│   ├── 06-admin.html            # Admin Center (uploads, usuários, config, logs)
│   └── 07-footer.html           # toast + fechamentos finais
├── js/
│   ├── 01-core.js               # firebase config, state, utils, login/logout, navegação, helpers de gráfico
│   ├── 02-render-financeiro.js  # renderPetcare, renderRanking, renderFaturamento, renderClinica, renderInter, renderCirurgico, renderLab
│   ├── 03-cogs.js               # todo o módulo de custos (DRE, EBITDA, categorias, histórico)
│   ├── 04-insights.js           # health score, geração de insights/plano de ação, projeções
│   ├── 05-import.js             # upload e parse de planilhas xlsx (base, análise, cogs, escala)
│   └── 06-admin.js              # usuários, logs, config, dashboard admin
├── build.sh                     # remonta tudo em dist/index.html (idêntico ao original)
└── dist/
    └── index.html                # arquivo final gerado — é o que você abre/publica
```

