import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminJwtGuard } from '../admin-auth/guards/admin-jwt.guard';
import { RolesGuard } from '../admin-auth/roles.guard';
import { CloudinaryService } from './cloudinary.service';

@Controller('admin/uploads')
@UseGuards(AdminJwtGuard, RolesGuard)
export class UploadsController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Get('cloudinary-signature')
  getCloudinarySignature(@Query('folder') folder?: string) {
    return this.cloudinary.getUploadSignature(folder);
  }
}