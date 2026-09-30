'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Flame, 
  Layers, 
  Grid, 
  Plus, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchActiveRecipes, createBakeOrderAction } from '@/actions/bakeQueue';
import { fetchProducts } from '@/actions/products';
import type { Recipe } from '@/modules/kitchen/domain/entities';

interface CreateBakeOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface ProductItem {
  id: string;
  name: string;
  type: string;
  optimalBatchSize: number;
}

export function CreateBakeOrderModal({ isOpen, onClose, onSuccess }: CreateBakeOrderModalProps) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [priority, setPriority] = useState<number>(2); // 1: Baja, 2: Normal, 3: Urgente
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Cargar recetas y productos activos
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadData() {
      setIsLoadingData(true);
      setErrorMsg(null);
      try {
        const [activeRecipes, activeProducts] = await Promise.all([
          fetchActiveRecipes(),
          fetchProducts()
        ]);

        if (isMounted) {
          setRecipes(activeRecipes);
          setProducts(activeProducts as ProductItem[]);

          if (activeRecipes.length > 0) {
            setSelectedRecipeId(activeRecipes[0].id);
            setSelectedProductId(activeRecipes[0].productId);
            // Iniciar por defecto con 1 bandeja
            setQuantity(activeRecipes[0].unitsPerTray ?? 24);
          } else if (activeProducts.length > 0) {
            setSelectedProductId(activeProducts[0].id);
            setQuantity(activeProducts[0].optimalBatchSize || 24);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Error al cargar productos y recetas.');
        }
      } finally {
        if (isMounted) setIsLoadingData(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [isOpen]);

  // Receta seleccionada actual
  const currentRecipe = useMemo(() => {
    return recipes.find(r => r.id === selectedRecipeId) || null;
  }, [recipes, selectedRecipeId]);

  // Capacidad de piezas por bandeja (de la receta o default 24)
  const unitsPerTray = currentRecipe?.unitsPerTray || 24;

  // Manejar cambio de receta / producto
  const handleRecipeChange = (recipeId: string) => {
    setSelectedRecipeId(recipeId);
    const rec = recipes.find(r => r.id === recipeId);
    if (rec) {
      setSelectedProductId(rec.productId);
      if (quantity === 0) {
        setQuantity(rec.unitsPerTray || 24);
      }
    }
  };

  const handleProductChange = (prodId: string) => {
    setSelectedProductId(prodId);
    // Buscar si tiene receta asociada
    const matchingRecipe = recipes.find(r => r.productId === prodId);
    if (matchingRecipe) {
      setSelectedRecipeId(matchingRecipe.id);
    } else {
      setSelectedRecipeId('');
    }
  };

  // Botones de incremento rápido
  const handleAddTray = () => {
    setQuantity(prev => prev + unitsPerTray);
  };

  const handleAddDozen = () => {
    setQuantity(prev => prev + 12);
  };

  const handleAddUnit = () => {
    setQuantity(prev => prev + 1);
  };

  const handleReset = () => {
    setQuantity(0);
  };

  // Cálculo de equivalencias
  const equivalences = useMemo(() => {
    if (quantity <= 0) return { bandejas: 0, unidadesRestantes: 0 };
    const bandejas = Math.floor(quantity / unitsPerTray);
    const unidadesRestantes = quantity % unitsPerTray;
    return { bandejas, unidadesRestantes };
  }, [quantity, unitsPerTray]);

  // Enviar orden
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setErrorMsg('Debe seleccionar un producto.');
      return;
    }
    if (quantity <= 0) {
      setErrorMsg('La cantidad a hornear debe ser mayor a 0.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await createBakeOrderAction({
        productId: selectedProductId,
        recipeId: selectedRecipeId || null,
        quantityNeeded: quantity,
        priority,
        notes: notes.trim() || null,
      });

      if (!res.success) {
        throw new Error(res.error || 'Error al crear la orden de horneado.');
      }

      setSuccessFeedback(`¡Orden encolada exitosamente para ${quantity} unidades!`);
      setTimeout(() => {
        setSuccessFeedback(null);
        onSuccess?.();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error inesperado al enviar orden.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-md rounded-2xl">
                <Flame className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-black">Crear Orden de Horneado</h2>
                <p className="text-xs text-orange-100 font-medium">
                  Programación rápida por bandejas, docenas o unidades
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {isLoadingData ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                <p className="text-sm font-medium">Cargando recetas y productos...</p>
              </div>
            ) : (
              <>
                {/* 1. Selección de Receta / Producto */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={14} className="text-orange-500" />
                    <span>Producto / Receta</span>
                  </label>

                  {recipes.length > 0 ? (
                    <div className="space-y-1.5">
                      <select
                        value={selectedRecipeId}
                        onChange={(e) => handleRecipeChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none transition-all"
                      >
                        {recipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.productName || r.name} — ({r.unitsPerTray ?? 24} u./bandeja)
                          </option>
                        ))}
                      </select>
                      {currentRecipe && (
                        <p className="text-[11px] text-slate-400 pl-1">
                          Capacidad configurada: <span className="font-bold text-slate-600">{unitsPerTray} piezas por bandeja</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-semibold focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 2. Selector Rápido de Cantidad */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                      Incremento Rápido
                    </span>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 font-semibold transition-colors"
                    >
                      <RotateCcw size={12} />
                      <span>Limpiar</span>
                    </button>
                  </div>

                  {/* Botones de un solo toque */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={handleAddTray}
                      className="flex flex-col items-center justify-center p-3 bg-white hover:bg-orange-50 active:scale-95 border border-slate-200 hover:border-orange-300 rounded-xl text-slate-700 hover:text-orange-600 transition-all font-bold shadow-xs group"
                    >
                      <Layers size={18} className="text-orange-500 group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-xs">+1 Bandeja</span>
                      <span className="text-[10px] text-slate-400 font-normal">+{unitsPerTray} uds</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddDozen}
                      className="flex flex-col items-center justify-center p-3 bg-white hover:bg-amber-50 active:scale-95 border border-slate-200 hover:border-amber-300 rounded-xl text-slate-700 hover:text-amber-600 transition-all font-bold shadow-xs group"
                    >
                      <Grid size={18} className="text-amber-500 group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-xs">+1 Docena</span>
                      <span className="text-[10px] text-slate-400 font-normal">+12 uds</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddUnit}
                      className="flex flex-col items-center justify-center p-3 bg-white hover:bg-blue-50 active:scale-95 border border-slate-200 hover:border-blue-300 rounded-xl text-slate-700 hover:text-blue-600 transition-all font-bold shadow-xs group"
                    >
                      <Plus size={18} className="text-blue-500 group-hover:scale-110 transition-transform mb-1" />
                      <span className="text-xs">+1 Unidad</span>
                      <span className="text-[10px] text-slate-400 font-normal">+1 ud</span>
                    </button>
                  </div>

                  {/* Input Directo de Cantidad */}
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap">
                      Total Unidades:
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={quantity === 0 ? '' : quantity}
                      onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-center text-lg font-black text-slate-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>

                  {/* Resumen Visual */}
                  <div className="bg-orange-50/70 border border-orange-200/60 rounded-xl p-3 text-center">
                    <p className="text-xs text-orange-950 font-medium">
                      Total a hornear:{' '}
                      <span className="font-extrabold text-orange-600 text-sm">
                        {quantity} {quantity === 1 ? 'unidad' : 'unidades'}
                      </span>
                    </p>
                    <p className="text-[11px] text-orange-700 mt-0.5 font-semibold">
                      (Equivalente a{' '}
                      <span className="underline decoration-orange-400 decoration-2">
                        {equivalences.bandejas} {equivalences.bandejas === 1 ? 'bandeja' : 'bandejas'}
                      </span>
                      {equivalences.unidadesRestantes > 0 ? (
                        <span> y {equivalences.unidadesRestantes} {equivalences.unidadesRestantes === 1 ? 'unidad' : 'unidades'} suelta(s)</span>
                      ) : (
                        <span> exactas</span>
                      )}
                      )
                    </p>
                  </div>
                </div>

                {/* 3. Selector de Prioridad */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Prioridad de Producción
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 1, label: 'Baja', color: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200', active: 'bg-slate-800 text-white border-slate-800' },
                      { val: 2, label: 'Normal', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200', active: 'bg-blue-600 text-white border-blue-600' },
                      { val: 3, label: 'Urgente', color: 'bg-red-50 text-red-700 hover:bg-red-100 border-red-200', active: 'bg-red-600 text-white border-red-600' },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => setPriority(p.val)}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all ${
                          priority === p.val ? p.active : p.color
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Notas opcionales */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Notas para el Maestro Panadero (Opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej: Tanda dorada para vitrina central..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-700 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                {/* Feedback Alerts */}
                {errorMsg && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successFeedback && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{successFeedback}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="w-1/3 h-12 rounded-xl font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || quantity <= 0}
                    className="w-2/3 h-12 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>Enviando al KDS...</span>
                      </>
                    ) : (
                      <>
                        <Flame size={18} />
                        <span>Encolar Horneado</span>
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
