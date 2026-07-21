// DIAN XML Generator — Genera la estructura XML de factura electrónica
// para facturación electrónica colombiana (Resolución DIAN 000008 de 2023).
//
// ⚠️ Este generador produce el XML con TODOS los campos requeridos por la DIAN,
// listos para ser firmados digitalmente y enviados a un proveedor tecnológico
// (Muisca, Dataico, Novasoft, etc.) o directamente a la DIAN.
//
// Los campos marcados como [MANUAL] deben ser completados con los datos reales
// del negocio antes de enviar a producción.

export const DIAN_CONFIG = {
  // ═══════════════════════════════════════════════════════════════
  // DATOS DEL EMISOR — Completar con los datos reales del negocio
  // ═══════════════════════════════════════════════════════════════
  emisor: {
    // [MANUAL] NIT o Número de Identificación Tributaria (sin digito de verificacion)
    nit: '900000000',
    // [MANUAL] Digito de verificacion del NIT
    digitoVerificacion: '0',
    // [MANUAL] Razon Social completa
    razonSocial: 'JUANCHO PIZZA SAS',
    // [MANUAL] Nombre Comercial
    nombreComercial: 'Juancho\'s Pizza',
    // [MANUAL] Direccion del establecimiento
    direccion: 'Cra 7 #12-34',
    // [MANUAL] Ciudad (codigo Dane)
    ciudad: 'Nemocón',
    codigoCiudad: '25489',
    // [MANUAL] Departamento (codigo Dane)
    departamento: 'Cundinamarca',
    codigoDepartamento: '25',
    // [MANUAL] Pais (codigo)
    pais: 'Colombia',
    codigoPais: 'CO',
    // [MANUAL] Telefono
    telefono: '3117074843',
    // [MANUAL] Correo electronico
    email: 'contacto@juanchospizza.com',
    // [MANUAL] Regimen fiscal: 'R-99-PN' (Persona Natural) | 'R-99-PJ' (Persona Juridica)
    regimenFiscal: 'R-99-PJ',
    // [MANUAL] Responsabilidad fiscal: 'R-99-PN' | 'O-15' (IVA) | 'O-13' (Gran contribuyente)
    responsabilidadFiscal: 'O-15',
    // [MANUAL] Tipo de contribuyente: '1' (Persona Juridica) | '2' (Persona Natural)
    tipoContribuyente: '1',
    // [MANUAL] Matricula Mercantil (si aplica)
    matriculaMercantil: '',
    // [MANUAL] Codigo del establecimiento (sede)
    codigoEstablecimiento: '00001',
  },

  // ═══════════════════════════════════════════════════════════════
  // CONFIGURACION GENERAL DE FACTURACION
  // ═══════════════════════════════════════════════════════════════
  facturacion: {
    // Prefijo de la factura (según resolución DIAN)
    // [MANUAL] Prefijo autorizado por la DIAN (ej: 'FE1', 'FEP')
    prefijo: 'FE',
    // [MANUAL] Rango de numeración autorizado por la DIAN
    rangoNumeracion: {
      desde: 1,
      hasta: 100000,
      // [MANUAL] Fecha de autorización de la resolución
      fechaAutorizacion: '2025-01-01',
      // [MANUAL] Número de resolución DIAN
      numeroResolucion: '1876000000001',
      // [MANUAL] Clave técnica (prefijo de la numeración)
      claveTecnica: 'FCB48B9A-4C1A-4B1A-9E7F-3F9E8C7B6A5D',
    },
    // [MANUAL] Ambiente: '1' (Pruebas) | '2' (Producción)
    ambiente: '1',
    // Version del documento electronico
    version: '4.1',
  },

  // ═══════════════════════════════════════════════════════════════
  // INFORMACION DEL SOFTWARE / PROVEEDOR TECNOLOGICO (PSE)
  // ═══════════════════════════════════════════════════════════════
  software: {
    // [MANUAL] ID del software (asignado por DIAN al registrar el software)
    softwareId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    // [MANUAL] PIN del software (asignado por DIAN)
    softwarePin: '00000000000000000000',
    // [MANUAL] Nombre del proveedor tecnologico (ej: 'MUISCA', 'DATAICO')
    proveedorTecnologico: 'MUISCA',
  },
};

