import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { TimeEntry } from './entities/time-entry.entity';
import { User } from '../staff/entities/user.entity';
import { TimeEntrySource } from '../../common/enums';
import { PunchInDto } from './dto/punch.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { ListTimeEntriesDto } from './dto/list-entries.dto';

@Injectable()
export class TimeclockService {
  constructor(
    @InjectRepository(TimeEntry) private entryRepo: Repository<TimeEntry>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async punchIn(userId: string): Promise<TimeEntry> {
    const today = new Date().toISOString().split('T')[0];
    const existing = await this.entryRepo.findOne({
      where: { userId, date: today, outAt: null as any },
    });
    if (existing) throw new ConflictException('Ya tienes una entrada abierta para hoy');

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const entry = this.entryRepo.create({
      userId,
      date: today,
      inAt: timeStr,
      source: TimeEntrySource.UI,
    });
    return this.entryRepo.save(entry);
  }

  async punchOut(userId: string): Promise<TimeEntry> {
    const today = new Date().toISOString().split('T')[0];
    const entry = await this.entryRepo.findOne({
      where: { userId, date: today, outAt: null as any },
    });
    if (!entry) throw new BadRequestException('No hay entrada abierta para hoy');

    entry.outAt = new Date().toTimeString().split(' ')[0];
    entry.durationMins = this.computeDurationMins(entry.inAt, entry.outAt);
    return this.entryRepo.save(entry);
  }

  async getToday(userId: string, role: string) {
    const today = new Date().toISOString().split('T')[0];
    const where: any = { date: today };
    if (role !== 'admin') where.userId = userId;

    return this.entryRepo.find({
      where,
      relations: ['user'],
      order: { inAt: 'ASC' },
    });
  }

  async getHistory(query: ListTimeEntriesDto) {
    const qb = this.entryRepo.createQueryBuilder('e')
      .leftJoinAndSelect('e.user', 'user')
      .leftJoinAndSelect('e.editedBy', 'editedBy')
      .orderBy('e.date', 'DESC');

    if (query.userId) qb.andWhere('e.userId = :uid', { uid: query.userId });
    if (query.from) qb.andWhere('e.date >= :from', { from: query.from });
    if (query.to) qb.andWhere('e.date <= :to', { to: query.to });

    return qb.getMany();
  }

  async updateEntry(id: string, dto: UpdateEntryDto, editedById: string): Promise<TimeEntry> {
    const entry = await this.entryRepo.findOne({ where: { id } });
    if (!entry) throw new BadRequestException('Entrada no encontrada');

    entry.inAt = dto.inAt;
    entry.outAt = dto.outAt ?? null;
    entry.durationMins = entry.outAt ? this.computeDurationMins(entry.inAt, entry.outAt) : null;
    entry.source = TimeEntrySource.MANUAL;
    entry.editedById = editedById;
    return this.entryRepo.save(entry);
  }

  private computeDurationMins(inAt: string, outAt: string): number {
    const [inH, inM] = inAt.split(':').map(Number);
    const [outH, outM] = outAt.split(':').map(Number);
    return (outH * 60 + outM) - (inH * 60 + inM);
  }

  async getSummary(range: 'week' | 'biweek' | 'month', userId?: string) {
    const now = new Date();
    let from: Date;
    if (range === 'week') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === 'biweek') {
      from = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
    } else {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const qb = this.entryRepo.createQueryBuilder('e')
      .leftJoinAndSelect('e.user', 'user')
      .where('e.date >= :from', { from: from.toISOString().split('T')[0] })
      .andWhere('e.outAt IS NOT NULL');

    if (userId) qb.andWhere('e.userId = :uid', { uid: userId });

    const entries = await qb.getMany();
    const users = await this.userRepo.find({ where: [{ status: 'activa' as any }] });

    const summary = users.map(u => {
      const userEntries = entries.filter(e => e.userId === u.id);
      let totalMinutes = 0;
      for (const e of userEntries) {
        if (e.outAt) {
          const [inH, inM] = e.inAt.split(':').map(Number);
          const [outH, outM] = e.outAt.split(':').map(Number);
          totalMinutes += (outH * 60 + outM) - (inH * 60 + inM);
        }
      }
      const totalHours = totalMinutes / 60;
      const hourlyRate = Number(u.salary) / (8 * 22);
      const estimatedCost = hourlyRate * totalHours;

      return {
        userId: u.id,
        name: u.name,
        totalHours: Math.round(totalHours * 100) / 100,
        totalMinutes,
        hourlyRate: Math.round(hourlyRate * 100) / 100,
        estimatedCost: Math.round(estimatedCost * 100) / 100,
        entries: userEntries,
      };
    });

    return summary;
  }
}