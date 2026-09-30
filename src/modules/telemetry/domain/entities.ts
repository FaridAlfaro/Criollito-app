export interface TelemetryEvent {
  id: string;
  tenantId: string;
  branchId: string;
  deviceId: string;
  eventType: string; // ej: "TRAY_DEPLETION_ALERT", "PEOPLE_COUNT", "SHELF_LEVEL", "QUEUE_DETECTED"
  confidence: number | null; // e.g. 0.9421
  payload: Record<string, unknown>; // JSON con bboxes, labels, metadata de inferencia
  processed: boolean;
  timestamp: Date;
  createdAt: Date;
}

export interface AlertEvent {
  id: string;
  tenantId: string;
  targetBranchId: string | null;
  type: 'LOW_STOCK' | 'SYSTEM';
  message: string;
  isRead: boolean;
  createdAt: Date;
}
