'use client';

import { Button } from "@/components/ui/button";
import { useStore } from "@/store/useStore";
import { AlertTriangle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BakerPage() {
  const { bakeQueue, startBaking, finishBaking } = useStore();

  const pendingQueue = bakeQueue.filter(t => t.status === 'PENDING');
  const bakingQueue = bakeQueue.filter(t => t.status === 'BAKING');

  return (
    <div className="bg-background text-foreground p-8 font-sans h-[calc(100vh-6rem)] overflow-y-auto">
      
      <header className="flex justify-between items-center mb-8 border-b-2 border-border pb-4">
        <h1 className="text-3xl font-extrabold font-heading text-foreground tracking-tight">
          Baker&apos;s Live Baking Sheet
        </h1>
        <Button className="bg-foreground hover:bg-foreground/90 text-background font-bold px-6 py-2 rounded-xl h-12 uppercase tracking-wide">
          Start Baking
        </Button>
      </header>

      {/* Table Headers */}
      <div className="grid grid-cols-4 gap-4 px-6 pb-2 text-sm font-bold text-muted-foreground uppercase tracking-wider border-b-2 border-border mb-4">
        <div className="col-span-1">Item</div>
        <div className="col-span-1 text-center">Qty</div>
        <div className="col-span-1 text-center">Est. Ready Time</div>
        <div className="col-span-1 text-right">Status</div>
      </div>

      <div className="space-y-4">
        {/* Pending Tasks */}
        <AnimatePresence>
          {pendingQueue.map(task => (
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
                {task.quantityNeeded} {task.quantityNeeded > 10 ? 'Kg' : 'Ud'}
              </div>
              <div className="col-span-1 flex justify-center items-center gap-2 text-foreground font-medium">
                <Clock size={18} className="text-muted-foreground" />
                30 min
              </div>
              <div className="col-span-1 flex justify-end">
                <Button 
                  onClick={() => startBaking(task.id)}
                  className="bg-foreground hover:bg-foreground/80 text-background font-bold h-12 px-8 rounded-xl uppercase tracking-wide w-full max-w-[160px]"
                >
                  Start Baking
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Dynamic Low Stock Alert Banner (Mocking the exact image) */}
        <AnimatePresence>
          {pendingQueue.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-primary text-primary-foreground p-6 rounded-2xl shadow-lg border-2 border-primary/20 flex flex-col justify-center my-6"
            >
              <div className="flex items-start gap-4">
                <div className="bg-background/20 p-2 rounded-lg">
                  <AlertTriangle size={40} className="text-background fill-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold uppercase tracking-tight">Low Stock Alert:</h2>
                  <p className="text-xl font-bold opacity-90 mt-1">
                    {pendingQueue[0]?.productName} Added to Queue! [{pendingQueue[0]?.quantityNeeded}]
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Baking Tasks */}
        <AnimatePresence>
          {bakingQueue.map(task => (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              key={task.id} 
              className="bg-card grid grid-cols-4 gap-4 items-center px-6 py-4 rounded-2xl border-2 border-primary/30 shadow-sm relative overflow-hidden"
            >
              {/* Subtle progress indicator */}
              <div className="absolute top-0 left-0 w-2 h-full bg-primary animate-pulse"></div>
              
              <div className="col-span-1 font-bold text-lg text-foreground truncate pl-4">
                {task.productName}
              </div>
              <div className="col-span-1 text-center font-semibold text-lg text-foreground">
                {task.quantityNeeded} {task.quantityNeeded > 10 ? 'Kg' : 'Ud'}
              </div>
              <div className="col-span-1 flex justify-center items-center gap-2 text-primary font-bold">
                <Clock size={18} className="animate-pulse" />
                In Oven...
              </div>
              <div className="col-span-1 flex justify-end">
                <Button 
                  onClick={() => finishBaking(task.id)}
                  className="bg-foreground hover:bg-foreground/80 text-background font-bold h-12 px-8 rounded-xl uppercase tracking-wide w-full max-w-[160px]"
                >
                  Ready
                </Button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {pendingQueue.length === 0 && bakingQueue.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl font-bold text-muted-foreground">No pending tasks. Great job!</p>
          </div>
        )}
      </div>

      {/* Bottom controls (matching image) */}
      <div className="mt-8 flex gap-4">
         <Button className="bg-foreground hover:bg-foreground/90 text-background font-bold px-8 py-2 rounded-xl h-14 uppercase tracking-wide text-lg flex-1">
           Start Baking
         </Button>
         <Button className="bg-foreground hover:bg-foreground/90 text-background font-bold px-8 py-2 rounded-xl h-14 uppercase tracking-wide text-lg flex-1">
           Ready
         </Button>
      </div>

    </div>
  );
}
