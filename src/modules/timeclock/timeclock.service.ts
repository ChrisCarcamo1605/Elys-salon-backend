import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { TimeEntry } from './entities/time-entry.entity';
import { User } from '../staff/entities/user.entity';
import { TimeEntrySource } from '../../common/enums';
import { PunchInDto } from './dto/punch.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { ListTimeEntriesDto } from './dto/list-entries.dto';
import { AppLogger } from '../../common/utils/logger';

@Injectable()
export class TimeclockService {
  private readonly logger = new AppLogger(TimeclockService.name);

  constructor(
    @InjectRepository(TimeEntry) private entryRepo: Repository<TimeEntry>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async punchIn(userId: string): Promise<TimeEntry> {
    try {
      this.logger.infoWithContext('User punching in', { userId });

      const openEntries = await this.entryRepo.find({
        where: { userId, outAt: IsNull() },
      });
      if (openEntries.length > 0) {
        this.logger.warnWithContext(
          'User has open time entries, auto-closing all',
          {
            userId,
            count: openEntries.length,
            entryIds: openEntries.map((e) => e.id),
          },
        );
        for (const entry of openEntries) {
          entry.outAt = entry.inAt;
          entry.durationMins = 0;
          entry.source = TimeEntrySource.MANUAL;
        }
        await this.entryRepo.save(openEntries);
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];

      const entry = this.entryRepo.create({
        userId,
        date: today,
        inAt: timeStr,
        source: TimeEntrySource.UI,
      });
      const saved = await this.entryRepo.save(entry);

      this.logger.infoWithContext('Punch in successful', {
        entryId: saved.id,
        userId,
        date: today,
        inAt: timeStr,
      });

      return saved;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to punch in',
        error,
        context: { userId },
      });
      throw error;
    }
  }

  async punchOut(userId: string): Promise<TimeEntry> {
    try {
      this.logger.infoWithContext('User punching out', { userId });

      const openEntries = await this.entryRepo.find({
        where: { userId, outAt: IsNull() },
        order: { inAt: 'DESC' },
      });
      if (openEntries.length === 0) {
        this.logger.errorWithContext({
          message: 'No open time entry found for punch out',
          context: { userId },
        });
        throw new BadRequestException('No hay entrada abierta');
      }

      const now = new Date().toTimeString().split(' ')[0];
      let saved: TimeEntry;

      for (const entry of openEntries) {
        entry.outAt = now;
        entry.durationMins = this.computeDurationMins(entry.inAt, now);
        entry.source = TimeEntrySource.UI;
      }

      const results = await this.entryRepo.save(openEntries);
      saved = results.find((r) => r.id === openEntries[0].id) ?? results[0];

      this.logger.infoWithContext('Punch out successful', {
        entryId: saved.id,
        userId,
        inAt: saved.inAt,
        outAt: saved.outAt,
        durationMins: saved.durationMins,
        closedCount: openEntries.length,
      });

      return saved;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to punch out',
        error,
        context: { userId },
      });
      throw error;
    }
  }

  async getToday(userId: string, role: string) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const where: any = { date: today };
      if (role !== 'admin') where.userId = userId;

      const result = await this.entryRepo.find({
        where,
        relations: ['user'],
        order: { inAt: 'ASC' },
      });

      this.logger.infoWithContext('Today entries retrieved', {
        count: result.length,
        userId,
        role,
        today,
      });

      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to retrieve today entries',
        error,
        context: { userId, role },
      });
      throw error;
    }
  }

  async getHistory(query: ListTimeEntriesDto) {
    try {
      const qb = this.entryRepo
        .createQueryBuilder('e')
        .leftJoinAndSelect('e.user', 'user')
        .leftJoinAndSelect('e.editedBy', 'editedBy')
        .orderBy('e.date', 'DESC');

      if (query.userId) qb.andWhere('e.userId = :uid', { uid: query.userId });
      if (query.from) qb.andWhere('e.date >= :from', { from: query.from });
      if (query.to) qb.andWhere('e.date <= :to', { to: query.to });

      const result = await qb.getMany();
      this.logger.infoWithContext('History entries retrieved', {
        count: result.length,
        userId: query.userId,
        from: query.from,
        to: query.to,
      });
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to retrieve history entries',
        error,
        context: { query },
      });
      throw error;
    }
  }

  async updateEntry(
    id: string,
    dto: UpdateEntryDto,
    editedById: string,
  ): Promise<TimeEntry> {
    try {
      this.logger.infoWithContext('Updating time entry', {
        id,
        editedById,
        changes: Object.keys(dto),
      });

      const entry = await this.entryRepo.findOne({ where: { id } });
      if (!entry) {
        this.logger.errorWithContext({
          message: 'Time entry not found for update',
          context: { id, editedById },
        });
        throw new BadRequestException('Entrada no encontrada');
      }

      const oldInAt = entry.inAt;
      const oldOutAt = entry.outAt;

      entry.inAt = dto.inAt;
      entry.outAt = dto.outAt ?? null;
      entry.durationMins = entry.outAt
        ? this.computeDurationMins(entry.inAt, entry.outAt)
        : null;
      entry.source = TimeEntrySource.MANUAL;
      entry.editedById = editedById;

      const saved = await this.entryRepo.save(entry);

      this.logger.infoWithContext('Time entry updated successfully', {
        id: saved.id,
        oldInAt,
        newInAt: dto.inAt,
        oldOutAt,
        newOutAt: dto.outAt,
        durationMins: saved.durationMins,
        editedById,
      });

      return saved;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to update time entry',
        error,
        context: { id, dto, editedById },
      });
      throw error;
    }
  }

  private computeDurationMins(inAt: string, outAt: string): number {
    try {
      const [inH, inM] = inAt.split(':').map(Number);
      const [outH, outM] = outAt.split(':').map(Number);
      return outH * 60 + outM - (inH * 60 + inM);
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to compute duration',
        error,
        context: { inAt, outAt },
      });
      throw error;
    }
  }

  async getSummary(range: 'week' | 'biweek' | 'month', userId?: string) {
    try {
      this.logger.infoWithContext('Getting time summary', { range, userId });

      const now = new Date();
      let from: Date;
      if (range === 'week') {
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (range === 'biweek') {
        from = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
      } else {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const qb = this.entryRepo
        .createQueryBuilder('e')
        .leftJoinAndSelect('e.user', 'user')
        .where('e.date >= :from', { from: from.toISOString().split('T')[0] })
        .andWhere('e.outAt IS NOT NULL');

      if (userId) qb.andWhere('e.userId = :uid', { uid: userId });

      const entries = await qb.getMany();
      const users = await this.userRepo.find({
        where: [{ status: 'activa' as any }],
      });

      const summary = users.map((u) => {
        const userEntries = entries.filter((e) => e.userId === u.id);
        let totalMinutes = 0;
        for (const e of userEntries) {
          if (e.outAt) {
            const [inH, inM] = e.inAt.split(':').map(Number);
            const [outH, outM] = e.outAt.split(':').map(Number);
            totalMinutes += outH * 60 + outM - (inH * 60 + inM);
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

      this.logger.infoWithContext('Summary generated', {
        range,
        usersCount: summary.length,
        totalEntries: entries.length,
      });

      return summary;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to get time summary',
        error,
        context: { range, userId },
      });
      throw error;
    }
  }
}
