import { describe, it, expect } from 'vitest';
import { generateInvoiceXml } from './dianXml.js';

// 2026-07-30 hardening: receptor.direccion/razonSocial/telefono/email vienen
// de datos del cliente (order.customerName/order.address/client.email) y se
// interpolaban en el XML SIN pasar por escapeXml(), a diferencia de
// item.name/brand/model que sí lo hacían. Un nombre o dirección con
// '<', '&' o '"' rompía la estructura UBL o inyectaba nodos arbitrarios en
// una factura electrónica legalmente radicada ante la DIAN.
describe('generateInvoiceXml — escaping de campos del receptor', () => {
  const maliciousOrder = {
    createdAt: new Date().toISOString(),
    customerName: '<script>alert(1)</script>&"\'',
    address: 'Calle "Falsa" 123 <inject/> & Cia',
    customerPhone: '"><Injected>666</Injected>',
    items: [{ name: 'Pizza Margarita', quantity: 1, price: 20000 }],
  };

  const maliciousClient = {
    nombre: '<Injected>Hacker</Injected>',
    direccion: 'Cra 1 & "2" <x>',
    email: '"><attacker@evil.com>',
    telefono: '<phone>&123</phone>',
  };

  const invoice = { invoiceNumber: 'FE-1', cufe: 'TEST-CUFE', createdAt: new Date().toISOString() };

  it('escapa razonSocial/direccion/telefono/email del receptor derivados de client', () => {
    const xml = generateInvoiceXml(invoice, maliciousOrder, maliciousClient);

    // Los caracteres peligrosos no deben aparecer crudos en el XML.
    expect(xml).not.toContain('<Injected>');
    expect(xml).not.toContain('<x>');
    expect(xml).not.toContain('<phone>');
    expect(xml).not.toContain('<attacker@evil.com>');

    // Las versiones escapadas sí deben estar presentes.
    expect(xml).toContain('&lt;Injected&gt;Hacker&lt;/Injected&gt;'); // razonSocial
    expect(xml).toContain('Cra 1 &amp; &quot;2&quot; &lt;x&gt;'); // direccion
    expect(xml).toContain('&lt;phone&gt;&amp;123&lt;/phone&gt;'); // telefono
    expect(xml).toContain('&quot;&gt;&lt;attacker@evil.com&gt;'); // email
  });

  it('escapa razonSocial/direccion/telefono derivados de order cuando no hay client', () => {
    const xml = generateInvoiceXml(invoice, maliciousOrder, null);

    expect(xml).not.toContain('<script>');
    expect(xml).not.toContain('<inject/>');
    expect(xml).not.toContain('<Injected>666</Injected>');

    expect(xml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;&amp;&quot;&apos;'); // customerName -> razonSocial
    expect(xml).toContain('Calle &quot;Falsa&quot; 123 &lt;inject/&gt; &amp; Cia'); // address -> direccion
    expect(xml).toContain('&quot;&gt;&lt;Injected&gt;666&lt;/Injected&gt;'); // customerPhone -> telefono
  });

  it('no introduce tags nuevos sin cerrar: cada "<" crudo (no entidad) pertenece a un tag legítimo del generador', () => {
    const xml = generateInvoiceXml(invoice, maliciousOrder, maliciousClient);

    // Todo '<' literal debe abrir un tag real de UBL (cac:, cbc:, ext:, sts:,
    // Invoice, o cierre '/'), nunca el contenido inyectado por el receptor
    // (que ahora llega como &lt; en vez de <).
    const rawTags = xml.match(/<[^!?][^>]*>/g) || [];
    for (const tag of rawTags) {
      expect(tag).toMatch(/^<\/?(cac:|cbc:|ext:|sts:|Invoice|ds:)/);
    }
  });
});
