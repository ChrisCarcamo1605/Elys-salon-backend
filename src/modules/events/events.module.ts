import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';

@Module({
  controllers: [EventsController],
  providers: [],
  exports: [],
})
export class EventsModule {}