// ================================================================
// GENERADOR DE XML (ESTRUCTURA COMPLETA)
// ================================================================
// Este generador produce el XML en el formato requerido por la DIAN
// versión 4.1 (Resolución 000008 de 2023).
//
// Campos generados automáticamente a partir de la orden:
//   - Datos del cliente (receptor)
//   - Items/productos con cantidades y precios
//   - Totales (subtotal, IVA, total general)
//   - Fecha de emisión
//   - Número de factura secuencial
//
// Campos que deben completarse MANUALMENTE:
//   - Firma digital (CUFE/CUDE)
//   - Datos fiscales del emisor
//   - Resolución DIAN
//   - Datos del software PSE
// ================================================================

/**
 * Genera el XML completo de factura electrónica.
 * 
 * @param {Object} invoice - Datos de la factura desde la DB
 * @param {Object} order - Datos de la orden asociada
 * @param {Object} client - Datos del cliente (opcional)
 * @returns {string} XML string
 */
export function generateInvoiceXml(invoice, order, client) {
  const emisor = DIAN_CONFIG.emisor;
  const cfg = DIAN_CONFIG.facturacion;
  const soft = DIAN_CONFIG.software;

  // Datos del receptor (cliente)
  const receptor = {
    nit: client?.nit || '222222222222',
    digitoVerificacion: client?.digitoVerificacion || '2',
    razonSocial: client?.nombre || order?.customerName || 'CONSUMIDOR FINAL',
    direccion: client?.direccion || order?.address || 'Sin dirección',
    email: client?.email || '',
    telefono: client?.telefono || order?.customerPhone || '',
    codigoCiudad: client?.codigoCiudad || '00000',
    codigoDepartamento: client?.codigoDepartamento || '00',
    pais: 'Colombia',
    codigoPais: 'CO',
  };

  // Calcular fechas
  // 2026-07-21 hardening: validar NIT del receptor ANTES de interpolar
  // en XML. Si el NIT es malformado, preferimos un error local explícito
  // a un XML generado que la DIAN rechazará con diagnóstico opaco.
  validateReceptorNit(receptor.nit);

  // Detección de tasa dominante: lanza si la factura mezcla tasas — el
  // generador actual no soporta múltiples TaxSubtotal blocks. El "%"
  // se emite con 2 decimales para casar con el XML previo (19.00).
  const taxRate = detectDominantTaxRate(items);
  const taxRatePct = (taxRate * 100).toFixed(2);

  const fechaEmision = new Date(invoice.createdAt || order?.createdAt || new Date()).toISOString();
  const horaEmision = fechaEmision; // ISO 8601
  const fechaVencimiento = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // +30 días

  // Procesar items de la orden
  const items = parseOrderItems(order);
  const totales = calculateTotals(items);

  // Construir XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';

  // ═══ ENCABEZADO ═══
  xml += `<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
                  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
                  xmlns:ds="http://www.w3.org/2000/09/xmldsig#"
                  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
                  xmlns:sts="dian:gov:co:facturaelectronica:Structures-2-1"
                  xmlns:xades="http://uri.etsi.org/01903/v1.3.2#"
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n`;

  // ═══ EXTENSIONES (firma digital) ═══
  xml += '  <ext:UBLExtensions>\n';
  xml += '    <ext:UBLExtension>\n';
  xml += '      <ext:ExtensionContent>\n';
  // [MANUAL] Aquí va la firma digital (XAdES-EPES)
  // El CUFE se genera después de firmar el XML completo
  xml += '        <!-- [MANUAL] FIRMA DIGITAL XAdES-EPES -->\n';
  xml += '        <sts:DianExtensions>\n';
  xml += `          <sts:SoftwareProvider>\n`;
  xml += `            <sts:ProviderID schemeName="31" schemeAgencyID="195">${soft.proveedorTecnologico}</sts:ProviderID>\n`;
  xml += `            <sts:SoftwareID schemeName="31" schemeAgencyID="195">${soft.softwareId}</sts:SoftwareID>\n`;
  xml += `          </sts:SoftwareProvider>\n`;
  xml += `          <sts:SoftwareSecurityCode schemeName="2" schemeAgencyID="195">${soft.softwarePin}</sts:SoftwareSecurityCode>\n`;
  xml += `          <sts:AuthorizationProvider>\n`;
  xml += `            <sts:AuthorizationProviderID schemeName="4" schemeAgencyID="195">${emisor.nit}</sts:AuthorizationProviderID>\n`;
  xml += `          </sts:AuthorizationProvider>\n`;
  xml += `          <sts:QRCode><!-- [MANUAL] URL con datos de la factura para validación --></sts:QRCode>\n`;
  xml += `        </sts:DianExtensions>\n`;
  xml += '        <!-- AQUÍ VA LA FIRMA: <ds:Signature>...</ds:Signature> -->\n';
  xml += '      </ext:ExtensionContent>\n';
  xml += '    </ext:UBLExtension>\n';
  xml += '  </ext:UBLExtensions>\n';

  // ═══ DATOS GENERALES ═══
  xml += `  <cbc:UBLVersionID>${cfg.version}</cbc:UBLVersionID>\n`;
  xml += `  <cbc:CustomizationID>10</cbc:CustomizationID>\n`;
  xml += `  <cbc:ProfileID>DIAN 4.1</cbc:ProfileID>\n`;
  xml += `  <cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>\n`;
  xml += `  <cbc:ID>${invoice.invoiceNumber || 'FE-PENDIENTE'}</cbc:ID>\n`;
  xml += `  <cbc:UUID schemeID="${cfg.rangoNumeracion.claveTecnica}" schemeName="CUFE-SHA384">${invoice.cufe || 'PENDIENTE'}</cbc:UUID>\n`;
  xml += `  <cbc:IssueDate>${fechaEmision.split('T')[0]}</cbc:IssueDate>\n`;
  xml += `  <cbc:IssueTime>${fechaEmision.split('T')[1]?.split('.')[0]}</cbc:IssueTime>\n`;
  xml += `  <cbc:DueDate>${fechaVencimiento.split('T')[0]}</cbc:DueDate>\n`;
  xml += `  <cbc:InvoiceTypeCode listID="${cfg.rangoNumeracion.numeroResolucion}">01</cbc:InvoiceTypeCode>\n`;
  xml += `  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>\n`;
  xml += `  <cbc:LineCountNumeric>${items.length}</cbc:LineCountNumeric>\n`;
  xml += `  <cbc:Notes languageLocaleID="es-CO"><![CDATA[${invoice.notes || ''}]]></cbc:Notes>\n`;

  // ═══ PERIODO DE FACTURACIÓN ═══
  xml += '  <cac:InvoicePeriod>\n';
  xml += `    <cbc:StartDate>${fechaEmision.split('T')[0]}</cbc:StartDate>\n`;
  xml += `    <cbc:EndDate>${fechaVencimiento.split('T')[0]}</cbc:EndDate>\n`;
  xml += '  </cac:InvoicePeriod>\n';

  // ═══ DATOS DEL EMISOR ═══
  xml += '  <cac:AccountingSupplierParty>\n';
  xml += '    <cac:Party>\n';
  xml += `      <cac:PartyIdentification>\n`;
  xml += `        <cbc:ID schemeID="31" schemeAgencyID="195">${emisor.nit}</cbc:ID>\n`;
  xml += '      </cac:PartyIdentification>\n';
  xml += `      <cac:PartyName>\n`;
  xml += `        <cbc:Name>${emisor.nombreComercial}</cbc:Name>\n`;
  xml += '      </cac:PartyName>\n';
  xml += '      <cac:PhysicalLocation>\n';
  xml += '        <cac:Address>\n';
  xml += `          <cbc:ID>${emisor.codigoCiudad}</cbc:ID>\n`;
  xml += `          <cbc:CityName>${emisor.ciudad}</cbc:CityName>\n`;
  xml += `          <cbc:CountrySubentity>${emisor.departamento}</cbc:CountrySubentity>\n`;
  xml += `          <cbc:CountrySubentityCode>${emisor.codigoDepartamento}</cbc:CountrySubentityCode>\n`;
  xml += `          <cbc:Line>${emisor.direccion}</cbc:Line>\n`;
  xml += '        </cac:Address>\n';
  xml += '      </cac:PhysicalLocation>\n';
  xml += '      <cac:PartyTaxScheme>\n';
  xml += `        <cbc:TaxLevelCode listName="${emisor.responsabilidadFiscal}">${emisor.regimenFiscal}</cbc:TaxLevelCode>\n`;
  xml += '      </cac:PartyTaxScheme>\n';
  xml += '      <cac:PartyLegalEntity>\n';
  xml += `        <cbc:RegistrationName>${emisor.razonSocial}</cbc:RegistrationName>\n`;
  xml += `        <cbc:CompanyID schemeID="31" schemeAgencyID="195">${emisor.nit}</cbc:CompanyID>\n`;
  xml += '      </cac:PartyLegalEntity>\n';
  xml += '      <cac:Contact>\n';
  xml += `        <cbc:Telephone>${emisor.telefono}</cbc:Telephone>\n`;
  xml += `        <cbc:ElectronicMail>${emisor.email}</cbc:ElectronicMail>\n`;
  xml += '      </cac:Contact>\n';
  xml += '    </cac:Party>\n';
  xml += '  </cac:AccountingSupplierParty>\n';

  // ═══ DATOS DEL RECEPTOR (CLIENTE) ═══
  xml += '  <cac:AccountingCustomerParty>\n';
  xml += '    <cac:Party>\n';
  xml += '      <cac:PartyIdentification>\n';
  xml += `        <cbc:ID schemeID="31" schemeAgencyID="195">${receptor.nit}</cbc:ID>\n`;
  xml += '      </cac:PartyIdentification>\n';
  xml += '      <cac:PhysicalLocation>\n';
  xml += '        <cac:Address>\n';
  xml += `          <cbc:ID>${receptor.codigoCiudad}</cbc:ID>\n`;
  xml += `          <cbc:CityName>${receptor.ciudad || 'Bogotá'}</cbc:CityName>\n`;
  xml += `          <cbc:CountrySubentityCode>${receptor.codigoDepartamento}</cbc:CountrySubentityCode>\n`;
  xml += `          <cbc:Line>${receptor.direccion}</cbc:Line>\n`;
  xml += '        </cac:Address>\n';
  xml += '      </cac:PhysicalLocation>\n';
  xml += '      <cac:PartyTaxScheme>\n';
  xml += '        <cbc:TaxLevelCode listName="O-99">R-99-PN</cbc:TaxLevelCode>\n';
  xml += '      </cac:PartyTaxScheme>\n';
  xml += '      <cac:PartyLegalEntity>\n';
  xml += `        <cbc:RegistrationName>${receptor.razonSocial}</cbc:RegistrationName>\n`;
  xml += '      </cac:PartyLegalEntity>\n';
  xml += '      <cac:Contact>\n';
  xml += `        <cbc:Telephone>${receptor.telefono}</cbc:Telephone>\n`;
  xml += `        <cbc:ElectronicMail>${receptor.email}</cbc:ElectronicMail>\n`;
  xml += '      </cac:Contact>\n';
  xml += '    </cac:Party>\n';
  xml += '  </cac:AccountingCustomerParty>\n';

  // ═══ TRIBUTOS (IVA, INC, etc.) ═══
  if (totales.iva > 0) {
    xml += '  <cac:TaxTotal>\n';
    xml += `    <cbc:TaxAmount currencyID="COP">${totales.iva}</cbc:TaxAmount>\n`;
    xml += '    <cac:TaxSubtotal>\n';
    xml += `      <cbc:TaxableAmount currencyID="COP">${totales.subtotal}</cbc:TaxableAmount>\n`;
    xml += `      <cbc:TaxAmount currencyID="COP">${totales.iva}</cbc:TaxAmount>\n`;
    xml += '      <cac:TaxCategory>\n';
    xml += '        <cbc:ID schemeID="2" schemeAgencyID="6">01</cbc:ID>\n';
    xml += '        <cbc:Percent>' + taxRatePct + '</cbc:Percent>\n';
    xml += '        <cbc:TaxExemptionReasonCode>1</cbc:TaxExemptionReasonCode>\n';
    xml += '        <cac:TaxScheme>\n';
    xml += '          <cbc:ID schemeID="2" schemeAgencyID="6">01</cbc:ID>\n';
    xml += '          <cbc:Name>IVA</cbc:Name>\n';
    xml += '        </cac:TaxScheme>\n';
    xml += '      </cac:TaxCategory>\n';
    xml += '    </cac:TaxSubtotal>\n';
    xml += '  </cac:TaxTotal>\n';
  }

  // ═══ TOTAL GENERAL ═══
  xml += '  <cac:LegalMonetaryTotal>\n';
  xml += `    <cbc:PayableAmount currencyID="COP">${totales.total}</cbc:PayableAmount>\n`;
  xml += '  </cac:LegalMonetaryTotal>\n';

  // ═══ DETALLE DE ITEMS ═══
  items.forEach((item, idx) => {
    const lineNum = idx + 1;
    xml += '  <cac:InvoiceLine>\n';
    xml += `    <cbc:ID>${lineNum}</cbc:ID>\n`;
    xml += `    <cbc:InvoicedQuantity unitCode="${item.unitCode || '94'}">${item.quantity}</cbc:InvoicedQuantity>\n`;
    xml += `    <cbc:LineExtensionAmount currencyID="COP">${item.subtotal}</cbc:LineExtensionAmount>\n`;
    xml += '    <cac:Item>\n';
    xml += `      <cbc:Description>${escapeXml(item.name)}</cbc:Description>\n`;
    xml += `      <cbc:BrandName>${escapeXml(item.brand || 'Juancho\'s Pizza')}</cbc:BrandName>\n`;
    xml += `      <cbc:ModelName>${escapeXml(item.model || '')}</cbc:ModelName>\n`;
    xml += '    </cac:Item>\n';
    xml += '    <cac:Price>\n';
    xml += `      <cbc:PriceAmount currencyID="COP">${item.unitPrice}</cbc:PriceAmount>\n`;
    xml += `      <cbc:BaseQuantity unitCode="${item.unitCode || '94'}">1</cbc:BaseQuantity>\n`;
    xml += '    </cac:Price>\n';

    // Impuesto por item
    if (item.iva > 0) {
      xml += '    <cac:ItemTaxTotal>\n';
      xml += '      <cac:TaxSubtotal>\n';
      xml += `        <cbc:TaxableAmount currencyID="COP">${item.subtotal}</cbc:TaxableAmount>\n`;
      xml += `        <cbc:TaxAmount currencyID="COP">${item.iva}</cbc:TaxAmount>\n`;
      xml += '        <cac:TaxCategory>\n';
      xml += '          <cbc:ID schemeID="2" schemeAgencyID="6">01</cbc:ID>\n';
      xml += '          <cbc:Percent>' + taxRatePct + '</cbc:Percent>\n';
      xml += '          <cac:TaxScheme>\n';
      xml += '            <cbc:ID schemeID="2" schemeAgencyID="6">01</cbc:ID>\n';
      xml += '            <cbc:Name>IVA</cbc:Name>\n';
      xml += '          </cac:TaxScheme>\n';
      xml += '        </cac:TaxCategory>\n';
      xml += '      </cac:TaxSubtotal>\n';
      xml += '    </cac:ItemTaxTotal>\n';
    }

    xml += '  </cac:InvoiceLine>\n';
  });

  // ═══ CIERRE ═══
  xml += '</Invoice>\n';

  return xml;
}

