import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminDriversService } from './admin-drivers.service';
import { AdminKeyGuard } from '../../auth/admin-key.guard';
import { CreateDriverDto } from './dto/create-driver.dto';
import { UpdateDriverDto } from './dto/update-driver.dto';

@Controller('admin/drivers')
@UseGuards(AdminKeyGuard)
export class AdminDriversController {
  constructor(private readonly service: AdminDriversService) {}

  @Get()
  async list(
    @Query('townId') townId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    if (!townId) {
      throw new BadRequestException('townId is required');
    }

    const includeInactiveValue =
      includeInactive === undefined ? true : includeInactive === 'true';

    return this.service.listByTown(townId, includeInactiveValue);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    return this.service.getById(id);
  }

  @Get(':id/orders')
  async getDriverOrders(@Param('id') id: string) {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    return this.service.getOrders(id);
  }

  @Post()
  async create(@Body() dto: CreateDriverDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDriverDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/availability')
  async setAvailability(
    @Param('id') id: string,
    @Body('availability') availability: 'AVAILABLE' | 'BUSY' | 'OFFLINE',
  ) {
    if (!availability) {
      throw new BadRequestException('availability is required');
    }

    return this.service.setAvailability(id, availability);
  }

  @Patch(':id/active')
  async setActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    if (typeof isActive !== 'boolean') {
      throw new BadRequestException('isActive must be a boolean');
    }

    return this.service.setActive(id, isActive);
  }
}