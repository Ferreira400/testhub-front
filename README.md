# TestHub Frontend

Interface web para a plataforma TestHub.

## Pré-requisitos
- Node.js 18+
- Backend TestHub rodando em http://localhost:3001

## Instalação e execução


```bash
# Instalar dependências
npm install

# Rodar em modo desenvolvimento
npm run dev
# → http://localhost:5173

# Build para produção
npm run build
```

## Estrutura
```
src/
├── context/AuthContext.jsx     # Autenticação global
├── services/api.js             # Camada de API (axios)
├── components/
│   └── layout/                 # Sidebar + Layout
├── pages/
│   ├── Login.jsx               # Tela de login
│   ├── Dashboard.jsx           # Gráficos e métricas
│   ├── Squads.jsx              # Gestão de squads
│   ├── Projects.jsx            # Projetos
│   ├── TestCases.jsx           # Casos de teste com passos
│   ├── Cycles.jsx              # Ciclos de teste
│   ├── Executions.jsx          # Registro de execuções
│   └── Reports.jsx             # Relatórios por squad/ciclo
└── index.css                   # Design system global
```

## Credenciais padrão
- Email: admin@testhub.io
- Senha: 123456
