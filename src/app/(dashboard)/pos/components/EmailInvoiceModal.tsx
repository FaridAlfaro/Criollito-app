'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCustomerByDni, saveCustomerEmail } from '@/actions/customers';

interface EmailInvoiceModalProps {
  dni: string;
  onSend: () => void;
  onCancel: () => void;
}

export function EmailInvoiceModal({ dni, onSend, onCancel }: EmailInvoiceModalProps) {
  const [inputDni, setInputDni] = useState(dni || '');
  const [step, setStep] = useState<1 | 2>(dni ? 2 : 1);
  const [email, setEmail] = useState('');
  const [acceptsMarketing, setAcceptsMarketing] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(!!dni);

  useEffect(() => {
    async function fetchInitialCustomer() {
      if (!dni) return;
      setIsFetching(true);
      const res = await getCustomerByDni(dni);
      if (res.success && res.customer) {
        setEmail(res.customer.email);
        setAcceptsMarketing(res.customer.acceptsMarketing);
      }
      setIsFetching(false);
    }
    fetchInitialCustomer();
  }, [dni]);

  const handleSearchDni = async () => {
    if (!inputDni) return;
    setIsFetching(true);
    const res = await getCustomerByDni(inputDni);
    if (res.success && res.customer) {
      setEmail(res.customer.email);
      setAcceptsMarketing(res.customer.acceptsMarketing);
    } else {
      setEmail('');
      setAcceptsMarketing(true);
    }
    setIsFetching(false);
    setStep(2);
  };

  const handleSend = async () => {
    if (!email) return;
    setIsLoading(true);
    
    const finalDni = dni || inputDni;
    if (finalDni) {
      await saveCustomerEmail(finalDni, email, acceptsMarketing);
    }
    
    setIsLoading(false);
    onSend();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-card border border-slate-200 rounded-[32px] p-8 max-w-md w-full shadow-2xl relative"
      >
        <button
          onClick={onCancel}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={32} className="text-orange-500" />
          </div>
          <h3 className="text-2xl font-extrabold font-heading text-slate-800 tracking-tight">
            Enviar Comprobante
          </h3>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            No se detectó una impresora térmica conectada. Ingrese el correo del cliente para enviar la factura.
          </p>
        </div>

        {isFetching ? (
          <div className="flex justify-center py-4">
            <span className="text-sm font-bold text-slate-400 animate-pulse">Buscando datos del cliente...</span>
          </div>
        ) : step === 1 ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">DNI del Cliente</label>
              <input
                type="number"
                placeholder="Ingrese DNI"
                value={inputDni}
                onChange={(e) => setInputDni(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchDni();
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                autoFocus
              />
            </div>
            <Button
              onClick={handleSearchDni}
              disabled={!inputDni}
              className="w-full h-14 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-2xl shadow-md text-base"
            >
              Buscar Cliente
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Correo Electrónico</label>
              <input
                type="email"
                placeholder="cliente@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && email) handleSend();
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
                autoFocus
              />
            </div>

            <label className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition-colors">
              <div className="mt-0.5">
                <input
                  type="checkbox"
                  checked={acceptsMarketing}
                  onChange={(e) => setAcceptsMarketing(e.target.checked)}
                  className="w-5 h-5 text-orange-500 bg-white border-slate-300 rounded focus:ring-orange-500 focus:ring-2"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-slate-800">Recibir promociones</span>
                <span className="text-xs text-slate-500 font-medium">
                  El cliente acepta recibir publicidad y ofertas especiales a este correo.
                </span>
              </div>
            </label>

            <Button
              onClick={handleSend}
              disabled={!email || isLoading}
              className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-md text-base"
            >
              {isLoading ? (
                'Enviando...'
              ) : (
                <>
                  <Send size={18} className="mr-2" /> Enviar Correo
                </>
              )}
            </Button>
            
            {!dni && (
              <button
                onClick={() => setStep(1)}
                className="w-full text-sm text-slate-400 hover:text-slate-600 font-semibold mt-2"
              >
                Volver a buscar DNI
              </button>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
