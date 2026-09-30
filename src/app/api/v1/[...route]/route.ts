import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUserSession } from '@/lib/auth-session';
import { validateApiKeyUseCase } from '@/modules/identity';
import { processSaleUseCase } from '@/modules/sales';
import { fetchBakeQueueUseCase, updateBakeStatusUseCase } from '@/modules/kitchen';
import { recordTimeClockUseCase } from '@/modules/identity';
import { ingestTelemetryUseCase, getTelemetryMetricsUseCase } from '@/modules/telemetry';
import { TenantContext } from '@/modules/shared/domain/tenant-context';
import { 
  DomainError, 
  NotFoundError, 
  ValidationError, 
  ConflictError, 
  UnauthorizedError,
  ForbiddenError
} from '@/modules/shared/domain/errors';
import { db } from '@/db';
import { and, eq } from 'drizzle-orm';

// ==========================================
// 1. DUAL AUTHENTICATION & CONTEXT RESOLUTION
// ==========================================

async function resolveTenantContext(request: NextRequest): Promise<TenantContext> {
  const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');

  // Modo A: Autenticación por Bearer API Key (Terminales POS locales y nodos Edge CV / YOLO)
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const rawKey = authHeader.slice(7).trim();
    const validated = await validateApiKeyUseCase.execute(rawKey);

    if (validated.isValid && validated.tenantId) {
      // Resolver un usuario del tenant para garantizar compatibilidad con FK de PostgreSQL (cashier_id)
      const tenantUser = await db.query.users.findFirst({
        where: (u, { and, eq }) => and(eq(u.tenantId, validated.tenantId!), eq(u.isActive, true)),
      });

      return {
        tenantId: validated.tenantId,
        branchId: validated.branchId ?? null,
        userId: tenantUser ? tenantUser.id : validated.tenantId,
        role: validated.role || 'CASHIER',
        name: validated.name || 'API Key Terminal',
      };
    }

    throw new UnauthorizedError(validated.error || 'API Key no válida o revocada.');
  }

  // Modo B: Autenticación por Cookie de Sesión Web
  try {
    const session = await getCurrentUserSession();
    return {
      tenantId: session.tenantId,
      branchId: session.branchId,
      userId: session.id,
      role: session.role,
      name: session.name,
    };
  } catch {
    throw new UnauthorizedError('Credenciales requeridas. Envíe un header "Authorization: Bearer <key>" o inicie sesión.');
  }
}

// ==========================================
// 2. ERROR MAPPER
// ==========================================

function handleApiError(err: unknown) {
  if (err instanceof NotFoundError) {
    return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: 404 });
  }
  if (err instanceof ValidationError) {
    return NextResponse.json({ success: false, error: err.message, code: err.code, details: err.details }, { status: 400 });
  }
  if (err instanceof ConflictError) {
    return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: 409 });
  }
  if (err instanceof UnauthorizedError) {
    return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: 401 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: 403 });
  }
  if (err instanceof DomainError) {
    return NextResponse.json({ success: false, error: err.message, code: err.code }, { status: 400 });
  }

  console.error('[API Gateway V1 Error]:', err);
  const msg = err instanceof Error ? err.message : 'Error interno en Gateway';
  return NextResponse.json({ success: false, error: msg }, { status: 500 });
}

