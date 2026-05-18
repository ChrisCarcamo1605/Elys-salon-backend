import { DataSource } from 'typeorm';
import { CatalogItem } from '../../modules/catalog/entities/catalog-item.entity';
import { Category } from '../../modules/categories/entities/category.entity';
import { ItemType } from '../../common/enums';

const CATALOG_ITEMS: Partial<CatalogItem>[] = [
  {
    name: 'Corte de cabello',
    type: ItemType.SERVICE,
    price: 150,
    cost: 0,
    duration: '30m',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400',
    active: true,
  },
  {
    name: 'Tinte de cabello',
    type: ItemType.SERVICE,
    price: 500,
    cost: 80,
    duration: '2h',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400',
    active: true,
  },
  {
    name: 'Manicure',
    type: ItemType.SERVICE,
    price: 120,
    cost: 15,
    duration: '45m',
    image: 'https://images.unsplash.com/photo-1610992015732-2449b76344bc?w=400',
    active: true,
  },
  {
    name: 'Pedicure',
    type: ItemType.SERVICE,
    price: 140,
    cost: 20,
    duration: '50m',
    image: 'https://images.unsplash.com/photo-1519014816548-bf65fe9251a4?w=400',
    active: true,
  },
  {
    name: 'Alisado keratina',
    type: ItemType.SERVICE,
    price: 1200,
    cost: 200,
    duration: '3h',
    image: 'https://images.unsplash.com/photo-1562322140-8baeececf3d7?w=400',
    active: true,
  },
  {
    name: 'Shampoo profesional',
    type: ItemType.PRODUCT,
    price: 180,
    cost: 90,
    stock: 25,
    stockMin: 5,
    alertEnabled: true,
    brand: 'Kérastase',
    sku: 'KER-SH-001',
    image: 'https://images.unsplash.com/photo-1535585200335-2b209b2943ab?w=400',
    active: true,
  },
  {
    name: 'Acondicionador',
    type: ItemType.PRODUCT,
    price: 200,
    cost: 100,
    stock: 20,
    stockMin: 5,
    alertEnabled: true,
    brand: 'Kérastase',
    sku: 'KER-AC-001',
    image: 'https://images.unsplash.com/photo-1631729371254-42c2892f0e6e?w=400',
    active: true,
  },
  {
    name: 'Tratamiento capilar',
    type: ItemType.PRODUCT,
    price: 350,
    cost: 150,
    stock: 15,
    stockMin: 3,
    alertEnabled: true,
    brand: 'Olaplex',
    sku: 'OLP-TR-001',
    image: 'https://images.unsplash.com/photo-1608248543803-ba4f8c4d9d7b?w=400',
    active: true,
  },
];

export async function seedCatalog(ds: DataSource): Promise<CatalogItem[]> {
  const itemRepo = ds.getRepository(CatalogItem);
  const catRepo = ds.getRepository(Category);
  const categories = await catRepo.find({ order: { ordering: 'ASC' } });

  const existing = await itemRepo.count();
  if (existing > 0) return itemRepo.find();

  const catMap = new Map<string, string>();
  for (const c of categories) catMap.set(c.label, c.id);

  const categoryAssignments: Record<string, string> = {
    'Corte de cabello': 'Cabello',
    'Tinte de cabello': 'Tintes',
    Manicure: 'Manicure',
    Pedicure: 'Pedicure',
    'Alisado keratina': 'Alisados',
    'Shampoo profesional': 'Productos',
    Acondicionador: 'Productos',
    'Tratamiento capilar': 'Productos',
  };

  for (const itemData of CATALOG_ITEMS) {
    const catLabel = categoryAssignments[itemData.name!] ?? 'Productos';
    const categoryId = catMap.get(catLabel);
    await itemRepo.save(
      itemRepo.create({ ...itemData, categoryId: categoryId ?? undefined }),
    );
  }

  return itemRepo.find();
}
