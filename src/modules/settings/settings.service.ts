import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { UserPreference } from './entities/user-preference.entity';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Setting) private settingRepo: Repository<Setting>,
    @InjectRepository(UserPreference) private prefRepo: Repository<UserPreference>,
  ) {}

  async getAll() {
    const settings = await this.settingRepo.find();
    const result: Record<string, any> = {};
    for (const s of settings) result[s.key] = s.value;
    return result;
  }

  async getByKey(key: string) {
    const s = await this.settingRepo.findOne({ where: { key } });
    if (!s) throw new NotFoundException('Setting no encontrado');
    return s.value;
  }

  async upsert(key: string, value: Record<string, unknown>) {
    await this.settingRepo.save({ key, value });
    return this.settingRepo.findOne({ where: { key } });
  }

  async upsertAll(items: { key: string; value: Record<string, unknown> }[]) {
    for (const item of items) {
      await this.settingRepo.save({ key: item.key, value: item.value });
    }
    return this.getAll();
  }

  async triggerBackup() {
    return { at: new Date().toISOString(), sizeBytes: 0, message: 'Backup triggered. Implementation pending.' };
  }

  async getPreferences(userId: string) {
    const pref = await this.prefRepo.findOne({ where: { userId } });
    return pref?.value ?? {};
  }

  async updatePreferences(userId: string, value: Record<string, unknown>) {
    await this.prefRepo.save({ userId, value });
    return this.getPreferences(userId);
  }
}