
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminKeyGuard } from '../auth/admin-key.guard';
import { CloudinaryService } from './cloudinary.service';

@Controller('admin/uploads')
@UseGuards(AdminKeyGuard)
export class UploadsController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Get('cloudinary-signature')
  getCloudinarySignature(@Query('folder') folder?: string) {
    return this.cloudinary.getUploadSignature(folder);
  }
}