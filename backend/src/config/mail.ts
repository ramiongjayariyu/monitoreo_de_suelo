import nodemailer, { type SendMailOptions } from 'nodemailer';
import { env } from './env';

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASSWORD,
          }
        : undefined,
    })
  : null;

export async function sendEmail(message: Omit<SendMailOptions, 'from'>): Promise<void> {
  if (!transporter) {
    throw new Error('El envío de correo requiere configurar SMTP_HOST en el archivo .env.');
  }

  await transporter.sendMail({
    ...message,
    from: env.SMTP_FROM,
  });
}
