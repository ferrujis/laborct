# FJ Analytics SaaS Backend

## Environment Variables

### Required Variables

```env
PORT=3000
NODE_ENV=production

# JWT Secret (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Database path
DB_PATH=./data/fj-analytics.db

# CORS Origins (comma-separated)
CORS_ORIGINS=https://yourdomain.com

# Admin credentials (CHANGE IN PRODUCTION!)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SecurePassword123!
```

### Optional Variables

```env
# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File upload
MAX_FILE_SIZE_MB=50

# Logging
LOG_LEVEL=info
```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login with username/password |
| POST | `/api/auth/register` | Register new user (dev only) |
| GET | `/api/auth/verify` | Verify token validity |
| POST | `/api/auth/logout` | Logout current session |

### Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data/` | Get all data (base, anal, cogs) |
| GET | `/api/data/base` | Get production base data |
| GET | `/api/data/anal/:category` | Get analysis data by category |
| GET | `/api/data/cogs` | Get costs data |
| GET | `/api/data/filters` | Get unique filter values |

### Upload (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload/base` | Upload base data Excel file |
| POST | `/api/upload/anal` | Upload analysis Excel file |
| POST | `/api/upload/cogs` | Upload costs Excel file |

### Users (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users/` | List all users |
| POST | `/api/users/` | Create new user |
| PATCH | `/api/users/:id/password` | Update user password |
| DELETE | `/api/users/:id` | Delete user |

### Logs (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/logs/` | Get access logs |
| GET | `/api/logs/stats` | Get log statistics |

### Escala (Admin only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/escala/parse` | Parse escala Excel file |
| POST | `/api/escala/save` | Save escala hours to data |
| GET | `/api/escala/mappings` | Get saved mappings |

## Security Features

- JWT-based authentication with 24h expiry
- Role-based access control (admin/viewer)
- Rate limiting on auth endpoints (10 req/15min)
- Rate limiting on API endpoints (100 req/15min)
- Helmet.js for security headers
- CORS with configurable origins
- Password hashing with bcrypt
- Audit logging for all actions
