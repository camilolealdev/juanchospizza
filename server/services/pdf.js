import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

async function drawText(page, font, fontBold, text, x, y, size = 12, bold = false) {
  page.drawText(text, {
    x,
    y,
    size,
    font: bold ? fontBold : font,
    color: rgb(0, 0, 0),
  });
}

async function drawLine(page, y) {
  page.drawLine({
    start: { x: 50, y },
    end: { x: 545, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });
}

export async function generatePDF(template, data) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;

  const write = (text, x = 50, size = 12, bold = false) => {
    drawText(page, font, fontBold, text, x, y, size, bold);
    y -= size + 4;
  };

  const line = () => {
    drawLine(page, y);
    y -= 10;
  };

  // Header
  write('GUIDO PIZZA', 50, 24, true);
  write(template === 'invoice' ? 'Factura de Venta' : template === 'order' ? 'Comanda' : 'Reporte', 50, 16, true);
  write('');

  if (template === 'invoice') {
    write(`Factura #: ${data.invoiceNumber}`);
    write(`Fecha: ${new Date(data.date).toLocaleDateString('es-CO')}`);
    write(`Cliente: ${data.customerName}`);
    write(`Teléfono: ${data.customerPhone || 'N/A'}`);
    write('');

    write('Detalle:', 50, 14, true);
    data.items.forEach((item, i) => {
      write(`${i + 1}. ${item.name} x${item.qty} - $${(item.price * item.qty).toLocaleString()}`);
    });

    write('');
    write(`Subtotal: $${data.subtotal.toLocaleString()}`, 50, 12, true);
    write(`Impuestos: $${data.tax.toLocaleString()}`, 50, 12, true);
    write(`TOTAL: $${data.total.toLocaleString()}`, 50, 16, true);
  }

  if (template === 'order') {
    write(`Pedido #${data.orderNumber}`, 50, 14, true);
    write(`Mesa: ${data.table || 'Para llevar'}`);
    write(`Hora: ${new Date().toLocaleTimeString('es-CO')}`);
    write('');

    data.items.forEach((item) => {
      write(`${item.qty}x ${item.name}`);
      if (item.notes) write(`  - ${item.notes}`, 65);
    });

    write('');
    write(`Total: $${data.total.toLocaleString()}`, 50, 12, true);
  }

  if (template === 'report') {
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
  }

  // Footer
  line();
  y -= 10;
  write('¡Gracias por tu pedido!', 50, 10, true);
  y -= 15;
  write('Guido Pizza - Cra 7 #12-34, Bogotá', 50, 9);
  y -= 12;
  write('Tel: +57 1 234 5678 | www.guidopizza.com', 50, 9);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function generateInvoicePDF(data) {
  return generatePDF('invoice', data);
}

export async function generateOrderPDF(data) {
  return generatePDF('order', data);
}

export async function generateReportPDF(data) {
  return generatePDF('report', data);
}
