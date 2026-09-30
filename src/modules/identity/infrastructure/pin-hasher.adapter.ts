import { createHmac, timingSafeEqual } from 'crypto';
import { IPinHasher } from '../domain/repositories';

export class CryptoPinHasherAdapter implements IPinHasher {
  private readonly salt: string;

  constructor(salt?: string) {
    this.salt = salt || process.env.PIN_SALT || 'criollito-secure-pin-salt-2025';
  }

  async hashPin(pin: string): Promise<string> {
    return createHmac('sha256', this.salt).update(pin.trim()).digest('hex');
  }

  async verifyPin(pin: string, hash: string): Promise<boolean> {
    try {
      const computed = await this.hashPin(pin);
      const computedBuffer = Buffer.from(computed, 'hex');
      const hashBuffer = Buffer.from(hash, 'hex');

      if (computedBuffer.length !== hashBuffer.length) {
        return false;
      }

      return timingSafeEqual(computedBuffer, hashBuffer);
    } catch {
      return false;
    }
  }
}
