export enum RoleName {
  SYSTEM = 'system',
  ADMIN = 'admin',
  SUPERVISOR = 'supervisor',
  EMPLOYEE = 'employee',
}

export enum TicketStatus {
  ACTIVE = 'ACTIVE',
  VOIDED = 'VOIDED',
}

export enum TicketItemType {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
}

export enum InventoryMovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum InventoryReferenceType {
  SALE = 'SALE',
  VOID = 'VOID',
  PURCHASE = 'PURCHASE',
  MANUAL = 'MANUAL',
}

export enum ExpenseType {
  UTILITIES = 'UTILITIES',
  PAYROLL = 'PAYROLL',
  INVENTORY_PURCHASE = 'INVENTORY_PURCHASE',
}

export enum PayrollPeriodStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  PAID = 'PAID',
}

export enum OfferTargetType {
  PRODUCT = 'PRODUCT',
  SERVICE = 'SERVICE',
}

export enum DiscountType {
  PERCENT = 'PERCENT',
  AMOUNT = 'AMOUNT',
}

export enum BonusMetric {
  SALES_AMOUNT = 'SALES_AMOUNT',
  TICKET_COUNT = 'TICKET_COUNT',
  SERVICE_COUNT = 'SERVICE_COUNT',
  PRODUCT_COUNT = 'PRODUCT_COUNT',
}

export enum BonusPeriodType {
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

export enum BonusStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
}

export enum RewardType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}
