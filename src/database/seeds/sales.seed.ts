import { DataSource } from 'typeorm';
import { Sale } from '../../modules/sales/entities/sale.entity';
import { SaleLine } from '../../modules/sales/entities/sale-line.entity';
import { SalePayment } from '../../modules/sales/entities/sale-payment.entity';
import { CatalogItem } from '../../modules/catalog/entities/catalog-item.entity';
import { User } from '../../modules/staff/entities/user.entity';
import {
  SaleStatus,
  ItemType,
  DiscountKind,
  PaymentMethod,
} from '../../common/enums';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function seedSales(ds: DataSource): Promise<Sale[]> {
  const saleRepo = ds.getRepository(Sale);
  const lineRepo = ds.getRepository(SaleLine);
  const paymentRepo = ds.getRepository(SalePayment);

  const existing = await saleRepo.count();
  if (existing > 0) return saleRepo.find();

  const users = await ds.getRepository(User).find();
  const ely = users.find((u) => u.name === 'Ely Martínez')!;
  const maria = users.find((u) => u.name === 'María López')!;

  const catalog = await ds.getRepository(CatalogItem).find();
  const corte = catalog.find((i) => i.name === 'Corte de cabello')!;
  const tinte = catalog.find((i) => i.name === 'Tinte de cabello')!;
  const manicure = catalog.find((i) => i.name === 'Manicure')!;
  const pedicure = catalog.find((i) => i.name === 'Pedicure')!;
  const alisado = catalog.find((i) => i.name === 'Alisado keratina')!;
  const shampoo = catalog.find((i) => i.name === 'Shampoo profesional')!;
  const acondicionador = catalog.find((i) => i.name === 'Acondicionador')!;
  const tratamiento = catalog.find((i) => i.name === 'Tratamiento capilar')!;

  const salesData: Partial<Sale>[] = [
    {
      employeeId: ely.id,
      customerName: 'Ana García',
      customerPhone: '555-0101',
      customerIsNew: false,
      subtotal: 150,
      discountTotal: 0,
      total: 150,
      tip: 20,
      status: SaleStatus.COMPLETED,
      createdAt: daysAgo(14),
    },
    {
      employeeId: maria.id,
      customerName: 'Laura Romero',
      customerPhone: '555-0102',
      customerIsNew: true,
      subtotal: 120,
      discountTotal: 0,
      total: 120,
      tip: 10,
      status: SaleStatus.COMPLETED,
      createdAt: daysAgo(12),
    },
    {
      employeeId: ely.id,
      customerName: 'Sofía Hernández',
      customerPhone: '555-0103',
      customerIsNew: false,
      subtotal: 500,
      discountTotal: 50,
      total: 450,
      tip: 40,
      status: SaleStatus.COMPLETED,
      createdAt: daysAgo(10),
    },
    {
      employeeId: maria.id,
      customerName: 'Carmen Ruiz',
      customerPhone: '555-0104',
      customerIsNew: true,
      subtotal: 140,
      discountTotal: 0,
      total: 140,
      tip: 15,
      status: SaleStatus.COMPLETED,
      createdAt: daysAgo(8),
    },
    {
      employeeId: ely.id,
      customerName: 'Valentina Díaz',
      customerPhone: '555-0105',
      customerIsNew: true,
      subtotal: 1350,
      discountTotal: 0,
      total: 1350,
      tip: 100,
      status: SaleStatus.COMPLETED,
      createdAt: daysAgo(7),
    },
    {
      employeeId: maria.id,
      customerName: 'Isabel Mendoza',
      customerPhone: '555-0106',
      customerIsNew: false,
      subtotal: 270,
      discountTotal: 0,
      total: 270,
      tip: 25,
      status: SaleStatus.COMPLETED,
      createdAt: daysAgo(5),
    },
    {
      employeeId: ely.id,
      customerName: 'Patricia Flores',
      customerPhone: '555-0107',
      customerIsNew: false,
      subtotal: 330,
      discountTotal: 30,
      total: 300,
      tip: 30,
      status: SaleStatus.COMPLETED,
      createdAt: daysAgo(3),
    },
    {
      employeeId: maria.id,
      customerName: 'Gabriela Torres',
      customerPhone: '555-0108',
      customerIsNew: true,
      subtotal: 620,
      discountTotal: 0,
      total: 620,
      tip: 50,
      status: SaleStatus.COMPLETED,
      createdAt: daysAgo(2),
    },
    {
      employeeId: ely.id,
      customerName: 'Diana Sánchez',
      customerPhone: '555-0109',
      customerIsNew: false,
      subtotal: 500,
      discountTotal: 0,
      total: 500,
      tip: 0,
      status: SaleStatus.VOIDED,
      createdAt: daysAgo(1),
    },
    {
      employeeId: maria.id,
      customerName: 'Rosa Vargas',
      customerPhone: '555-0110',
      customerIsNew: true,
      subtotal: 290,
      discountTotal: 0,
      total: 290,
      tip: 30,
      status: SaleStatus.COMPLETED,
      createdAt: daysAgo(0),
    },
  ];

  const linesData: {
    saleIdx: number;
    itemId: string;
    itemType: ItemType;
    itemName: string;
    basePrice: number;
    price: number;
    qty: number;
    discountKind?: DiscountKind;
    discountValue?: number;
  }[] = [
    {
      saleIdx: 0,
      itemId: corte.id,
      itemType: ItemType.SERVICE,
      itemName: 'Corte de cabello',
      basePrice: 150,
      price: 150,
      qty: 1,
    },
    {
      saleIdx: 1,
      itemId: manicure.id,
      itemType: ItemType.SERVICE,
      itemName: 'Manicure',
      basePrice: 120,
      price: 120,
      qty: 1,
    },
    {
      saleIdx: 2,
      itemId: tinte.id,
      itemType: ItemType.SERVICE,
      itemName: 'Tinte de cabello',
      basePrice: 500,
      price: 450,
      qty: 1,
      discountKind: DiscountKind.AMOUNT,
      discountValue: 50,
    },
    {
      saleIdx: 3,
      itemId: pedicure.id,
      itemType: ItemType.SERVICE,
      itemName: 'Pedicure',
      basePrice: 140,
      price: 140,
      qty: 1,
    },
    {
      saleIdx: 4,
      itemId: alisado.id,
      itemType: ItemType.SERVICE,
      itemName: 'Alisado keratina',
      basePrice: 1200,
      price: 1200,
      qty: 1,
    },
    {
      saleIdx: 4,
      itemId: corte.id,
      itemType: ItemType.SERVICE,
      itemName: 'Corte de cabello',
      basePrice: 150,
      price: 150,
      qty: 1,
    },
    {
      saleIdx: 5,
      itemId: manicure.id,
      itemType: ItemType.SERVICE,
      itemName: 'Manicure',
      basePrice: 120,
      price: 120,
      qty: 1,
    },
    {
      saleIdx: 5,
      itemId: pedicure.id,
      itemType: ItemType.SERVICE,
      itemName: 'Pedicure',
      basePrice: 140,
      price: 140,
      qty: 1,
    },
    {
      saleIdx: 5,
      itemId: shampoo.id,
      itemType: ItemType.PRODUCT,
      itemName: 'Shampoo profesional',
      basePrice: 180,
      price: 180,
      qty: 1,
    },
    {
      saleIdx: 6,
      itemId: tinte.id,
      itemType: ItemType.SERVICE,
      itemName: 'Tinte de cabello',
      basePrice: 500,
      price: 450,
      qty: 1,
      discountKind: DiscountKind.PERCENT,
      discountValue: 10,
    },
    {
      saleIdx: 6,
      itemId: corte.id,
      itemType: ItemType.SERVICE,
      itemName: 'Corte de cabello',
      basePrice: 150,
      price: 150,
      qty: 1,
    },
    {
      saleIdx: 6,
      itemId: tratamiento.id,
      itemType: ItemType.PRODUCT,
      itemName: 'Tratamiento capilar',
      basePrice: 350,
      price: 350,
      qty: 1,
    },
    {
      saleIdx: 7,
      itemId: alisado.id,
      itemType: ItemType.SERVICE,
      itemName: 'Alisado keratina',
      basePrice: 1200,
      price: 1200,
      qty: 1,
    },
    {
      saleIdx: 7,
      itemId: acondicionador.id,
      itemType: ItemType.PRODUCT,
      itemName: 'Acondicionador',
      basePrice: 200,
      price: 200,
      qty: 1,
    },
    {
      saleIdx: 8,
      itemId: tinte.id,
      itemType: ItemType.SERVICE,
      itemName: 'Tinte de cabello',
      basePrice: 500,
      price: 500,
      qty: 1,
    },
    {
      saleIdx: 9,
      itemId: corte.id,
      itemType: ItemType.SERVICE,
      itemName: 'Corte de cabello',
      basePrice: 150,
      price: 150,
      qty: 1,
    },
    {
      saleIdx: 9,
      itemId: manicure.id,
      itemType: ItemType.SERVICE,
      itemName: 'Manicure',
      basePrice: 120,
      price: 120,
      qty: 1,
    },
    {
      saleIdx: 9,
      itemId: shampoo.id,
      itemType: ItemType.PRODUCT,
      itemName: 'Shampoo profesional',
      basePrice: 180,
      price: 180,
      qty: 1,
    },
  ];

  const paymentsData: {
    saleIdx: number;
    method: PaymentMethod;
    amount: number;
    cardLast4?: string;
    cardBrand?: string;
  }[] = [
    { saleIdx: 0, method: PaymentMethod.CASH, amount: 170 },
    {
      saleIdx: 1,
      method: PaymentMethod.CARD,
      amount: 120,
      cardLast4: '1234',
      cardBrand: 'Visa',
    },
    { saleIdx: 2, method: PaymentMethod.CASH, amount: 490 },
    { saleIdx: 3, method: PaymentMethod.TRANSFER, amount: 155 },
    {
      saleIdx: 4,
      method: PaymentMethod.CARD,
      amount: 1450,
      cardLast4: '5678',
      cardBrand: 'Mastercard',
    },
    { saleIdx: 5, method: PaymentMethod.CASH, amount: 295 },
    {
      saleIdx: 6,
      method: PaymentMethod.CARD,
      amount: 950,
      cardLast4: '9012',
      cardBrand: 'Visa',
    },
    { saleIdx: 6, method: PaymentMethod.CASH, amount: 250 },
    { saleIdx: 7, method: PaymentMethod.TRANSFER, amount: 1400 },
    { saleIdx: 7, method: PaymentMethod.CASH, amount: 220 },
    { saleIdx: 8, method: PaymentMethod.CASH, amount: 500 },
    {
      saleIdx: 9,
      method: PaymentMethod.CARD,
      amount: 290,
      cardLast4: '3456',
      cardBrand: 'Visa',
    },
  ];

  const voidedSale = salesData[8];
  if (voidedSale) {
    voidedSale.voidedById = ely.id;
    voidedSale.voidedAt = daysAgo(1);
  }

  const savedSales: Sale[] = [];
  for (const saleData of salesData) {
    const sale = saleRepo.create(saleData);
    const saved = await saleRepo.save(sale);
    savedSales.push(saved);
  }

  for (const lineData of linesData) {
    const sale = savedSales[lineData.saleIdx];
    const { saleIdx, ...rest } = lineData;
    await lineRepo.save(
      lineRepo.create({ ...rest, saleId: sale.id } as Partial<SaleLine>),
    );
  }

  for (const payData of paymentsData) {
    const sale = savedSales[payData.saleIdx];
    const { saleIdx, ...rest } = payData;
    await paymentRepo.save(
      paymentRepo.create({ ...rest, saleId: sale.id } as Partial<SalePayment>),
    );
  }

  return savedSales;
}
