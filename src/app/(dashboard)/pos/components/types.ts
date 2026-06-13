export type PaymentMethod = 'CASH' | 'DEBIT' | 'CREDIT' | 'QR' | null;

export interface SummaryData {
  initialAmount: number;
  totalSalesCash: number;
  totalDebit: number;
  totalCredit: number;
  totalQr?: number;
  totalIngresos: number;
  totalEgresos: number;
  theoreticalTotal: number;
  countedCash: number;
  difference: number;
}

export interface CartItem {
  product: import('@/store/useStore').Product;
  quantity: number;
}
