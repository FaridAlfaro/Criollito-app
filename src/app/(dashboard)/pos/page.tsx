'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useStore, Product } from '@/store/useStore';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2, Banknote, CreditCard, ScanLine, UserSquare2, AlertCircle, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Numpad } from '@/components/ui/Numpad';

type PaymentMethod = 'CASH' | 'DEBIT' | 'CREDIT' | null;

// Límite ARCA 2025 para consumidor final anónimo
const ARCA_LIMIT = 10000000; 

export default function POSPage() {
  const { products, processSale } = useStore();
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [customerDoc, setCustomerDoc] = useState('');
  
  // Numpad state
  const [activeWeightProduct, setActiveWeightProduct] = useState<Product | null>(null);
  const [tempWeight, setTempWeight] = useState<number>(0);

  // Barcode scanner state
  const [barcodeBuffer, setBarcodeBuffer] = useState('');

  const addToCart = useCallback((product: Product, customQuantity?: number) => {
    // Si es por peso y no hay cantidad custom, abrir Numpad
    if (product.type === 'WEIGHT' && customQuantity === undefined) {
      setActiveWeightProduct(product);
      return;
    }

    const qtyToAdd = customQuantity ?? 1;

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + qtyToAdd } 
            : item
        );
      }
      return [...prev, { product, quantity: qtyToAdd }];
    });
  }, []);

  const handleWeightConfirm = () => {
    if (activeWeightProduct && tempWeight > 0) {
      addToCart(activeWeightProduct, tempWeight);
    }
    setActiveWeightProduct(null);
    setTempWeight(0);
  };

  // Escucha global de teclado (Simula Lector de Código de Barras y Lector EAN-13 de Balanza)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 0) {
          // Parseo EAN-13 de Balanza homologada (ej. 20PPPPPKKKKKC)
          if (barcodeBuffer.length === 13 && barcodeBuffer.startsWith('20')) {
            const productCode = barcodeBuffer.substring(2, 7);
            const weightOrPrice = parseInt(barcodeBuffer.substring(7, 12), 10) / 1000; // Asumiendo formato peso
            
            // Buscar producto por parte del código
            const product = products.find(p => p.barcode?.includes(productCode));
            if (product) {
              addToCart(product, weightOrPrice);
            }
          } else {
            // Producto unitario normal
            const product = products.find(p => p.barcode === barcodeBuffer);
            if (product) {
              addToCart(product);
            }
          }
          setBarcodeBuffer('');
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setBarcodeBuffer(prev => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const timeout = setTimeout(() => setBarcodeBuffer(''), 100);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timeout);
    };
  }, [barcodeBuffer, products, addToCart]);


  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQ = item.quantity + delta;
        return newQ > 0 ? { ...item, quantity: newQ } : item;
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const total = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  
  // ARCA Validation
  const requiresDoc = total >= ARCA_LIMIT;
  const canConfirm = cart.length > 0 && paymentMethod && (!requiresDoc || customerDoc.length >= 7);

  const handleConfirmSale = () => {
    if (!canConfirm) return;
    
    processSale(
      cart.map(item => ({ productId: item.product.id, quantity: item.quantity })),
      customerDoc
    );
    
    setCart([]);
    setPaymentMethod(null);
    setCustomerDoc('');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-6 relative">
      
      {/* Numpad Modal Overlay */}
      <AnimatePresence>
        {activeWeightProduct && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="flex flex-col items-center">
               <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                 <Scale className="text-primary" /> {activeWeightProduct.name}
               </h2>
               <Numpad 
                 onValueChange={setTempWeight} 
                 onConfirm={handleWeightConfirm} 
                 label="Ingrese Peso Manual o espere a Balanza"
               />
               <Button variant="ghost" className="mt-4 text-muted-foreground" onClick={() => setActiveWeightProduct(null)}>Cancelar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left side: Products Grid */}
      <div className="flex-1 bg-card rounded-2xl shadow-sm p-6 flex flex-col border border-border">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            Productos Rápidos
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full border border-border">
            <ScanLine size={16} className="text-primary animate-pulse" />
            <span>Lector / Balanza activo</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4">
          {products.map(product => (
            <motion.div 
              whileHover={{ scale: 1.02, borderColor: 'var(--primary)' }}
              whileTap={{ scale: 0.98 }}
              key={product.id}
              onClick={() => addToCart(product)}
              className="p-5 border border-border rounded-xl cursor-pointer transition-all hover:shadow-md bg-muted/20 flex flex-col justify-between h-32 select-none group"
            >
              <div>
                <h3 className="font-bold text-foreground leading-tight">{product.name}</h3>
                {product.barcode && <p className="text-[10px] text-muted-foreground opacity-50 mt-1">{product.barcode}</p>}
              </div>
              <div className="flex justify-between items-end mt-2">
                <span className="text-primary font-bold">${product.price}</span>
                <span className="text-xs text-muted-foreground font-medium bg-background border border-border px-2 py-1 rounded-md">
                  {product.type === 'WEIGHT' ? '/kg' : '/ud'}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right side: Current Ticket */}
      <div className="w-[450px] bg-card rounded-2xl shadow-sm p-6 flex flex-col border border-border relative overflow-hidden">
        <AnimatePresence>
          {showSuccess && (
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="absolute inset-0 z-20 bg-primary flex flex-col items-center justify-center text-primary-foreground"
            >
              <CheckCircle2 size={64} className="mb-4 text-primary-foreground" />
              <h2 className="text-3xl font-bold font-heading">Venta Exitosa</h2>
              <p className="mt-2 text-primary-foreground/90 font-medium">Factura ARCA emitida correctamente</p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-between items-center mb-6 text-foreground border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart size={24} className="text-primary" />
            <h2 className="text-2xl font-bold font-heading">Ticket Actual</h2>
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-sm text-muted-foreground hover:text-destructive font-medium transition-colors">
              Vaciar Ticket
            </button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto mb-6 pr-2 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
              <ShoppingCart size={48} className="mb-4" />
              <p>Escanea o selecciona productos</p>
            </div>
          ) : (
            <AnimatePresence>
              {cart.map(item => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  key={item.product.id} 
                  className="flex flex-col gap-2 p-3 bg-muted/30 rounded-lg border border-border/50"
                >
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>{item.product.name}</span>
                    <span>${item.product.price * item.quantity}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-3 bg-background px-2 py-1 rounded-md border border-border">
                      <button onClick={() => updateQuantity(item.product.id, item.product.type === 'WEIGHT' ? -0.5 : -1)} className="text-muted-foreground hover:text-primary transition-colors"><Minus size={14} /></button>
                      <span className="font-bold w-12 text-center text-foreground">{item.quantity} {item.product.type === 'WEIGHT' ? 'kg' : 'ud'}</span>
                      <button onClick={() => updateQuantity(item.product.id, item.product.type === 'WEIGHT' ? 0.5 : 1)} className="text-muted-foreground hover:text-primary transition-colors"><Plus size={14} /></button>
                    </div>
                    <button onClick={() => removeFromCart(item.product.id)} className="text-muted-foreground hover:text-destructive p-2 rounded-md hover:bg-destructive/10 transition-colors flex items-center gap-1">
                      <Trash2 size={16} /> <span className="text-xs font-semibold">Eliminar</span>
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <div className="border-t border-border pt-4 bg-card z-10">
          <div className="flex justify-between font-bold text-3xl mb-4 text-foreground font-heading">
            <span>Total</span>
            <span className="text-primary">${total}</span>
          </div>

          {/* ARCA Billing Input */}
          <div className="mb-4 space-y-2">
             <div className="flex items-center justify-between">
                <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                  <UserSquare2 size={16} className="text-muted-foreground" />
                  DNI/CUIT Cliente
                </label>
                {requiresDoc && <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1"><AlertCircle size={10}/> Req. ARCA</span>}
             </div>
             <input 
                type="number" 
                placeholder={requiresDoc ? "Obligatorio (Total > $10M)" : "Opcional (Consumidor Final)"}
                value={customerDoc}
                onChange={(e) => setCustomerDoc(e.target.value)}
                className={`w-full bg-background border ${requiresDoc && customerDoc.length < 7 ? 'border-destructive ring-1 ring-destructive' : 'border-border'} rounded-lg p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary placeholder:text-muted-foreground`}
             />
          </div>
          
          <div className="grid grid-cols-3 gap-2 mb-4">
            <Button 
              variant={paymentMethod === 'CASH' ? 'default' : 'outline'} 
              className={`h-14 font-semibold border-border flex flex-col gap-1 ${paymentMethod === 'CASH' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background hover:bg-muted text-foreground'}`}
              onClick={() => setPaymentMethod('CASH')}
            >
              <Banknote size={18} />
              <span>Efectivo</span>
            </Button>
            <Button 
              variant={paymentMethod === 'DEBIT' ? 'default' : 'outline'} 
              className={`h-14 font-semibold border-border flex flex-col gap-1 ${paymentMethod === 'DEBIT' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background hover:bg-muted text-foreground'}`}
              onClick={() => setPaymentMethod('DEBIT')}
            >
              <CreditCard size={18} />
              <span>Débito</span>
            </Button>
            <Button 
              variant={paymentMethod === 'CREDIT' ? 'default' : 'outline'} 
              className={`h-14 font-semibold border-border flex flex-col gap-1 ${paymentMethod === 'CREDIT' ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background hover:bg-muted text-foreground'}`}
              onClick={() => setPaymentMethod('CREDIT')}
            >
              <CreditCard size={18} />
              <span>Crédito</span>
            </Button>
          </div>
          <Button 
            size="lg"
            className="w-full h-16 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md transition-all disabled:opacity-50"
            disabled={!canConfirm}
            onClick={handleConfirmSale}
          >
            {!paymentMethod ? 'Selecciona método de pago' : 
             requiresDoc && customerDoc.length < 7 ? 'Ingrese DNI/CUIT (ARCA)' : 
             'Facturar Venta'}
          </Button>
        </div>
      </div>
    </div>
  );
}
