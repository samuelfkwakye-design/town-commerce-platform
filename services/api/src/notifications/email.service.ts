import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend = new Resend(process.env.RESEND_API_KEY);

  async sendAdminPasswordResetEmail(email: string, code: string) {
    const resetLink = `${process.env.OPS_APP_BASE_URL}/ops/reset-password`;

    await this.resend.emails.send({
      from: process.env.EMAIL_FROM || 'Somame <onboarding@resend.dev>',
      to: email,
      subject: 'Reset your Somame admin password',
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Reset your Somame admin password</h2>
          <p>We received a request to reset your password.</p>
          <p>Your reset code is:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 4px; margin: 16px 0;">
            ${code}
          </div>
          <p>This code expires in 15 minutes.</p>
          <p>You can reset your password here:</p>
          <p>
            <a href="${resetLink}" target="_blank" rel="noopener noreferrer">
              ${resetLink}
            </a>
          </p>
        </div>
      `,
    });
  }
}
