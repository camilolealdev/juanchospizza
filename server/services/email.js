import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, html, text, attachments }) {
  if (!process.env.SMTP_USER) {
    console.warn('[Email] SMTP not configured, skipping email to:', to);
    return { skipped: true };
  }

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || '"Guido Pizza" <noreply@guidopizza.com>',
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
    attachments,
  });

  return { messageId: info.messageId };
}

export async function sendTemplatedEmail({ to, template, data, subject }) {
  const html = renderTemplate(template, data);
  return sendEmail({ to, subject, html });
}

function renderTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] || '');
}

// NOTA: strings planos (no template literals) a propósito. Estas son
// plantillas con sintaxis {{variable}} para renderTemplate(), no para
// interpolación de JavaScript. El $ antes de {{total}} no debe
// interpretarse como ${}.
export const templates = {
  orderConfirmation:
    '<h1>¡Pedido confirmado! 🍕</h1>\n' +
    '<p>Hola {{customerName}},</p>\n' +
    '<p>Tu pedido <strong>#' +
    '{{orderNumber}}</strong> ha sido confirmado.</p>\n' +
    '<p>Total: <strong>${{total}}</strong></p>\n' +
    '<p>Tiempo estimado: {{estimatedTime}} min</p>\n',
  orderReady:
    '<h1>¡Tu pedido está listo! 🎉</h1>\n' +
    '<p>Hola {{customerName}},</p>\n' +
    '<p>Tu pedido <strong>#' +
    '{{orderNumber}}</strong> está listo para {{deliveryType}}.</p>\n',
  welcome:
    '<h1>¡Bienvenido a Guido Pizza! 🍕</h1>\n' +
    '<p>Hola {{customerName}},</p>\n' +
    '<p>Gracias por registrarte. Aquí tienes un 10% de descuento en tu primer pedido:</p>\n' +
    '<p><strong>Código: WELCOME10</strong></p>\n',
  passwordReset:
    '<h1>Restablecer contraseña</h1>\n' +
    '<p>Hola {{customerName}},</p>\n' +
    '<p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>\n' +
    '<p><a href="{{resetLink}}">Restablecer contraseña</a></p>\n' +
    '<p>El enlace expira en 1 hora.</p>\n',
};
