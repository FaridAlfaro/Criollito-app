'use server';

// Módulo de Facturación Electrónica ARCA (Ex-AFIP)
// Implementación simulada del Web Service WSFEv1 para la emisión de facturas.

export interface ARCAInvoiceRequest {
  totalAmount: number;
  netAmount: number;
  ivaAmount: number;
  docType: 'DNI' | 'CUIT' | 'CUIL' | 'PASAPORTE' | 'CONSUMIDOR_FINAL';
  docNumber?: string;
  comprobanteTipo: 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C';
  puntoVenta: number;
}

export interface ARCAInvoiceResponse {
  success: boolean;
  cae?: string;
  caeExpiration?: Date;
  numeroComprobante?: number;
  qrCodeData?: string;
  errorMessage?: string;
}

/**
 * Verifica las restricciones legales según Resolución General 5700/2025.
 * @param req Petición de factura
 */
function validateARCARules(req: ARCAInvoiceRequest): { valid: boolean, error?: string } {
  const LIMITE_ANONIMO = 10000000;

  if (req.totalAmount >= LIMITE_ANONIMO) {
    if (req.docType === 'CONSUMIDOR_FINAL' || !req.docNumber || req.docNumber.trim().length < 7) {
      return { 
        valid: false, 
        error: `Operación superior a $${LIMITE_ANONIMO}. Es obligatorio identificar al consumidor (DNI/CUIT).` 
      };
    }
  }

  return { valid: true };
}

/**
 * Solicita CAE a ARCA mediante WSFEv1.
 * @param req Datos del comprobante
 */
export async function emitirFacturaARCA(req: ARCAInvoiceRequest): Promise<ARCAInvoiceResponse> {
  console.log('[ARCA API] Validando reglas de facturación...');
  
  const validation = validateARCARules(req);
  if (!validation.valid) {
    console.error('[ARCA API] Rechazado por reglas de negocio:', validation.error);
    return { success: false, errorMessage: validation.error };
  }

  console.log(`[ARCA API] Solicitando CAE para ${req.comprobanteTipo} por $${req.totalAmount}`);

  // Simulación de latencia de los servidores de ARCA
  await new Promise(resolve => setTimeout(resolve, 1200));

  // Generar Mock de CAE
  const cae = Math.floor(Math.random() * 100000000000000).toString().padStart(14, '0');
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 10);

  // Generar Mock de QR ARCA
  const qrDataObj = {
    ver: 1,
    fecha: new Date().toISOString().split('T')[0],
    cuit: 30123456789,
    ptoVta: req.puntoVenta,
    tipoCmp: req.comprobanteTipo === 'FACTURA_B' ? 6 : req.comprobanteTipo === 'FACTURA_C' ? 11 : 1,
    nroCmp: Math.floor(Math.random() * 10000),
    importe: req.totalAmount,
    moneda: 'PES',
    ctz: 1,
    tipoDocRec: req.docType === 'DNI' ? 96 : req.docType === 'CUIT' ? 80 : 99,
    nroDocRec: req.docNumber ? parseInt(req.docNumber) : 0,
    tipoCodAut: 'E',
    codAut: cae
  };
  
  const qrCodeData = Buffer.from(JSON.stringify(qrDataObj)).toString('base64');
  const qrUrl = `https://www.afip.gob.ar/fe/qr/?p=${qrCodeData}`;

  console.log(`[ARCA API] CAE Obtenido exitosamente: ${cae}`);

  return {
    success: true,
    cae,
    caeExpiration: expiration,
    numeroComprobante: qrDataObj.nroCmp,
    qrCodeData: qrUrl,
  };
}
