import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private repo: Repository<AuditLog>) {}

  async log(data: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    payload?: any;
  }) {
    const entry = this.repo.create({
      userId: data.userId ?? undefined,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId ?? undefined,
      payload: data.payload ?? undefined,
    });
    return this.repo.save(entry);
  }

  async findAll(page = 1, pageSize = 50) {
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      relations: ['user'],
    });
    return { items, total, page, pageSize };
  }
}
