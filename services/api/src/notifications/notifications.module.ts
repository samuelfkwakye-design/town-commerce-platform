import { Module } from '@nestjs/common';
import { ArkeselSmsService } from './arkesel-sms.service';
import { NotificationsService } from './notifications.service';

@Module({
  providers: [ArkeselSmsService, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}