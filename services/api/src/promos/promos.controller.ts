import { Body, Controller, Post } from '@nestjs/common';
import { PromosService } from './promos.service';
import { CreatePromoDto } from './dto/create-promo.dto';

@Controller('promos')
export class PromosController {
  constructor(private readonly service: PromosService) {}

  @Post()
  create(@Body() dto: CreatePromoDto) {
    return this.service.createPromo(dto);
  }

  @Post('validate')
  validate(@Body() body: { code: string }) {
    return this.service.validatePromo(body.code);
  }
}