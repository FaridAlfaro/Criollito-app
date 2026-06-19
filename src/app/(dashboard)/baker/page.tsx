'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { AlertTriangle, Clock, Volume2, BellRing, Sparkles, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchBakeQueue, updateBakeTaskStatus } from '@/actions/bakeQueue';

// ==========================================
// FUNCIONES AUXILIARES DE AUDIO Y NOTIFICACIÓN
// ==========================================

function playAlarmSound() {
  if (typeof window === 'undefined') return;
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = audioCtx.currentTime;
    
    // Reproducir un pitido doble urgente
    const playBeep = (time: number) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, time); // Nota La5 (alta y llamativa)
      gain.gain.setValueAtTime(0.3, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(time);
      osc.stop(time + 0.15);
    };
    
    playBeep(now);
    playBeep(now + 0.2);
  } catch (e) {
    console.error('No se pudo reproducir el sonido:', e);
  }
}

function requestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }
}

function sendDesktopNotification(title: string, body: string) {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { 
      body,
      icon: '/favicon.ico'
    });
  }
}

// ==========================================
// COMPONENTES AUXILIARES
// ==========================================

function PendingTaskCard({ task, onStart }: { task: any, onStart: (id: string, mins: number) => void }) {
  const [mins, setMins] = useState(15);
  
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      key={task.id} 
      className="bg-card grid grid-cols-4 gap-4 items-center px-6 py-4 rounded-2xl border-2 border-border shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="col-span-1 font-bold text-lg text-foreground truncate">
        {task.productName}
      </div>
      <div className="col-span-1 text-center font-semibold text-lg text-foreground">
        {parseFloat(task.quantityNeeded.toString())} {task.quantityNeeded > 10 ? 'Kg' : 'Ud'}
      </div>
      <div className="col-span-1 flex justify-center items-center gap-2 text-foreground font-medium">
        <Clock size={18} className="text-muted-foreground" />
        <span>Listo en {mins} min</span>
      </div>
      <div className="col-span-1 flex justify-end items-center gap-2">
        <select
          value={mins}
          onChange={(e) => setMins(Number(e.target.value))}
          className="bg-background border-2 border-border rounded-xl px-2.5 py-1 font-bold text-xs h-10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
        >
          <option value={5}>5 min</option>
          <option value={10}>10 min</option>
          <option value={15}>15 min</option>
          <option value={20}>20 min</option>
          <option value={30}>30 min</option>
          <option value={45}>45 min</option>
        </select>
        <Button 
          onClick={() => onStart(task.id, mins)}
          className="bg-foreground hover:bg-foreground/80 text-background font-bold h-10 px-4 rounded-xl uppercase tracking-wide text-xs shrink-0"
        >
          Iniciar
        </Button>
      </div>
    </motion.div>
  );
}

