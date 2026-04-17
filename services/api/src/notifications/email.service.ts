import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private get resend(): Resend | null {
    const apiKey = process.env.RESEND_API_KEY?.trim();

    if (!apiKey) {
      return null;
    }

    return new Resend(apiKey);
  }

  private get fromEmail(): string {
    return process.env.RESEND_FROM_EMAIL?.trim() || 'onboarding@resend.dev';
  }

  async sendPasswordResetEmail(params: {
    to: string;
    resetUrl: string;
  }): Promise<void> {
    const client = this.resend;

    if (!client) {
      this.logger.warn(
        `RESEND_API_KEY is not set. Skipping password reset email to ${params.to}`,
      );
      this.logger.log(`Password reset URL: ${params.resetUrl}`);
      return;
    }

    try {
      await client.emails.send({
        from: this.fromEmail,
        to: params.to,
        subject: 'Reset your password',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>Reset your password</h2>
            <p>Click the link below to reset your password:</p>
            <p><a href="${params.resetUrl}">${params.resetUrl}</a></p>
            <p>If you did not request this, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async sendAdminPasswordResetEmail(
    email: string,
    resetCode: string,
  ): Promise<void> {
    const client = this.resend;

    if (!client) {
      this.logger.warn(
        `RESEND_API_KEY is not set. Skipping admin password reset email to ${email}`,
      );
      this.logger.log(`Admin password reset code for ${email}: ${resetCode}`);
      return;
    }

    try {
      await client.emails.send({
        from: this.fromEmail,
        to: email,
        subject: 'Admin password reset code',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5;">
            <h2>Admin password reset</h2>
            <p>Your password reset code is:</p>
            <p style="font-size: 24px; font-weight: 700; letter-spacing: 2px;">
              ${resetCode}
            </p>
            <p>If you did not request this, you can ignore this email.</p>
          </div>
        `,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send admin password reset email: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}