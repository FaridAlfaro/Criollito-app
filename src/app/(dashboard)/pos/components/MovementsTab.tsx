'use client';

import { RefObject } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

type MovementType = 'INGRESO' | 'EGRESO_PROVEEDOR' | 'EGRESO_SUELDO' | 'EGRESO_VARIOS';
type OutlayType = 'PROVEEDOR' | 'INSUMO' | 'MATERIA_PRIMA' | 'SUELDO' | 'OTRO';

interface MovementsTabProps {
  movementType: MovementType;
  outlayType: OutlayType;
  movementAmount: string;
  movementDescription: string;
  justification: string;
  workers: { id: string; name: string; role: string }[];
  selectedWorkerId: string;
  movementAmountInputRef: RefObject<HTMLInputElement | null>;
  movementDescriptionInputRef: RefObject<HTMLInputElement | null>;
  justificationInputRef: RefObject<HTMLTextAreaElement | null>;
  onMovementTypeChange: (type: MovementType) => void;
  onOutlayTypeChange: (type: OutlayType) => void;
  onMovementTypeFromSelect: (type: MovementType) => void;
  onSubCategoryChange: (type: OutlayType) => void;
  onWorkerChange: (workerId: string) => void;
  onMovementAmountChange: (value: string) => void;
  onMovementDescriptionChange: (value: string) => void;
  onJustificationChange: (value: string) => void;
  onBackToCobros: () => void;
  onRegister: () => void;
  canRegister: boolean;
}

export function MovementsTab({
  movementType,
  outlayType,
  movementAmount,
  movementDescription,
  justification,
  workers,
  selectedWorkerId,
  movementAmountInputRef,
  movementDescriptionInputRef,
  justificationInputRef,
  onMovementTypeChange,
  onOutlayTypeChange,
  onMovementTypeFromSelect,
  onSubCategoryChange,
  onWorkerChange,
  onMovementAmountChange,
  onMovementDescriptionChange,
  onJustificationChange,
  onBackToCobros,
  onRegister,
  canRegister,
}: MovementsTabProps) {
  return (
    <div className="flex-1 max-w-xl mx-auto w-full print:hidden overflow-y-auto pr-2">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-3xl p-8 shadow-md space-y-6 my-2"
      >
        <div className="text-center pb-2 border-b border-border">
          <h2 className="text-2xl font-bold font-heading flex items-center justify-center gap-2">
            <ArrowUpDown className="text-primary" /> Registrar Movimiento de Caja
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Registre un ingreso o egreso de caja manual para este turno</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wider">Tipo de Movimiento</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={movementType === 'INGRESO' ? 'default' : 'outline'}
                onClick={() => onMovementTypeChange('INGRESO')}
                className={`h-11 font-bold rounded-xl ${movementType === 'INGRESO' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted text-foreground'}`}
              >
                Ingreso (Aporte)
              </Button>
              <Button
                type="button"
                variant={movementType !== 'INGRESO' ? 'default' : 'outline'}
                onClick={() => {
                  onMovementTypeChange('EGRESO_VARIOS');
                  onOutlayTypeChange('PROVEEDOR');
                  onMovementDescriptionChange('Pago a Proveedores');
                }}
                className={`h-11 font-bold rounded-xl ${movementType !== 'INGRESO' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted text-foreground'}`}
              >
                Egreso (Gasto)
              </Button>
            </div>
          </div>

          {movementType !== 'INGRESO' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Tipo de Gasto</label>
              <select
                className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-medium"
                value={
                  outlayType === 'PROVEEDOR'
                    ? 'EGRESO_PROVEEDOR'
                    : outlayType === 'SUELDO'
                      ? 'EGRESO_SUELDO'
                      : 'EGRESO_VARIOS'
                }
                onChange={(e) => onMovementTypeFromSelect(e.target.value as MovementType)}
              >
                <option value="EGRESO_PROVEEDOR">Pago Proveedores</option>
                <option value="EGRESO_VARIOS">Gasto Operativo (Insumo / Materia Prima / Otro)</option>
                <option value="EGRESO_SUELDO">Pago de Sueldo</option>
              </select>
            </div>
          )}

          {movementType !== 'INGRESO' && outlayType !== 'PROVEEDOR' && outlayType !== 'SUELDO' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">SubCategoría Gasto</label>
              <select
                className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-medium"
                value={outlayType}
                onChange={(e) => onSubCategoryChange(e.target.value as OutlayType)}
              >
                <option value="INSUMO">Compra Insumo</option>
                <option value="MATERIA_PRIMA">Compra Materia Prima</option>
                <option value="OTRO">Otro (Requiere Justificación)</option>
              </select>
            </div>
          )}

          {movementType !== 'INGRESO' && outlayType === 'SUELDO' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">Seleccionar Trabajador</label>
              <select
                className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-medium"
                value={selectedWorkerId}
                onChange={(e) => onWorkerChange(e.target.value)}
              >
                {workers.length === 0 ? (
                  <option value="">No hay trabajadores registrados</option>
                ) : (
                  workers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.role})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {movementType !== 'INGRESO' && outlayType === 'OTRO' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                Justificación del Gasto (Obligatorio)
              </label>
              <textarea
                ref={justificationInputRef}
                className="w-full bg-background border border-border rounded-xl p-3 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none h-20 resize-none font-medium"
                placeholder="Justifique el motivo de este gasto..."
                value={justification}
                onChange={(e) => onJustificationChange(e.target.value)}
              />
            </div>
          )}

          {!(movementType !== 'INGRESO' && outlayType === 'SUELDO') &&
            !(movementType !== 'INGRESO' && outlayType === 'OTRO') && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wide">Concepto / Descripción</label>
                <input
                  ref={movementDescriptionInputRef}
                  type="text"
                  className="w-full bg-background border border-border rounded-xl p-3 text-foreground focus:ring-1 focus:ring-primary focus:outline-none text-sm font-medium"
                  placeholder="Ej. Cambio de billetes, Aporte del cajero..."
                  value={movementDescription}
                  onChange={(e) => onMovementDescriptionChange(e.target.value)}
                />
              </div>
            )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground uppercase tracking-wide">Monto ($)</label>
            <input
              ref={movementAmountInputRef}
              type="number"
              className="w-full bg-background border border-border rounded-xl p-4 text-2xl font-mono text-center text-foreground focus:ring-1 focus:ring-primary focus:outline-none font-bold"
              placeholder="0.00"
              value={movementAmount}
              onChange={(e) => onMovementAmountChange(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-4 pt-4 border-t border-border">
          <Button variant="outline" className="flex-1 h-12 rounded-xl text-muted-foreground" onClick={onBackToCobros}>
            Volver a Cobros
          </Button>
          <Button
            className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-bold"
            onClick={onRegister}
            disabled={!canRegister}
          >
            Registrar Movimiento
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
