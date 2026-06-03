# FJ Analytics SaaS - Local Development Setup

## Prerequisites

- Node.js 18+ (or Docker + Docker Compose)
- npm or yarn
- Docker (optional, for containerized development)

## Quick Start (Local Development)

### Option 1: Docker Compose (Recommended)

```bash
# Clone or extract the project
cd fj-analytics-saas

# Create .env from example
cp backend/.env.example backend/.env

# Start all services
docker-compose up -d

# Wait for services to be ready
docker-compose logs -f backend
```

Access the app at: http://localhost:8080

### Option 2: Manual Development

```bash
# Backend
cd backend
npm install
npm run dev

# In another terminal - Frontend (already included in backend serving)
# The backend serves the frontend in production mode
```

## Default Credentials

- **Username:** admin
- **Password:** Admin123!ChangeMe (change in production!)

## Verifying Installation

### Check Health
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "environment": "development"
}
```

### Run E2E Tests
```bash
cd e2e
npm install
npx playwright install
npm test
```

## Project Structure

```
fj-analytics-saas/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── config/      # Database config
│   │   ├── middleware/  # Auth, error handling
│   │   ├── routes/     # API endpoints
│   │   └── server.js   # Express app
│   └── package.json
├── frontend/            # Static frontend (SPA)
│   └── index.html
├── kubernetes/         # K8s manifests
├── e2e/               # Playwright tests
├── docker-compose.yml
├── Dockerfile.backend
└── Dockerfile.frontend
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/verify` | Verify token |
| GET | `/api/data/` | Get all data |
| GET | `/api/data/filters` | Get filter options |
| POST | `/api/upload/base` | Upload base Excel |
| POST | `/api/upload/anal` | Upload analysis Excel |
| POST | `/api/upload/cogs` | Upload costs Excel |
| GET | `/api/users/` | List users (admin) |
| POST | `/api/users/` | Create user (admin) |
| GET | `/api/logs/` | Access logs (admin) |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| JWT_SECRET | JWT signing key | (generate new) |
| DB_PATH | SQLite database path | ./data/fj-analytics.db |
| CORS_ORIGINS | Allowed CORS origins | http://localhost:8080 |
| ADMIN_EMAIL | Default admin email | admin@fj-analytics.com |
| ADMIN_PASSWORD | Default admin password | Admin123! |

## Troubleshooting

### Backend won't start

```bash
# Check if port is in use
lsof -i :3000

# Check database
ls -la backend/data/

# View logs
docker-compose logs backend
```

### Database errors

```bash
# Delete and recreate database
rm backend/data/fj-analytics.db
docker-compose restart backend
```

### E2E tests fail

```bash
# Make sure services are running
docker-compose ps

# Check if frontend is accessible
curl http://localhost:8080

# Check if backend API is accessible
curl http://localhost:3000/api/health
```

## Production Deployment

See [kubernetes/README.md](kubernetes/README.md) for Kubernetes deployment instructions.

## Support

For issues or questions, check the main README or contact support.
