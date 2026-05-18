import { DataSource } from 'typeorm';
import { InventoryEntry } from '../../modules/inventory/entities/inventory-entry.entity';
import { CatalogItem } from '../../modules/catalog/entities/catalog-item.entity';
import { User } from '../../modules/staff/entities/user.entity';
import { InventoryKind, AdjustmentReason } from '../../common/enums';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function seedInventory(ds: DataSource): Promise<InventoryEntry[]> {
  const repo = ds.getRepository(InventoryEntry);
  const existing = await repo.count();
  if (existing > 0) return repo.find();

  const catalog = await ds.getRepository(CatalogItem).find();
  const users = await ds.getRepository(User).find();
  const ely = users.find(u => u.name === 'Ely Martínez')!;
  const shampoo = catalog.find(i => i.name === 'Shampoo profesional')!;
  const acondicionador = catalog.find(i => i.name === 'Acondicionador')!;
  const tratamiento = catalog.find(i => i.name === 'Tratamiento capilar')!;

  const entries: Partial<InventoryEntry>[] = [
    {
      productId: shampoo.id, kind: InventoryKind.PURCHASE, qtyDelta: 25, stockAfter: 25,
      unitCost: 90, totalCost: 2250, supplier: 'Distribuidora Kérastase MX', invoice: 'INV-2024-001',
      createdById: ely.id, createdAt: daysAgo(30),
    },
    {
      productId: acondicionador.id, kind: InventoryKind.PURCHASE, qtyDelta: 20, stockAfter: 20,
      unitCost: 100, totalCost: 2000, supplier: 'Distribuidora Kérastase MX', invoice: 'INV-2024-002',
      createdById: ely.id, createdAt: daysAgo(28),
    },
    {
      productId: tratamiento.id, kind: InventoryKind.PURCHASE, qtyDelta: 15, stockAfter: 15,
      unitCost: 150, totalCost: 2250, supplier: 'Olaplex México', invoice: 'INV-2024-003',
      createdById: ely.id, createdAt: daysAgo(25),
    },
    {
      productId: shampoo.id, kind: InventoryKind.ADJUSTMENT, qtyDelta: -3, stockAfter: 22,
      unitCost: 0, totalCost: 0, reason: AdjustmentReason.MERMA,
      notes: '3 botellas vencidas', createdById: ely.id, createdAt: daysAgo(15),
    },
    {
      productId: shampoo.id, kind: InventoryKind.ADJUSTMENT, qtyDelta: -2, stockAfter: 20,
      unitCost: 0, totalCost: 0, reason: AdjustmentReason.CONTEO,
      notes: 'Ajuste por conteo físico', createdById: ely.id, createdAt: daysAgo(7),
    },
    {
      productId: acondicionador.id, kind: InventoryKind.ADJUSTMENT, qtyDelta: -1, stockAfter: 19,
      unitCost: 0, totalCost: 0, reason: AdjustmentReason.USO,
      notes: 'Uso en demostración para clienta', createdById: ely.id, createdAt: daysAgo(5),
    },
    {
      productId: shampoo.id, kind: InventoryKind.PURCHASE, qtyDelta: 10, stockAfter: 30,
      unitCost: 95, totalCost: 950, supplier: 'Distribuidora Kérastase MX', invoice: 'INV-2024-010',
      createdById: ely.id, createdAt: daysAgo(3),
    },
    {
      productId: tratamiento.id, kind: InventoryKind.ADJUSTMENT, qtyDelta: -2, stockAfter: 13,
      unitCost: 0, totalCost: 0, reason: AdjustmentReason.DEVOLUCION,
      notes: 'Devolución de cliente', createdById: ely.id, createdAt: daysAgo(1),
    },
  ];

  const saved: InventoryEntry[] = [];
  for (const data of entries) {
    const entry = repo.create(data as Partial<InventoryEntry>);
    saved.push(await repo.save(entry));
  }

  await ds.getRepository(CatalogItem).update(shampoo.id, { stock: 30 });
  await ds.getRepository(CatalogItem).update(acondicionador.id, { stock: 19 });
  await ds.getRepository(CatalogItem).update(tratamiento.id, { stock: 13 });

  return saved;
}