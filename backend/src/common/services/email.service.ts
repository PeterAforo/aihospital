import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      logger.warn('SMTP not configured. Emails will be logged to console.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResponse> {
    const { to, subject, html, text } = options;
    const from = process.env.SMTP_FROM || 'MediCare Ghana <noreply@medicaregha.com>';

    if (!this.transporter) {
      logger.info(`[DEV MODE] Email to ${to}:`);
      logger.info(`Subject: ${subject}`);
      logger.info(`Body: ${text || html}`);
      return { success: true, messageId: 'dev-mode-' + Date.now() };
    }

    try {
      const result = await this.transporter.sendMail({
        from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>/g, ''),
      });

      logger.info(`Email sent to ${to}: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      logger.error(`Email error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async sendOTP(email: string, code: string): Promise<SendEmailResponse> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">MediCare Ghana</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Verify Your Email</h2>
          <p style="color: #6b7280;">Use the following code to complete your registration:</p>
          <div style="background: white; border: 2px dashed #d1d5db; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1e40af;">${code}</span>
          </div>
          <p style="color: #6b7280; font-size: 14px;">This code expires in 10 minutes. Do not share it with anyone.</p>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>© ${new Date().getFullYear()} MediCare Ghana. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Your MediCare Ghana Verification Code',
      html,
      text: `Your MediCare Ghana verification code is: ${code}. Valid for 10 minutes.`,
    });
  }

  async sendWelcome(email: string, name: string, hospitalName: string): Promise<SendEmailResponse> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0;">Welcome to MediCare Ghana!</h1>
        </div>
        <div style="padding: 30px; background: #f9fafb;">
          <h2 style="color: #1f2937;">Hi ${name},</h2>
          <p style="color: #6b7280;">Congratulations! <strong>${hospitalName}</strong> has been successfully registered on MediCare Ghana.</p>
          <p style="color: #6b7280;">You can now:</p>
          <ul style="color: #6b7280;">
            <li>Add patients and manage their records</li>
            <li>Schedule and track appointments</li>
            <li>Process billing and NHIS claims</li>
            <li>Access analytics and reports</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://app.medicaregha.com/login" style="background: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Dashboard</a>
          </div>
        </div>
        <div style="padding: 20px; text-align: center; color: #9ca3af; font-size: 12px;">
          <p>Need help? Contact us at support@medicaregha.com</p>
          <p>© ${new Date().getFullYear()} MediCare Ghana. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `Welcome to MediCare Ghana - ${hospitalName}`,
      html,
    });
  }
}

export const emailService = new EmailService();
