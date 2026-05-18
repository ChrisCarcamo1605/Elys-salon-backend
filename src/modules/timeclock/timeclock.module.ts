import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimeEntry } from './entities/time-entry.entity';
import { User } from '../staff/entities/user.entity';
import { TimeclockService } from './timeclock.service';
import { TimeclockController } from './timeclock.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TimeEntry, User])],
  controllers: [TimeclockController],
  providers: [TimeclockService],
  exports: [TimeclockService],
})
export class TimeclockModule {}
