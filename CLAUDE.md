You are an AI coding agent working in this repository. Follow these rules strictly. If a request conflicts with these rules, propose a compliant alternative.

## Repository structure (enforce)
- Each feature is a Nest module under `src/<module>/` (e.g. `src/user/`, `src/user-auth/`, `src/admin/`, `src/admin-auth/`, `src/interest/`).
- Inside each module, keep layers separated:
  - `*.controller.ts`: HTTP boundary only (no business logic).
  - `*.service.ts`: business orchestration (domain logic + validation + transaction boundaries).
  - `domain/`: domain types and domain errors (one error per file), plus domain-only helpers.
  - `dto/`: transport DTOs only (validation + shapes for requests/responses).
  - `*.mapper.ts`: mapping helpers used ONLY by controllers.
- Shared cross-cutting helpers live under `src/common/` (config, db, decorators, filters, logger, dto pagination, const).

## Controllers: NO LOGIC
- Controllers MUST:
  - Only parse/validate input (DTOs), call a service method, and map service output to response DTOs.
  - Contain no branching business rules, no persistence calls, no raw SQL, no transactions, no authorization decisions beyond guards/metadata.
- Controllers MUST NOT:
  - Catch database exceptions.
  - Build SQL.
  - Contain domain logic, computations, or state transitions.

## Mapping: controller-level only
- Mapping between domain objects and API DTOs MUST happen in controllers (or controller-level mappers).
- Services MUST NOT return DTOs and MUST NOT depend on controller DTOs.
- Domain code MUST NOT import from `dto/` or controller files.

## Pagination: MANDATORY for list endpoints
All endpoints that return lists of data MUST implement pagination. There are two types of pagination used in this repository:

### Cursor-based pagination (User-facing endpoints)
- **Use for**: ALL user-facing endpoints (under `/api/v1/users`, `/api/v1/events`, `/api/v1/connections`, etc.)
- **Why**: Cursor pagination is efficient for real-time data, prevents page drift, and scales well.
- **Implementation**:
  - Use `CursorPaginationDto` from `@/common/dto/cursor-pagination.dto` as query params
  - Cursor format: `{sort_field},{id}` (e.g., `2026-01-09T12:00:00.000Z,123e4567-e89b-12d3-a456-426614174000`)
  - Sort order: Always include `id` as secondary sort to ensure stable pagination
  - Default limit: 20 items per page (max 100)
  - Service method returns: `{ items: T[]; nextCursor: string | null }`
  - Controller returns inline type: `{ items: ItemDto[]; nextCursor: string | null }`
  - Use `@ApiOkResponse({ description: 'Paginated list of...' })` (do NOT create separate pagination response DTOs)

**Example cursor pagination implementation**:
```typescript
// Controller
@Get()
@ApiOkResponse({ description: 'Paginated list of events' })
async getEvents(@Query() query: CursorPaginationDto): Promise<{ events: EventDto[]; nextCursor: string | null }> {
  const result = await this.service.getEvents(query.cursor, query.limit);
  return {
    events: result.events.map(mapToDto),
    nextCursor: result.nextCursor,
  };
}

// Service
async getEvents(cursor?: string, limit?: number): Promise<{ events: Event[]; nextCursor: string | null }> {
  const pageSize = limit ?? 20;
  const params: unknown[] = [];
  let paramIndex = 1;

  let whereClause = '';
  if (cursor) {
    const [sortField, id] = cursor.split(',');
    whereClause = `WHERE (sort_field, id) < ($${paramIndex}::timestamptz, $${paramIndex + 1}::uuid)`;
    params.push(sortField, id);
    paramIndex += 2;
  }

  const sql = `
    SELECT * FROM view_name
    ${whereClause}
    ORDER BY sort_field DESC, id DESC
    LIMIT ${pageSize + 1}
  `;

  const result = await this.pool.query(sql, params);
  const rows = result.rows;

  let nextCursor: string | null = null;
  if (rows.length > pageSize) {
    rows.pop();
    const lastRow = rows[rows.length - 1];
    nextCursor = `${lastRow.sort_field.toISOString()},${lastRow.id}`;
  }

  return { events: rows.map(mapRow), nextCursor };
}
```

### Offset-based pagination (Admin endpoints)
- **Use for**: ALL admin-facing endpoints (under `/api/v1/admin`)
- **Why**: Admins need total counts, page numbers, and the ability to jump to specific pages for data management tasks.
- **Implementation**:
  - Use `OffsetPaginationDto` from `@/common/dto/offset-pagination.dto` as query params
  - Parameters: `offset` (default: 0) and `limit` (default: 20, max: 100)
  - Service method returns: `{ items: T[]; total: number }`
  - Controller returns inline type: `{ items: ItemDto[]; total: number }`
  - Use `@ApiOkResponse({ description: 'Paginated list of...' })` (do NOT create separate pagination response DTOs)

**Example offset pagination implementation**:
```typescript
// Controller
@Get()
@ApiOkResponse({ description: 'Paginated list of users' })
async findUsers(@Query() query: OffsetPaginationDto): Promise<{ users: UserDto[]; total: number }> {
  const result = await this.service.findUsers(query.offset, query.limit);
  return {
    users: result.users.map(mapUserToDto),
    total: result.total,
  };
}

// Service
async findUsers(offset?: number, limit?: number): Promise<{ users: User[]; total: number }> {
  const pageOffset = offset ?? 0;
  const pageSize = limit ?? 20;

  const countResult = await this.pool.query('SELECT COUNT(*) FROM view_name');
  const total = parseInt(countResult.rows[0].count, 10);

  const sql = `
    SELECT * FROM view_name
    ORDER BY created_at DESC, id DESC
    LIMIT $1 OFFSET $2
  `;

  const result = await this.pool.query(sql, [pageSize, pageOffset]);
  return { users: result.rows.map(mapRow), total };
}
```

