import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentCustomer } from '../customer-auth/customer-auth.decorator';
import { CustomerAuthGuard } from '../customer-auth/customer-auth.guard';
import { CreateCustomerAddressDto } from './dto/create-customer-address.dto';
import { UpdateCustomerAddressDto } from './dto/update-customer-address.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';
import { CustomersService } from './customers.service';

@UseGuards(CustomerAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get('me')
  getMe(@CurrentCustomer() customer: any) {
    return this.customersService.getMe(customer.id);
  }

  @Patch('me')
  updateMe(
    @CurrentCustomer() customer: any,
    @Body() dto: UpdateCustomerProfileDto,
  ) {
    return this.customersService.updateMe(customer.id, dto);
  }

  /**
   * NEW: update customer's default town
   */
  @Patch('me/default-town')
  updateDefaultTown(
    @CurrentCustomer() customer: any,
    @Body() body: { defaultTownId?: string },
  ) {
    return this.customersService.updateDefaultTown(
      customer.id,
      body?.defaultTownId,
    );
  }

  @Get('me/addresses')
  listAddresses(@CurrentCustomer() customer: any) {
    return this.customersService.listAddresses(customer.id);
  }

  @Post('me/addresses')
  createAddress(
    @CurrentCustomer() customer: any,
    @Body() dto: CreateCustomerAddressDto,
  ) {
    return this.customersService.createAddress(customer.id, dto);
  }

  @Patch('me/addresses/:addressId')
  updateAddress(
    @CurrentCustomer() customer: any,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateCustomerAddressDto,
  ) {
    return this.customersService.updateAddress(customer.id, addressId, dto);
  }

  @Delete('me/addresses/:addressId')
  deleteAddress(
    @CurrentCustomer() customer: any,
    @Param('addressId') addressId: string,
  ) {
    return this.customersService.deleteAddress(customer.id, addressId);
  }

  @Post('me/addresses/:addressId/default')
  setDefaultAddress(
    @CurrentCustomer() customer: any,
    @Param('addressId') addressId: string,
  ) {
    return this.customersService.setDefaultAddress(customer.id, addressId);
  }

  @Get('me/orders')
  listOrders(@CurrentCustomer() customer: any) {
    return this.customersService.listOrders(customer.id);
  }

  @Get('me/orders/:orderId')
  getOrder(
    @CurrentCustomer() customer: any,
    @Param('orderId') orderId: string,
  ) {
    return this.customersService.getOrder(customer.id, orderId);
  }
}