function BakingTaskCard({ task, onFinish }: { task: any, onFinish: (id: string) => void }) {
  const startedAtTime = task.startedAt ? new Date(task.startedAt).getTime() : Date.now();
  const durationSeconds = (task.durationMinutes || 15) * 60;

  const [timeOffset, setTimeOffset] = useState(0); // en segundos
  const [remaining, setRemaining] = useState(durationSeconds);
  const [isAlertActive, setIsAlertActive] = useState(false);

  const hasNotifiedRef = useRef(false);

  useEffect(() => {
    // Solicitar permiso de notificaciones cuando se monta
    requestNotificationPermission();
    
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAtTime) / 1000);
      const rem = Math.max(0, durationSeconds - elapsed + timeOffset);
      setRemaining(rem);

      if (rem === 0) {
        setIsAlertActive(true);
        if (!hasNotifiedRef.current) {
          playAlarmSound();
          sendDesktopNotification(
            "¡Horneado Finalizado!",
            `La bandeja de ${task.productName} está lista para ser retirada.`
          );
          hasNotifiedRef.current = true;
        }
      } else {
        setIsAlertActive(false);
        hasNotifiedRef.current = false;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAtTime, durationSeconds, timeOffset, task.productName]);

  // Manejar repetición de alarma de sonido mientras el aviso esté activo
  useEffect(() => {
    if (!isAlertActive) return;
    
    const alarmInterval = setInterval(() => {
      playAlarmSound();
    }, 3000);

    return () => clearInterval(alarmInterval);
  }, [isAlertActive]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const adjustTime = (amount: number) => {
    setTimeOffset(prev => prev + amount);
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      key={task.id} 
      className={`grid grid-cols-4 gap-4 items-center px-6 py-4 rounded-2xl border-2 transition-all relative overflow-hidden ${
        isAlertActive 
          ? 'bg-red-50 border-red-500 shadow-lg animate-pulse shadow-red-100' 
          : 'bg-card border-primary/30 shadow-sm'
      }`}
    >
      {/* Indicador de progreso */}
      <div className={`absolute top-0 left-0 w-2 h-full ${isAlertActive ? 'bg-red-500 animate-bounce' : 'bg-primary animate-pulse'}`}></div>
      
      <div className="col-span-1 font-bold text-lg text-foreground truncate pl-4">
        {task.productName}
        {isAlertActive && (
          <span className="block text-xs font-black text-red-600 animate-bounce mt-1.5 flex items-center gap-1">
            <Volume2 size={14} className="shrink-0" /> ¡RETIRAR BANDEJA!
          </span>
        )}
      </div>
      
      <div className="col-span-1 text-center font-semibold text-lg text-foreground">
        {parseFloat(task.quantityNeeded.toString())} {task.quantityNeeded > 10 ? 'Kg' : 'Ud'}
      </div>
      
      {/* Temporizador y controles */}
      <div className="col-span-1 flex flex-col sm:flex-row justify-center items-center gap-2">
        <div className={`flex items-center gap-2 font-bold text-lg ${isAlertActive ? 'text-red-600' : 'text-primary'}`}>
          <Clock size={18} className={isAlertActive ? 'animate-bounce' : 'animate-pulse'} />
          <span>{formatTime(remaining)}</span>
        </div>
        <div className="flex gap-1 shrink-0">
          <button 
            onClick={() => adjustTime(60)} 
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border text-slate-700 text-xs font-extrabold rounded-lg transition-colors cursor-pointer"
          >
            +1m
          </button>
          <button 
            onClick={() => adjustTime(-60)} 
            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 border text-slate-700 text-xs font-extrabold rounded-lg transition-colors cursor-pointer"
            disabled={remaining <= 0}
          >
            -1m
          </button>
        </div>
      </div>
      
      <div className="col-span-1 flex justify-end">
        <Button 
          onClick={() => onFinish(task.id)}
          className={`font-bold h-12 px-8 rounded-xl uppercase tracking-wide w-full max-w-[160px] cursor-pointer ${
            isAlertActive 
              ? 'bg-red-600 hover:bg-red-700 text-white animate-bounce' 
              : 'bg-foreground hover:bg-foreground/80 text-background'
          }`}
        >
          Listo
        </Button>
      </div>
    </motion.div>
  );
}

// ==========================================
// VISTA PRINCIPAL
// ==========================================

