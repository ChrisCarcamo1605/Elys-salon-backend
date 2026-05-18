import { DataSource } from 'typeorm';
import { Alert } from '../../modules/alerts/entities/alert.entity';
import { CatalogItem } from '../../modules/catalog/entities/catalog-item.entity';
import { AlertType, AlertStatus, DiscountKind } from '../../common/enums';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursFromNow(h: number): Date {
  const d = new Date();
  d.setHours(d.getHours() + h);
  return d;
}

export async function seedAlerts(ds: DataSource): Promise<Alert[]> {
  const repo = ds.getRepository(Alert);
  const existing = await repo.count();
  if (existing > 0) return repo.find();

  const catalog = await ds.getRepository(CatalogItem).find();
  const shampoo = catalog.find((i) => i.name === 'Shampoo profesional')!;
  const acondicionador = catalog.find((i) => i.name === 'Acondicionador')!;
  const tratamiento = catalog.find((i) => i.name === 'Tratamiento capilar')!;

  const alerts: Partial<Alert>[] = [
    {
      type: AlertType.LOW_STOCK,
      resourceId: shampoo.id,
      status: AlertStatus.ACTIVE,
      notes: 'Stock bajo de Shampoo profesional',
      createdAt: daysAgo(1),
    },
    {
      type: AlertType.LOW_STOCK,
      resourceId: acondicionador.id,
      status: AlertStatus.RESOLVED,
      resolvedAt: daysAgo(0),
      notes: 'Reposición completada',
      createdAt: daysAgo(3),
    },
    {
      type: AlertType.SLOW_MOVER,
      resourceId: tratamiento.id,
      status: AlertStatus.ACTIVE,
      suggestedOfferKind: DiscountKind.PERCENT,
      suggestedOfferValue: 15,
      notes: 'Tratamiento capilar sin movimiento en 14 días',
      createdAt: daysAgo(5),
    },
    {
      type: AlertType.DISCOUNT_REVIEW,
      resourceId: null,
      status: AlertStatus.ACTIVE,
      notes: 'Descuento del 10% aplicado sin autorización en venta reciente',
      createdAt: daysAgo(2),
    },
    {
      type: AlertType.PROMO,
      resourceId: null,
      status: AlertStatus.ACTIVE,
      notes: 'Promoción de temporada sin ventas registradas',
      createdAt: daysAgo(4),
    },
    {
      type: AlertType.LOW_STOCK,
      resourceId: tratamiento.id,
      status: AlertStatus.SNOOZED,
      snoozedUntil: hoursFromNow(48),
      notes: 'Verificar stock de Tratamiento capilar',
      createdAt: daysAgo(2),
    },
  ];

  const saved: Alert[] = [];
  for (const data of alerts) {
    const alert = repo.create(data);
    saved.push(await repo.save(alert));
  }
  return saved;
}
