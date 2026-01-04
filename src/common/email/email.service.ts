import { Inject, Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { AppConfigService } from '@/common/config/config.service';
import { buildOtpEmailHtml } from './templates/otp.template';
import { EMAIL_PROVIDER, EmailProvider, SendEmailOptions } from './email.interface';

@Injectable()
export class ResendEmailProvider implements EmailProvider {
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: AppConfigService) {
    this.resend = new Resend(this.config.resend.apiKey);
    this.from = this.config.resend.fromEmail;
  }

  async send(options: SendEmailOptions): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: this.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}

@Injectable()
export class EmailService {
  constructor(@Inject(EMAIL_PROVIDER) private readonly provider: EmailProvider) {}

  async sendOtp(email: string, code: string): Promise<void> {
    await this.provider.send({
      to: email,
      subject: 'Your Password Reset Code',
      html: buildOtpEmailHtml(code),
    });
  }
}
