'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore, Product } from '@/store/useStore';
import { useSerialScale } from '@/hooks/useSerialScale';
import { getBranchWorkers } from '@/actions/cashSessions';
import { processMercadoPagoPayment } from '@/actions/payments';
import { getCustomerByDni } from '@/actions/customers';
import { fetchProducts } from '@/actions/products';
import { fetchAlerts } from '@/actions/alerts';

import { PosLoadingScreen } from './components/PosLoadingScreen';
import { PosStatusBar } from './components/PosStatusBar';
import { OpenSessionModal } from './components/OpenSessionModal';
import { CloseSessionModal } from './components/CloseSessionModal';
import { SessionSummaryModal } from './components/SessionSummaryModal';
import { QrPaymentModal } from './components/QrPaymentModal';
import { CheckoutModal } from './components/CheckoutModal';
import { CashChangePanel } from './components/CashChangePanel';
import { EmailInvoiceModal } from './components/EmailInvoiceModal';
import { WeightNumpadModal } from './components/WeightNumpadModal';
import { SalePrintModal } from './components/SalePrintModal';
import { MovementPrintModal } from './components/MovementPrintModal';
import { HistoryPrintModal } from './components/HistoryPrintModal';
import { CobrosTab } from './components/CobrosTab';
import { MovementsTab } from './components/MovementsTab';
import { HistoryTab } from './components/HistoryTab';
import { TicketPrintPreview, MovementPrintPreview, HistoryReportPrintPreview } from './components/PrintPreviews';
import type { PaymentMethod, SummaryData, CartItem } from './components/types';

const ARCA_LIMIT = 10000000;

