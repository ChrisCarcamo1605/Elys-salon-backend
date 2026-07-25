/**
 * Visibilidad del costo de compra.
 *
 * El costo (`catalog_items.cost`, `inventory_entries.unit_cost/total_cost`) es
 * información de negocio: una empleada solo debe ver el precio final de venta.
 * Como los controladores devuelven entidades TypeORM crudas — no hay DTO de
 * salida ni `ClassSerializerInterceptor` — el filtrado se hace aquí, sobre la
 * respuesta ya armada, justo antes de entregarla.
 */

import { Role } from '../enums';

/** Permiso que habilita ver costos y márgenes. Admin siempre pasa. */
export const COST_PERMISSION = 'products.cost.read';

/** Campos de costo que nunca deben salir hacia quien no tiene el permiso. */
const COST_FIELDS = ['cost', 'unitCost', 'totalCost'] as const;

interface PermissionHolder {
  role?: string;
  permissions?: Record<string, boolean> | null;
}

/**
 * `user.permissions` que llega en el request ya viene resuelto (matriz de rol +
 * override por usuario), así que basta con leer la clave.
 */
export function hasPermission(
  user: PermissionHolder | undefined | null,
  perm: string,
): boolean {
  if (!user) return false;
  if (user.role === Role.ADMIN) return true;
  return user.permissions?.[perm] === true;
}

export function canSeeCost(user: PermissionHolder | undefined | null): boolean {
  return hasPermission(user, COST_PERMISSION);
}

/**
 * Devuelve una copia del payload sin los campos de costo, en cualquier nivel
 * de anidamiento (items sueltos, `{ items: [...] }`, entradas con `product`
 * incrustado). Si `visible` es true devuelve el payload tal cual.
 */
export function stripCost<T>(payload: T, visible: boolean): T {
  if (visible) return payload;
  return strip(payload) as T;
}

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if ((COST_FIELDS as readonly string[]).includes(key)) continue;
    out[key] = strip(val);
  }
  return out;
}
