import { useState, useEffect, useRef } from 'react';

// Interfaces locales para Web Serial API
interface SerialPort {
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  readable: ReadableStream<BufferSource>;
}

export function useSerialScale(onWeightChange?: (weight: number) => void) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weight, setWeight] = useState(0);
  
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const keepReadingRef = useRef(false);

  const connectScale = async () => {
    setError(null);
    if (typeof window === 'undefined' || !('serial' in navigator)) {
      setError('Web Serial API no es soportada en este navegador.');
      return;
    }

    try {
      const port = await (navigator as unknown as { serial: { requestPort(): Promise<SerialPort> } }).serial.requestPort();
      await port.open({ baudRate: 9600 });
      portRef.current = port;
      setConnected(true);
      keepReadingRef.current = true;

      // Iniciar el bucle de lectura
      readLoop(port);
    } catch (err: unknown) {
      console.error('Error al conectar con la balanza:', err);
      const msg = err instanceof Error ? err.message : 'Error al abrir el puerto serial.';
      setError(msg);
    }
  };

  const readLoop = async (port: SerialPort) => {
    const textDecoder = new TextDecoderStream();
    
    // Obtenemos el stream readable y lo pipeamos
    const readableStream = port.readable.pipeThrough(textDecoder);
    const reader = readableStream.getReader();
    readerRef.current = reader;

    let buffer = '';

    try {
      while (keepReadingRef.current) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }
        if (value) {
          buffer += value;
          // Separamos por salto de línea
          if (buffer.includes('\n')) {
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Dejar la última línea incompleta en el buffer

            for (const line of lines) {
              const cleaned = line.trim();
              // Expresión regular para parsear números decimales
              const match = cleaned.match(/(\d+(?:\.\d+)?)/);
              if (match) {
                const parsedWeight = parseFloat(match[1]);
                if (!isNaN(parsedWeight)) {
                  setWeight(parsedWeight);
                  if (onWeightChange) {
                    onWeightChange(parsedWeight);
                  }
                }
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      console.error('Error leyendo del puerto serial:', err);
      if (keepReadingRef.current) {
        setError('Error en la comunicación con la balanza.');
      }
    } finally {
      reader.releaseLock();
    }
  };

  const disconnectScale = async () => {
    keepReadingRef.current = false;
    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch {
        // Ignorar
      }
      readerRef.current = null;
    }
    if (portRef.current) {
      try {
        await portRef.current.close();
      } catch {
        // Ignorar
      }
      portRef.current = null;
    }
    setConnected(false);
  };

  useEffect(() => {
    return () => {
      // Limpiar conexión al desmontar
      keepReadingRef.current = false;
      if (portRef.current) {
        portRef.current.close().catch(() => {});
      }
    };
  }, []);

  return {
    connected,
    error,
    weight,
    connectScale,
    disconnectScale,
  };
}
