# Ely's Salon — Backend

API NestJS para el sistema de gestión del salón de belleza Ely's.

## Stack

- NestJS 11 + TypeScript
- TypeORM + PostgreSQL (Supabase)
- JWT (access + refresh con rotación) + Passport
- BullMQ + Redis (jobs y correos)
- Swagger en `/api/docs`

## Setup

```bash
cp .env.example .env
# editar .env con DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, SYSTEM_USER_*, etc.

pnpm install
pnpm migration:run    # aplica migraciones
pnpm seed             # crea roles, permisos y usuario system
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

- [x] Fase 0: scaffold
- [x] Fase 1: Auth + RBAC + Users
- [ ] Fase 2: Productos, Servicios, Categorías
- [ ] Fase 3: Ventas, Tickets, Inventario
- [ ] Fase 4: Gastos, Planilla
- [ ] Fase 5: Ofertas
- [ ] Fase 6: Asistencias, Bonos
- [ ] Fase 7: Email, Reportes
- [ ] Fase 8: Analíticas
- [ ] Fase 9: Audit log, hardening, deploy

## Auth — Endpoints clave

| Método | Path | Descripción | Acceso |
|--------|------|-------------|--------|
| POST | `/api/auth/login` | Login email+password | público |
| POST | `/api/auth/refresh` | Rotar tokens | público |
| POST | `/api/auth/logout` | Revocar refresh token | autenticado |
| GET | `/api/auth/me` | Usuario actual + permisos | autenticado |
| GET | `/api/users` | Listar (paginado) | admin/supervisor |
| POST | `/api/users` | Crear | admin |
| POST | `/api/users/:id/permissions` | Otorgar permiso especial | admin |
| GET | `/api/roles` | Listar roles + permisos | admin/supervisor |
| PUT | `/api/roles/:id/permissions` | Reconfigurar permisos de rol | **system** |

## Guards globales

- `JwtAuthGuard` — todos los endpoints requieren bearer token excepto los marcados `@Public()`.
- `RolesGuard` — chequea `@Roles(...)`. `system` bypasa siempre.
- `PermissionsGuard` — chequea `@RequirePermissions(...)`. Usa unión `rol.permisos ∪ usuario.permisos_extra`.
- `ThrottlerGuard` — rate limiting global.
