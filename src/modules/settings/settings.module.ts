import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Setting } from './entities/setting.entity';
import { UserPreference } from './entities/user-preference.entity';
import { SettingsService } from './settings.service';
import {
  SettingsController,
  PreferencesController,
} from './settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Setting, UserPreference])],
  controllers: [SettingsController, PreferencesController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
