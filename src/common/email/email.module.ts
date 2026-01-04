import { Module } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email.interface';
import { EmailService, ResendEmailProvider } from './email.service';

@Module({
  providers: [
    {
      provide: EMAIL_PROVIDER,
      useClass: ResendEmailProvider,
    },
    EmailService,
  ],
  exports: [EmailService, EMAIL_PROVIDER],
})
export class EmailModule {}
