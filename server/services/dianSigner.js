// DIAN Digital Signature — Estructura de firma digital para facturación electrónica
// Versión 4.1 (Resolución DIAN 000008 de 2023)
//
// ═══════════════════════════════════════════════════════════════════════════
//  IMPORTANTE: Este módulo es una GUÍA ESTRUCTURAL.
//  La firma digital real requiere:
//    1. Un certificado digital (.pfx/.p12) emitido por una entidad de
//       certificación autorizada (ej. Andrés Díaz, Certicámara, etc.)
//    2. La contraseña del certificado
//    3. Una biblioteca criptográfica (ej. node-forge, crypto nativa, xml-crypto)
//
//  Los campos marcados como [MANUAL] deben completarse con datos reales.
// ═══════════════════════════════════════════════════════════════════════════

// Estructura completa de la firma digital XAdES-EPES requerida por DIAN
// Esta firma se inserta dentro de <ext:UBLExtensions> en el XML de la factura.
export const FIRMA_XML_TEMPLATE = `<!-- ═══════════════════════════════════════════════════════════
     FIRMA DIGITAL XAdES-EPES
     [MANUAL] Esta firma debe ser generada por:
       1. Una biblioteca criptográfica (node-forge, xml-crypto, etc.)
       2. Usando el certificado digital (.pfx/.p12) del emisor
       3. Aplicando el algoritmo SHA-256withRSA sobre el XML canónico
     ═══════════════════════════════════════════════════════════ -->
<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Signature1">
  <ds:SignedInfo>
    <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315" />
    <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256" />
    <!-- [MANUAL] Referencia al ID del documento firmado -->
    <ds:Reference URI="#Factura1">
      <ds:Transforms>
        <ds:Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315" />
      </ds:Transforms>
      <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
      <!-- [MANUAL] DigestValue del documento (hash SHA-256 del XML canónico) -->
      <ds:DigestValue>[BASE64-SHA256-DEL-DOCUMENTO]</ds:DigestValue>
    </ds:Reference>
    <ds:Reference Type="http://uri.etsi.org/01903#SignedProperties" URI="#SignedProperties1">
      <ds:Transforms>
        <ds:Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315" />
      </ds:Transforms>
      <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
      <!-- [MANUAL] DigestValue de las propiedades firmadas -->
      <ds:DigestValue>[BASE64-SHA256-DE-PROPIEDADES]</ds:DigestValue>
    </ds:Reference>
  </ds:SignedInfo>
  <!-- [MANUAL] Valor de la firma (resultado de SHA-256withRSA sobre SignedInfo canónico) -->
  <ds:SignatureValue>[BASE64-DE-LA-FIRMA]</ds:SignatureValue>
  <ds:KeyInfo>
    <ds:X509Data>
      <!-- [MANUAL] Certificado digital en base64 (incluir la cadena completa) -->
      <ds:X509Certificate>[CERTIFICADO-BASE64]</ds:X509Certificate>
      <!-- [MANUAL] Subject del certificado -->
      <ds:X509SubjectName>CN=JUANCHO PIZZA SAS, OU=Facturacion, O=JUANCHO PIZZA SAS, L=Nemocon, C=CO</ds:X509SubjectName>
      <!-- [MANUAL] Serial number del certificado -->
      <ds:X509SerialNumber>[SERIAL-DEL-CERTIFICADO]</ds:X509SerialNumber>
    </ds:X509Data>
  </ds:KeyInfo>
  <ds:Object>
    <xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#Signature1">
      <xades:SignedProperties Id="SignedProperties1">
        <xades:SignedSignatureProperties>
          <!-- [MANUAL] Fecha de firma (YYYY-MM-DDTHH:mm:ss) -->
          <xades:SigningTime>[FECHA-DE-FIRMA]</xades:SigningTime>
          <xades:SigningCertificate>
            <xades:Cert>
              <xades:CertDigest>
                <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256" />
                <!-- [MANUAL] SHA-256 del certificado -->
                <ds:DigestValue>[SHA256-DEL-CERTIFICADO]</ds:DigestValue>
              </xades:CertDigest>
              <xades:IssuerSerial>
                <ds:X509IssuerName>CN=AC RAÍZ SF, OU=SF, O=DIAN, C=CO</ds:X509IssuerName>
                <ds:X509SerialNumber>[SERIAL-DEL-CERTIFICADO]</ds:X509SerialNumber>
              </xades:IssuerSerial>
            </xades:Cert>
          </xades:SigningCertificate>
        </xades:SignedSignatureProperties>
      </xades:SignedProperties>
    </xades:QualifyingProperties>
  </ds:Object>
</ds:Signature>`;

