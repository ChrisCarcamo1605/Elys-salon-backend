import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './entities/setting.entity';
import { UserPreference } from './entities/user-preference.entity';
import { AppLogger } from '../../common/utils/logger';

@Injectable()
export class SettingsService {
  private readonly logger = new AppLogger(SettingsService.name);

  constructor(
    @InjectRepository(Setting) private settingRepo: Repository<Setting>,
    @InjectRepository(UserPreference)
    private prefRepo: Repository<UserPreference>,
  ) {}

  async getAll() {
    try {
      const settings = await this.settingRepo.find();
      const result: Record<string, any> = {};
      for (const s of settings) result[s.key] = s.value;
      this.logger.infoWithContext('Settings retrieved', {
        count: Object.keys(result).length,
      });
      return { sections: this.buildSections(result), ...result };
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to retrieve settings',
        error,
      });
      throw error;
    }
  }

  private buildSections(values: Record<string, any>) {
    return [
      {
        id: 'business',
        group: 'General',
        label: 'Datos del negocio',
        desc: 'Nombre, dirección y contacto de la salon.',
        kind: 'form',
        icon: 'Store',
        fields: [
          { key: 'businessName', label: 'Nombre del negocio', value: values.businessName ?? "Ely's Salón de Belleza" },
          { key: 'address', label: 'Dirección', value: values.address ?? '' },
          { key: 'phone', label: 'Teléfono', value: values.phone ?? '' },
          { key: 'email', label: 'Email', value: values.email ?? '' },
        ],
      },
      {
        id: 'hours',
        group: 'General',
        label: 'Horarios',
        desc: 'Días y horarios de atención.',
        kind: 'hours',
        icon: 'Clock',
        schedule: values.schedule ?? [
          { day: 'Lunes', open: '09:00', close: '19:00', on: true },
          { day: 'Martes', open: '09:00', close: '19:00', on: true },
          { day: 'Miércoles', open: '09:00', close: '19:00', on: true },
          { day: 'Jueves', open: '09:00', close: '19:00', on: true },
          { day: 'Viernes', open: '09:00', close: '19:00', on: true },
          { day: 'Sábado', open: '09:00', close: '17:00', on: true },
          { day: 'Domingo', open: '09:00', close: '17:00', on: false },
        ],
      },
      {
        id: 'receipt',
        group: 'General',
        label: 'Ticket',
        desc: 'Encabezado y pie del ticket.',
        kind: 'receipt',
        icon: 'Receipt',
      },
      {
        id: 'tax',
        group: 'General',
        label: 'Impuestos',
        desc: 'Configuración de IVA.',
        kind: 'tax',
        icon: 'Percent',
      },
      {
        id: 'goals',
        group: 'Equipo',
        label: 'Metas',
        desc: 'Metas mensuales por estilista.',
        kind: 'goals',
        icon: 'Target',
      },
      {
        id: 'commissions',
        group: 'Equipo',
        label: 'Comisiones',
        desc: 'Reglas de comisiones por producto/servicio.',
        kind: 'commissions',
        icon: 'DollarSign',
      },
      {
        id: 'lock-time',
        group: 'Seguridad',
        label: 'Bloqueo de pantalla',
        desc: 'Tiempo de inactividad antes de bloquear.',
        kind: 'lock-time',
        icon: 'Lock',
      },
      {
        id: 'payments',
        group: 'Seguridad',
        label: 'Métodos de pago',
        desc: 'Activar o desactivar métodos de pago.',
        kind: 'payments',
        icon: 'CreditCard',
      },
      {
        id: 'appearance',
        group: 'Sistema',
        label: 'Apariencia',
        desc: 'Tema, colores y densidad.',
        kind: 'appearance',
        icon: 'Palette',
      },
      {
        id: 'backup',
        group: 'Sistema',
        label: 'Respaldo',
        desc: 'Exportar e importar base de datos.',
        kind: 'backup',
        icon: 'Database',
      },
    ];
  }

  async getByKey(key: string) {
    try {
      const s = await this.settingRepo.findOne({ where: { key } });
      if (!s) {
        this.logger.errorWithContext({
          message: 'Setting not found',
          context: { key },
        });
        throw new NotFoundException(`Setting no encontrado (Key: ${key})`);
      }
      return s.value;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.errorWithContext({
        message: 'Failed to retrieve setting',
        error,
        context: { key },
      });
      throw error;
    }
  }

  async upsert(key: string, value: Record<string, unknown>) {
    try {
      this.logger.infoWithContext('Upserting setting', { key });
      await this.settingRepo.save({ key, value });
      const result = await this.settingRepo.findOne({ where: { key } });
      this.logger.infoWithContext('Setting upserted successfully', { key });
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to upsert setting',
        error,
        context: { key },
      });
      throw error;
    }
  }

  async upsertAll(items: { key: string; value: Record<string, unknown> }[]) {
    try {
      this.logger.infoWithContext('Upserting multiple settings', {
        count: items.length,
      });
      for (const item of items) {
        await this.settingRepo.save({ key: item.key, value: item.value });
      }
      const result = await this.getAll();
      this.logger.infoWithContext('Settings batch upserted successfully', {
        count: items.length,
      });
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to batch upsert settings',
        error,
        context: { count: items.length },
      });
      throw error;
    }
  }

  async triggerBackup() {
    try {
      this.logger.infoWithContext('Backup triggered');
      const result = {
        at: new Date().toISOString(),
        sizeBytes: 0,
        message: 'Backup triggered. Implementation pending.',
      };
      this.logger.infoWithContext('Backup trigger completed', result);
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to trigger backup',
        error,
      });
      throw error;
    }
  }

  async getPreferences(userId: string) {
    try {
      this.logger.infoWithContext('Getting user preferences', { userId });
      const pref = await this.prefRepo.findOne({ where: { userId } });
      const result = pref?.value ?? {};
      this.logger.infoWithContext('User preferences retrieved', {
        userId,
        hasPreferences: !!pref,
      });
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to retrieve user preferences',
        error,
        context: { userId },
      });
      throw error;
    }
  }

  async updatePreferences(userId: string, value: Record<string, unknown>) {
    try {
      this.logger.infoWithContext('Updating user preferences', {
        userId,
        keys: Object.keys(value),
      });
      await this.prefRepo.save({ userId, value });
      const result = await this.getPreferences(userId);
      this.logger.infoWithContext('User preferences updated successfully', {
        userId,
      });
      return result;
    } catch (error) {
      this.logger.errorWithContext({
        message: 'Failed to update user preferences',
        error,
        context: { userId },
      });
      throw error;
    }
  }
}