export default function POSPage() {
  const {
    products,
    setProducts,
    setAlerts,
    processSale,
    currentSession,
    pendingSales,
    openSession,
    registerMovement,
    closeSession,
    syncOfflineSales,
    salesHistory,
    movementsHistory,
    posActiveTab,
    setPosActiveTab,
  } = useStore();
  const currentUser = useStore(s => s.currentUser);

  const [mounted, setMounted] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [customerDoc, setCustomerDoc] = useState('');
  const [lastSaleDni, setLastSaleDni] = useState('');
  const [customerEmailStatus, setCustomerEmailStatus] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isPrinterConnected, setIsPrinterConnected] = useState(false);
  const [stockAlert, setStockAlert] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  const customerDocInputRef = useRef<HTMLInputElement>(null);
  const initialAmountInputRef = useRef<HTMLInputElement>(null);
  const countedCashInputRef = useRef<HTMLInputElement>(null);
  const movementAmountInputRef = useRef<HTMLInputElement>(null);
  const justificationInputRef = useRef<HTMLTextAreaElement>(null);
  const movementDescriptionInputRef = useRef<HTMLInputElement>(null);
  const cashReceivedInputRef = useRef<HTMLInputElement>(null);

  const [workers, setWorkers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState('');

  const [showQrModal, setShowQrModal] = useState(false);
  const [qrData, setQrData] = useState('');
  const [isQrPaid, setIsQrPaid] = useState(false);
  const [isProcessingQr, setIsProcessingQr] = useState(false);

  const [cashReceived, setCashReceived] = useState('');
  const [changeToGive, setChangeToGive] = useState<number | null>(null);

  const [outlayType, setOutlayType] = useState<'PROVEEDOR' | 'INSUMO' | 'MATERIA_PRIMA' | 'SUELDO' | 'OTRO'>('PROVEEDOR');
  const [justification, setJustification] = useState('');

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const requiresDoc = total >= ARCA_LIMIT;
  const isCashInsufficient = paymentMethod === 'CASH' && (cashReceived === '' || parseFloat(cashReceived) < total);
  const canConfirm = cart.length > 0 && paymentMethod && (!requiresDoc || customerDoc.length >= 7) && !isCashInsufficient;

  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCashModal, setShowCashModal] = useState(false);
  const [showEmailInvoiceModal, setShowEmailInvoiceModal] = useState(false);
  const [saleToPrint, setSaleToPrint] = useState<any | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printingType, setPrintingType] = useState<'factura' | 'recibo' | null>(null);

  const [movementToPrint, setMovementToPrint] = useState<any | null>(null);
  const [showMovementPrintModal, setShowMovementPrintModal] = useState(false);
  const [printAllSession, setPrintAllSession] = useState(false);
  const [showPrintAllModal, setShowPrintAllModal] = useState(false);

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [initialAmountInput, setInitialAmountInput] = useState('0');

  const [showCloseModal, setShowCloseModal] = useState(false);
  const [countedCashInput, setCountedCashInput] = useState('0');

  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);

  const [movementType, setMovementType] = useState<'INGRESO' | 'EGRESO_PROVEEDOR' | 'EGRESO_SUELDO' | 'EGRESO_VARIOS'>('INGRESO');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementDescription, setMovementDescription] = useState('');

  const [activeWeightProduct, setActiveWeightProduct] = useState<Product | null>(null);
  const [tempWeight, setTempWeight] = useState<number>(0);
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const [isRegisteringMovement, setIsRegisteringMovement] = useState(false);

  const { connected: scaleConnected, error: scaleError, weight: scaleWeight, connectScale, disconnectScale } = useSerialScale((w) => {
    if (activeWeightProduct) setTempWeight(w);
  });

  const [simulatedWeight, setSimulatedWeight] = useState(0.0);
  const [isSimulatingScale, setIsSimulatingScale] = useState(false);

  // Hidratación desde DB al montar el componente
  useEffect(() => {
    async function hydrateFromDB() {
      try {
        const [productList, alertList, workerList] = await Promise.all([
          fetchProducts(),
          fetchAlerts(),
          getBranchWorkers(),
        ]);
        setProducts(productList);
        setAlerts(alertList);
        setWorkers(workerList);
      } catch (err) {
        console.error('[POS] Error hidratando datos desde DB:', err);
      }
    }
    hydrateFromDB();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
      if (typeof window !== 'undefined') setIsOnline(navigator.onLine);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Los guards se aplican en el render, no aquí (evitar violación de reglas de Hooks)

  useEffect(() => {
    if (!mounted) return;
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineSales();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (navigator.onLine) syncOfflineSales();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [mounted, syncOfflineSales]);

  useEffect(() => {
    if (mounted && !currentSession) {
      const t = setTimeout(() => setShowOpenModal(true), 0);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setShowOpenModal(false), 0);
    return () => clearTimeout(t);
  }, [mounted, currentSession]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isSimulatingScale && activeWeightProduct) {
      const t = setTimeout(() => {
        setSimulatedWeight(1.25);
        setTempWeight(1.25);
      }, 0);
      interval = setInterval(() => {
        const nextW = parseFloat((Math.random() * 0.1 + 1.2).toFixed(3));
        setSimulatedWeight(nextW);
        setTempWeight(nextW);
      }, 1500);
      return () => {
        clearTimeout(t);
        if (interval) clearInterval(interval);
      };
    }
    const t = setTimeout(() => setSimulatedWeight(0.0), 0);
    return () => clearTimeout(t);
  }, [isSimulatingScale, activeWeightProduct]);

  const addToCart = useCallback(
    (product: Product, customQuantity?: number) => {
      if (product.type === 'WEIGHT' && customQuantity === undefined) {
        setActiveWeightProduct(product);
        if (scaleConnected && scaleWeight > 0) setTempWeight(scaleWeight);
        return;
      }
      const qtyToAdd = customQuantity ?? 1;
      
      let isStockValid = true;
      let stockLimitMsg = '';

      setCart((prev) => {
        const existing = prev.find((item) => item.product.id === product.id);
        const currentCartQty = existing ? existing.quantity : 0;
        if (currentCartQty + qtyToAdd > product.currentStock) {
          isStockValid = false;
          stockLimitMsg = `Stock insuficiente para ${product.name}. Disponible: ${product.currentStock}. En carrito: ${currentCartQty}`;
          return prev;
        }
        if (existing) {
          return prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: parseFloat((item.quantity + qtyToAdd).toFixed(3)) }
              : item
          );
        }
        return [...prev, { product, quantity: qtyToAdd }];
      });

      if (!isStockValid) {
        setStockAlert({ show: true, message: stockLimitMsg });
        setTimeout(() => setStockAlert({ show: false, message: '' }), 3000);
      }
    },
    [scaleConnected, scaleWeight]
  );

  const handleWeightConfirm = () => {
    if (activeWeightProduct && tempWeight > 0) addToCart(activeWeightProduct, tempWeight);
    setActiveWeightProduct(null);
    setTempWeight(0);
    setIsSimulatingScale(false);
  };

  const handleCashReceivedChange = (value: string) => {
    setCashReceived(value);
    const amount = parseFloat(value);
    if (!isNaN(amount) && amount >= total) setChangeToGive(amount - total);
    else setChangeToGive(null);
  };

  const applyQuickCash = (amount: number) => {
    handleCashReceivedChange((amount === 0 ? total : amount).toString());
  };

  const handleQrPaymentStart = async () => {
    if (total <= 0) return;
    setIsProcessingQr(true);
    setShowQrModal(true);
    setIsQrPaid(false);
    setQrData('');
    try {
      const response = await processMercadoPagoPayment({
        amount: total,
        description: 'Venta POS El Criollito',
        paymentMethod: 'QR',
      });
      if (response.success && response.qrData) setQrData(response.qrData);
    } catch (e) {
      console.error('Error generating QR payment:', e);
    } finally {
      setIsProcessingQr(false);
    }
  };

  const handleSimulateQrSuccess = () => {
    setIsQrPaid(true);
    setPaymentMethod('QR');
    setTimeout(() => setShowQrModal(false), 1200);
  };

  const handleCerrarVentaClick = () => {
    if (!canConfirm) return;
    setShowCheckoutModal(true);
  };

  const confirmSaleWithDocument = async (docType: 'factura' | 'recibo' | 'ninguno') => {
    setShowCheckoutModal(false);

    let compTipo: 'FACTURA_A' | 'FACTURA_B' | 'FACTURA_C' | null = null;
    let caeData = undefined;

    if (docType === 'factura') {
      compTipo = customerDoc && customerDoc.length > 8 ? 'FACTURA_A' : 'FACTURA_B';
      const cae = Math.floor(Math.random() * 10000000000000).toString().padStart(14, '0');
      const expiration = new Date();
      expiration.setDate(expiration.getDate() + 10);
      caeData = {
        cae,
        expiration: expiration.toISOString(),
        numero: Math.floor(Math.random() * 10000),
        qr: 'https://www.afip.gob.ar/fe/qr/?p=mockedQrData',
      };
    }

    const ticketItems = cart.map((item) => ({
      name: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      subtotal: item.product.price * item.quantity,
    }));

    const saleInfo = {
      createdAt: new Date().toISOString(),
      totalAmount: total,
      paymentMethod: paymentMethod!,
      comprobanteTipo: compTipo,
      clienteDocumento: customerDoc || null,
      cae: caeData?.cae || null,
      caeExpiration: caeData?.expiration || null,
      numeroComprobante: caeData?.numero || null,
      qrCodeData: caeData?.qr || null,
      items: ticketItems,
    };

    await processSale(
      cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      paymentMethod!,
      customerDoc || undefined,
      compTipo,
      caeData
    );

    setLastSaleDni(customerDoc);
    setCart([]);
    setPaymentMethod(null);
    setCustomerDoc('');
    setCustomerEmailStatus(null);
    setCashReceived('');
    setChangeToGive(null);

    if (docType !== 'ninguno') {
      if (isPrinterConnected) {
        // Simular impresión térmica real
        console.log('Imprimiendo en impresora térmica...');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        if (customerDoc && customerEmailStatus && customerEmailStatus !== 'not_found') {
          console.log(`Enviando factura automáticamente a ${customerEmailStatus}...`);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
        } else {
          // Abrir modal de email porque no hay impresora y no hay email validado
          setShowEmailInvoiceModal(true);
        }
      }
    } else {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  };

  const handleCustomerDocValidate = async (dni: string) => {
    if (!dni || dni.length < 7) {
      setCustomerEmailStatus(null);
      return;
    }
    const res = await getCustomerByDni(dni);
    if (res.success && res.customer && res.customer.email) {
      setCustomerEmailStatus(res.customer.email);
    } else {
      setCustomerEmailStatus('not_found');
    }
  };

  const handleEmailInvoiceSent = () => {
    setShowEmailInvoiceModal(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleOpenSession = async () => {
    try {
      await openSession(parseFloat(initialAmountInput) || 0);
      setShowOpenModal(false);
    } catch (err) {
      console.error('Error abriendo sesión:', err);
    }
  };

  const handleCloseSession = async () => {
    try {
      const result = await closeSession(0);
      setSummaryData(result.summary);
      setShowCloseModal(false);
      setShowSummaryModal(true);
    } catch (err) {
      console.error('Error cerrando sesión:', err);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    let isStockValid = true;
    let stockLimitMsg = '';

    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const newQ = parseFloat((item.quantity + delta).toFixed(3));
          if (delta > 0 && newQ > item.product.currentStock) {
            isStockValid = false;
            stockLimitMsg = `No se puede agregar más. Stock disponible de ${item.product.name}: ${item.product.currentStock}`;
            return item;
          }
          return newQ > 0 ? { ...item, quantity: newQ } : item;
        }
        return item;
      })
    );

    if (!isStockValid) {
      setStockAlert({ show: true, message: stockLimitMsg });
      setTimeout(() => setStockAlert({ show: false, message: '' }), 3000);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const selectCash = () => {
    setPaymentMethod('CASH');
    setCashReceived('');
    setChangeToGive(null);
    setShowCashModal(true);
  };

  const closeCashPanel = () => {
    setShowCashModal(false);
  };

  const handleMovementTypeFromSelect = (val: string) => {
    if (val === 'EGRESO_PROVEEDOR') {
      setOutlayType('PROVEEDOR');
      setMovementType('EGRESO_PROVEEDOR');
      setMovementDescription('Pago a Proveedores');
    } else if (val === 'EGRESO_SUELDO') {
      setOutlayType('SUELDO');
      setMovementType('EGRESO_SUELDO');
      if (workers.length > 0) {
        setSelectedWorkerId(workers[0].id);
        setMovementDescription(`Pago de Sueldo - ${workers[0].name}`);
      } else {
        setMovementDescription('Pago de Sueldo');
      }
    } else {
      setOutlayType('INSUMO');
      setMovementType('EGRESO_VARIOS');
      setMovementDescription('Compra Insumo');
    }
  };

  const handleSubCategoryChange = (val: 'PROVEEDOR' | 'INSUMO' | 'MATERIA_PRIMA' | 'SUELDO' | 'OTRO') => {
    setOutlayType(val);
    if (val === 'INSUMO') setMovementDescription('Compra Insumo');
    else if (val === 'MATERIA_PRIMA') setMovementDescription('Compra Materia Prima');
    else {
      setOutlayType('OTRO');
      setMovementDescription('');
      setJustification('');
    }
  };

  const handleWorkerChange = (workerId: string) => {
    setSelectedWorkerId(workerId);
    const w = workers.find((work) => work.id === workerId);
    if (w) setMovementDescription(`Pago de Sueldo - ${w.name}`);
  };

  const handleRegisterMovement = async () => {
    if (isRegisteringMovement) return;
    const amt = parseFloat(movementAmount) || 0;
    if (amt <= 0) return;
    if (movementType !== 'INGRESO' && outlayType === 'OTRO' && justification.trim().length === 0) return;

    const desc =
      outlayType === 'SUELDO' ? movementDescription : outlayType === 'OTRO' ? justification : movementDescription;

    setIsRegisteringMovement(true);
    try {
      await registerMovement(movementType as any, amt, desc);
      setMovementAmount('');
      setMovementDescription('');
      setJustification('');
      setPosActiveTab('cobros');
    } catch (e) {
      console.error('Error registrando movimiento:', e);
    } finally {
      setIsRegisteringMovement(false);
    }
  };

  const canRegisterMovement =
    !!movementAmount &&
    parseFloat(movementAmount) > 0 &&
    !(movementType !== 'INGRESO' && outlayType === 'OTRO' && justification.trim().length === 0) &&
    !isRegisteringMovement;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isInput = (e.target as HTMLElement).tagName === 'INPUT';
      const isTextarea = (e.target as HTMLElement).tagName === 'TEXTAREA';

      if (isInput || isTextarea) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
          return;
        }
        if (isTextarea) return;
        if (e.key !== 'Enter') return;
      }

      const key = e.key;

      if (key === 'F1') {
        e.preventDefault();
        setPosActiveTab('cobros');
        return;
      }
      if (key === 'F2') {
        e.preventDefault();
        setPosActiveTab('movimientos');
        return;
      }
      if (key === 'F3') {
        e.preventDefault();
        setPosActiveTab('historial');
        return;
      }

      if (showCheckoutModal) {
        const k = key.toLowerCase();
        if (k === 'f') {
          e.preventDefault();
          confirmSaleWithDocument('factura');
          return;
        }
        if (k === 'b') {
          e.preventDefault();
          confirmSaleWithDocument('recibo');
          return;
        }
        if (key === 'Enter' || k === 'n') {
          e.preventDefault();
          confirmSaleWithDocument('ninguno');
          return;
        }
        if (key === 'Escape') {
          e.preventDefault();
          setShowCheckoutModal(false);
          return;
        }
      }

      if (showEmailInvoiceModal) {
        if (key === 'Escape') {
          e.preventDefault();
          setShowEmailInvoiceModal(false);
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
          return;
        }
      }

      if (showQrModal) {
        if (key === 'Escape') {
          e.preventDefault();
          setShowQrModal(false);
          setPaymentMethod(null);
          return;
        }
      }

      if (showPrintModal) {
        if (key === 'Escape' || key === 'Enter') {
          e.preventDefault();
          setShowPrintModal(false);
          setSaleToPrint(null);
          return;
        }
      }

      if (posActiveTab === 'cobros' && !showCheckoutModal && !showQrModal && !showPrintModal && !showOpenModal && !showCloseModal && !showSummaryModal) {
        const k = key.toLowerCase();

        // Atajos de teclado por índice (primer producto UNIT = 'm', segundo WEIGHT = 'p', etc.)
        const unitProducts = products.filter(p => p.type === 'UNIT');
        const weightProducts = products.filter(p => p.type === 'WEIGHT');

        if (k === 'm' && unitProducts[0]) {
          e.preventDefault();
          addToCart(unitProducts[0], 1);
          return;
        }
        if (k === ',' && unitProducts[0]) {
          e.preventDefault();
          addToCart(unitProducts[0], 6);
          return;
        }
        if (k === '.' && unitProducts[0]) {
          e.preventDefault();
          addToCart(unitProducts[0], 12);
          return;
        }
        if (k === 'p' && weightProducts[0]) {
          e.preventDefault();
          addToCart(weightProducts[0]);
          return;
        }
        if (k === 'k' && weightProducts[1]) {
          e.preventDefault();
          addToCart(weightProducts[1]);
          return;
        }
        if (k === 'f' && unitProducts[1]) {
          e.preventDefault();
          addToCart(unitProducts[1], 1);
          return;
        }
        if (k === 'g' && unitProducts[1]) {
          e.preventDefault();
          addToCart(unitProducts[1], 6);
          return;
        }
        if (k === 'h' && unitProducts[1]) {
          e.preventDefault();
          addToCart(unitProducts[1], 12);
          return;
        }

        if (k === 'e') {
          e.preventDefault();
          selectCash();
          return;
        }
        if (k === 'd') {
          e.preventDefault();
          setPaymentMethod('DEBIT');
          return;
        }
        if (k === 'c') {
          e.preventDefault();
          setPaymentMethod('CREDIT');
          return;
        }
        if (k === 'q') {
          e.preventDefault();
          handleQrPaymentStart();
          return;
        }
        if (k === 'v') {
          e.preventDefault();
          setCart([]);
          return;
        }
        if (k === '0') {
          e.preventDefault();
          customerDocInputRef.current?.focus();
          return;
        }
        if (k === 't') {
          e.preventDefault();
          setShowCloseModal(true);
          return;
        }

        if (paymentMethod === 'CASH') {
          if (k === 'x') {
            e.preventDefault();
            applyQuickCash(0);
            return;
          }
          if (k === 'y') {
            e.preventDefault();
            applyQuickCash(1000);
            return;
          }
          if (k === 'w') {
            e.preventDefault();
            applyQuickCash(2000);
            return;
          }
          if (k === 'h') {
            e.preventDefault();
            applyQuickCash(5000);
            return;
          }
          if (k === 'o') {
            e.preventDefault();
            applyQuickCash(10000);
            return;
          }
          if (k === 'j') {
            e.preventDefault();
            applyQuickCash(20000);
            return;
          }
        }

        if ((key === 'Enter' || key === ' ') && canConfirm && barcodeBuffer.length === 0 && !showCashModal) {
          e.preventDefault();
          handleCerrarVentaClick();
          return;
        }
      }

      if (key === 'Enter') {
        if (barcodeBuffer.length > 0) {
          if (barcodeBuffer.length === 13 && barcodeBuffer.startsWith('20')) {
            const productCode = barcodeBuffer.substring(2, 7);
            const weightOrPrice = parseInt(barcodeBuffer.substring(7, 12), 10) / 1000;
            const product = products.find((p) => p.barcode?.includes(productCode));
            if (product) addToCart(product, weightOrPrice);
          } else {
            const product = products.find((p) => p.barcode === barcodeBuffer);
            if (product) addToCart(product);
          }
          setBarcodeBuffer('');
        }
      } else if (key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (/[0-9]/.test(key)) setBarcodeBuffer((prev) => prev + key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const timeout = setTimeout(() => setBarcodeBuffer(''), 100);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [barcodeBuffer, products, addToCart, showCheckoutModal, showQrModal, showPrintModal, posActiveTab, paymentMethod, canConfirm]);

  useEffect(() => {
    if (showOpenModal) {
      const t = setTimeout(() => {
        initialAmountInputRef.current?.focus();
        initialAmountInputRef.current?.select();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [showOpenModal]);

  useEffect(() => {
    if (showCloseModal) {
      const t = setTimeout(() => {
        countedCashInputRef.current?.focus();
        countedCashInputRef.current?.select();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [showCloseModal]);

  useEffect(() => {
    if (posActiveTab === 'movimientos') {
      const t = setTimeout(() => {
        movementAmountInputRef.current?.focus();
        movementAmountInputRef.current?.select();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [posActiveTab]);

  useEffect(() => {
    if (posActiveTab === 'movimientos' && movementType !== 'INGRESO' && outlayType === 'OTRO') {
      const t = setTimeout(() => {
        justificationInputRef.current?.focus();
        justificationInputRef.current?.select();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [outlayType, movementType, posActiveTab]);

  useEffect(() => {
    if (paymentMethod === 'CASH') {
      const t = setTimeout(() => {
        cashReceivedInputRef.current?.focus();
        cashReceivedInputRef.current?.select();
      }, 50);
      return () => clearTimeout(t);
    }
  }, [paymentMethod]);

  if (!mounted) return <PosLoadingScreen />;

  // Guard: cajero SIN sucursal asignada → bloquear operaciones
  if (!currentUser?.branchId) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-100 p-6 font-sans">
        <div className="max-w-md w-full bg-white rounded-3xl p-10 shadow-xl border border-amber-100 text-center space-y-5">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-500 mx-auto">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <h2 className="text-2xl font-bold font-heading text-slate-800">Sin Sucursal Asignada</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Tu usuario no tiene una sucursal asignada. No puedes operar el punto de venta hasta que un administrador te asigne a una sucursal.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-xs text-slate-500 text-left space-y-1">
            <p className="font-bold text-slate-700">¿Qué hacer?</p>
            <p>1. Contacta al administrador de tu negocio.</p>
            <p>2. El admin debe ir a <strong>Admin → Gestión de Personal</strong>.</p>
            <p>3. Crear tu usuario y asignarte a la sucursal correcta.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full relative bg-slate-50/50 text-slate-900 overflow-hidden p-4">
      <PosStatusBar
        hasSession={!!currentSession}
        isOnline={isOnline}
        pendingCount={pendingSales.length}
        isPrinterConnected={isPrinterConnected}
        onTogglePrinter={() => setIsPrinterConnected(!isPrinterConnected)}
        onCloseSession={() => setShowCloseModal(true)}
      />

      <AnimatePresence>
        {stockAlert.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white font-bold px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-500"
          >
            <span>⚠️</span>
            <span>{stockAlert.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showOpenModal && (
          <OpenSessionModal
            initialAmountInput={initialAmountInput}
            onAmountChange={setInitialAmountInput}
            onConfirm={handleOpenSession}
            inputRef={initialAmountInputRef}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCloseModal && (
          <CloseSessionModal
            onCancel={() => setShowCloseModal(false)}
            onConfirm={handleCloseSession}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSummaryModal && summaryData && (
          <SessionSummaryModal
            summaryData={summaryData}
            onPrint={() => window.print()}
            onFinish={() => {
              setShowSummaryModal(false);
              setSummaryData(null);
              window.location.href = '/';
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showQrModal && (
          <QrPaymentModal
            total={total}
            qrData={qrData}
            isProcessing={isProcessingQr}
            isPaid={isQrPaid}
            onSimulateSuccess={handleSimulateQrSuccess}
            onCancel={() => {
              setShowQrModal(false);
              setPaymentMethod(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCheckoutModal && (
          <CheckoutModal
            onSelectFactura={() => confirmSaleWithDocument('factura')}
            onSelectRecibo={() => confirmSaleWithDocument('recibo')}
            onSelectNinguno={() => confirmSaleWithDocument('ninguno')}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCashModal && (
          <CashChangePanel
            total={total}
            cashReceived={cashReceived}
            changeToGive={changeToGive}
            isCashInsufficient={isCashInsufficient}
            inputRef={cashReceivedInputRef}
            onCashReceivedChange={handleCashReceivedChange}
            onQuickCash={applyQuickCash}
            onClose={closeCashPanel}
            onConfirm={() => {
              closeCashPanel();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEmailInvoiceModal && (
          <EmailInvoiceModal
            dni={lastSaleDni}
            onSend={handleEmailInvoiceSent}
            onCancel={() => {
              setShowEmailInvoiceModal(false);
              setShowSuccess(true);
              setTimeout(() => setShowSuccess(false), 3000);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeWeightProduct && (
          <WeightNumpadModal
            product={activeWeightProduct}
            scaleConnected={scaleConnected}
            scaleWeight={scaleWeight}
            scaleError={scaleError}
            isSimulatingScale={isSimulatingScale}
            simulatedWeight={simulatedWeight}
            onConnectScale={connectScale}
            onToggleSimulation={() => setIsSimulatingScale(!isSimulatingScale)}
            onValueChange={setTempWeight}
            onConfirm={handleWeightConfirm}
            onCancel={() => {
              setActiveWeightProduct(null);
              setIsSimulatingScale(false);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPrintModal && saleToPrint && (
          <SalePrintModal
            sale={saleToPrint}
            printingType={printingType}
            onPrint={() => window.print()}
            onClose={() => {
              setShowPrintModal(false);
              setSaleToPrint(null);
              setPrintingType(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMovementPrintModal && movementToPrint && (
          <MovementPrintModal
            movement={movementToPrint}
            onPrint={() => window.print()}
            onClose={() => {
              setShowMovementPrintModal(false);
              setMovementToPrint(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPrintAllModal && printAllSession && (
          <HistoryPrintModal
            sales={salesHistory}
            movements={movementsHistory}
            currentSession={currentSession}
            onPrint={() => window.print()}
            onClose={() => {
              setShowPrintAllModal(false);
              setPrintAllSession(false);
            }}
          />
        )}
      </AnimatePresence>

      {posActiveTab === 'cobros' && (
        <CobrosTab
          products={products}
          currentSession={currentSession}
          cart={cart}
          total={total}
          showSuccess={showSuccess}
          paymentMethod={paymentMethod}
          customerDoc={customerDoc}
          requiresDoc={requiresDoc}
          cashReceived={cashReceived}
          changeToGive={changeToGive}
          isCashInsufficient={isCashInsufficient}
          canConfirm={!!canConfirm}
          scaleConnected={scaleConnected}
          scaleWeight={scaleWeight}
          scaleError={scaleError}
          customerDocInputRef={customerDocInputRef}
          cashReceivedInputRef={cashReceivedInputRef}
          onAddToCart={addToCart}
          onConnectScale={connectScale}
          onDisconnectScale={disconnectScale}
          onClearCart={() => setCart([])}
          onUpdateQuantity={updateQuantity}
          onRemoveFromCart={removeFromCart}
          onCustomerDocChange={setCustomerDoc}
          onCustomerDocValidate={handleCustomerDocValidate}
          onSelectCash={selectCash}
          onSelectDebit={() => setPaymentMethod('DEBIT')}
          onSelectCredit={() => setPaymentMethod('CREDIT')}
          onSelectQr={handleQrPaymentStart}
          onCloseCashPanel={closeCashPanel}
          onCashReceivedChange={handleCashReceivedChange}
          onQuickCash={applyQuickCash}
          onConfirmSale={handleCerrarVentaClick}
        />
      )}

      {posActiveTab === 'movimientos' && (
        <MovementsTab
          movementType={movementType}
          outlayType={outlayType}
          movementAmount={movementAmount}
          movementDescription={movementDescription}
          justification={justification}
          workers={workers}
          selectedWorkerId={selectedWorkerId}
          movementAmountInputRef={movementAmountInputRef}
          movementDescriptionInputRef={movementDescriptionInputRef}
          justificationInputRef={justificationInputRef}
          onMovementTypeChange={(type) => {
            setMovementType(type);
            if (type === 'INGRESO') setMovementDescription('');
          }}
          onOutlayTypeChange={setOutlayType}
          onMovementTypeFromSelect={handleMovementTypeFromSelect}
          onSubCategoryChange={handleSubCategoryChange}
          onWorkerChange={handleWorkerChange}
          onMovementAmountChange={setMovementAmount}
          onMovementDescriptionChange={setMovementDescription}
          onJustificationChange={(value) => {
            setJustification(value);
            setMovementDescription(value);
          }}
          onBackToCobros={() => {
            setPosActiveTab('cobros');
            setMovementAmount('');
            setMovementDescription('');
            setJustification('');
          }}
          onRegister={handleRegisterMovement}
          canRegister={canRegisterMovement}
        />
      )}

      {posActiveTab === 'historial' && (
        <HistoryTab
          salesHistory={salesHistory}
          movementsHistory={movementsHistory}
          onPrintAll={() => {
            setPrintAllSession(true);
            setShowPrintAllModal(true);
            setTimeout(() => window.print(), 500);
          }}
          onPrintSale={(sale) => {
            setSaleToPrint(sale);
            setPrintingType(sale.comprobanteTipo ? 'factura' : 'recibo');
            setShowPrintModal(true);
            setTimeout(() => window.print(), 500);
          }}
          onPrintMovement={(mov) => {
            setMovementToPrint(mov);
            setShowMovementPrintModal(true);
            setTimeout(() => window.print(), 500);
          }}
        />
      )}

      {showPrintModal && saleToPrint && (
        <div className="hidden print:block print-ticket">
          <TicketPrintPreview sale={saleToPrint} type={printingType} />
        </div>
      )}

      {showMovementPrintModal && movementToPrint && (
        <div className="hidden print:block print-ticket">
          <MovementPrintPreview movement={movementToPrint} />
        </div>
      )}

      {showPrintAllModal && printAllSession && (
        <div className="hidden print:block print-ticket">
          <HistoryReportPrintPreview sales={salesHistory} movements={movementsHistory} currentSession={currentSession} />
        </div>
      )}
    </div>
  );
}
