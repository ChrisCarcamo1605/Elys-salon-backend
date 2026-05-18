import { DataSource } from 'typeorm';
import { UserPreference } from '../../modules/settings/entities/user-preference.entity';
import { User } from '../../modules/staff/entities/user.entity';

export async function seedUserPreferences(
  ds: DataSource,
): Promise<UserPreference[]> {
  const repo = ds.getRepository(UserPreference);
  const existing = await repo.count();
  if (existing > 0) return repo.find();

  const users = await ds.getRepository(User).find();
  const ely = users.find((u) => u.name === 'Ely Martínez')!;
  const maria = users.find((u) => u.name === 'María López')!;

  const prefs: { userId: string; value: Record<string, unknown> }[] = [
    {
      userId: ely.id,
      value: {
        theme: 'light',
        language: 'es',
        notifications: true,
        defaultView: 'sales',
      },
    },
    {
      userId: maria.id,
      value: {
        theme: 'light',
        language: 'es',
        notifications: true,
        defaultView: 'sales',
      },
    },
  ];

  const saved: UserPreference[] = [];
  for (const p of prefs) {
    const pref = repo.create({ userId: p.userId, value: p.value });
    saved.push(await repo.save(pref));
  }
  return saved;
}
