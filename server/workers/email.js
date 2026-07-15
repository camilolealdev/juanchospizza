import { Worker } from 'bullmq';
import { redis } from '../redis.js';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const templates = {
  orderConfirmation: (data) => ({
    subject: `Confirmación de pedido #${data.orderNumber}`,
    html: `
      <h1>¡Gracias por tu pedido, ${data.customerName}!</h1>
      <p>Tu pedido <strong>#${data.orderNumber}</strong> ha sido confirmado.</p>
      <p>Total: $${data.total}</p>
      <p>Tiempo estimado: ${data.estimatedTime} min</p>
    `,
  }),
  passwordReset: (data) => ({
    subject: 'Restablece tu contraseña',
    html: `
      <h1>Restablecer contraseña</h1>
      <p>Haz clic en el enlace: <a href="${data.resetUrl}">${data.resetUrl}</a></p>
      <p>Expira en 1 hora.</p>
    `,
  }),
  welcome: (data) => ({
    subject: '¡Bienvenido a Guido Pizza!',
    html: `
      <h1>¡Hola ${data.name}!</h1>
      <p>Gracias por registrarte. Disfruta de un 10% de descuento en tu primer pedido con código: <strong>WELCOME10</strong></p>
    `,
  }),
};

export const emailWorker = new Worker(
  'email',
  async (job) => {
    const { to, template, data, subject, html, text } = job.data;

    let mailOptions = { from: process.env.SMTP_FROM || 'Guido Pizza <noreply@guidopizza.com>', to };

    if (template && templates[template]) {
      const rendered = templates[template](data);
      mailOptions = { ...mailOptions, ...rendered };
    } else {
      mailOptions = { ...mailOptions, subject, html, text };
    }

    const info = await transporter.sendMail(mailOptions);
    return { messageId: info.messageId };
  },
  { connection: redis, concurrency: 10 }
);

emailWorker.on('completed', (job) => console.log(`[Email] Job ${job.id} sent`));
emailWorker.on('failed', (job, err) => console.error(`[Email] Job ${job?.id} failed:`, err.message));

console.log('[Worker] Email worker started');
