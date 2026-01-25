import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { TownProductsService } from './town-products.service';
import { CreateTownProductDto } from './dto/create-town-product.dto';
import { UpdateTownProductDto } from './dto/update-town-product.dto';

@Controller('town-products')
export class TownProductsController {
  constructor(private readonly service: TownProductsService) {}

  @Post()
  create(@Body() dto: CreateTownProductDto) {
    return this.service.create(dto);
  }

  // /api/v1/town-products?townId=...&productId=...&isActive=true
  @Get()
  findAll(
    @Query('townId') townId?: string,
    @Query('productId') productId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.findAll({
      townId,
      productId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTownProductDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
