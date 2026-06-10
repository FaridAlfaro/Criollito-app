'use client';

// Componente Visual del Ticket Factura (Optimizado para Impresora Térmica 80mm)
// Cumple con la Resolución General 5614/2024 (IVA Contenido).

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface TicketARCAProps {
  businessName: string;
  cuit: string;
  puntoVenta: number;
  numeroComprobante: number;
  fecha: Date;
  items: { name: string; quantity: number; price: number; subtotal: number }[];
  total: number;
  ivaContenido: number;
  cae: string;
  caeExpiration: Date;
  qrUrl: string;
  docType: string;
  docNumber: string;
}

export function TicketARCA({ 
  businessName, cuit, puntoVenta, numeroComprobante, fecha, 
  items, total, ivaContenido, cae, caeExpiration, qrUrl, docType, docNumber 
}: TicketARCAProps) {
  
  return (
    <div className="w-[80mm] bg-white text-black p-4 font-mono text-sm shadow-xl border border-gray-200 mx-auto print:shadow-none print:border-none print:p-0">
      
      {/* Header */}
      <div className="text-center border-b border-black pb-2 mb-2">
        <h1 className="font-bold text-lg uppercase">{businessName}</h1>
        <p>CUIT: {cuit}</p>
        <p>IVA Responsable Inscripto</p>
        <p className="mt-2 font-bold">FACTURA B</p>
        <p>Nro: {String(puntoVenta).padStart(4, '0')}-{String(numeroComprobante).padStart(8, '0')}</p>
        <p>Fecha: {fecha.toLocaleDateString('es-AR')} {fecha.toLocaleTimeString('es-AR')}</p>
      </div>

      {/* Datos Cliente */}
      <div className="border-b border-black pb-2 mb-2">
        <p>A Consumidor Final</p>
        {docNumber && <p>{docType}: {docNumber}</p>}
      </div>

      {/* Items */}
      <table className="w-full text-left mb-2">
        <thead>
          <tr className="border-b border-black">
            <th className="font-normal w-1/2">Desc.</th>
            <th className="font-normal text-right">Cant</th>
            <th className="font-normal text-right">SubT</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="truncate max-w-[40mm]">{item.name}</td>
              <td className="text-right">{item.quantity}</td>
              <td className="text-right">${item.subtotal.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="border-t border-black pt-2 mb-2 text-right">
        <p className="font-bold text-lg">TOTAL: ${total.toFixed(2)}</p>
      </div>

      {/* RG 5614/2024: IVA Contenido */}
      <div className="border-b border-black pb-2 mb-2 text-xs">
        <p>De acuerdo a la RG 5614/2024, se informa:</p>
        <p>IVA Contenido (21%): ${ivaContenido.toFixed(2)}</p>
        <p>Otros Imp. Nac. Indirectos: $0.00</p>
      </div>

      {/* Footer / AFIP */}
      <div className="text-center text-xs space-y-2 mt-4">
        <div className="flex justify-center">
           <QRCodeSVG value={qrUrl} size={100} />
        </div>
        <div className="font-bold mt-2">
          <p>CAE: {cae}</p>
          <p>Vto CAE: {caeExpiration.toLocaleDateString('es-AR')}</p>
        </div>
        <p className="mt-4 italic">¡Gracias por su compra!</p>
      </div>
      
    </div>
  );
}