/**
 * Genera el XML para Nota Crédito/Débito
 */
export function generateCreditNoteXml(creditNote, invoice, order) {
  // [MANUAL] Implementar según necesidad
  return `<!-- NOTA ${creditNote.tipoNota?.toUpperCase()} - PENDIENTE DE GENERACIÓN -->
<CreditNote>
  <!-- [MANUAL] Generar estructura similar a Invoice pero con tipo 91/92 -->
</CreditNote>`;
}

/**
 * Escapa caracteres especiales XML
 */
function escapeXml(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Parsea los items de una orden al formato DIAN
 */
// IVA mixto por factura no soportado en este MVP. Si una factura combina
// items a 19% y a 0%, separar en documentos separados o extender este
// generador para emitir múltiples TaxSubtotal blocks.
function detectDominantTaxRate(items) {
  if (!items.length) return 0.19;
  const rates = new Set(items.map((i) => (typeof i.ivaRate === 'number' ? i.ivaRate : 0.19)));
  if (rates.size > 1) {
    throw new Error(
      '[DIAN] IVA mixto no soportado. Tasas en items: ' +
        [...rates].map((r) => (r * 100).toFixed(2) + '%').join(', ') +
        '. Separar en facturas o extender generateInvoiceXml.'
    );
  }
  return [...rates][0];
}

// Valida el NIT del receptor antes de interpolarlo en XML. El NIT
// colombiano es 9–15 dígitos, sin puntos ni comas, sin ceros a la
// izquierda. Referencia (no exhaustiva): el algoritmo oficial incluye
// dígito de verificación módulo 11; para MVP basta con el formato.
function validateReceptorNit(nit) {
  if (typeof nit !== 'string') {
    throw new Error(`[DIAN] receptor.nit debe ser string, recibido: ${typeof nit}`);
  }
  if (!/^[1-9][0-9]{5,14}$/.test(nit)) {
    throw new Error(
      '[DIAN] receptor.nit inválido: "' + nit + '" (debe ser 6–15 dígitos sin ceros a la izquierda)'
    );
  }
}

function parseOrderItems(order) {
  if (!order?.items) return [];

  let rawItems = order.items;
  if (typeof rawItems === 'string') {
    try { rawItems = JSON.parse(rawItems); }
    catch { rawItems = []; }
  }

  if (!Array.isArray(rawItems)) return [];

  return rawItems.map((item) => {
    const quantity = item.quantity || 1;
    const unitPrice = item.price || item.unitPrice || 0;
    const subtotal = quantity * unitPrice;
    // 2026-07-21 hardening: item.ivaRate opcional. Productos exentos
    // (canasta familiar) pasan 0 desde inventory; default sigue siendo
    // 19% por compatibilidad con productos no marcados. La validación
    // de tasa única por factura vive en generateInvoiceXml
    // (detectDominantTaxRate).
    const ivaRate =
      typeof item.ivaRate === 'number' && item.ivaRate >= 0 && item.ivaRate <= 1
        ? item.ivaRate
        : 0.19;
    const iva = Math.round(subtotal * ivaRate);

    return {
      name: item.name || item.productName || 'Producto',
      quantity,
      unitPrice,
      subtotal,
      iva,
      ivaRate,
      total: subtotal + iva,
      unitCode: item.unitCode || '94', // '94' = unidad
      brand: item.brand || '',
      model: item.model || '',
    };
  });
}

/**
 * Calcula los totales de la factura
 */
function calculateTotals(items) {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const iva = items.reduce((sum, item) => sum + item.iva, 0);
  const total = subtotal + iva;

  return { subtotal, iva, total };
}

/**
 * Genera la estructura JSON completa para el campo dianResponse
 * Esta estructura contiene todos los datos necesarios para ser
 * enviada al proveedor DIAN. Los campos [MANUAL] deben completarse.
 *
 * @returns {Object} Objeto con la estructura completa para DIAN
 */
export function generateDianRequestPayload(invoice, order) {
  return {
    // ═══ DATOS DEL DOCUMENTO ═══
    documento: {
      numeroFactura: invoice.invoiceNumber,
      fechaEmision: invoice.createdAt,
      tipoDocumento: invoice.tipoDocumento || 'factura',
      // [MANUAL] Ambiente: 1=Pruebas, 2=Produccion
      ambiente: DIAN_CONFIG.facturacion.ambiente,
    },

    // ═══ DATOS DEL EMISOR ═══
    emisor: {
      // [MANUAL] Completar con datos reales del negocio
      ...DIAN_CONFIG.emisor,
      // [MANUAL] Certificado digital (.pfx o .p12)
      certificadoDigital: {
        archivo: 'certificado.pfx',
        // [MANUAL] Contraseña del certificado
        password: '********',
        // [MANUAL] Vigencia del certificado
        vigenciaDesde: '2025-01-01',
        vigenciaHasta: '2026-01-01',
      },
    },

    // ═══ DATOS DEL RECEPTOR ═══
    receptor: {
      tipoIdentificacion: '31', // 31=NIT, 13=Cedula, 22=Cedula Extranjeria
      numeroIdentificacion: order?.customerPhone || '222222222222',
      // [MANUAL] Digito de verificación si es NIT
      digitoVerificacion: '0',
      razonSocial: order?.customerName || 'CONSUMIDOR FINAL',
      direccion: order?.address || 'Sin dirección',
      email: '',
      telefono: order?.customerPhone || '',
    },

    // ═══ ITEMS ═══
    items: parseOrderItems(order),

    // ═══ TOTALES ═══
    totales: calculateTotals(parseOrderItems(order)),

    // ═══ RESOLUCIÓN DIAN ═══
    resolucion: {
      ...DIAN_CONFIG.facturacion.rangoNumeracion,
    },

    // ═══ SOFTWARE (PSE) ═══
    software: {
      ...DIAN_CONFIG.software,
    },

    // ═══ CAMPOS PARA FIRMA DIGITAL ═══
    firma: {
      // [MANUAL] Algoritmo de firma: 'SHA-256withRSA'
      algoritmo: 'SHA-256withRSA',
      // [MANUAL] CUFE generado por el proveedor DIAN después de firmar
      cufe: null,
      // [MANUAL] XML firmado completo
      xmlFirmado: null,
      // [MANUAL] Respuesta completa del proveedor DIAN
      respuestaDian: null,
    },
  };
}
