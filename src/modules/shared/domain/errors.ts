export abstract class DomainError extends Error {
  public abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends DomainError {
  public readonly code = 'NOT_FOUND';
  constructor(entity: string, id?: string) {
    super(id ? `${entity} con identificador "${id}" no fue encontrado.` : `${entity} no fue encontrado.`);
  }
}

export class ValidationError extends DomainError {
  public readonly code = 'VALIDATION_ERROR';
  public readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.details = details;
  }
}

export class ConflictError extends DomainError {
  public readonly code = 'CONFLICT';
  constructor(message: string) {
    super(message);
  }
}

export class ConcurrencyError extends DomainError {
  public readonly code = 'CONCURRENCY_ERROR';
  constructor(message = 'Conflicto de concurrencia detectado.') {
    super(message);
  }
}

export class UnauthorizedError extends DomainError {
  public readonly code = 'UNAUTHORIZED';
  constructor(message = 'Acceso no autorizado para realizar esta acción.') {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  public readonly code = 'FORBIDDEN';
  constructor(message = 'Acceso denegado. Permisos insuficientes para realizar esta acción.') {
    super(message);
  }
}

export class InfrastructureError extends DomainError {
  public readonly code = 'INFRASTRUCTURE_ERROR';
  public readonly originalError?: unknown;

  constructor(message = 'Error de infraestructura o base de datos.', originalError?: unknown) {
    super(message);
    this.originalError = originalError;
  }
}

