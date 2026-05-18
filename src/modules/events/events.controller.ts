import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('events')
@Controller('events')
export class EventsController {
  @Get()
  findAll() {
    return { message: 'WebSocket endpoint available at /v1/events?token=...' };
  }
}
