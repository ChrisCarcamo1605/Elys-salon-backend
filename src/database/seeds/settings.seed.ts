import { DataSource } from 'typeorm';
import { Setting } from '../../modules/settings/entities/setting.entity';

const SETTINGS: { key: string; value: Record<string, unknown> }[] = [
  { key: 'business', value: { name: "Ely's Salón", phone: '', email: '', address: '', rfc: '' } },
  { key: 'tax', value: { rate: 0, included: false } },
  { key: 'payments', value: { methods: ['cash', 'card', 'transfer'] } },
  { key: 'lock', value: { timeoutSec: 120 } },
  { key: 'commissions', value: { enabled: true } },
  { key: 'appearance', value: { darkMode: false, accent: '#de0fab', density: 'comfortable' } },
  { key: 'backup', value: { lastBackup: null, autoBackup: false } },
  { key: 'stock_alert_config', value: { defaultMinStock: 3, enabledByDefault: true } },
];

export async function seedSettings(ds: DataSource): Promise<Setting[]> {
  const repo = ds.getRepository(Setting);
  for (const s of SETTINGS) {
    await repo.save({ key: s.key, value: s.value });
  }
  return repo.find();
}