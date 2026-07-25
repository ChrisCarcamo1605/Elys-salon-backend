# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install               # install deps
pnpm start:dev             # dev server with watch (port 3001, loads .env.dev)
pnpm build                 # compile to dist/
pnpm test                  # unit tests (Jest)
pnpm test:watch            # unit tests with watch
pnpm test:e2e              # e2e tests (Supertest)
pnpm test:cov              # coverage
pnpm lint                  # ESLint --fix

# Migrations (always runs against production DB via .env)
pnpm migration:generate src/database/migrations/<Name>   # generate from entity diff
pnpm migration:run                                        # apply pending migrations
pnpm migration:revert                                     # revert last migration

pnpm seed                  # idempotent: permissions, users, categories, settings
```

Dev uses `.env.dev`; production and migration commands use `.env`. Never use `synchronize: true` — schema changes go through migrations only.

Swagger UI: `http://localhost:3001/api/docs`

## Architecture

NestJS 11 + TypeORM 0.3 + PostgreSQL 16 + Redis/BullMQ. All global prefix is `/api` (set in `main.ts`), but the README refers to `/v1` — use `/api` when calling endpoints.

### Global guards (applied to every route)
1. `JwtAuthGuard` — validates Bearer token and active session (`sessions` table, SHA-256 hash). Routes opting out use `@Public()`.
2. `PermissionsGuard` — routes decorated with `@Permissions('...')` check: user override (JSONB) → role default from `permissions_matrix` → 403. Admins always pass.
3. `ThrottlerGuard` — global rate limit; auth endpoint has tighter per-IP block logic in `AuthService.unlock()`.

### Auth flow
PIN-only. `POST /api/auth/unlock` hashes `pin + pepper` with argon2id, scans all active users, returns a JWT + session row. Sessions are stored hashed (SHA-256) and invalidated on `POST /api/auth/lock`.

### Module structure
Each feature lives in `src/modules/<name>/` with the standard NestJS layout (controller, service, module, entities, DTOs). Cross-module entity sharing is done by importing `TypeOrmModule.forFeature([...])` in the consuming module.

| Module | Purpose |
|---|---|
| `auth` | PIN login, session management, per-user month stats |
| `staff` | User CRUD, PIN changes, per-user permission overrides |
| `permissions` | Global role-default permissions matrix |
| `categories` | Product/service categories |
| `catalog` | Unified catalog items (products `P` and services `S`) |
| `sales` | Sale creation (with `DataSource` transaction), void, list |
| `inventory` | Purchase entries and manual adjustments |
| `timeclock` | Employee punch in/out, manual corrections |
| `goals` | Performance goals with reset periods (daily, monthly, biweekly, none). The reset is a read-time window — `getPeriodStart` moves the query's start date on local (America/El_Salvador) calendar boundaries; nothing is stored or cleared, so there is no cron |
| `promotions` | Promotions with join table to catalog items |
| `alerts` | Low-stock, slow-mover, discount-review, promo alerts with cron jobs |
| `payroll` | Payroll computation |
| `analytics` | Analytics aggregates |
| `reports` | PDF/Excel export via pdfkit + exceljs |
| `settings` | Global app settings + per-user preferences |
| `audit` | Audit log entity and service |
| `events` | WebSocket gateway (in progress) |
| `upload` | Image upload to S3-compatible storage (`catalog/` prefix) |

### Key patterns
- **Transactions**: Use `DataSource.createQueryRunner()` for multi-table writes (see `SalesService.create`).
- **Events**: `EventEmitter2` fires domain events (e.g., `sale.created`) that `AlertsListener` in `alerts` module consumes.
- **Cron jobs**: `AlertCrons` in `alerts` module runs low-stock check (08:00), slow-mover check (09:00), and snooze reopen (hourly).
- **Enums**: All domain enums live in `src/common/enums/index.ts` — `Role`, `ItemType`, `SaleStatus`, `PaymentMethod`, etc.
- **Config**: Typed via `AppConfig` interface in `src/config/configuration.ts`. Always inject `ConfigService<AppConfig, true>` with `{ infer: true }`.
- **Logging**: Use `AppLogger` from `src/common/utils/logger.ts` in services; NestJS `Logger` in guards/interceptors.

### Permissions model
- `permissions_matrix` table: one row per permission with an `admin` and an `empleado` boolean.
- `users.permissions` JSONB: per-user overrides (`true`/`false`/absent). Absent means fall back to role default.
- Admin role bypasses all permission checks.
- **`req.user.permissions` is already resolved** (matrix default for the role, overridden by the user's JSONB) — `AuthService.effectivePermissions` builds it in `validateUser`, and login/unlock return the same merged map to the client. Read the key directly; do not re-consult the matrix. `GET /staff` still returns the raw override map, which is what the admin UI edits.
- `products.cost.read` gates the purchase cost. Read endpoints return raw TypeORM entities (no output DTO, no `ClassSerializerInterceptor`), so `stripCost()` from `src/common/utils/cost-visibility.ts` filters `cost`/`unitCost`/`totalCost` out of the response in `CatalogController` and `InventoryController`. Any new endpoint that returns a `CatalogItem` or an `InventoryEntry` must do the same.

### Data conventions
- IDs: UUID v4
- Currency: `numeric(10,2)` MXN
- Timestamps: ISO 8601 UTC
- Pagination response: `{ items, total, page, pageSize }`
- Error response: `{ error: { code, message, fields? } }` in Spanish (es-MX)

### Environment variables
Required: `DATABASE_URL`, `JWT_SECRET`, `PIN_PEPPER`. Optional with defaults: `REDIS_URL`, `PORT` (3001), `TZ` (America/El_Salvador). Upload requires `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`.
