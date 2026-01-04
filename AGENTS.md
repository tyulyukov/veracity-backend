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
