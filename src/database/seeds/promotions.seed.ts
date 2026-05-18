import { DataSource } from 'typeorm';
import { Promotion } from '../../modules/promotions/entities/promotion.entity';

export async function seedPromotions(ds: DataSource): Promise<Promotion[]> {
  const repo = ds.getRepository(Promotion);
  const existing = await repo.count();
  if (existing > 0) return repo.find();

  const promos: Partial<Promotion>[] = [
    {
      name: 'Bienvenida 15%',
      description: '15% de descuento para clientes nuevas en su primera visita',
      off: '15%',
      rule: { type: 'new_customer', minPurchase: 200 },
      active: true,
    },
    {
      name: 'Combo Cabello',
      description: 'Corte + Tinte con $50 de descuento',
      off: '$50',
      rule: { type: 'bundle', items: ['Corte de cabello', 'Tinte de cabello'] },
      active: true,
    },
    {
      name: 'Martes de Manicure',
      description: 'Manicure al 2x1 los martes',
      off: '50%',
      rule: { type: 'day_of_week', days: ['Tuesday'], items: ['Manicure'] },
      active: true,
    },
    {
      name: 'Producto gratis',
      description: 'Shampoo gratis en compras mayores a $1,000',
      off: '$180',
      rule: { type: 'min_purchase', minPurchase: 1000, category: 'Productos' },
      active: false,
    },
  ];

  const saved: Promotion[] = [];
  for (const data of promos) {
    const promo = repo.create(data);
    saved.push(await repo.save(promo));
  }
  return saved;
}
