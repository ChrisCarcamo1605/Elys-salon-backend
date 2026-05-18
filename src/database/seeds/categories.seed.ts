import { DataSource } from 'typeorm';
import { Category } from '../../modules/categories/entities/category.entity';

const CATEGORIES: { label: string; ordering: number }[] = [
  { label: 'Cabello', ordering: 1 },
  { label: 'Manicure', ordering: 2 },
  { label: 'Pedicure', ordering: 3 },
  { label: 'Tintes', ordering: 4 },
  { label: 'Alisados', ordering: 5 },
  { label: 'Productos', ordering: 6 },
];

export async function seedCategories(ds: DataSource): Promise<Category[]> {
  const repo = ds.getRepository(Category);
  const existing = await repo.count();
  if (existing > 0) return repo.find({ order: { ordering: 'ASC' } });

  for (const c of CATEGORIES) {
    await repo.save(repo.create(c));
  }
  return repo.find({ order: { ordering: 'ASC' } });
}