### When pagination is NOT required
- **Small reference tables**: Tables with a fixed, small number of entries (e.g., `/interests` with ~10-20 interests)
- **Single item lookups**: Endpoints that return a single resource by ID (e.g., `GET /users/:id`)
- **Meta/system endpoints**: Health checks, configuration endpoints

### Critical rules
- **NEVER** return an unpaginated array for user data, events, connections, or any entity that can grow
- **ALWAYS** verify new `GET` endpoints that return lists are paginated before committing
- **ALWAYS** add pagination tests to integration tests (`test/*.e2e-spec.ts`)
- If unsure whether to paginate, **always paginate** - it's better to paginate unnecessarily than to have a performance issue later

## Errors: domain-only, per module
- Never throw NestJS HTTP exceptions directly (`BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, etc.) from controllers/services/domain.
- All expected failures MUST be represented as custom errors located in the module’s `domain/` folder, one class per file.
- Services may throw domain errors; controllers must not translate errors to Nest exceptions.
- Only the global error filter (or equivalent app-wide boundary) may map domain errors to HTTP responses.

## PostgreSQL: handle ALL DB exceptions
- Any code that touches the DB MUST handle/translate Postgres errors deterministically:
  - Catch PG errors at the repository/DB boundary and rethrow a domain error (module-specific) or a shared domain error type.
  - Never leak raw PG error messages/details to clients.
- When adding a new DB write path, ensure at minimum you cover:
  - Unique constraint violations.
  - Foreign key violations.
  - Not-null violations.
  - Check constraint violations.
  - Permission/privilege errors (from SECURITY DEFINER function checks).
  - Serialization/deadlock/timeouts where applicable.

## Database access: ONLY raw SQL
- Do not introduce ORMs (TypeORM/Prisma/Sequelize) or query builders unless explicitly approved.
- All DB operations MUST be implemented as parameterized raw SQL.
- Never interpolate user input directly into SQL strings; always use parameters.
- Keep SQL close to the DB boundary (repository/data-access functions), not in controllers/services.

## DB-level security: RLS + VIEWs + SECURITY DEFINER functions
- Authorization is enforced at the database level using a hybrid approach:
  - **SELECT operations**: Use Row Level Security (RLS) policies on tables + schema-scoped VIEWs.
    - RLS policies control which rows each role can see.
    - VIEWs in role-specific schemas (e.g., `admin.users_with_interests_v`, `"user".other_active_users_v`) provide pre-joined data with appropriate column visibility.
    - Roles are granted SELECT on tables (RLS filters rows) and on VIEWs.
  - **Mutations (INSERT/UPDATE/DELETE)**: Use SECURITY DEFINER functions in role-specific schemas.
    - Functions check `session_user` role membership and enforce access rules internally.
    - Grant EXECUTE only to appropriate roles.
- Schemas for role-specific objects: `guest`, `"user"`, `speaker`, `admin`, `owner`.
- Every new mutation MUST:
  - Be implemented as a SECURITY DEFINER function in the appropriate role schema.
  - Verify caller permissions using `pg_has_role(session_user, 'role_name', 'MEMBER')`.
  - Grant EXECUTE only to appropriate roles.
- Every new SELECT access pattern MUST:
  - Have appropriate RLS policies on the underlying tables.
  - Optionally use a VIEW for complex joins or column filtering.

## DB connection: under the user's credentials
- Application code MUST execute queries using the authenticated user's DB credentials/session context.
- Admin-only operations must use an admin-scoped connection/pool distinct from user-scoped execution.
- The `session_user` is used by SECURITY DEFINER functions to determine access rights.

## Migrations
- Migrations are mandatory for any schema/policy/role changes.
- Use ONLY SQL in migrations (no ORM schema generation).
- Migrations are organized by role (e.g., `009_fn_guest.ts`, `010_fn_user.ts`, `011_fn_admin.ts`, `012_fn_owner.ts`).
- Migrations MUST:
  - Be ordered and deterministic.
  - Be idempotent where feasible.
  - Include: schema objects, roles/grants, RLS policies, VIEWs, SECURITY DEFINER functions, indexes.
  - Avoid destructive changes unless explicitly required and carefully staged.
- Keep migrations in the existing migrations folders (`migrations/` and/or `src/common/db/migrations/`) following the repository convention.

## TypeScript quality constraints
- Do not use `any`.
- Keep code SOLID/DRY; prefer small, testable units.
- Do not add comments unless explicitly requested.

## Tooling / docs
- Before using or changing library-specific behavior, consult the library’s current docs.

## Environment Variables
- keep .env.example up to date when adding a new env variable

## Integration Testing
- When creating or modifying a feature, create or update the corresponding integration tests in `test/*.e2e-spec.ts`.
- Run `npm run test:integration` after making changes to ensure all tests pass.
- Integration tests use Testcontainers to spin up a fresh PostgreSQL container and run migrations from `src/common/db/migrations/`.
- Test files are organized per module (e.g., `test/user-auth.e2e-spec.ts`, `test/admin-users.e2e-spec.ts`).
- Use helpers from `test/setup/auth.helper.ts` for authentication in tests.
