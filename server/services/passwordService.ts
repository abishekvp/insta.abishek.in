import crypto from 'crypto';

export class PasswordService {
  /**
   * Hashes a plaintext password using crypto.scryptSync with a cryptographically secure random salt.
   */
  static hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Securely verifies a plaintext password against a stored salt:hash string using timingSafeEqual.
   */
  static verifyPassword(password: string, storedHash: string): boolean {
    try {
      const [salt, hash] = storedHash.split(':');
      if (!salt || !hash) return false;
      const computedHash = crypto.scryptSync(password, salt, 64).toString('hex');
      return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computedHash, 'hex'));
    } catch {
      return false;
    }
  }
}
