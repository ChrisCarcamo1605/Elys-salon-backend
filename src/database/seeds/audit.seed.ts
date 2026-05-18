import { DataSource } from 'typeorm';
import { AuditLog } from '../../modules/audit/entities/audit-log.entity';
import { User } from '../../modules/staff/entities/user.entity';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function seedAudit(ds: DataSource): Promise<AuditLog[]> {
  const repo = ds.getRepository(AuditLog);
  const existing = await repo.count();
  if (existing > 0) return repo.find();

  const users = await ds.getRepository(User).find();
  const ely = users.find((u) => u.name === 'Ely Martínez')!;
  const system = users.find((u) => u.name === 'Sistema')!;

  const logs: Partial<AuditLog>[] = [
    {
      userId: system.id,
      action: 'create',
      resource: 'user',
      resourceId: ely.id,
      payload: { name: 'Ely Martínez', role: 'admin' },
      createdAt: daysAgo(30),
    },
    {
      userId: ely.id,
      action: 'create',
      resource: 'category',
      payload: { label: 'Cabello' },
      createdAt: daysAgo(30),
    },
    {
      userId: ely.id,
      action: 'create',
      resource: 'category',
      payload: { label: 'Manicure' },
      createdAt: daysAgo(30),
    },
    {
      userId: ely.id,
      action: 'create',
      resource: 'category',
      payload: { label: 'Pedicure' },
      createdAt: daysAgo(30),
    },
    {
      userId: ely.id,
      action: 'create',
      resource: 'catalog_item',
      payload: { name: 'Corte de cabello', price: 150 },
      createdAt: daysAgo(29),
    },
    {
      userId: ely.id,
      action: 'create',
      resource: 'catalog_item',
      payload: { name: 'Tinte de cabello', price: 500 },
      createdAt: daysAgo(29),
    },
    {
      userId: ely.id,
      action: 'sale',
      resource: 'sale',
      payload: { total: 170, customerName: 'Ana García' },
      createdAt: daysAgo(14),
    },
    {
      userId: ely.id,
      action: 'sale',
      resource: 'sale',
      payload: { total: 490, customerName: 'Sofía Hernández' },
      createdAt: daysAgo(10),
    },
    {
      userId: ely.id,
      action: 'void',
      resource: 'sale',
      payload: { reason: 'Error de cobro' },
      createdAt: daysAgo(1),
    },
    {
      userId: ely.id,
      action: 'update',
      resource: 'catalog_item',
      payload: { field: 'price', from: 140, to: 150 },
      createdAt: daysAgo(7),
    },
    {
      userId: ely.id,
      action: 'create',
      resource: 'promotion',
      payload: { name: 'Bienvenida 15%' },
      createdAt: daysAgo(20),
    },
    {
      userId: ely.id,
      action: 'purchase',
      resource: 'inventory_entry',
      payload: { product: 'Shampoo profesional', qty: 25 },
      createdAt: daysAgo(30),
    },
    {
      userId: ely.id,
      action: 'adjustment',
      resource: 'inventory_entry',
      payload: { product: 'Shampoo profesional', reason: 'merma', qty: -3 },
      createdAt: daysAgo(15),
    },
    {
      userId: ely.id,
      action: 'update',
      resource: 'alert',
      payload: { status: 'resolved', type: 'low_stock' },
      createdAt: daysAgo(0),
    },
    {
      userId: ely.id,
      action: 'update',
      resource: 'settings',
      payload: {
        key: 'appearance',
        field: 'accent',
        from: '#000000',
        to: '#de0fab',
      },
      createdAt: daysAgo(25),
    },
  ];

  const saved: AuditLog[] = [];
  for (const data of logs) {
    const log = repo.create(data);
    saved.push(await repo.save(log));
  }
  return saved;
}
