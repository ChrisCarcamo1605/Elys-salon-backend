#!/usr/bin/env bash
set -euo pipefail

# ── Colores ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()  { echo -e "${YELLOW}[deploy]${NC} $*"; }
error() { echo -e "${RED}[deploy]${NC} $*" >&2; }

# ── Validaciones ─────────────────────────────────────────────────────────────
if [[ -z "${DATABASE_URL:-}" ]]; then
  error "DATABASE_URL no está definida. Exporta las variables de entorno antes de desplegar."
  exit 1
fi

if [[ -z "${JWT_SECRET:-}" ]]; then
  error "JWT_SECRET no está definida."
  exit 1
fi

export NODE_ENV=production

# ── Dependencias ─────────────────────────────────────────────────────────────
info "Instalando dependencias..."
pnpm install --frozen-lockfile --prod=false

# ── Build ─────────────────────────────────────────────────────────────────────
info "Compilando..."
pnpm build

# ── Migraciones ───────────────────────────────────────────────────────────────
info "Ejecutando migraciones..."
pnpm migration:run
info "Migraciones completadas."

# ── Inicio ────────────────────────────────────────────────────────────────────
if command -v pm2 &>/dev/null; then
  APP_NAME="${PM2_APP_NAME:-elys-backend}"
  if pm2 describe "$APP_NAME" &>/dev/null; then
    info "Reiniciando proceso PM2 '$APP_NAME'..."
    pm2 restart "$APP_NAME"
  else
    info "Iniciando proceso PM2 '$APP_NAME'..."
    pm2 start dist/main.js --name "$APP_NAME"
  fi
  pm2 save
else
  warn "PM2 no encontrado. Iniciando con node directamente (bloqueante)..."
  exec node dist/main.js
fi
