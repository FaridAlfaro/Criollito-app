'use client';

import React, { useState } from 'react';
import { Button } from './button';
import { Delete } from 'lucide-react';

interface NumpadProps {
  onValueChange: (value: number) => void;
  onConfirm: () => void;
  label?: string;
  externalValue?: number;
}

export function Numpad({ onValueChange, onConfirm, label = "Ingresar Peso (kg)", externalValue }: NumpadProps) {
  const [value, setValue] = useState("0");

  const handlePress = (num: string) => {
    if (value === "0" && num !== ".") {
      setValue(num);
    } else {
      if (num === "." && value.includes(".")) return;
      setValue(value + num);
    }
  };

  const handleDelete = () => {
    if (value.length > 1) {
      setValue(value.slice(0, -1));
    } else {
      setValue("0");
    }
  };

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const t = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    if (externalValue !== undefined && externalValue > 0) {
      const t = setTimeout(() => {
        setValue(externalValue.toString());
      }, 0);
      return () => clearTimeout(t);
    }
  }, [externalValue]);

  React.useEffect(() => {
    onValueChange(parseFloat(value) || 0);
  }, [value, onValueChange]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

  return (
    <div className="bg-card border border-border p-4 rounded-xl shadow-md w-64">
      <h3 className="text-sm font-bold text-muted-foreground text-center mb-3">{label}</h3>
      <input
        ref={inputRef}
        type="text"
        className="w-full bg-background text-foreground text-3xl font-mono text-right p-3 rounded-lg mb-4 border border-border focus:ring-2 focus:ring-primary focus:outline-none"
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          if (/^[0-9]*\.?[0-9]*$/.test(val) || val === '') {
            setValue(val || "0");
          }
        }}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onConfirm();
            setValue("0");
          }
        }}
      />
      <div className="grid grid-cols-3 gap-2">
        {keys.map(k => (
          <Button 
            key={k} 
            variant="outline" 
            className="h-14 text-xl font-bold bg-muted/50 hover:bg-primary hover:text-primary-foreground border-border transition-colors"
            onClick={() => handlePress(k)}
          >
            {k}
          </Button>
        ))}
        <Button 
          variant="outline" 
          className="h-14 text-xl bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20"
          onClick={handleDelete}
        >
          <Delete size={24} />
        </Button>
      </div>
      <Button 
        className="w-full mt-4 h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md"
        onClick={() => {
          onConfirm();
          setValue("0");
        }}
      >
        Aceptar
      </Button>
    </div>
  );
}
