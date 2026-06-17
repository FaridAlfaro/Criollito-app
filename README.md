# Criollito SaaS - Panadería y Facturación Electrónica

Este repositorio contiene el sistema de punto de venta (POS) y administración en tiempo real de la panadería **El Criollito**. Está diseñado con capacidad de resiliencia ante cortes de red y fallos de base de datos ("offline-first"), facturación electrónica integrada con ARCA (Ex-AFIP), y control dinámico de horneado en cocina.

---

## 🛠️ Tecnologías Utilizadas

El núcleo técnico de la plataforma se compone de:

1. **Framework Principal**: [Next.js 16 (App Router)](https://nextjs.org/) sobre [React 19](https://react.dev/), aprovechando componentes del lado del servidor y Server Actions.
2. **Estilado e Interfaz**: [Tailwind CSS v4](https://tailwindcss.com/) para un diseño premium, fluido e interactivo, asistido por [Lucide React](https://lucide.dev/) para iconos y [Framer Motion](https://www.framer.com/motion/) para micro-animaciones en tarjetas, paneles y transiciones de estado.
3. **Gestión de Estado**: [Zustand 5](https://github.com/pmndrs/zustand) para un almacenamiento centralizado y reactivo.
4. **Base de Datos y ORM**: [Drizzle ORM](https://orm.drizzle.team/) con el cliente de PostgreSQL `pg`.
5. **Persistencia Cliente (Offline)**: Zustand Persist middleware en conjunto con **IndexedDB** mediante la librería `idb-keyval` para almacenar de forma persistente las ventas en cola y el estado local del negocio ante desconexiones.
6. **Notificaciones y Alertas**: Web Audio API para síntesis sonora y Web Notification API para alertas en el sistema operativo.

---

## 📐 Arquitectura del Sistema

El proyecto está estructurado de forma modular respetando los patrones modernos de Next.js:

```
[Cliente: Navegador / POS]
       │
       ▼ (Leer/Escribir Estado)
[Zustand Store + IndexedDB] 
       │
       ▼ (Invocar Funciones / Server Actions)
[Next.js Server Actions]
       │
       ▼ (Transacciones SQL)
[Drizzle ORM / PostgreSQL]
```

### 📂 Estructura de Directorios

- `src/db/`: Contiene el esquema relacional (`schema.ts`) y la inicialización de la conexión (`index.ts`).
- `src/actions/`: Capa de Server Actions ("use server") que actúan como "endpoints" del backend.
- `src/store/`: Estado global de la aplicación (`useStore.ts`) con políticas de sincronización offline.
- `src/components/`: Componentes UI reutilizables (ej. gráficos KPI en `KPIGraph.tsx`).
- `src/app/`: Estructura de rutas bajo el App Router de Next.js, organizada por grupos de roles:
  - `(dashboard)/pos`: Pantalla de cobros y facturación de la caja.
  - `(dashboard)/admin`: Panel de control de sueldos, horarios, existencias y selección de sucursales.
  - `(dashboard)/baker`: Planilla del panadero con duraciones y cuentas regresivas del horno.
  - `(dashboard)/supervisor`: Panel consolidado del dueño para auditar locales Palermo, Recoleta y Belgrano.

---

## ⚡ Endpoints y Server Actions (API)

Al ser una aplicación Next.js moderna con React Server Actions, no se exponen endpoints REST tradicionales (ej: `GET /api/sales`), sino funciones invocables desde el cliente con tipado TypeScript estricto. Las acciones principales son:

| Acción | Archivo | Descripción |
| :--- | :--- | :--- |
| `procesarVenta` | `src/actions/procesarVenta.ts` | Registra una venta, descuenta stock del inventario, emite alertas de stock bajo y planifica horneados. |
| `openSession` | `src/actions/cashSessions.ts` | Abre un arqueo de caja con un fondo inicial en base de datos. |
| `closeSession` | `src/actions/cashSessions.ts` | Cierra la sesión activa calculando totales y diferencias teóricas de efectivo. |
| `registerMovement` | `src/actions/cashSessions.ts` | Registra ingresos y egresos (gastos) en la sesión actual. |
| `getBranchWorkers` | `src/actions/cashSessions.ts` | Obtiene el personal disponible asignado a la sucursal activa. |
| `getSessionHistory` | `src/actions/cashSessions.ts` | Recupera el historial de movimientos y ventas asociados a la sesión. |
| `emitirFacturaARCA` | `src/actions/arca.ts` | Valida reglas de facturación (Resolución 5700/2025) y genera cae y código QR. |
| `processMercadoPagoPayment` | `src/actions/payments.ts` | Simula cobros electrónicos mediante Point físico o QR dinámico. |
| `processPaywayPayment` | `src/actions/payments.ts` | Simula transacciones de tarjetas de débito/crédito y cuotas. |

---

## 🛡️ Robustez y Manejo de Errores Offline-First

Uno de los principales desafíos resueltos en este proyecto es la resiliencia ante la caída del servidor de base de datos (por ejemplo, errores de tipo `connect ECONNREFUSED`).

```
[Venta Realizada]
      │
      ├──> ¿Hay Red y DB? ──> SÍ ──> Guardar en Base de Datos (procesarVenta)
      │
      └──> NO (Desconectado/Error) 
            │
            └──> Retornar success: false (sin romper servidor)
            │
            └──> Zustand guarda en Cola de Ventas (IndexedDB)
            │
            └──> El POS sigue operando localmente
```

### 1. Tolerancia a Fallos en Operaciones Comunes
Acciones como `openSession` y `getBranchWorkers` están envueltas en estructuras `try-catch`. Si falla la comunicación con la base de datos:
1. Imprimen una advertencia (`console.warn`).
2. Retornan un **mock de contingencia** precargado.
3. Permiten que la interfaz del POS se dibuje con éxito y el cajero pueda trabajar en memoria local.

### 2. Sincronización y Transacciones de Venta
El registro de ventas utiliza un flujo transaccional optimizado:
- **Actualización Optimista**: El cliente descuenta el inventario y agenda solicitudes de producción al instante en el cliente (Zustand).
- **Control de Error en Servidor**: La Server Action `procesarVenta` captura los errores de base de datos (`ECONNREFUSED` u otros) y los procesa de forma estructurada devolviendo `{ success: false, error: ... }` con status `200 OK` en Next.js en lugar de lanzar una excepción incontrolada que devuelva un código HTTP `500`.
- **Encolamiento Offline**: Al detectar que `success: false` o un fallo de red absoluto, el store añade la venta al array `pendingSales` en IndexedDB.
- **Proceso de Sincronización**: Cuando la base de datos vuelve a estar en línea, la función `syncOfflineSales` sincroniza en lote todas las ventas pendientes, limpiando la cola local de forma transparente.

---

## 📝 Registro de Decisiones de Ejecución

Durante el desarrollo del software se adoptaron las siguientes decisiones de diseño técnico:

### 1. Fallback de IPv4 para Base de Datos Local
- **Problema**: En sistemas modernos (Node.js + Windows), `localhost` se resuelve preferentemente en la dirección de IPv6 (`::1`), lo que provocaba errores `connect ECONNREFUSED ::1:5432` debido a que PostgreSQL local por defecto suele escuchar solo en la interfaz IPv4 (`127.0.0.1`).
- **Decisión**: Modificamos el constructor de Drizzle/Pool en [index.ts](file:///c:/Users/Alfaro/Documents/Trabajo/Criollito%20sas/criollito-saas/src/db/index.ts) para forzar la dirección IPv4 `127.0.0.1:5432`. Esto garantiza conectividad local estable sin requerir cambios de red en el sistema operativo del usuario.

### 2. Selector de Sucursales Reactivo en Administración
- **Decisión**: Para habilitar la gestión corporativa multi-sucursal en la demo de administración, creamos un selector dropdown que permite simular de forma reactiva las sucursales *Palermo*, *Recoleta* y *Belgrano*. Al cambiar la selección, los KPIs de arqueo de caja, los horarios de hoy del personal y el stock de productos en la tabla se actualizan con métricas simuladas personalizadas, permitiendo hacer auditorías completas sin persistencias complejas.

### 3. Persistencia de Temporizadores en Cocina
- **Decisión**: Para evitar que las cuentas regresivas de cocción en la cocina se pierdan si el panadero refresca el navegador o cambia de pestaña, extendimos la interfaz de `BakeTask` en la store persistida de Zustand para almacenar `startedAt` (ISO Timestamp) y `durationMinutes`. De este modo, la cuenta regresiva se calcula dinámicamente en base al tiempo transcurrido desde que se inició el horneado, logrando resiliencia absoluta ante reinicios.

### 4. Notificaciones y Sonido Sintetizado
- **Problema**: Depender de archivos estáticos de audio (como archivos `.mp3` o `.wav`) suele causar fallos de carga (404) o problemas de compatibilidad de rutas locales.
- **Decisión**: Implementamos la reproducción de alarmas utilizando la **Web Audio API** nativa del navegador. Sintetizamos ondas sinusoidales en tiempo real para generar pitidos de alarma (beeps), logrando un sonido limpio, independiente de archivos externos, y de bajo consumo.
- Adicionalmente, integramos la **Notification API** del navegador para avisar mediante ventanas del sistema operativo cuando una tanda de facturas o medialunas está lista en el horno.