// ==========================================
// 3. HTTP HANDLERS
// ==========================================

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route } = await context.params;
    const path = route.join('/');

    // GET /api/v1/health (Public Liveness Probe)
    if (path === 'health') {
      let resolvedTenant: string | null = null;
      try {
        const ctx = await resolveTenantContext(request);
        resolvedTenant = ctx.tenantId;
      } catch {
        // Public probe
      }
      return NextResponse.json({
        status: 'UP',
        service: 'Criollito SaaS Gateway v1',
        tenantId: resolvedTenant,
        timestamp: new Date().toISOString(),
      });
    }

    const tenantContext = await resolveTenantContext(request);

    // GET /api/v1/kitchen/queue -> FetchBakeQueueUseCase
    if (path === 'kitchen/queue') {
      const queue = await fetchBakeQueueUseCase.execute(tenantContext);
      return NextResponse.json({ success: true, data: queue });
    }

    // GET /api/v1/telemetry/metrics -> GetTelemetryMetricsUseCase
    if (path === 'telemetry/metrics') {
      const url = new URL(request.url);
      const sinceHours = Number(url.searchParams.get('sinceHours')) || 24;
      const limit = Number(url.searchParams.get('limit')) || 50;

      const metrics = await getTelemetryMetricsUseCase.execute({
        sinceHours,
        limit,
      }, tenantContext);

      return NextResponse.json({ success: true, data: metrics });
    }

    return NextResponse.json({ success: false, error: `Ruta GET no encontrada: /api/v1/${path}` }, { status: 404 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route } = await context.params;
    const path = route.join('/');
    const tenantContext = await resolveTenantContext(request);

    // Leer payload JSON de forma segura
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    // Sanitización Multi-Tenant contra Tenant Injection:
    // Los parámetros del body nunca pueden sobreescribir el tenantId resuelto criptográficamente
    body.tenantId = tenantContext.tenantId;

    // POST /api/v1/sales/checkout -> ProcessSaleUseCase
    if (path === 'sales/checkout') {
      const idempotencyKey = request.headers.get('X-Idempotency-Key') || 
                             request.headers.get('x-idempotency-key') || 
                             (typeof body.idempotencyKey === 'string' ? body.idempotencyKey : undefined);

      const result = await processSaleUseCase.execute({
        ...(body as unknown as Parameters<typeof processSaleUseCase.execute>[0]),
        idempotencyKey: idempotencyKey || undefined,
      }, tenantContext);

      return NextResponse.json(result, { status: 201 });
    }

    // POST /api/v1/kitchen/status -> UpdateBakeStatusUseCase
    if (path === 'kitchen/status') {
      await updateBakeStatusUseCase.execute({
        taskId: String(body.taskId || ''),
        status: body.status as 'PENDING' | 'BAKING' | 'COMPLETED',
        startedAt: body.startedAt ? new Date(String(body.startedAt)) : undefined,
      }, tenantContext);

      return NextResponse.json({ success: true, message: 'Estado de horneado actualizado correctamente.' });
    }

    // POST /api/v1/identity/clock -> RecordTimeClockUseCase
    if (path === 'identity/clock') {
      const deviceInfo = request.headers.get('user-agent') || (typeof body.deviceInfo === 'string' ? body.deviceInfo : 'POS-Terminal-API');

      const result = await recordTimeClockUseCase.execute({
        pin: String(body.pin || ''),
        eventType: body.eventType as 'CLOCK_IN' | 'CLOCK_OUT' | 'BREAK_START' | 'BREAK_END',
        branchId: (typeof body.branchId === 'string' ? body.branchId : tenantContext.branchId),
        deviceInfo,
        notes: typeof body.notes === 'string' ? body.notes : null,
      }, tenantContext);

      return NextResponse.json(result, { status: 201 });
    }

    // POST /api/v1/telemetry/events -> IngestTelemetryUseCase (Consumido por nodos Python/YOLO)
    if (path === 'telemetry/events') {
      const result = await ingestTelemetryUseCase.execute({
        deviceId: String(body.deviceId || ''),
        eventType: String(body.eventType || ''),
        confidence: typeof body.confidence === 'number' ? body.confidence : null,
        payload: (body.payload as Record<string, unknown>) || {},
        timestamp: typeof body.timestamp === 'string' || body.timestamp instanceof Date ? body.timestamp : undefined,
        branchId: (typeof body.branchId === 'string' ? body.branchId : tenantContext.branchId),
      }, tenantContext);

      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json({ success: false, error: `Ruta POST no encontrada: /api/v1/${path}` }, { status: 404 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route } = await context.params;
    const path = route.join('/');
    await resolveTenantContext(request);

    return NextResponse.json({ success: false, error: `Ruta PUT no encontrada: /api/v1/${path}` }, { status: 404 });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ route: string[] }> }
) {
  try {
    const { route } = await context.params;
    const path = route.join('/');
    await resolveTenantContext(request);

    return NextResponse.json({ success: false, error: `Ruta DELETE no encontrada: /api/v1/${path}` }, { status: 404 });
  } catch (err) {
    return handleApiError(err);
  }
}