/**
 * Datos de configuración del certificado digital.
 * [MANUAL] Completar con los datos reales del certificado.
 */
export const CERTIFICADO_CONFIG = {
  // [MANUAL] Ruta al archivo .pfx o .p12 del certificado
  archivo: 'certificado.pfx',
  // [MANUAL] Contraseña del certificado
  password: '********',
  // [MANUAL] Alias del certificado dentro del archivo PFX
  alias: 'facturacion-electronica',
  // [MANUAL] Tipo de certificado: 'firmador' | 'sellador'
  tipo: 'firmador',
  // [MANUAL] Vigencia
  vigenciaDesde: '2025-01-01',
  vigenciaHasta: '2026-01-01',
  // [MANUAL] Entidad certificadora
  entidad: 'ANDRES DIAZ - SF',  // O 'Certicámara', 'GSE', etc.
};

/**
 * Genera el XML completo con la firma digital insertada.
 * 
 * @param {string} rawXml - XML sin firmar
 * @param {Object} firmaData - Datos de la firma digital
 * @returns {string} XML firmado
 * 
 * [MANUAL] Esta función debe implementarse con una biblioteca como:
 *   - node-forge (npm install node-forge)
 *   - xml-crypto (npm install xml-crypto)
 *   - xadesjs (npm install xadesjs)
 */
export function signXml(rawXml, firmaData) {
  // ⚠️ [MANUAL] Implementación pendiente:
  // 1. Parsear el XML original
  // 2. Insertar la firma en <ext:UBLExtensions>
  // 3. Aplicar canonicalización XML (C14N)
  // 4. Calcular SHA-256 del documento
  // 5. Firmar con RSA usando el certificado
  // 6. Calcular CUFE (ver función abajo)
  // 7. Insertar CUFE en el XML
  // 8. Retornar XML firmado completo

  console.warn('[DIAN] signXml() no está implementado. Se requiere certificado digital.');
  console.warn('[DIAN] Ver docs/DIAN_MODULE_STATUS.md para instrucciones de implementación.');

  // Placeholder: insertar la plantilla de firma
  if (rawXml && rawXml.includes('<!-- [MANUAL] FIRMA DIGITAL XAdES-EPES -->')) {
    return rawXml.replace(
      '<!-- [MANUAL] FIRMA DIGITAL XAdES-EPES -->\n' +
      '        <!-- AQUÍ VA LA FIRMA: <ds:Signature>...</ds:Signature> -->',
      `<!-- ⚠️ FIRMA PENDIENTE - Completar con certificado digital -->\n` +
      `        <!-- Firma generada: ${new Date().toISOString()} -->`
    );
  }
  return rawXml;
}

/**
 * Calcula el CUFE (Código Único de Factura Electrónica).
 * 
 * El CUFE es un hash SHA-384 generado a partir de una cadena específica
 * que incluye los datos numéricos de la factura.
 * 
 * Fórmula DIAN:
 * CUFE = SHA-384(
 *   NumFac + FecFac + HorFac + NitFac + DocAdq + TtlAdq +
 *   TotIva + Cargos + Descuentos + ValorIVA +
 *   ValorOtrosImpuestos + IVAS + IVA + OtrosImpuestos +
 *   ValorTotal + NitOFirmante + ClaveTecnica
 * )
 * 
 * @param {Object} invoiceData - Datos de la factura
 * @returns {string|null} CUFE o null si no hay datos
 * 
 * [MANUAL] Esta función requiere que los datos numéricos estén formateados
 * correctamente según la especificación DIAN.
 */
export function calcularCUFE(invoiceData) {
  if (!invoiceData) return null;

  console.warn('[DIAN] calcularCUFE() no está implementado.');
  console.warn('[DIAN] Se requiere node-forge o crypto nativa para SHA-384.');
  console.warn('[DIAN] Datos necesarios:', {
    numeroFactura: invoiceData.invoiceNumber,
    nitEmisor: '900000000', // [MANUAL]
    claveTecnica: 'FCB48B9A-4C1A-4B1A-9E7F-3F9E8C7B6A5D', // [MANUAL]
  });

  // Placeholder: estructura del CUFE
  return `PENDIENTE_${invoiceData.invoiceNumber || ''}_${Date.now()}`;
}

export default {
  FIRMA_XML_TEMPLATE,
  CERTIFICADO_CONFIG,
  signXml,
  calcularCUFE,
};
