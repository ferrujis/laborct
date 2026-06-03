# FJ Analytics SaaS

Business Intelligence Platform for Veterinary Clinics and Medical Practices

## Features

- **LaborBI**: Commission management, veterinary production, clinical analysis
- **CogsBI**: Cost management, gross profit, financial intelligence
- **InsightsAI**: AI-powered executive analysis with strategic recommendations
- **AdminCenter**: User management, file uploads, access audit

## Quick Start

### Docker (Recommended)

```bash
docker-compose up -d
# Access at http://localhost:8080
```

### Manual Development

```bash
cd backend
npm install
npm run dev
```

## Documentation

- [Setup Guide](README-SETUP.md) - Installation and configuration
- [User Guide](README-USER.md) - User documentation
- [API Reference](backend/README.md) - Backend API documentation
- [Kubernetes Guide](kubernetes/README.md) - K8s deployment

## Architecture

```
┌────────────┐     ┌───────────────┐     ┌─────────────┐
│  Browser   │────▶│   Frontend    │────▶│   Backend   │
│  (SPA)     │◀────│  (nginx/CDN)  │◀────│  (Node.js)  │
└────────────┘     └───────────────┘     └─────────────┘
                                              │
                                              ▼
                                        ┌─────────────┐
                                        │   SQLite    │
                                        │  (Multi-    │
                                        │   tenant)   │
                                        └─────────────┘
```

## Tech Stack

- **Frontend**: Vanilla JS SPA, Chart.js, XLSX.js
- **Backend**: Node.js, Express, SQLite
- **Security**: JWT, bcrypt, Helmet, CORS, rate limiting
- **Deployment**: Docker, Kubernetes, Nginx

## Default Credentials

- Username: `admin`
- Password: `Admin123!ChangeMe`

> ⚠️ **Change these in production!**

## License

MIT License - See [LICENSE](LICENSE) for details
