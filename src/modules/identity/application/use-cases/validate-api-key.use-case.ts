import { createHash } from 'crypto';
import { IApiKeyRepository } from '../../domain/repositories';
import { Role } from '../../domain/entities';

export interface ValidatedApiKeyResult {
  isValid: boolean;
  tenantId?: string;
  branchId?: string | null;
  role?: Role;
  name?: string;
  error?: string;
}

export class ValidateApiKeyUseCase {
  constructor(private readonly apiKeyRepo: IApiKeyRepository) {}

  async execute(rawToken: string): Promise<ValidatedApiKeyResult> {
    if (!rawToken || typeof rawToken !== 'string') {
      return { isValid: false, error: 'Token no provisto o inválido.' };
    }

    // Limpiar prefijo 'Bearer ' si viene incluido
    const cleanToken = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();

    if (!cleanToken) {
      return { isValid: false, error: 'Token vacío.' };
    }

    // Calcular hash SHA-256 del token recibido
    const tokenHash = createHash('sha256').update(cleanToken).digest('hex');

    const apiKey = await this.apiKeyRepo.findApiKeyByHash(tokenHash);
    if (!apiKey || !apiKey.isActive) {
      return { isValid: false, error: 'API Key inválida o revocada.' };
    }

    // Actualizar timestamp de último uso de forma asíncrona no bloqueante
    this.apiKeyRepo.updateLastUsed(apiKey.id, new Date()).catch(err => {
      console.error('[ValidateApiKeyUseCase] Error actualizando lastUsedAt:', err);
    });

    return {
      isValid: true,
      tenantId: apiKey.tenantId,
      branchId: apiKey.branchId,
      role: apiKey.role,
      name: apiKey.name,
    };
  }
}
