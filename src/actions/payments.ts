'use server';

// Módulo de Cobros Electrónicos Locales (APIs de Pago)

export interface PaymentRequest {
  amount: number;
  description: string;
  paymentMethod: 'DEBIT' | 'CREDIT' | 'QR';
  installments?: number; // Para Plan Z, etc.
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
  qrData?: string;
}

/**
 * MOCK: Integración con Mercado Pago (Point In-Store o QR Dinámico)
 */
export async function processMercadoPagoPayment(req: PaymentRequest): Promise<PaymentResponse> {
  console.log(`[MercadoPago API] Procesando pago de $${req.amount} vía ${req.paymentMethod}`);
  
  // Si es QR, devolvemos un string mock para generar el QR en el frontend
  if (req.paymentMethod === 'QR') {
    return {
      success: true,
      qrData: `00020101021143650016COM.MERCADOLIBRE0104http...monto=${req.amount}`,
    };
  }

  // Simulación de delay de red de la terminal Point
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    success: true,
    transactionId: `MP-POS-${Math.floor(Math.random() * 1000000)}`,
  };
}

/**
 * MOCK: Integración con Payway / Naranja X
 */
export async function processPaywayPayment(req: PaymentRequest): Promise<PaymentResponse> {
  console.log(`[Payway API] Procesando pago de $${req.amount} en ${req.installments || 1} cuotas`);

  // Lógica de validación de cuotas (Ej. Plan Z Naranja X)
  let finalAmount = req.amount;
  if (req.installments && req.installments > 1) {
    // Ejemplo de cálculo de coeficiente
    const coeficientes: Record<number, number> = { 2: 1.10, 3: 1.15, 6: 1.30 };
    const recargo = coeficientes[req.installments] || 1;
    finalAmount = req.amount * recargo;
    console.log(`[Payway API] Monto con recargo aplicado: $${finalAmount.toFixed(2)}`);
  }

  // Simulación de comunicación local o Cloud con Posnet
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    success: true,
    transactionId: `PW-POS-${Math.floor(Math.random() * 1000000)}`,
  };
}