export default function BakerPage() {
  const { bakeQueue, setBakeQueue, startBaking, finishBaking } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      const queue = await fetchBakeQueue();
      setBakeQueue(queue.map(item => ({
        id: item.id,
        tenantId: item.tenantId,
        branchId: item.branchId,
        productId: item.productId,
        productName: item.productName,
        productType: item.productType,
        quantityNeeded: parseFloat(item.quantityNeeded as string),
        status: item.status as 'PENDING' | 'BAKING' | 'COMPLETED',
        requestedAt: item.requestedAt,
        startedAt: item.startedAt?.toISOString() ?? null,
        completedAt: item.completedAt?.toISOString() ?? null,
      })));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[Baker] Error cargando cola:', err);
    } finally {
      setIsLoading(false);
    }
  }, [setBakeQueue]);

  // Carga inicial + polling cada 30 segundos
  useEffect(() => {
    loadQueue();
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, [loadQueue]);

  const handleStart = async (taskId: string, durationMinutes: number) => {
    startBaking(taskId, durationMinutes);
    try {
      await updateBakeTaskStatus(taskId, 'BAKING', new Date());
    } catch (err) {
      console.error('[Baker] Error actualizando estado:', err);
    }
  };

  const handleFinish = async (taskId: string) => {
    finishBaking(taskId);
    try {
      await updateBakeTaskStatus(taskId, 'COMPLETED');
    } catch (err) {
      console.error('[Baker] Error completando tarea:', err);
    }
  };

  const pendingQueue = bakeQueue.filter(t => t.status === 'PENDING');
  const bakingQueue = bakeQueue.filter(t => t.status === 'BAKING');

  return (
    <div className="bg-background text-foreground p-8 font-sans h-[calc(100vh-6rem)] overflow-y-auto">
      
      <header className="flex justify-between items-center mb-8 border-b-2 border-border pb-4">
        <div>
          <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight flex items-center gap-2">
            Planilla de Horneado en Vivo <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest flex items-center gap-1"><Sparkles size={10} /> Cocina</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Gestione las tandas de producción, controle los tiempos de cocción y reciba avisos cuando finalicen.</p>
        </div>
        <Button onClick={loadQueue} className="bg-foreground hover:bg-foreground/90 text-background font-bold px-6 py-2 rounded-xl h-12 uppercase tracking-wide flex items-center gap-2">
          <RefreshCw size={16} />
          {isLoading ? 'Cargando...' : 'Actualizar'}
        </Button>
      </header>

      {/* Cabecera de Tabla */}
      <div className="grid grid-cols-4 gap-4 px-6 pb-2 text-sm font-bold text-muted-foreground uppercase tracking-wider border-b-2 border-border mb-4">
        <div className="col-span-1">Producto</div>
        <div className="col-span-1 text-center">Cantidad Solicitada</div>
        <div className="col-span-1 text-center">Tiempo en Horno</div>
        <div className="col-span-1 text-right">Acciones</div>
      </div>

      <div className="space-y-4">
        {/* Tareas Pendientes */}
        <AnimatePresence>
          {pendingQueue.map(task => (
            <PendingTaskCard 
              key={task.id} 
              task={task} 
              onStart={handleStart} 
            />
          ))}
        </AnimatePresence>

        {/* Banner de Alerta Dinámico por Stock Bajo */}
        <AnimatePresence>
          {pendingQueue.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-lg border-2 border-primary/20 flex flex-col justify-center my-6"
            >
              <div className="flex items-start gap-4">
                <div className="bg-background/20 p-2 rounded-lg shrink-0">
                  <AlertTriangle size={40} className="text-background fill-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold uppercase tracking-tight">¡Alerta de Stock Bajo!</h2>
                  <p className="text-xl font-bold opacity-90 mt-1">
                    Se ha añadido {pendingQueue[0]?.productName} a la cola de producción. [Cantidad: {parseFloat(pendingQueue[0]?.quantityNeeded.toString())}]
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tareas Horneando */}
        <AnimatePresence>
          {bakingQueue.map(task => (
            <BakingTaskCard 
              key={task.id} 
              task={task} 
              onFinish={handleFinish} 
            />
          ))}
        </AnimatePresence>

        {/* Vista cuando no hay tareas pendientes ni en proceso */}
        {pendingQueue.length === 0 && bakingQueue.length === 0 && (
          <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <CheckCircleIcon className="mx-auto text-green-500 mb-3" size={48} />
            <p className="text-xl font-bold text-slate-800">No hay tareas pendientes en la cocina.</p>
            <p className="text-sm text-slate-400 mt-1">¡Excelente trabajo! Todo el stock está al día.</p>
          </div>
        )}
      </div>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground text-center mt-6">
          Última actualización: {lastUpdated.toLocaleTimeString()} · Se actualiza automáticamente cada 30s
        </p>
      )}

    </div>
  );
}

// Icono decorativo para el estado vacío
function CheckCircleIcon({ className, size }: { className?: string, size?: number }) {
  return (
    <svg 
      className={className} 
      width={size || 24} 
      height={size || 24} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
