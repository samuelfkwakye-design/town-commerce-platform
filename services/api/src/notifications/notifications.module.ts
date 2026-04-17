import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';
import { ArkeselSmsService } from './arkesel-sms.service';

@Module({
  imports: [HttpModule],
  providers: [NotificationsService, EmailService, ArkeselSmsService],
  exports: [NotificationsService, EmailService],
})
export class NotificationsModule {}