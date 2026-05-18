import { DataSource } from 'typeorm';
import { TimeEntry } from '../../modules/timeclock/entities/time-entry.entity';
import { User } from '../../modules/staff/entities/user.entity';
import { TimeEntrySource } from '../../common/enums';

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

export async function seedTimeclock(ds: DataSource): Promise<TimeEntry[]> {
  const repo = ds.getRepository(TimeEntry);
  const existing = await repo.count();
  if (existing > 0) return repo.find();

  const users = await ds.getRepository(User).find();
  const ely = users.find(u => u.name === 'Ely Martínez')!;
  const maria = users.find(u => u.name === 'María López')!;

  const entries: Partial<TimeEntry>[] = [
    { userId: ely.id, date: dateStr(14), inAt: '09:00', outAt: '18:00', durationMins: 540, source: TimeEntrySource.UI },
    { userId: ely.id, date: dateStr(13), inAt: '09:00', outAt: '17:30', durationMins: 510, source: TimeEntrySource.UI },
    { userId: ely.id, date: dateStr(12), inAt: '10:00', outAt: '19:00', durationMins: 540, source: TimeEntrySource.UI },
    { userId: ely.id, date: dateStr(11), inAt: '09:00', outAt: '18:00', durationMins: 540, source: TimeEntrySource.UI },
    { userId: ely.id, date: dateStr(10), inAt: '09:30', outAt: '18:30', durationMins: 540, source: TimeEntrySource.UI },
    { userId: ely.id, date: dateStr(9), inAt: '09:00', outAt: '15:00', durationMins: 360, source: TimeEntrySource.MANUAL, editedById: ely.id },
    { userId: ely.id, date: dateStr(7), inAt: '09:00', outAt: '18:00', durationMins: 540, source: TimeEntrySource.UI },
    { userId: ely.id, date: dateStr(6), inAt: '09:00', outAt: '18:30', durationMins: 570, source: TimeEntrySource.UI },
    { userId: ely.id, date: dateStr(5), inAt: '09:00', outAt: '17:00', durationMins: 480, source: TimeEntrySource.UI },
    { userId: ely.id, date: dateStr(3), inAt: '09:00', outAt: '18:00', durationMins: 540, source: TimeEntrySource.UI },
    { userId: ely.id, date: dateStr(2), inAt: '09:00', outAt: '18:00', durationMins: 540, source: TimeEntrySource.UI },
    { userId: ely.id, date: dateStr(1), inAt: '09:00', outAt: '18:00', durationMins: 540, source: TimeEntrySource.UI },
    { userId: ely.id, date: dateStr(0), inAt: '09:00', outAt: null, durationMins: null, source: TimeEntrySource.UI },

    { userId: maria.id, date: dateStr(14), inAt: '10:00', outAt: '18:00', durationMins: 480, source: TimeEntrySource.UI },
    { userId: maria.id, date: dateStr(13), inAt: '10:00', outAt: '19:00', durationMins: 540, source: TimeEntrySource.UI },
    { userId: maria.id, date: dateStr(12), inAt: '10:00', outAt: '18:30', durationMins: 510, source: TimeEntrySource.UI },
    { userId: maria.id, date: dateStr(11), inAt: '09:30', outAt: '18:00', durationMins: 510, source: TimeEntrySource.UI },
    { userId: maria.id, date: dateStr(9), inAt: '10:00', outAt: '18:00', durationMins: 480, source: TimeEntrySource.UI },
    { userId: maria.id, date: dateStr(7), inAt: '10:00', outAt: '18:30', durationMins: 510, source: TimeEntrySource.UI },
    { userId: maria.id, date: dateStr(6), inAt: '09:30', outAt: '17:30', durationMins: 480, source: TimeEntrySource.UI },
    { userId: maria.id, date: dateStr(5), inAt: '10:00', outAt: '18:00', durationMins: 480, source: TimeEntrySource.UI },
    { userId: maria.id, date: dateStr(3), inAt: '10:00', outAt: '19:00', durationMins: 540, source: TimeEntrySource.UI },
    { userId: maria.id, date: dateStr(2), inAt: '10:00', outAt: '18:00', durationMins: 480, source: TimeEntrySource.UI },
    { userId: maria.id, date: dateStr(1), inAt: '10:00', outAt: '18:30', durationMins: 510, source: TimeEntrySource.UI },
    { userId: maria.id, date: dateStr(0), inAt: '10:00', outAt: null, durationMins: null, source: TimeEntrySource.UI },
  ];

  const saved: TimeEntry[] = [];
  for (const data of entries) {
    const entry = repo.create(data as Partial<TimeEntry>);
    saved.push(await repo.save(entry));
  }
  return saved;
}