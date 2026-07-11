export enum Role {
  ADMIN = 'admin',
  EMPLEADO = 'empleado',
}

/** Alcance de un device token: qué roles puede desbloquear por PIN en ese dispositivo. */
export enum DeviceTokenScope {
  ADMIN = 'admin',
  EMPLEADO = 'empleado',
}

export enum UserStatus {
  ACTIVA = 'activa',
  VACACIONES = 'vacaciones',
  INACTIVA = 'inactiva',
}

export enum PayType {
  SALARIO = 'salario',
  SALARIO_COMISION = 'salario + comisión',
  COMISION = 'comisión',
}

export enum SaleStatus {
  COMPLETED = 'completed',
  VOIDED = 'voided',
}

export enum ItemType {
  SERVICE = 'S',
  PRODUCT = 'P',
}

export enum DiscountKind {
  AMOUNT = 'amount',
  PERCENT = 'percent',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
}

export enum InventoryKind {
  PURCHASE = 'purchase',
  ADJUSTMENT = 'adjustment',
}

export enum AdjustmentReason {
  CONTEO = 'conteo',
  MERMA = 'merma',
  ROBO = 'robo',
  USO = 'uso',
  DEVOLUCION = 'devolucion',
}

export enum TimeEntrySource {
  UI = 'ui',
  MANUAL = 'manual',
}

export enum BonusMetric {
  TOTAL_SALES = 'totalSales',
  RETAIL_SALES = 'retailSales',
  SERVICES_DONE = 'servicesDone',
  NEW_CLIENTS = 'newClients',
  TIPS_COLLECTED = 'tipsCollected',
}

export enum RewardType {
  FIXED = 'fixed',
  PERCENT = 'percent',
}

export enum GoalTone {
  MAGENTA = 'magenta',
  PURPLE = 'purple',
  TEAL = 'teal',
  GREEN = 'green',
}

export enum AlertType {
  LOW_STOCK = 'low_stock',
  DISCOUNT_REVIEW = 'discount_review',
  SLOW_MOVER = 'slow_mover',
  PROMO = 'promo',
}

export enum AlertStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  SNOOZED = 'snoozed',
}

export enum ResetPeriod {
  MONTHLY = 'monthly',
  BIWEEKLY = 'biweekly',
  NONE = 'none',
}
