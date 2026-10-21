import { Request, Response, NextFunction } from 'express';
import { AuthService, TokenPayload } from '../services/authService.js';
import { query } from '../db/index.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const payload = AuthService.verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }

  // Check if user is still active in database
  const user = await query.get<{ id: string; role: string; is_active: number }>(
    'SELECT id, role, is_active FROM users WHERE id = ?',
    [payload.userId]
  );

  if (!user || user.is_active === 0) {
    return res.status(403).json({ error: 'User account has been deactivated or suspended' });
  }

  // Ensure current role from DB is attached
  req.user = {
    ...payload,
    role: user.role as 'user' | 'admin'
  };

  next();
}

export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Administrator privileges required.' });
  }
  next();
}

// Optional auth: attaches user if token is present, but doesn't block if absent
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (token) {
    const payload = AuthService.verifyToken(token);
    if (payload) {
      req.user = payload;
    }
  }
  next();
}
