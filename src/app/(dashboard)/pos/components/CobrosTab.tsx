'use client';

import type { Product } from '@/store/useStore';
import { ProductsGrid } from './ProductsGrid';
import { TicketPanel } from './TicketPanel';
import type { CartItem, PaymentMethod } from './types';
import { RefObject } from 'react';

interface CobrosTabProps {
  products: Product[];
  currentSession: { initialAmount: string } | null;
  cart: CartItem[];
  total: number;
  showSuccess: boolean;
  paymentMethod: PaymentMethod;
  customerDoc: string;
  requiresDoc: boolean;
  cashReceived: string;
  changeToGive: number | null;
  isCashInsufficient: boolean;
  canConfirm: boolean;
  scaleConnected: boolean;
  scaleWeight: number;
  scaleError: string | null;
  customerDocInputRef: RefObject<HTMLInputElement | null>;
  cashReceivedInputRef: RefObject<HTMLInputElement | null>;
  onAddToCart: (product: Product, quantity?: number) => void;
  onConnectScale: () => void;
  onDisconnectScale: () => void;
  onClearCart: () => void;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onCustomerDocChange: (value: string) => void;
  onCustomerDocValidate: (value: string) => void;
  onSelectCash: () => void;
  onSelectDebit: () => void;
  onSelectCredit: () => void;
  onSelectQr: () => void;
  onCloseCashPanel: () => void;
  onCashReceivedChange: (value: string) => void;
  onQuickCash: (amount: number) => void;
  onConfirmSale: () => void;
}

export function CobrosTab(props: CobrosTabProps) {
  const {
    products,
    currentSession,
    scaleConnected,
    scaleWeight,
    scaleError,
    onAddToCart,
    onConnectScale,
    onDisconnectScale,
    ...ticketProps
  } = props;

  return (
    <div className="flex flex-1 gap-6 relative print:hidden overflow-hidden min-h-0">
      <ProductsGrid
        products={products}
        currentSession={currentSession}
        scaleConnected={scaleConnected}
        scaleWeight={scaleWeight}
        scaleError={scaleError}
        onAddToCart={onAddToCart}
        onConnectScale={onConnectScale}
        onDisconnectScale={onDisconnectScale}
      />
      <TicketPanel {...ticketProps} />
    </div>
  );
}
