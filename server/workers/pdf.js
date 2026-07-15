import { Worker } from 'bullmq';
import { redis } from '../redis.js';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

const templates = {
  invoice: async (data) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;
    const write = (text, x = 50, size = 12, bold = false) => {
      page.drawText(text, { x, y, size, font: bold ? fontBold : font, color: rgb(0, 0, 0) });
      y -= size + 4;
    };

    write('GUIDO PIZZA', 50, 24, true);
    write('Factura de Venta', 50, 16, true);
    write('');
    write(`Factura #: ${data.invoiceNumber}`);
    write(`Fecha: ${new Date(data.date).toLocaleDateString('es-CO')}`);
    write(`Cliente: ${data.customerName}`);
    write(`Teléfono: ${data.customerPhone || 'N/A'}`);
    write('');

    write('Detalle:', 50, 14, true);
    data.items.forEach((item, i) => {
      write(`${i + 1}. ${item.name} x${item.qty} - $${item.price * item.qty}`);
    });

    write('');
    write(`Subtotal: $${data.subtotal}`, 50, 12, true);
    write(`Impuestos: $${data.tax}`, 50, 12, true);
    write(`TOTAL: $${data.total}`, 50, 16, true);

    return pdfDoc.save();
  },

  orderTicket: async (data) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([280, 400]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 380;
    const write = (text, x = 10, size = 10, bold = false) => {
      page.drawText(text, { x, y, size, font: bold ? fontBold : font, color: rgb(0, 0, 0) });
      y -= size + 2;
    };

    write('GUIDO PIZZA', 10, 14, true);
    write(`Pedido #${data.orderNumber}`, 10, 12, true);
    write(`Mesa: ${data.table || 'Para llevar'}`);
    write(`Hora: ${new Date().toLocaleTimeString('es-CO')}`);
    write('');

    data.items.forEach((item) => {
      write(`${item.qty}x ${item.name}`);
      if (item.notes) write(`  - ${item.notes}`, 15);
    });

    write('');
    write(`Total: $${data.total}`, 10, 12, true);

    return pdfDoc.save();
  },

  report: async (data) => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;
    const write = (text, x = 50, size = 12, bold = false) => {
      page.drawText(text, { x, y, size, font: bold ? fontBold : font, color: rgb(0, 0, 0) });
      y -= size + 4;
    };

    write('GUIDO PIZZA - REPORTE', 50, 20, true);
    write(`Tipo: ${data.type}`, 50, 14);
    write(`Periodo: ${data.period}`, 50, 12);
    write(`Generado: ${new Date().toLocaleString('es-CO')}`);
    write('');

    if (data.summary) {
      write('Resumen:', 50, 14, true);
      Object.entries(data.summary).forEach(([k, v]) => {
        write(`${k}: ${v}`);
      });
    }

    return pdfDoc.save();
  },
};

export const pdfWorker = new Worker(
  'pdf',
  async (job) => {
    const { template, data, filename } = job.data;

    if (!templates[template]) {
      throw new Error(`Template PDF no encontrado: ${template}`);
    }

    const pdfBytes = await templates[template](data);
    const base64 = Buffer.from(pdfBytes).toString('base64');

    return { pdfBase64: base64, filename: filename || `${template}-${Date.now()}.pdf`, size: pdfBytes.length };
  },
  { connection: redis, concurrency: 3 }
);

pdfWorker.on('completed', (job) => console.log(`[PDF] Job ${job.id} generated`));
pdfWorker.on('failed', (job, err) => console.error(`[PDF] Job ${job?.id} failed:`, err.message));

console.log('[Worker] PDF worker started');
