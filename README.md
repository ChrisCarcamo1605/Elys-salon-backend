# Ely's Salon — Backend

API NestJS para el sistema de gestión del salón de belleza Ely's.

## Stack

- **Runtime**: Node 20 LTS
- **Framework**: NestJS 11 + TypeScript estricto
- **ORM**: TypeORM 0.3 (migraciones, sin `synchronize`)
- **DB**: PostgreSQL 16
- **Cache/Queue**: Redis + BullMQ
- **Auth**: JWT con PIN de 4 dígitos + argon2id + pepper
- **Validación**: class-validator + class-transformer
- **Docs**: Swagger UI en `/api/docs`
- **Real-time**: WebSocket (fase tardía)
- **Email**: Resend (alt: SMTP via @nestjs-modules/mailer)

## Setup

```bash
cp .env.example .env.dev
# editar .env.dev con DATABASE_URL, JWT_SECRET, PIN_PEPPER, etc.

pnpm install
pnpm migration:run    # aplica migraciones
pnpm seed             # crea permisos, usuarias, catálogo, metas, settings
pnpm start:dev        # http://localhost:3001
```

## Scripts

| Script | Descripción |
|--------|-------------|
| `pnpm start:dev` | Inicia con watch |
| `pnpm build` | Compila a `dist/` |
| `pnpm test` | Tests unitarios (Jest) |
| `pnpm test:e2e` | Tests e2e (Supertest) |
| `pnpm test:cov` | Cobertura |
| `pnpm lint` | ESLint con --fix |
| `pnpm migration:generate src/database/migrations/<Nombre>` | Genera migración desde diff |
| `pnpm migration:run` | Aplica migraciones pendientes |
| `pnpm migration:revert` | Revierte la última migración |
| `pnpm seed` | Ejecuta seeds idempotentes |

## Estado por fase

- [x] Fase 0: Setup
- [x] Fase 1: Auth (PIN) + Plantilla + Permisos
- [x] Fase 2: Categorías + Catálogo unificado
- [x] Fase 3: Ventas + Inventario
- [x] Fase 4: Asistencia + Metas/Bonos
- [x] Fase 5: Promociones + Alertas
- [x] Fase 6: Nómina
- [x] Fase 7: Analíticas + Reportes (stubs)
- [x] Fase 8: Settings + Preferencias
- [ ] Fase 9: WebSocket multi-terminal + Audit hardening + Deploy

## Auth — Endpoints clave

| Método | Path | Descripción | Acceso |
|--------|------|-------------|--------|
| POST | `/v1/auth/unlock` | Login con PIN de 4 dígitos | público |
| POST | `/v1/auth/lock` | Invalida token (auditoría) | autenticado |
| GET | `/v1/auth/me` | Usuario actual | autenticado |
| GET | `/v1/staff/public` | Hints para lockscreen (id, name, initials, color) | público |
| GET | `/v1/staff` | Lista completa con HR | admin |
| PATCH | `/v1/staff/:id/pin` | Cambiar PIN | admin |
| PATCH | `/v1/staff/:id/permissions` | Override permisos por usuaria | admin |
| GET | `/v1/permissions` | Matriz global admin × empleada | admin |
| PUT | `/v1/permissions` | Reemplaza matriz | admin |

## Permisos

- **Matriz global** en `permissions_matrix` define defaults para `admin` y `empleada`.
- **Overrides individuales** en `users.permissions` (JSONB): `{ "Modificar precios y descuentos": true }`.
- `PermissionsGuard` evalúa: override individual → default del rol → 403.

## Convenciones API

- **Base URL**: `/v1`
- **Formato**: JSON
- **Timestamps**: ISO 8601 UTC
- **Moneda**: MXN, `numeric(10,2)`
- **IDs**: UUID v4
- **Paginación**: `?page=1&pageSize=50 → { items, total, page, pageSize }`
- **Errores**: `{ "error": { "code", "message", "fields?" } }` en es-MX
- **Auth**: Bearer token en header `Authorization`

## Guards globales

- `JwtAuthGuard` — Todos los endpoints requieren token excepto `@Public()`.
- `PermissionsGuard` — Evalúa permisos con override → default del rol.
- `ThrottlerGuard` — Rate limiting global. `/v1/auth/unlock` con límite de 5 intentos/30s → 429 por 5min.