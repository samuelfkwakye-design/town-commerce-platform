import { Body, Controller, Get, Post } from '@nestjs/common';
import { TownsService } from './towns.service';

@Controller('towns')
export class TownsController {
  constructor(private readonly towns: TownsService) {}

  @Get()
  list() {
    return this.towns.list();
  }

  @Post()
  create(@Body() body: { name?: string }) {
    return this.towns.create(body?.name ?? '');
  }
}

