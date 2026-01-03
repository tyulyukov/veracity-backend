# Veracity Backend

Business Networking Platform API built with NestJS.

## Stack

- **NestJS 11** - Node.js framework
- **TypeORM** - ORM with PostgreSQL
- **Pino** - Logging
- **Scalar** - API documentation (OpenAPI/Swagger)

## Quick Start

### With Docker (recommended)

```bash
cp .env.example .env  # configure environment
docker compose up
```

API available at `http://localhost:7007` | Docs at `http://localhost:7007/api/docs`

### Migrations

```bash
npm run migration:generate  # generate new migration
npm run migration:run       # apply migrations
npm run migration:revert    # revert last migration
```

