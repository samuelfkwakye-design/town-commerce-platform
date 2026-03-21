import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../../auth/admin-key.guard';
import { AdminCustomersService } from './admin-customers.service';

@UseGuards(AdminKeyGuard)
@Controller('admin/customers')
export class AdminCustomersController {
  constructor(
    private readonly adminCustomersService: AdminCustomersService,
  ) {}

  @Get()
  listCustomers(
    @Query('search') search?: string,
    @Query('townId') townId?: string,
  ) {
    return this.adminCustomersService.listCustomers({
      search,
      townId,
    });
  }
}