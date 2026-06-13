'use client';

import { QRCodeSVG } from 'qrcode.react';

export function TicketPrintPreview({ sale, type }: { sale: any; type: 'factura' | 'recibo' | null }) {
  if (!sale) return null;
  const isInvoice = type === 'factura';
  const ivaContenido = (sale.totalAmount * 0.21) / 1.21;
  const dateObj = new Date(sale.createdAt);

  return (
    <div className="w-[80mm] bg-white text-black p-4 font-mono text-[10px] mx-auto text-left leading-tight">
      <div className="text-center border-b border-black pb-2 mb-2">
        <h1 className="font-bold text-sm uppercase">PANADERÍA EL CRIOLLITO</h1>
        <p>Criollito SRL</p>
        <p>CUIT: 30-12345678-9</p>
        <p>IVA Responsable Inscripto</p>
        <p className="mt-2 font-bold uppercase">{isInvoice ? sale.comprobanteTipo || 'FACTURA B' : 'RECIBO DE VENTA'}</p>
        {isInvoice && <p className="text-[8px] text-gray-700 font-semibold">(ORIGINAL)</p>}
        <p>Nro: 0001-{String(sale.numeroComprobante || Math.floor(Math.random() * 10000)).padStart(8, '0')}</p>
        <p>
          Fecha: {dateObj.toLocaleDateString('es-AR')} {dateObj.toLocaleTimeString('es-AR')}
        </p>
      </div>

      <div className="border-b border-black pb-2 mb-2 text-[9px]">
        <p>A Consumidor Final</p>
        {sale.clienteDocumento && <p>DNI/CUIT: {sale.clienteDocumento}</p>}
        <p>
          Cond. de Venta:{' '}
          {sale.paymentMethod === 'CASH'
            ? 'Efectivo'
            : sale.paymentMethod === 'DEBIT'
              ? 'Débito'
              : sale.paymentMethod === 'CREDIT'
                ? 'Crédito'
                : 'QR / MercadoPago'}
        </p>
      </div>

      <table className="w-full text-left mb-2 text-[9px]">
        <thead>
          <tr className="border-b border-black">
            <th className="font-normal w-1/2">Desc.</th>
            <th className="font-normal text-right">Cant</th>
            <th className="font-normal text-right">SubT</th>
          </tr>
        </thead>
        <tbody>
          {sale.items?.map((item: any, i: number) => (
            <tr key={i}>
              <td className="truncate max-w-[35mm]">{item.name}</td>
              <td className="text-right">{item.quantity}</td>
              <td className="text-right">${parseFloat(item.subtotal || item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-black pt-2 mb-2 text-right">
        <p className="font-bold text-xs">TOTAL: ${parseFloat(sale.totalAmount).toFixed(2)}</p>
      </div>

      {isInvoice ? (
        <div className="border-b border-black pb-2 mb-2 text-[8px] text-gray-700">
          <p>IVA Contenido (21.00%): ${ivaContenido.toFixed(2)}</p>
          <p>Otros Imp. Nac. Indirectos: $0.00</p>
          <p>CAE: {sale.cae || 'MOCK-CAE-123456'}</p>
          <p>
            Vto CAE:{' '}
            {sale.caeExpiration ? new Date(sale.caeExpiration).toLocaleDateString('es-AR') : new Date().toLocaleDateString('es-AR')}
          </p>
        </div>
      ) : (
        <div className="border-b border-black pb-2 mb-2 text-[8px] text-center italic">
          <p>Documento no válido como factura</p>
        </div>
      )}

      <div className="text-center text-[8px] space-y-2 mt-4">
        {isInvoice && sale.qrCodeData && (
          <div className="flex justify-center my-2">
            <QRCodeSVG value={sale.qrCodeData} size={80} />
          </div>
        )}
        <p className="mt-2 italic">¡Gracias por su compra!</p>
      </div>
    </div>
  );
}

export function MovementPrintPreview({ movement }: { movement: any }) {
  if (!movement) return null;
  const dateObj = new Date(movement.createdAt);
  return (
    <div className="w-[80mm] bg-white text-black p-4 font-mono text-[10px] mx-auto text-left leading-tight">
      <div className="text-center border-b border-black pb-2 mb-2">
        <h1 className="font-bold text-sm uppercase">PANADERÍA EL CRIOLLITO</h1>
        <p className="font-bold mt-1">VALE DE MOVIMIENTO DE CAJA</p>
        <p>
          Fecha: {dateObj.toLocaleDateString('es-AR')} {dateObj.toLocaleTimeString('es-AR')}
        </p>
      </div>
      <div className="space-y-2 text-[9px] my-3">
        <div className="flex justify-between">
          <span className="font-bold">TIPO DE MOVIMIENTO:</span>
          <span className="uppercase">{movement.type}</span>
        </div>
        <div className="flex justify-between text-xs border-t border-dashed border-gray-300 pt-1 mt-1">
          <span className="font-bold">MONTO:</span>
          <span className="font-bold">${parseFloat(movement.amount).toFixed(2)}</span>
        </div>
        <div className="border-t border-dashed border-gray-300 pt-2">
          <span className="font-bold block">CONCEPTO / DETALLE:</span>
          <p className="mt-1 text-gray-700 italic bg-gray-50 p-2 rounded border border-gray-100">
            {movement.description || 'Sin concepto'}
          </p>
        </div>
      </div>
      <div className="mt-8 border-t border-black pt-4 text-center text-[8px] flex justify-between px-2">
        <div className="w-[30mm]">
          <div className="h-6" />
          <p className="border-t border-dashed border-gray-400 pt-1">Firma Cajero</p>
        </div>
        <div className="w-[30mm]">
          <div className="h-6" />
          <p className="border-t border-dashed border-gray-400 pt-1">Firma Receptor</p>
        </div>
      </div>
    </div>
  );
}

export function HistoryReportPrintPreview({
  sales,
  movements,
  currentSession,
}: {
  sales: any[];
  movements: any[];
  currentSession: any;
}) {
  const totalSalesAmount = sales.reduce((sum, s) => sum + parseFloat(s.totalAmount), 0);
  const totalIngresos = movements.filter((m) => m.type === 'INGRESO').reduce((sum, m) => sum + parseFloat(m.amount), 0);
  const totalEgresos = movements.filter((m) => m.type !== 'INGRESO').reduce((sum, m) => sum + parseFloat(m.amount), 0);
  const initial = currentSession ? parseFloat(currentSession.initialAmount) : 0;
  const theoretical = initial + totalSalesAmount + totalIngresos - totalEgresos;

  return (
    <div className="w-[80mm] bg-white text-black p-4 font-mono text-[9px] mx-auto text-left leading-tight">
      <div className="text-center border-b border-black pb-2 mb-2">
        <h1 className="font-bold text-sm uppercase">PANADERÍA EL CRIOLLITO</h1>
        <p className="font-bold mt-1">REPORTE RESUMEN DE TURNO</p>
        <p>
          Fecha: {new Date().toLocaleDateString('es-AR')} {new Date().toLocaleTimeString('es-AR')}
        </p>
      </div>

      <div className="space-y-1 text-[9px] border-b border-black pb-2">
        <div className="flex justify-between">
          <span>FONDO INICIAL:</span>
          <span>${initial.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span>TOTAL VENTAS:</span>
          <span>+${totalSalesAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-emerald-700">
          <span>TOTAL INGRESOS:</span>
          <span>+${totalIngresos.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-rose-700">
          <span>TOTAL EGRESOS:</span>
          <span>-${totalEgresos.toFixed(2)}</span>
        </div>
        <div className="flex justify-between font-bold text-xs pt-1 border-t border-dashed border-gray-300 mt-1">
          <span>TOTAL CAJA TEÓRICO:</span>
          <span>${theoretical.toFixed(2)}</span>
        </div>
      </div>

      <div className="my-3">
        <p className="font-bold text-[9px] uppercase border-b border-black pb-0.5 mb-1">DETALLE DE VENTAS ({sales.length})</p>
        {sales.length === 0 ? (
          <p className="text-[8px] text-gray-500 italic">No hay ventas registradas</p>
        ) : (
          <table className="w-full text-[8px] text-left">
            <thead>
              <tr className="border-b border-gray-300">
                <th>Comprobante</th>
                <th>Pago</th>
                <th className="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s, idx) => (
                <tr key={idx}>
                  <td>
                    {s.comprobanteTipo || 'TICKET'} #{String(s.numeroComprobante || idx).substring(0, 4)}
                  </td>
                  <td>{s.paymentMethod}</td>
                  <td className="text-right">${parseFloat(s.totalAmount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="my-3">
        <p className="font-bold text-[9px] uppercase border-b border-black pb-0.5 mb-1">
          DETALLE DE MOVIMIENTOS ({movements.length})
        </p>
        {movements.length === 0 ? (
          <p className="text-[8px] text-gray-500 italic">No hay movimientos registrados</p>
        ) : (
          <table className="w-full text-[8px] text-left">
            <thead>
              <tr className="border-b border-gray-300">
                <th>Categoría / Detalle</th>
                <th className="text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m, idx) => (
                <tr key={idx}>
                  <td className="truncate max-w-[45mm]">
                    {m.type} - {m.description}
                  </td>
                  <td className="text-right">${parseFloat(m.amount).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-8 border-t border-black pt-4 text-center text-[8px]">
        <p className="border-t border-dashed border-gray-400 pt-1 w-2/3 mx-auto">Cierre de Caja Caja #1</p>
      </div>
    </div>
  );
}
