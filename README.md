# Veracity Backend

Business Networking Platform API built with NestJS.

## Stack

- **NestJS 11** - Node.js framework
- **pg** & **node-pg-migrate** - PostgreSQL interaction
- **Pino** - Logging
- **Scalar** - API documentation (OpenAPI/Swagger)

## Quick Start

### With Docker

```bash
cp .env.example .env  # configure environment
docker compose up -d  # migrations run automatically
```

API available at `http://localhost:7007` | Docs at `http://localhost:7007/api/docs`
