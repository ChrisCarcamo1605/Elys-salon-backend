import { DataSource } from 'typeorm';
import { Setting } from '../../modules/settings/entities/setting.entity';

const SETTINGS: { key: string; value: Record<string, unknown> }[] = [
  {
    key: 'business',
    value: { name: "Ely's Salón de Belleza", phone: '', email: '', address: '', rfc: '' },
  },
  { key: 'tax', value: { rate: 16, includedInPrice: true } },
  {
    key: 'payments',
    value: {
      methods: [
        { id: 'cash', label: 'Efectivo', on: true },
        { id: 'card', label: 'Tarjeta', on: true },
        { id: 'transfer', label: 'Transferencia', on: true },
        { id: 'voucher', label: 'Vale / Monedero', on: false },
      ],
    },
  },
  {
    key: 'commissions',
    value: {
      rows: [
        { name: 'Corte', rate: 30 },
        { name: 'Tinte', rate: 25 },
        { name: 'Manicure', rate: 35 },
        { name: 'Pedicure', rate: 35 },
        { name: 'Productos (retail)', rate: 10 },
      ],
    },
  },
  {
    key: 'lock',
    value: { timeoutSec: 120, lockAfterSale: true },
  },
  {
    key: 'appearance',
    value: { darkMode: false, accent: '#de0fab', density: 'comfortable' },
  },
  { key: 'backup', value: { lastBackup: null, autoBackup: false } },
  {
    key: 'stock_alert_config',
    value: { defaultMinStock: 3, enabledByDefault: true },
  },
];

export async function seedSettings(ds: DataSource): Promise<Setting[]> {
  const repo = ds.getRepository(Setting);
  for (const s of SETTINGS) {
    await repo.save({ key: s.key, value: s.value });
  }
  return repo.find();
}
