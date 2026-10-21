import crypto from 'crypto';
import { SECRET_KEY } from '../config.js';

export interface TokenPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  exp: number;
}

export class AuthService {
  /**
   * Generates a signed HMAC-SHA256 bearer token.
   */
  static generateToken(payload: { userId: string; email: string; role: 'user' | 'admin' }, expiresInDays = 7): string {
    const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
    const data: TokenPayload = { ...payload, exp };
    const encodedPayload = Buffer.from(JSON.stringify(data)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(encodedPayload)
      .digest('base64url');
    return `${encodedPayload}.${signature}`;
  }

  /**
   * Verifies and decodes a signed bearer token.
   */
  static verifyToken(token: string): TokenPayload | null {
    try {
      const [encodedPayload, signature] = token.split('.');
      if (!encodedPayload || !signature) return null;

      const expectedSignature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(encodedPayload)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return null;
      }

      const payload: TokenPayload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return null; // Expired
      }

      return payload;
    } catch {
      return null;
    }
  }
}
